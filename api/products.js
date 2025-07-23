const { connectToDatabase } = require('./config/database');

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
      const { sku } = req.query;
      
      const { db } = await connectToDatabase();
      const collection = db.collection('products');
      
      if (sku) {
        // 특정 제품 삭제
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