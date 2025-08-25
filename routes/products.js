const express = require('express');
const router = express.Router();
const { connectToDatabase } = require('../config/database');
const { ObjectId } = require('mongodb');
const multer = require('multer');
const XLSX = require('xlsx');

// Multer 설정 - 메모리에 파일 저장 (최적화)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB 제한
    files: 1 // 단일 파일만
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    
    if (allowedTypes.includes(file.mimetype) || 
        file.originalname.match(/\.(xlsx|xls)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Excel 파일만 업로드 가능합니다.'), false);
    }
  }
});

// 📦 전체 제품 목록 조회 (페이징, 필터링, 정렬 최적화)
router.get('/', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      category = '',
      subCategory = '',
      sortBy = 'displayOrder',
      sortOrder = 'asc',
      active = 'true',
      importance = '' // 중요도 필터
    } = req.query;
    
    console.log('📦 제품 목록 조회:', { page, limit, search, category });

    const { db } = await connectToDatabase();

    // 🚀 Aggregation으로 고성능 검색 및 필터링
    const pipeline = [];

    // 매치 조건 구성
    const matchStage = {};
    
    if (active !== 'all') {
      matchStage.active = active === 'true';
    }
    
    if (search) {
      matchStage.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category) {
      matchStage.category = category;
    }
    
    if (subCategory) {
      matchStage.subCategory = subCategory;
    }

    pipeline.push({ $match: matchStage });

    // 중요도 계산 필드 추가
    pipeline.push({
      $addFields: {
        importance: {
          $switch: {
            branches: [
              { case: { $lte: ['$salesAvg', 80] }, then: 'high' },
              { case: { $lte: ['$salesAvg', 130] }, then: 'medium' }
            ],
            default: 'low'
          }
        }
      }
    });

    // 중요도 필터링
    if (importance) {
      pipeline.push({ $match: { importance } });
    }

    // 정렬
    const sortStage = {};
    sortStage[sortBy] = sortOrder === 'desc' ? -1 : 1;
    pipeline.push({ $sort: sortStage });

    // 전체 개수 계산용 파이프라인
    const countPipeline = [...pipeline, { $count: 'total' }];

    // 페이징 적용
    const skip = (parseInt(page) - 1) * parseInt(limit);
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: parseInt(limit) });

    // 병렬로 데이터와 총 개수 조회
    const [products, countResult] = await Promise.all([
      db.collection('products').aggregate(pipeline).toArray(),
      db.collection('products').aggregate(countPipeline).toArray()
    ]);

    const totalCount = countResult[0]?.total || 0;
    const responseTime = Date.now() - startTime;

    console.log(`✅ 제품 조회 완료 (${responseTime}ms): ${products.length}개 / 전체 ${totalCount}개`);

    res.json({
      success: true,
      data: products,
      products: products, // 기존 호환성을 위해 추가
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalCount,
        limit: parseInt(limit),
        hasNext: skip + parseInt(limit) < totalCount,
        hasPrev: parseInt(page) > 1
      },
      filters: {
        search, category, subCategory, active, importance
      },
      responseTime
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`❌ 제품 조회 오류 (${responseTime}ms):`, error);
    
    res.status(500).json({
      success: false,
      error: 'PRODUCTS_FETCH_ERROR',
      message: '제품 조회 중 오류가 발생했습니다.',
      responseTime
    });
  }
});

// 🔍 SKU로 제품 조회 (캐싱 적용)
router.get('/sku/:sku', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { sku } = req.params;
    console.log(`🔍 SKU 제품 조회: ${sku}`);

    const { db } = await connectToDatabase();
    
    const product = await db.collection('products').findOne({ 
      sku: String(sku) 
    });

    const responseTime = Date.now() - startTime;

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'PRODUCT_NOT_FOUND',
        message: '해당 SKU의 제품을 찾을 수 없습니다.',
        sku,
        responseTime
      });
    }

    // 중요도 계산
    const importance = product.salesAvg <= 80 ? 'high' : 
                      product.salesAvg <= 130 ? 'medium' : 'low';

    console.log(`✅ SKU 제품 조회 완료 (${responseTime}ms)`);

    res.json({
      success: true,
      data: {
        ...product,
        importance
      },
      product: { // 기존 호환성을 위해 추가
        ...product,
        importance
      },
      responseTime
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`❌ SKU 제품 조회 오류 (${responseTime}ms):`, error);
    
    res.status(500).json({
      success: false,
      error: 'PRODUCT_FETCH_ERROR',
      message: '제품 조회 중 오류가 발생했습니다.',
      responseTime
    });
  }
});

