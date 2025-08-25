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

    // 초고속 리포트 데이터 집계
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
          scanInfo: 0,
          salesAvg: 1 // salesAvg 필드 포함
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
              lastScanned: '$lastScanned',
              salesAvg: '$salesAvg' // salesAvg 포함
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

    // 순위 및 우선순위 계산 후 추가 (JavaScript에서 처리)
    if (format === 'summary' && reportData.length > 0) {
      // 모든 제품을 평탄화하고 salesAvg로 정렬
      let allProducts = [];
      
      reportData.forEach(group => {
        if (group.items && Array.isArray(group.items)) {
          group.items.forEach(item => {
            allProducts.push({
              ...item,
              salesAvg: item.salesAvg || 0,
              status: group._id
            });
          });
        }
      });
      
      // salesAvg 기준 내림차순 정렬하여 순위 계산
      allProducts.sort((a, b) => (b.salesAvg || 0) - (a.salesAvg || 0));
      
      // 순위와 우선순위 추가
      allProducts = allProducts.map((item, index) => {
        const rank = index + 1;
        const priority = rank <= 20 ? 'high' : rank <= 60 ? 'medium' : 'low';
        
        return {
          ...item,
          rank,
          priority
        };
      });
      
      // 다시 status별로 그룹화
      const groupedByStatus = {};
      allProducts.forEach(item => {
        const status = item.status;
        if (!groupedByStatus[status]) {
          groupedByStatus[status] = {
            _id: status,
            items: [],
            count: 0,
            totalValue: 0,
            highPriorityCount: 0,
            mediumPriorityCount: 0,
            lowPriorityCount: 0
          };
        }
        
        // salesAvg와 status 제거 후 items에 추가
        const { salesAvg, status: itemStatus, ...cleanItem } = item;
        groupedByStatus[status].items.push(cleanItem);
        groupedByStatus[status].count++;
        groupedByStatus[status].totalValue += (cleanItem.estimatedStock || 0) * (cleanItem.price || 0);
        
        // 우선순위별 카운트
        if (cleanItem.priority === 'high') groupedByStatus[status].highPriorityCount++;
        else if (cleanItem.priority === 'medium') groupedByStatus[status].mediumPriorityCount++;
        else groupedByStatus[status].lowPriorityCount++;
      });
      
      // 최종 reportData 업데이트
      reportData.length = 0;
      reportData.push(...Object.values(groupedByStatus));
    }

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
