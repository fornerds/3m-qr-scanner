const express = require('express');
const router = express.Router();
const { connectToDatabase } = require('../config/database');
const { ObjectId } = require('mongodb');

// 메모리 캐시 (간단한 인메모리 캐싱)
const cache = new Map();
const CACHE_TTL = 30000; // 30초 캐시 TTL

// 캐시 헬퍼 함수들
function getCacheKey(operation, params = {}) {
  return `${operation}:${JSON.stringify(params)}`;
}

function getFromCache(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key); // 만료된 캐시 삭제
  return null;
}

function setToCache(key, data) {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
  
  // 캐시 크기 제한 (메모리 누수 방지)
  if (cache.size > 100) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
}

// ⚡ 초고속 매장 목록 조회 (MongoDB Aggregation 사용)
router.get('/', async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('🏪 매장 목록 조회 요청');
    
    // 캐시 확인
    const cacheKey = getCacheKey('stores_with_stats');
    const cachedResult = getFromCache(cacheKey);
    
    if (cachedResult) {
      console.log(`⚡ 캐시에서 반환 (${Date.now() - startTime}ms)`);
      return res.json({
        success: true,
        data: cachedResult,
        cached: true,
        responseTime: Date.now() - startTime
      });
    }

    const { db } = await connectToDatabase();

    // 🚀 단일 Aggregation으로 모든 데이터 가져오기 (초고속!)
    const pipeline = [
      // 1. 매장 정보 가져오기
      {
        $lookup: {
          from: 'scan_records',
          let: { storeId: { $toString: '$_id' } },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$storeId', '$$storeId'] }
              }
            },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                lastScan: { $max: '$timestamp' }
              }
            }
          ],
          as: 'scanStats'
        }
      },
      // 2. 결과 정리
      {
        $project: {
          id: { $toString: '$_id' },
          name: 1,
          address: 1,
          phone: { $ifNull: ['$phone', ''] },
          district: { $ifNull: ['$district', ''] },
          lastVisit: 1,
          createdAt: 1,
          updatedAt: 1,
          scannedItems: {
            $ifNull: [{ $arrayElemAt: ['$scanStats.count', 0] }, 0]
          },
          lastScanTime: {
            $arrayElemAt: ['$scanStats.lastScan', 0]
          }
        }
      },
      // 3. 생성일 기준 내림차순 정렬
      {
        $sort: { createdAt: -1 }
      }
    ];

    // 전체 제품 수 조회 (병렬로 실행)
    const [storesResult, totalProducts] = await Promise.all([
      db.collection('stores').aggregate(pipeline).toArray(),
      db.collection('products').countDocuments({ active: { $ne: false } })
    ]);

    // 최종 데이터 구성
    const storesWithStats = storesResult.map(store => {
      const progress = totalProducts > 0 ? Math.round((store.scannedItems / totalProducts) * 100) : 0;
      
      return {
        ...store,
        totalItems: totalProducts,
        progress,
        scanCount: `${store.scannedItems}/${totalProducts} (${progress}%)`,
        lastScanTime: store.lastScanTime || null,
        _id: undefined // MongoDB _id 제거
      };
    });

    // 결과 캐싱
    setToCache(cacheKey, storesWithStats);

    const responseTime = Date.now() - startTime;
    console.log(`✅ 매장 목록 조회 완료 (${responseTime}ms, ${storesWithStats.length}개)`);

    res.json({
      success: true,
      data: storesWithStats,
      cached: false,
      responseTime,
      totalStores: storesWithStats.length,
      totalProducts
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`❌ 매장 목록 조회 오류 (${responseTime}ms):`, error);
    
    res.status(500).json({ 
      success: false, 
      error: 'STORES_FETCH_ERROR',
      message: '매장 목록을 가져올 수 없습니다.',
      responseTime 
    });
  }
});

