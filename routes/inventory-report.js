const express = require('express');
const router = express.Router();
const { connectToDatabase } = require('../config/database');

// 📄 재고 리포트 생성 (완전 최적화)
router.get('/', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { storeId, format = 'summary' } = req.query;
    console.log(`📄 재고 리포트 생성: 매장 ${storeId}, 형식 ${format}`);

    if (!storeId) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: '매장 ID는 필수입니다.'
      });
    }

    const { db } = await connectToDatabase();

    // 🚀 초고속 리포트 데이터 집계
    const reportPipeline = [
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
            },
            {
              $sort: { timestamp: -1 }
            },
            {
              $limit: 1
            }
          ],
          as: 'scanInfo'
        }
      },
      {
        $addFields: {
          status: {
            $cond: {
              if: { $gt: [{ $size: '$scanInfo' }, 0] },
              then: 'scanned',
              else: 'missing'
            }
          },
          lastScanned: { $arrayElemAt: ['$scanInfo.timestamp', 0] },
          importance: {
            $switch: {
              branches: [
                { case: { $lte: ['$salesAvg', 80] }, then: 'high' },
                { case: { $lte: ['$salesAvg', 130] }, then: 'medium' }
              ],
              default: 'low'
            }
          },
          estimatedStock: {
            $cond: {
              if: { $gt: [{ $size: '$scanInfo' }, 0] },
              then: { $multiply: ['$salesAvg', { $rand: [] }] }, // 스캔된 제품은 랜덤 재고
              else: 0 // 미스캔 제품은 0으로 가정
            }
          }
        }
      },
      {
        $project: {
          scanInfo: 0
        }
      }
    ];

    // 상세 리포트 vs 요약 리포트
    let finalPipeline = [...reportPipeline];
    
    if (format === 'summary') {
      // 요약 리포트: 통계만
      finalPipeline.push({
        $group: {
          _id: '$status',
          items: {
            $push: {
              sku: '$sku',
              name: '$name',
              category: '$category',
              importance: '$importance',
              estimatedStock: { $round: ['$estimatedStock', 0] },
              price: '$price',
              lastScanned: '$lastScanned'
            }
          },
          count: { $sum: 1 },
          totalValue: {
            $sum: { $multiply: ['$estimatedStock', { $ifNull: ['$price', 0] }] }
          },
          highPriorityCount: {
            $sum: { $cond: [{ $eq: ['$importance', 'high'] }, 1, 0] }
          },
          mediumPriorityCount: {
            $sum: { $cond: [{ $eq: ['$importance', 'medium'] }, 1, 0] }
          },
          lowPriorityCount: {
            $sum: { $cond: [{ $eq: ['$importance', 'low'] }, 1, 0] }
          }
        }
      });
    } else {
      // 상세 리포트: 모든 제품 정보
      finalPipeline.push({
        $sort: {
          importance: 1,  // 중요도 높은 순
          status: 1,      // 미스캔 우선
          salesAvg: 1     // 판매량 높은 순
        }
      });
    }

    const reportData = await db.collection('products').aggregate(finalPipeline).toArray();

    // 추가 통계 계산
    const overallStats = await db.collection('products').aggregate([
      ...reportPipeline,
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          scannedItems: {
            $sum: { $cond: [{ $eq: ['$status', 'scanned'] }, 1, 0] }
          },
          missingItems: {
            $sum: { $cond: [{ $eq: ['$status', 'missing'] }, 1, 0] }
          },
          totalEstimatedValue: {
            $sum: { $multiply: ['$estimatedStock', { $ifNull: ['$price', 0] }] }
          },
          highPriorityMissing: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ['$status', 'missing'] },
                  { $eq: ['$importance', 'high'] }
                ]},
                1, 0
              ]
            }
          }
        }
      }
    ]).toArray();

    const stats = overallStats[0] || {
      totalItems: 0,
      scannedItems: 0,
      missingItems: 0,
      totalEstimatedValue: 0,
      highPriorityMissing: 0
    };

    // 스캔 완료율 계산
    const completionRate = stats.totalItems > 0 ? 
      Math.round((stats.scannedItems / stats.totalItems) * 100) : 0;

    const responseTime = Date.now() - startTime;
    console.log(`재고 리포트 생성 완료 (${responseTime}ms)`);

    res.json({
      success: true,
      data: reportData,
      summary: {
        ...stats,
        completionRate,
        reportGeneratedAt: new Date().toISOString(),
        storeId: String(storeId),
        format
      },
      meta: {
        responseTime,
        recordCount: reportData.length,
        format,
        generatedBy: 'Express API v2.0'
      }
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`재고 리포트 생성 오류 (${responseTime}ms):`, error);
    
    res.status(500).json({
      success: false,
      error: 'INVENTORY_REPORT_ERROR',
      message: '재고 리포트 생성에 실패했습니다.',
      responseTime
    });
  }
});

module.exports = router;
