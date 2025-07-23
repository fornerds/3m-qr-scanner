const { connectToDatabase } = require('./config/database');

// 기존 제품 데이터 import (ES6 → CommonJS 변환 필요)
// src/data/products.js의 전체 제품 데이터 사용
let DAISO_PRODUCTS = [];

// 동적으로 제품 데이터 로드
async function loadProductData() {
  try {
    // ES6 모듈을 동적으로 import
    const { DAISO_PRODUCTS: products } = await import('../src/data/products.js');
    DAISO_PRODUCTS = products;
    console.log(`${DAISO_PRODUCTS.length}개 제품 데이터 로드 완료`);
  } catch (error) {
    console.error('제품 데이터 로드 실패:', error);
    // fallback: 기본 제품 몇 개만 사용
    DAISO_PRODUCTS = [
      {
        "sku": "56169",
        "name": "POST-IT노트(656 노랑)",
        "category": "사무문구포장부",
        "subCategory": "문구/팬시 > 사무문구 > 사무메모",
        "price": 1000,
        "salesRep": "JW Park",
        "salesAvg": 22712
      }
    ];
    console.log('Fallback: 기본 제품 데이터 사용');
  }
}

// 제품 DB 초기화 API
module.exports = async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { force = false } = req.body;
      
      // 제품 데이터 먼저 로드
      await loadProductData();
      
      const { db } = await connectToDatabase();
      const collection = db.collection('products');
      
      // 기존 데이터 확인
      const existingCount = await collection.countDocuments();
      
      if (existingCount > 0 && !force) {
        return res.status(200).json({
          success: true,
          message: '제품 데이터가 이미 존재합니다. force: true로 재초기화 가능합니다.',
          existingCount: existingCount
        });
      }
      
      // 기존 데이터 삭제 (force가 true인 경우)
      if (force && existingCount > 0) {
        await collection.deleteMany({});
        console.log('기존 제품 데이터 삭제 완료');
      }
      
      // 제품 데이터에 메타데이터 추가
      const productsWithMeta = DAISO_PRODUCTS.map((product, index) => ({
        ...product,
        createdAt: new Date(),
        updatedAt: new Date(),
        active: true,
        displayOrder: index + 1
      }));
      
      // 제품 데이터 삽입
      const result = await collection.insertMany(productsWithMeta);
      
      console.log(`${result.insertedCount}개의 제품 데이터 초기화 완료`);
      
      res.status(200).json({
        success: true,
        message: '제품 데이터 초기화 완료',
        insertedCount: result.insertedCount,
        products: productsWithMeta.length
      });
      
    } catch (error) {
      console.error('제품 초기화 오류:', error);
      res.status(500).json({
        success: false,
        message: '제품 초기화 중 오류가 발생했습니다.',
        error: error.message
      });
    }
  } else if (req.method === 'GET') {
    // 현재 제품 데이터 상태 확인
    try {
      // 제품 데이터 먼저 로드
      await loadProductData();
      
      const { db } = await connectToDatabase();
      const collection = db.collection('products');
      
      const count = await collection.countDocuments();
      const sampleProducts = await collection.find({}).limit(5).toArray();
      
      res.status(200).json({
        success: true,
        productCount: count,
        availableProducts: DAISO_PRODUCTS.length,
        initialized: count > 0,
        sampleProducts: sampleProducts
      });
      
    } catch (error) {
      console.error('제품 상태 확인 오류:', error);
      res.status(500).json({
        success: false,
        message: '제품 상태 확인 중 오류가 발생했습니다.',
        error: error.message
      });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }
}; 