// 📁 카테고리 목록 조회 (집계 최적화)
router.get('/categories/list', async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('📁 카테고리 목록 조회');

    const { db } = await connectToDatabase();
    
    // 🚀 단일 Aggregation으로 카테고리 통계 생성
    const categories = await db.collection('products').aggregate([
      { $match: { active: { $ne: false } } },
      {
        $group: {
          _id: {
            category: '$category',
            subCategory: '$subCategory'
          },
          count: { $sum: 1 },
          avgSalesAvg: { $avg: '$salesAvg' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' }
        }
      },
      {
        $group: {
          _id: '$_id.category',
          subCategories: {
            $push: {
              name: '$_id.subCategory',
              count: '$count',
              avgSales: { $round: ['$avgSalesAvg', 0] },
              priceRange: {
                min: '$minPrice',
                max: '$maxPrice'
              }
            }
          },
          totalCount: { $sum: '$count' },
          avgSales: { $avg: '$avgSalesAvg' }
        }
      },
      {
        $project: {
          _id: 0,
          name: '$_id',
          count: '$totalCount',
          avgSales: { $round: ['$avgSales', 0] },
          subCategories: {
            $sortArray: {
              input: '$subCategories',
              sortBy: { count: -1 }
            }
          }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();

    const responseTime = Date.now() - startTime;
    console.log(`✅ 카테고리 조회 완료 (${responseTime}ms): ${categories.length}개`);
    
    res.json({
      success: true,
      data: categories,
      responseTime,
      totalCategories: categories.length,
      totalSubCategories: categories.reduce((sum, cat) => sum + cat.subCategories.length, 0)
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`❌ 카테고리 조회 오류 (${responseTime}ms):`, error);
    
    res.status(500).json({
      success: false,
      error: 'CATEGORIES_FETCH_ERROR',
      message: '카테고리 조회 중 오류가 발생했습니다.',
      responseTime
    });
  }
});

// 📤 제품 업로드 (엑셀 파일, 성능 최적화)
router.post('/upload', upload.single('file'), async (req, res) => {
  const startTime = Date.now();
  
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'NO_FILE',
      message: '파일을 선택해주세요.'
    });
  }

  try {
    console.log('📤 제품 엑셀 업로드 시작:', req.file.originalname);

    const { db } = await connectToDatabase();

    // 엑셀 파일 처리 (최적화된 버전)
    const products = await processExcelFileOptimized(req.file.buffer);
    
    if (products.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'NO_VALID_DATA',
        message: '유효한 제품 데이터가 없습니다.'
      });
    }

    console.log(`📊 처리된 제품 개수: ${products.length}`);

    // 🚀 Bulk 연산으로 성능 최적화
    const bulkOps = products.map(product => ({
      updateOne: {
        filter: { sku: product.sku },
        update: {
          $set: {
            ...product,
            updatedAt: new Date()
          },
          $setOnInsert: {
            createdAt: new Date()
          }
        },
        upsert: true
      }
    }));

    const result = await db.collection('products').bulkWrite(bulkOps, {
      ordered: false // 병렬 처리로 성능 향상
    });

    const responseTime = Date.now() - startTime;
    console.log(`✅ 제품 업로드 완료 (${responseTime}ms)`);

    res.json({
      success: true,
      message: '제품 리스트가 성공적으로 업로드되었습니다.',
      summary: {
        totalProcessed: products.length,
        inserted: result.upsertedCount,
        updated: result.modifiedCount,
        errors: result.writeErrors?.length || 0
      },
      responseTime
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`❌ 제품 업로드 오류 (${responseTime}ms):`, error);
    
    res.status(500).json({
      success: false,
      error: 'PRODUCT_UPLOAD_ERROR',
      message: error.message || '제품 업로드 중 오류가 발생했습니다.',
      responseTime
    });
  }
});

// 🚀 최적화된 엑셀 파일 처리 함수
async function processExcelFileOptimized(buffer) {
  try {
    const workbook = XLSX.read(buffer, { 
      type: 'buffer',
      cellStyles: false, // 스타일 정보 무시로 성능 향상
      cellHTML: false,
      cellDates: false
    });
    
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // 대용량 데이터 처리 최적화
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      defval: '', // 기본값 설정
      blankrows: false // 빈 행 제거
    });
    
    if (jsonData.length <= 1) {
      throw new Error('데이터가 없거나 헤더만 있습니다.');
    }

    const dataRows = jsonData.slice(1);
    console.log(`📊 원본 데이터 행 수: ${dataRows.length}`);
    
    // 🚀 병렬 처리로 데이터 변환 최적화
    const products = [];
    const batchSize = 1000;
    
    for (let i = 0; i < dataRows.length; i += batchSize) {
      const batch = dataRows.slice(i, i + batchSize);
      const batchProducts = batch
        .map((row, index) => {
          try {
            const sku = String(row[5] || '').trim();
            const name = String(row[6] || '').trim();
            const category = String(row[1] || '').trim();
            const subCategory = String(row[2] || '').trim();
            
            // 유효성 검사
            if (!sku || !name || !sku.match(/^[0-9]+$/)) {
              return null;
            }
            
            return {
              sku,
              name,
              category,
              subCategory,
              price: parseInt(String(row[7] || '').replace(/,/g, '')) || 0,
              salesAvg: parseInt(String(row[8] || '').replace(/,/g, '')) || 0,
              salesRep: 'JW Park',
              active: true,
              displayOrder: i + index + 1,
              updatedAt: new Date()
            };
          } catch (error) {
            console.warn(`행 ${i + index + 2} 처리 오류:`, error.message);
            return null;
          }
        })
        .filter(Boolean);
      
      products.push(...batchProducts);
    }
    
    console.log(`✅ 유효한 제품 데이터: ${products.length}개`);
    return products;
    
  } catch (error) {
    console.error('엑셀 파일 처리 오류:', error);
    throw new Error(`엑셀 파일 처리 실패: ${error.message}`);
  }
}

module.exports = router;