// 📊 특정 매장 상세 정보 조회 (더 빠른 버전)
router.get('/:id', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { id } = req.params;
    console.log(`🏪 매장 상세 조회: ${id}`);

    // 캐시 확인
    const cacheKey = getCacheKey('store_detail', { id });
    const cachedResult = getFromCache(cacheKey);
    
    if (cachedResult) {
      console.log(`⚡ 캐시에서 반환 (${Date.now() - startTime}ms)`);
      return res.json({
        success: true,
        data: cachedResult,
        cached: true
      });
    }

    const { db } = await connectToDatabase();

    // 매장 정보와 상세 통계를 한 번에 가져오기
    const pipeline = [
      {
        $match: { _id: id }
      },
      {
        $lookup: {
          from: 'scan_records',
          let: { storeId: { $toString: '$_id' } },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$storeId', '$$storeId'] }
              }
            },
            {
              $group: {
                _id: null,
                totalScans: { $sum: 1 },
                uniqueProducts: { $addToSet: '$productCode' },
                lastScan: { $max: '$timestamp' },
                firstScan: { $min: '$timestamp' }
              }
            },
            {
              $project: {
                totalScans: 1,
                uniqueProductCount: { $size: '$uniqueProducts' },
                lastScan: 1,
                firstScan: 1
              }
            }
          ],
          as: 'scanStats'
        }
      },
      {
        $lookup: {
          from: 'sessions',
          let: { storeId: { $toString: '$_id' } },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$storeId', '$$storeId'] }
              }
            },
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 }
              }
            }
          ],
          as: 'sessionStats'
        }
      }
    ];

    const [storeResult, totalProducts] = await Promise.all([
      db.collection('stores').aggregate(pipeline).toArray(),
      db.collection('products').countDocuments({ active: { $ne: false } })
    ]);

    if (storeResult.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'STORE_NOT_FOUND',
        message: '해당 매장을 찾을 수 없습니다.'
      });
    }

    const store = storeResult[0];
    const scanStats = store.scanStats[0] || {};
    const sessionStats = store.sessionStats || [];

    const storeDetail = {
      id: store._id,
      name: store.name,
      address: store.address,
      phone: store.phone || '',
      district: store.district || '',
      lastVisit: store.lastVisit,
      createdAt: store.createdAt,
      updatedAt: store.updatedAt,
      
      // 스캔 통계
      totalItems: totalProducts,
      scannedItems: scanStats.uniqueProductCount || 0,
      totalScans: scanStats.totalScans || 0,
      progress: totalProducts > 0 ? Math.round(((scanStats.uniqueProductCount || 0) / totalProducts) * 100) : 0,
      
      // 시간 정보
      firstScanTime: scanStats.firstScan || null,
      lastScanTime: scanStats.lastScan || null,
      
      // 세션 통계
      sessions: {
        completed: sessionStats.find(s => s._id === 'completed')?.count || 0,
        active: sessionStats.find(s => s._id === 'active')?.count || 0
      }
    };

    // 결과 캐싱 (더 짧은 TTL - 상세 정보는 더 자주 변경됨)
    setToCache(cacheKey, storeDetail);

    const responseTime = Date.now() - startTime;
    console.log(`✅ 매장 상세 조회 완료 (${responseTime}ms)`);

    res.json({
      success: true,
      data: storeDetail,
      cached: false,
      responseTime
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`❌ 매장 상세 조회 오류 (${responseTime}ms):`, error);
    
    res.status(500).json({
      success: false,
      error: 'STORE_DETAIL_ERROR',
      message: '매장 상세 정보를 가져올 수 없습니다.',
      responseTime
    });
  }
});

