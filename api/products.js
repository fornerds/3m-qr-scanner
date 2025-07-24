const { connectToDatabase } = require('./config/database');
const multer = require('multer');
const XLSX = require('xlsx');

// Multer 설정 - 메모리에 파일 저장
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB 제한
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        file.mimetype === 'application/vnd.ms-excel' ||
        file.originalname.endsWith('.xlsx') ||
        file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('Excel 파일만 업로드 가능합니다.'), false);
    }
  }
});

// 엑셀 파일 처리 함수
const processExcelFile = (buffer) => {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // 엑셀 데이터를 JSON으로 변환
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // 헤더 행 제거하고 데이터만 추출
    const headers = jsonData[0];
    const dataRows = jsonData.slice(1);
    
    // 디버깅: 원본 데이터 확인
    console.log('원본 헤더:', headers);
    console.log('원본 데이터 샘플 (처음 3행):', dataRows.slice(0, 3));
    
    // 이미지에서 보이는 컬럼 구조에 맞춰 매핑
    const products = dataRows
      .filter(row => {
        // 빈 행 제거
        if (!row || row.length < 7) {
          console.log('빈 행 또는 컬럼 부족:', row);
          return false;
        }
        
        const sku = String(row[3] || '');
        const name = String(row[4] || '');
        
        // 기본적인 유효성 검사만 수행
        if (!sku || !name || sku.trim() === '' || name.trim() === '') {
          console.log('빈 SKU 또는 이름 필터링:', { sku, name });
          return false;
        }
        
        // 헤더 행만 제거
        if (sku === 'DAISO SKU ID' || name === 'DAISO SKU Name') {
          console.log('헤더 행 필터링:', { sku, name });
          return false;
        }
        
        // 모든 데이터를 허용 (디버깅용)
        console.log('유효한 데이터:', { sku, name });
        return true;
      })
              .map((row, index) => {
          // 숫자에서 쉼표 제거 후 변환
          const priceStr = String(row[5] || '').replace(/,/g, '');
          const salesAvgStr = String(row[6] || '').replace(/,/g, '');
          
          return {
            sku: String(row[3] || '').trim(), // DAISO SKU ID
            name: String(row[4] || '').trim(), // DAISO SKU Name
            category: String(row[1] || '').trim(), // 다이소 대분류
            subCategory: String(row[2] || '').trim(), // 다이소 소분류
            price: parseInt(priceStr) || 0, // 판매가 (VAT+)
            salesAvg: parseInt(salesAvgStr) || 0, // 6YTD AVG
            salesRep: 'JW Park', // 기본값
            active: true,
            displayOrder: index + 1,
            createdAt: new Date(),
            updatedAt: new Date()
          };
        });
    
    return products;
  } catch (error) {
    console.error('엑셀 파일 처리 오류:', error);
    throw new Error('엑셀 파일을 처리할 수 없습니다.');
  }
};

