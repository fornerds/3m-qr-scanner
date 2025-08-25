const express = require('express');
const router = express.Router();
const { connectToDatabase } = require('../config/database');
const { ObjectId } = require('mongodb');

// 스캔 기록 생성 (중복 방지 최적화)
router.post('/', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { storeId, productCode, productName, source = 'manual' } = req.body;
    
    // storeId 타입 통일 (문자열로 변환)
    const normalizedStoreId = String(storeId);
    const normalizedProductCode = String(productCode);
    
    console.log('스캔 기록 저장 요청:', { 
      storeId: normalizedStoreId, 
      productCode: normalizedProductCode, 
      productName,
      source 
    });
    
    if (!storeId || !productCode || !productName) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: '필수 정보가 누락되었습니다.',
        required: ['storeId', 'productCode', 'productName']
      });
    }

    const { db } = await connectToDatabase();

    // Upsert를 사용한 중복 방지 (원자적 연산)
    const scanRecord = {
      storeId: normalizedStoreId,
      productCode: normalizedProductCode,
      productName: productName.trim(),

      source,
      timestamp: new Date(),
      createdAt: new Date()
      // updatedAt는 $currentDate로 처리
    };

    // 중복 체크를 위한 고유 키
    const duplicateFilter = {
      storeId: normalizedStoreId,
      productCode: normalizedProductCode
    };

    const result = await db.collection('scan_records').updateOne(
      duplicateFilter,
      {
        $setOnInsert: scanRecord,
        $currentDate: { updatedAt: true } // MongoDB가 자동으로 현재 시간 설정
      },
      { upsert: true }
    );

    // 매장 방문 기록 업데이트 (비동기)
    db.collection('stores').updateOne(
      { _id: normalizedStoreId },
      { 
        $set: { 
          lastVisit: new Date(),
          updatedAt: new Date()
        } 
      }
    ).catch(err => console.warn('매장 방문 기록 업데이트 실패:', err));

    const responseTime = Date.now() - startTime;

    if (result.upsertedCount > 0) {
      // 새로 생성됨
      console.log(`새 스캔 기록 저장 (${responseTime}ms):`, normalizedProductCode);
      
      res.json({
        success: true,
        message: '스캔 기록이 저장되었습니다.',
        isDuplicate: false,
        record: scanRecord,
        responseTime
      });
    } else {
      // 이미 존재함 (중복)
      console.log(`중복 스캔 기록 (${responseTime}ms):`, normalizedProductCode);
      
      res.json({
        success: true,
        message: '이미 스캔된 제품입니다.',
        isDuplicate: true,
        responseTime
      });
    }

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`스캔 기록 저장 오류 (${responseTime}ms):`, error);
    
    res.status(500).json({
      success: false,
      error: 'SCAN_RECORD_CREATE_ERROR',
      message: '스캔 기록 저장에 실패했습니다.',
      responseTime
    });
  }
});

// 스캔 기록 조회 (페이징 및 필터링 최적화)
router.get('/', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { 
      storeId, 
      productCode,
      source,
      limit = 50, 
      offset = 0, 
      sortBy = 'timestamp',
      sortOrder = 'desc',
      startDate,
      endDate 
    } = req.query;
    
    console.log('스캔 기록 조회 요청:', { storeId, limit, offset });

    const { db } = await connectToDatabase();

    // Aggregation을 사용한 고성능 조회
    const matchStage = {};
    
    if (storeId) matchStage.storeId = String(storeId);

    if (productCode) matchStage.productCode = String(productCode);
    if (source) matchStage.source = source;
    
    // 날짜 필터링
    if (startDate || endDate) {
      matchStage.timestamp = {};
      if (startDate) matchStage.timestamp.$gte = new Date(startDate);
      if (endDate) matchStage.timestamp.$lte = new Date(endDate);
    }

    const pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: 'products',
          localField: 'productCode',
          foreignField: 'sku',
          as: 'productInfo'
        }
      },
      {
        $addFields: {
          productCategory: { $arrayElemAt: ['$productInfo.category', 0] },
          productPrice: { $arrayElemAt: ['$productInfo.price', 0] },
          productImportance: { $arrayElemAt: ['$productInfo.salesAvg', 0] }
        }
      },
      {
        $project: {
          productInfo: 0 // 불필요한 데이터 제거로 네트워크 최적화
        }
      },
      { $sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 } }
    ];

    // 총 개수와 데이터를 병렬로 조회
    const [totalCountResult, records] = await Promise.all([
      db.collection('scan_records').aggregate([
        { $match: matchStage },
        { $count: 'total' }
      ]).toArray(),
      db.collection('scan_records').aggregate([
        ...pipeline,
        { $skip: parseInt(offset) },
        { $limit: parseInt(limit) }
      ]).toArray()
    ]);

    const totalCount = totalCountResult[0]?.total || 0;
    const responseTime = Date.now() - startTime;

    console.log(`스캔 기록 조회 완료 (${responseTime}ms): ${records.length}개 / 전체 ${totalCount}개`);
    
    res.json({
      success: true,
      data: records,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: totalCount > parseInt(offset) + parseInt(limit),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        currentPage: Math.floor(parseInt(offset) / parseInt(limit)) + 1
      },
      filters: {
        storeId,

        productCode,
        source,
        dateRange: startDate || endDate ? { startDate, endDate } : null
      },
      responseTime
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`스캔 기록 조회 오류 (${responseTime}ms):`, error);
    
    res.status(500).json({
      success: false,
      error: 'SCAN_RECORDS_FETCH_ERROR',
      message: '스캔 기록 조회에 실패했습니다.',
      responseTime
    });
  }
});