// ⚡ 새 매장 추가 (최적화된 중복 체크)
router.post('/', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const newStore = req.body;
    console.log('🏪 새 매장 추가 요청:', newStore.name);

    // 입력 데이터 검증
    if (!newStore.name || !newStore.address) {
      return res.status(400).json({ 
        success: false, 
        error: 'VALIDATION_ERROR',
        message: '매장명과 주소는 필수 입력 항목입니다.',
        required: ['name', 'address']
      });
    }

    const { db } = await connectToDatabase();

    // 🚀 중복 검사를 aggregation으로 최적화
    const duplicateCheck = await db.collection('stores').aggregate([
      {
        $match: {
          $or: [
            { name: { $regex: new RegExp(`^${newStore.name.trim()}$`, 'i') } },
            { address: { $regex: new RegExp(`^${newStore.address.trim()}$`, 'i') } }
          ]
        }
      },
      {
        $project: {
          name: 1,
          address: 1,
          duplicateType: {
            $cond: {
              if: { $eq: [{ $toLower: '$name' }, newStore.name.trim().toLowerCase()] },
              then: 'name',
              else: 'address'
            }
          }
        }
      },
      {
        $limit: 1
      }
    ]).toArray();

    if (duplicateCheck.length > 0) {
      const duplicate = duplicateCheck[0];
      const field = duplicate.duplicateType === 'name' ? '매장명' : '주소';
      
      return res.status(409).json({ 
        success: false, 
        error: 'DUPLICATE_STORE',
        message: `동일한 ${field}의 매장이 이미 존재합니다: ${duplicate.name}`,
        duplicateField: duplicate.duplicateType,
        existingStore: {
          id: duplicate._id,
          name: duplicate.name
        }
      });
    }

    // 새 ID 생성 (더 효율적인 방법)
    const maxIdResult = await db.collection('stores').aggregate([
      {
        $addFields: {
          numericId: {
            $toInt: {
              $cond: {
                if: { $regexMatch: { input: '$_id', regex: /^\d+$/ } },
                then: '$_id',
                else: 0
              }
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          maxId: { $max: '$numericId' }
        }
      }
    ]).toArray();

    const newStoreId = String((maxIdResult[0]?.maxId || 0) + 1);

    const storeData = {
      _id: newStoreId,
      name: newStore.name.trim(),
      address: newStore.address.trim(),
      phone: newStore.phone?.trim() || '',
      district: newStore.district?.trim() || '',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastVisit: null
    };

    await db.collection('stores').insertOne(storeData);

    // 캐시 무효화
    cache.clear();

    const responseTime = Date.now() - startTime;
    console.log(`✅ 새 매장 추가 완료 (${responseTime}ms): ${newStore.name} (ID: ${newStoreId})`);

    res.status(201).json({ 
      success: true, 
      message: '매장이 성공적으로 추가되었습니다.',
      data: {
        ...storeData,
        totalItems: 0,
        scannedItems: 0,
        progress: 0,
        scanCount: '0/0 (0%)'
      },
      responseTime
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`❌ 매장 추가 오류 (${responseTime}ms):`, error);
    
    res.status(500).json({ 
      success: false, 
      error: 'STORE_CREATE_ERROR',
      message: '매장 추가에 실패했습니다.',
      responseTime
    });
  }
});

// ⚡ 매장 정보 수정 (최적화된 업데이트)
router.put('/:id', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { id } = req.params;
    const updateData = req.body;
    console.log(`🏪 매장 수정 요청: ${id}`);

    // 입력 데이터 검증
    if (!updateData.name || !updateData.address) {
      return res.status(400).json({ 
        success: false, 
        error: 'VALIDATION_ERROR',
        message: '매장명과 주소는 필수 입력 항목입니다.' 
      });
    }

    const { db } = await connectToDatabase();

    // 존재 여부와 중복 검사를 한 번에
    const checks = await Promise.all([
      db.collection('stores').findOne({ _id: id }),
      db.collection('stores').findOne({
        _id: { $ne: id },
        $or: [
          { name: { $regex: new RegExp(`^${updateData.name.trim()}$`, 'i') } },
          { address: { $regex: new RegExp(`^${updateData.address.trim()}$`, 'i') } }
        ]
      })
    ]);

    const [existingStore, duplicateStore] = checks;

    if (!existingStore) {
      return res.status(404).json({ 
        success: false, 
        error: 'STORE_NOT_FOUND',
        message: '해당 매장을 찾을 수 없습니다.' 
      });
    }

    if (duplicateStore) {
      const duplicateField = duplicateStore.name.toLowerCase() === updateData.name.trim().toLowerCase() ? '매장명' : '주소';
      return res.status(409).json({ 
        success: false, 
        error: 'DUPLICATE_STORE',
        message: `동일한 ${duplicateField}의 매장이 이미 존재합니다: ${duplicateStore.name}` 
      });
    }

    const updatedFields = {
      name: updateData.name.trim(),
      address: updateData.address.trim(),
      phone: updateData.phone?.trim() || '',
      district: updateData.district?.trim() || '',
      updatedAt: new Date()
    };

    await db.collection('stores').updateOne(
      { _id: id }, 
      { $set: updatedFields }
    );

    // 캐시 무효화
    cache.clear();

    const responseTime = Date.now() - startTime;
    console.log(`✅ 매장 수정 완료 (${responseTime}ms): ${updateData.name}`);

    res.json({ 
      success: true, 
      message: '매장 정보가 성공적으로 수정되었습니다.',
      data: { 
        id,
        ...updatedFields,
        createdAt: existingStore.createdAt,
        lastVisit: existingStore.lastVisit
      },
      responseTime
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`❌ 매장 수정 오류 (${responseTime}ms):`, error);
    
    res.status(500).json({ 
      success: false, 
      error: 'STORE_UPDATE_ERROR',
      message: '매장 정보 수정에 실패했습니다.',
      responseTime 
    });
  }
});