// 제품 API (MongoDB 연동)
module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { sku, category, importance, search } = req.query;
      
      const { db } = await connectToDatabase();
      const collection = db.collection('products');
      
      // 조회 조건 설정
      const query = {};
      
      if (sku) {
        query.sku = sku;
      }
      
      if (category) {
        query.category = { $regex: category, $options: 'i' };
      }
      
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { sku: { $regex: search, $options: 'i' } }
        ];
      }
      
      let products = await collection.find(query).toArray();
      
      // 중요도 필터링 (클라이언트에서 계산)
      if (importance) {
        products = products.filter(product => {
          const productImportance = getProductImportance(product.sku, products);
          return productImportance === importance;
        });
      }
      
      // SKU로 단일 제품 조회인 경우
      if (sku && products.length > 0) {
        return res.status(200).json({
          success: true,
          product: products[0]
        });
      }
      
      res.status(200).json({
        success: true,
        products: products,
        total: products.length
      });
      
    } catch (error) {
      console.error('제품 조회 오류:', error);
      res.status(500).json({
        success: false,
        message: '제품 조회 중 오류가 발생했습니다.'
      });
    }
  } else if (req.method === 'POST') {
    try {
      const products = req.body;
      
      const { db } = await connectToDatabase();
      const collection = db.collection('products');
      
      // 단일 제품 또는 배열 처리
      const productsArray = Array.isArray(products) ? products : [products];
      
      // 기존 제품 확인 및 업서트
      const bulkOps = productsArray.map(product => ({
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
      
      const result = await collection.bulkWrite(bulkOps);
      
      res.status(200).json({
        success: true,
        message: '제품 등록/업데이트 완료',
        inserted: result.upsertedCount,
        modified: result.modifiedCount,
        total: productsArray.length
      });
      
    } catch (error) {
      console.error('제품 등록 오류:', error);
      res.status(500).json({
        success: false,
        message: '제품 등록 중 오류가 발생했습니다.'
      });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { sku, id } = req.query;
      
      const { db } = await connectToDatabase();
      const collection = db.collection('products');
      
      if (id) {
        // ID로 특정 제품 삭제
        const result = await collection.deleteOne({ _id: id });
        
        if (result.deletedCount > 0) {
          res.status(200).json({
            success: true,
            message: '제품이 삭제되었습니다.'
          });
        } else {
          res.status(404).json({
            success: false,
            message: '제품을 찾을 수 없습니다.'
          });
        }
      } else if (sku) {
        // SKU로 특정 제품 삭제
        const result = await collection.deleteOne({ sku: sku });
        
        if (result.deletedCount > 0) {
          res.status(200).json({
            success: true,
            message: '제품이 삭제되었습니다.'
          });
        } else {
          res.status(404).json({
            success: false,
            message: '제품을 찾을 수 없습니다.'
          });
        }
      } else {
        // 모든 제품 삭제
        const result = await collection.deleteMany({});
        
        res.status(200).json({
          success: true,
          message: `${result.deletedCount}개의 제품이 삭제되었습니다.`
        });
      }
      
    } catch (error) {
      console.error('제품 삭제 오류:', error);
      res.status(500).json({
        success: false,
        message: '제품 삭제 중 오류가 발생했습니다.'
      });
    }
  } else if (req.method === 'PUT') {
    // 파일 업로드 처리
    console.log('PUT 요청 시작 - 파일 업로드');
    
    upload.single('file')(req, res, async (err) => {
      console.log('multer 처리 완료, err:', err);
      
      if (err) {
        console.error('파일 업로드 오류:', err);
        return res.status(400).json({ 
          success: false, 
          message: err.message || '파일 업로드 중 오류가 발생했습니다.' 
        });
      }

      console.log('req.file 확인:', req.file ? '파일 있음' : '파일 없음');
      if (req.file) {
        console.log('파일 정보:', {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size
        });
      }

      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: '파일이 선택되지 않았습니다.' 
        });
      }

      try {
        console.log('파일 업로드 시작:', req.file.originalname);
        
        // 엑셀 파일 처리
        console.log('엑셀 파일 처리 시작');
        let products;
        try {
          products = processExcelFile(req.file.buffer);
          console.log('엑셀 파일 처리 완료, 제품 수:', products.length);
        } catch (excelError) {
          console.error('엑셀 파일 처리 중 오류:', excelError);
          return res.status(400).json({ 
            success: false, 
            message: `엑셀 파일 처리 중 오류: ${excelError.message}` 
          });
        }
        
        if (products.length === 0) {
          return res.status(400).json({ 
            success: false, 
            message: '유효한 제품 데이터가 없습니다.' 
          });
        }

        console.log(`처리된 제품 수: ${products.length}개`);
        
        // 디버깅: 처음 몇 개 제품 출력
        if (products.length > 0) {
          console.log('처리된 제품 샘플:', products.slice(0, 3));
        }

        // 데이터베이스 연결
        const { db } = await connectToDatabase();
        const collection = db.collection('products');

        // 기존 제품 SKU 목록 조회 (중복 체크용)
        const existingSkus = await collection.distinct('sku');
        const existingSkuSet = new Set(existingSkus);

        // 중복 제거 및 새 제품 분류
        const newProducts = [];
        const updatedProducts = [];

        for (const product of products) {
          if (existingSkuSet.has(product.sku)) {
            // 기존 제품 업데이트
            updatedProducts.push(product);
          } else {
            // 새 제품 추가
            newProducts.push(product);
          }
        }

        let insertResult = null;
        let updateResult = null;

        // 새 제품 추가
        if (newProducts.length > 0) {
          insertResult = await collection.insertMany(newProducts);
          console.log(`새 제품 추가: ${insertResult.insertedCount}개`);
        }

        // 기존 제품 업데이트
        if (updatedProducts.length > 0) {
          const bulkOps = updatedProducts.map(product => ({
            updateOne: {
              filter: { sku: product.sku },
              update: { 
                $set: {
                  name: product.name,
                  category: product.category,
                  subCategory: product.subCategory,
                  price: product.price,
                  salesAvg: product.salesAvg,
                  salesRep: product.salesRep,
                  active: product.active,
                  displayOrder: product.displayOrder,
                  updatedAt: new Date()
                }
              }
            }
          }));

          updateResult = await collection.bulkWrite(bulkOps);
          console.log(`제품 업데이트: ${updateResult.modifiedCount}개`);
        }

        const result = {
          success: true,
          message: '제품 리스트가 성공적으로 업로드되었습니다.',
          summary: {
            totalProcessed: products.length,
            newProducts: newProducts.length,
            updatedProducts: updatedProducts.length,
            insertedCount: insertResult?.insertedCount || 0,
            modifiedCount: updateResult?.modifiedCount || 0
          }
        };

        console.log('업로드 완료:', result);
        res.status(200).json(result);

      } catch (error) {
        console.error('제품 업로드 처리 오류:', error);
        res.status(500).json({ 
          success: false, 
          message: '제품 업로드 처리 중 오류가 발생했습니다: ' + error.message 
        });
      }
    });
  } else {
    res.status(405).json({
      success: false,
      message: '지원하지 않는 메소드입니다.'
    });
  }
};

// 제품 중요도 계산 함수
const getProductImportance = (productSku, products) => {
  // 판매량 기준으로 정렬
  const sortedProducts = [...products].sort((a, b) => b.salesAvg - a.salesAvg);
  
  // 제품의 순위 찾기 (1부터 시작)
  const rank = sortedProducts.findIndex(product => product.sku === productSku) + 1;
  
  if (rank === 0) {
    return 'unknown'; // 제품을 찾을 수 없음
  }
  
  // 중요도 판단
  if (rank <= 80) {
    return 'high';      // 1-80위: 높음
  } else if (rank <= 130) {
    return 'medium';    // 81-130위: 보통
  } else {
    return 'low';       // 131-150위: 낮음
  }
}; 