// 스캔 통계 조회 (초고속 집계)
router.get('/stats', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { storeId, period = '7d' } = req.query;
    console.log(`스캔 통계 조회: ${storeId}, 기간: ${period}`);

    const { db } = await connectToDatabase();

    // 기간 계산
    const periodMap = {
      '1d': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90
    };

    const days = periodMap[period] || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const matchStage = {
      timestamp: { $gte: startDate }
    };

    if (storeId) {
      matchStage.storeId = String(storeId);
    }

    // 복합 통계를 단일 Aggregation으로 처리
    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalScans: { $sum: 1 },
          uniqueProducts: { $addToSet: '$productCode' },
          uniqueStores: { $addToSet: '$storeId' },
          scansBySource: {
            $push: '$source'
          },
          scansByDay: {
            $push: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
              timestamp: '$timestamp'
            }
          },
          firstScan: { $min: '$timestamp' },
          lastScan: { $max: '$timestamp' }
        }
      },
      {
        $project: {
          totalScans: 1,
          uniqueProductCount: { $size: '$uniqueProducts' },
          uniqueStoreCount: { $size: '$uniqueStores' },
          scansBySource: {
            $reduce: {
              input: '$scansBySource',
              initialValue: {},
              in: {
                $mergeObjects: [
                  '$$value',
                  {
                    $cond: [
                      { $eq: [{ $type: { $getField: { field: '$$this', input: '$$value' } } }, 'missing'] },
                      { $arrayToObject: [[{ k: '$$this', v: 1 }]] },
                      { $arrayToObject: [[{ k: '$$this', v: { $add: [{ $getField: { field: '$$this', input: '$$value' } }, 1] } }]] }
                    ]
                  }
                ]
              }
            }
          },
          dailyStats: {
            $map: {
              input: {
                $setUnion: ['$scansByDay.date']
              },
              as: 'date',
              in: {
                date: '$$date',
                count: {
                  $size: {
                    $filter: {
                      input: '$scansByDay',
                      cond: { $eq: ['$$this.date', '$$date'] }
                    }
                  }
                }
              }
            }
          },
          firstScan: 1,
          lastScan: 1,
          averageScansPerDay: {
            $divide: ['$totalScans', days]
          }
        }
      }
    ];

    const [statsResult] = await db.collection('scan_records').aggregate(pipeline).toArray();

    const stats = statsResult || {
      totalScans: 0,
      uniqueProductCount: 0,
      uniqueStoreCount: 0,
      scansBySource: {},
      dailyStats: [],
      firstScan: null,
      lastScan: null,
      averageScansPerDay: 0
    };

    const responseTime = Date.now() - startTime;
    console.log(`스캔 통계 조회 완료 (${responseTime}ms)`);

    res.json({
      success: true,
      data: stats,
      period: {
        days,
        startDate,
        endDate: new Date()
      },
      responseTime
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`스캔 통계 조회 오류 (${responseTime}ms):`, error);
    
    res.status(500).json({
      success: false,
      error: 'SCAN_STATS_ERROR',
      message: '스캔 통계 조회에 실패했습니다.',
      responseTime
    });
  }
});

// 스캔 기록 삭제
router.delete('/:id', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { id } = req.params;
    console.log(`스캔 기록 삭제 요청: ${id}`);

    const { db } = await connectToDatabase();

    let filter;
    if (ObjectId.isValid(id)) {
      filter = { _id: new ObjectId(id) };
    } else {
      filter = { _id: id };
    }

    const result = await db.collection('scan_records').deleteOne(filter);

    const responseTime = Date.now() - startTime;

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'SCAN_RECORD_NOT_FOUND',
        message: '해당 스캔 기록을 찾을 수 없습니다.',
        responseTime
      });
    }

    console.log(`스캔 기록 삭제 완료 (${responseTime}ms)`);
    
    res.json({
      success: true,
      message: '스캔 기록이 삭제되었습니다.',
      responseTime
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`스캔 기록 삭제 오류 (${responseTime}ms):`, error);
    
    res.status(500).json({
      success: false,
      error: 'SCAN_RECORD_DELETE_ERROR',
      message: '스캔 기록 삭제에 실패했습니다.',
      responseTime
    });
  }
});

// 🧹 매장별 스캔 기록 일괄 삭제
router.delete('/store/:storeId', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { storeId } = req.params;
    const normalizedStoreId = String(storeId);
    
    console.log(`🧹 매장별 스캔 기록 일괄 삭제: ${normalizedStoreId}`);

    const { db } = await connectToDatabase();

    const result = await db.collection('scan_records').deleteMany({
      storeId: normalizedStoreId
    });

    const responseTime = Date.now() - startTime;
    console.log(`매장별 스캔 기록 삭제 완료 (${responseTime}ms): ${result.deletedCount}개`);

    res.json({
      success: true,
      message: `${result.deletedCount}개의 스캔 기록이 삭제되었습니다.`,
      deletedCount: result.deletedCount,
      storeId: normalizedStoreId,
      responseTime
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`매장별 스캔 기록 삭제 오류 (${responseTime}ms):`, error);
    
    res.status(500).json({
      success: false,
      error: 'BULK_DELETE_ERROR',
      message: '매장별 스캔 기록 삭제에 실패했습니다.',
      responseTime
    });
  }
});

module.exports = router;