// 🗑️ 매장 삭제 (관련 데이터도 함께 삭제)
router.delete('/:id', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { id: storeId } = req.params;
    console.log(`🏪 매장 삭제 요청: ${storeId}`);

    const { db } = await connectToDatabase();

    // 매장 존재 확인
    const existingStore = await db.collection('stores').findOne({ _id: storeId });
    
    if (!existingStore) {
      return res.status(404).json({ 
        success: false, 
        error: 'STORE_NOT_FOUND',
        message: '해당 매장을 찾을 수 없습니다.' 
      });
    }

    console.log(`🗑️ 매장 삭제 시작: ${existingStore.name}`);

    // 🚀 병렬로 관련 데이터 삭제 (트랜잭션 사용)
    const session = db.client.startSession();
    
    try {
      await session.withTransaction(async () => {
        const [scanDeleteResult, sessionDeleteResult] = await Promise.all([
          db.collection('scan_records').deleteMany(
            { storeId: String(storeId) }, 
            { session }
          ),
          db.collection('sessions').deleteMany(
            { storeId: String(storeId) }, 
            { session }
          )
        ]);

        // 매장 삭제
        await db.collection('stores').deleteOne(
          { _id: storeId }, 
          { session }
        );

        console.log(`✅ 관련 데이터 삭제 완료: 스캔 기록 ${scanDeleteResult.deletedCount}개, 세션 ${sessionDeleteResult.deletedCount}개`);
        
        return { scanDeleteResult, sessionDeleteResult };
      });
    } finally {
      await session.endSession();
    }

    // 캐시 무효화
    cache.clear();

    const responseTime = Date.now() - startTime;
    console.log(`✅ 매장 삭제 완료 (${responseTime}ms): ${existingStore.name}`);

    res.json({ 
      success: true, 
      message: `매장이 성공적으로 삭제되었습니다.`,
      deletedStore: {
        id: storeId,
        name: existingStore.name
      },
      responseTime
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`❌ 매장 삭제 오류 (${responseTime}ms):`, error);
    
    res.status(500).json({ 
      success: false, 
      error: 'STORE_DELETE_ERROR',
      message: '매장 삭제에 실패했습니다.',
      responseTime 
    });
  }
});

// 🧹 캐시 수동 클리어 (관리용)
router.post('/cache/clear', (req, res) => {
  cache.clear();
  console.log('🧹 매장 API 캐시 클리어됨');
  
  res.json({
    success: true,
    message: '캐시가 성공적으로 클리어되었습니다.',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
