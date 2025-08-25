const express = require('express');
const router = express.Router();
const { connectToDatabase } = require('../config/database');

// 재고 현황 조회 (초고속 집계)
router.get('/', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { storeId } = req.query;
    console.log(`재고 현황 조회: 매장 ${storeId || '전체'}`);

    if (!storeId) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: '매장 ID는 필수입니다.'
      });
    }

    const { db } = await connectToDatabase();

    // 단일 Aggregation으로 전체 재고 현황 생성
    const pipeline = [
      {
        $lookup: {
          from: 'scan_records',
          let: { productSku: '$sku' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$productCode', '$$productSku'] },
                    { $eq: ['$storeId', String(storeId)] }
                  ]
                }
              }
            }
          ],
          as: 'scanRecord'
        }
      },
      {
        $addFields: {
          isScanned: { $gt: [{ $size: '$scanRecord' }, 0] },
          lastScanned: { $arrayElemAt: ['$scanRecord.timestamp', 0] },
          importance: {
            $switch: {
              branches: [
                { case: { $lte: ['$salesAvg', 80] }, then: 'high' },
                { case: { $lte: ['$salesAvg', 130] }, then: 'medium' }
              ],
              default: 'low'
            }
          },
          // 예상 재고량 계산 (실제 비즈니스 로직 적용)
          estimatedStock: {
            $switch: {
              branches: [
                { case: { $lte: ['$salesAvg', 50] }, then: { $multiply: ['$salesAvg', 0.7] } },
                { case: { $lte: ['$salesAvg', 100] }, then: { $multiply: ['$salesAvg', 0.8] } },
                { case: { $lte: ['$salesAvg', 200] }, then: { $multiply: ['$salesAvg', 0.9] } }
              ],
              default: { $multiply: ['$salesAvg', 1.0] }
            }
          },
          // 재주문 필요 여부
          needsReorder: {
            $cond: {
              if: { $gt: [{ $size: '$scanRecord' }, 0] },
              then: { $lt: [{ $multiply: ['$salesAvg', 0.3] }, 10] }, // 스캔된 경우 낮은 재고로 가정
              else: true // 미스캔 제품은 재주문 필요로 가정
            }
          }
        }
      },
      {
        $project: {
          scanRecord: 0 // 불필요한 데이터 제거
        }
      },
      {
        $sort: { 
          isScanned: 1,      // 미스캔 제품 우선
          importance: 1,      // 중요도 높은 순
          salesAvg: 1        // 판매량 높은 순
        }
      }
    ];

    // 통계 집계 파이프라인
    const statsPipeline = [
      ...pipeline.slice(0, -1), // 마지막 정렬 제외
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          scannedItems: {
            $sum: { $cond: ['$isScanned', 1, 0] }
          },
          highPriorityItems: {
            $sum: { $cond: [{ $eq: ['$importance', 'high'] }, 1, 0] }
          },
          mediumPriorityItems: {
            $sum: { $cond: [{ $eq: ['$importance', 'medium'] }, 1, 0] }
          },
          lowPriorityItems: {
            $sum: { $cond: [{ $eq: ['$importance', 'low'] }, 1, 0] }
          },
          needsReorderCount: {
            $sum: { $cond: ['$needsReorder', 1, 0] }
          },
          totalEstimatedValue: {
            $sum: { $multiply: ['$estimatedStock', { $ifNull: ['$price', 0] }] }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalItems: 1,
          scannedItems: 1,
          unscannedItems: { $subtract: ['$totalItems', '$scannedItems'] },
          scanProgress: {
            $multiply: [
              { $divide: ['$scannedItems', '$totalItems'] },
              100
            ]
          },
          priorityBreakdown: {
            high: '$highPriorityItems',
            medium: '$mediumPriorityItems',
            low: '$lowPriorityItems'
          },
          needsReorderCount: 1,
          totalEstimatedValue: { $round: ['$totalEstimatedValue', 0] }
        }
      }
    ];

    // 데이터와 통계 병렬 조회
    const [inventoryItems, statsResult] = await Promise.all([
      db.collection('products').aggregate(pipeline).toArray(),
      db.collection('products').aggregate(statsPipeline).toArray()
    ]);

    const stats = statsResult[0] || {
      totalItems: 0,
      scannedItems: 0,
      unscannedItems: 0,
      scanProgress: 0,
      priorityBreakdown: { high: 0, medium: 0, low: 0 },
      needsReorderCount: 0,
      totalEstimatedValue: 0
    };

    const responseTime = Date.now() - startTime;
    console.log(`재고 현황 조회 완료 (${responseTime}ms): ${inventoryItems.length}개 제품`);

    res.json({
      success: true,
      data: inventoryItems,
      summary: stats,
      storeId: String(storeId),
      responseTime,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`재고 현황 조회 오류 (${responseTime}ms):`, error);
    
    res.status(500).json({
      success: false,
      error: 'INVENTORY_FETCH_ERROR',
      message: '재고 현황 조회에 실패했습니다.',
      responseTime
    });
  }
});

// 📈 재고 트렌드 분석
router.get('/trends', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { storeId, days = 7 } = req.query;
    console.log(`📈 재고 트렌드 분석: 매장 ${storeId}, 기간 ${days}일`);

    if (!storeId) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: '매장 ID는 필수입니다.'
      });
    }

    const { db } = await connectToDatabase();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // 일별 스캔 트렌드 분석
    const trendPipeline = [
      {
        $match: {
          storeId: String(storeId),
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }
          },
          dailyScans: { $sum: 1 },
          uniqueProducts: { $addToSet: '$productCode' }
        }
      },
      {
        $project: {
          date: '$_id.date',
          dailyScans: 1,
          uniqueProductCount: { $size: '$uniqueProducts' },
          _id: 0
        }
      },
      {
        $sort: { date: 1 }
      }
    ];

    const trends = await db.collection('scan_records').aggregate(trendPipeline).toArray();

    const responseTime = Date.now() - startTime;
    console.log(`재고 트렌드 분석 완료 (${responseTime}ms)`);

    res.json({
      success: true,
      data: trends,
      period: {
        days: parseInt(days),
        startDate,
        endDate: new Date()
      },
      storeId: String(storeId),
      responseTime
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`재고 트렌드 분석 오류 (${responseTime}ms):`, error);
    
    res.status(500).json({
      success: false,
      error: 'INVENTORY_TRENDS_ERROR',
      message: '재고 트렌드 분석에 실패했습니다.',
      responseTime
    });
  }
});

module.exports = router;
