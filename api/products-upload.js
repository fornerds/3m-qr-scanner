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
    
    // 이미지에서 보이는 컬럼 구조에 맞춰 매핑
    const products = dataRows
      .filter(row => row.length >= 7 && row[0]) // 빈 행 제거
      .map((row, index) => {
        return {
          sku: String(row[3] || ''), // DAISO SKU ID
          name: String(row[4] || ''), // DAISO SKU Name
          category: String(row[1] || ''), // 다이소 대분류
          subCategory: String(row[2] || ''), // 다이소 소분류
          price: parseInt(row[5]) || 0, // 판매가 (VAT+)
          salesAvg: parseInt(row[6]) || 0, // 6YTD AVG
          salesRep: 'JW Park', // 기본값
          active: true,
          displayOrder: index + 1,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      })
      .filter(product => product.sku && product.name); // SKU와 이름이 있는 제품만
    
    return products;
  } catch (error) {
    console.error('엑셀 파일 처리 오류:', error);
    throw new Error('엑셀 파일을 처리할 수 없습니다.');
  }
};

// API 핸들러
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // Multer 미들웨어 실행
  upload.single('file')(req, res, async (err) => {
    if (err) {
      console.error('파일 업로드 오류:', err);
      return res.status(400).json({ 
        success: false, 
        message: err.message || '파일 업로드 중 오류가 발생했습니다.' 
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
      const products = processExcelFile(req.file.buffer);
      
      if (products.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: '유효한 제품 데이터가 없습니다.' 
        });
      }

      console.log(`처리된 제품 수: ${products.length}개`);

      // 데이터베이스 연결
      const { db } = await connectToDatabase();
      const collection = db.collection('products');

      // 기존 제품 SKU 목록 조회 (중복 체크용)
      const existingSkus = await collection.distinct('sku');
      const existingSkuSet = new Set(existingSkus);

      // 중복 제거 및 새 제품 분류
      const newProducts = [];
      const duplicateProducts = [];
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
}; 