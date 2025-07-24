const { connectToDatabase } = require('./config/database');
const fs = require('fs');
const path = require('path');

// 제품 DB 초기화 함수
async function initializeProducts(force = false) {
  try {
    const { db } = await connectToDatabase();
    const productsCollection = db.collection('products');
    
    // products.js 파일 읽어서 제품 데이터 추출
    const productsFilePath = path.join(process.cwd(), 'src', 'data', 'products.js');
    const productsFileContent = fs.readFileSync(productsFilePath, 'utf8');
    
    // export 키워드 제거하고 DAISO_PRODUCTS 추출
    const cleanContent = productsFileContent.replace(/export\s+/g, '');
    let DAISO_PRODUCTS;
    eval(cleanContent);
    
    // 기존 데이터 확인
    const existingCount = await productsCollection.countDocuments();
    
    if (existingCount > 0 && !force) {
      return {
        success: true,
        message: '제품 데이터가 이미 존재합니다. force: true로 재초기화 가능합니다.',
        existingCount: existingCount
      };
    }
    
    // 기존 데이터 삭제 (force가 true인 경우)
    if (force && existingCount > 0) {
      await productsCollection.deleteMany({});
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
    const result = await productsCollection.insertMany(productsWithMeta);
    
    console.log(`${result.insertedCount}개의 제품 데이터 초기화 완료`);
    
    return {
      success: true,
      message: '제품 데이터 초기화 완료',
      insertedCount: result.insertedCount,
      products: productsWithMeta.length
    };
    
  } catch (error) {
    console.error('제품 초기화 오류:', error);
    throw error;
  }
}

// 초기 샘플 데이터 생성 API (MongoDB 연동)
module.exports = async function handler(req, res) {
  if (req.method === 'POST') {
    const { action, force = false } = req.body;
    
    // 제품 초기화 액션
    if (action === 'init-products') {
      try {
        const result = await initializeProducts(force);
        res.status(200).json(result);
      } catch (error) {
        res.status(500).json({
          success: false,
          message: '제품 초기화 중 오류가 발생했습니다.',
          error: error.message
        });
      }
      return;
    }
    
    // 기존 샘플 데이터 생성 로직
    try {
      console.log('초기 샘플 데이터 생성 시작...');
      
      const { db } = await connectToDatabase();
      
      // 1. 제품 데이터 MongoDB에 등록
      const productsCollection = db.collection('products');
      
      // products.js 파일 읽어서 제품 데이터 추출
      const productsFilePath = path.join(process.cwd(), 'src', 'data', 'products.js');
      const productsFileContent = fs.readFileSync(productsFilePath, 'utf8');
      
      // export 키워드 제거하고 DAISO_PRODUCTS 추출
      const cleanContent = productsFileContent.replace(/export\s+/g, '');
      let DAISO_PRODUCTS;
      eval(cleanContent);
      
      // 기존 제품이 있는지 확인
      const existingProductsCount = await productsCollection.countDocuments();
      
      if (existingProductsCount > 0) {
        console.log(`이미 ${existingProductsCount}개의 제품이 등록되어 있습니다. 제품 데이터 추가를 건너뜁니다.`);
        
        res.status(200).json({
          success: true,
          message: `제품 데이터가 이미 존재합니다 (${existingProductsCount}개)`,
          addedProducts: 0,
          existingProducts: existingProductsCount,
          addedScans: 0,
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      // 기존 제품이 없을 때만 새로 추가
      const productsWithMeta = DAISO_PRODUCTS.map(product => ({
        ...product,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      
      const productResult = await productsCollection.insertMany(productsWithMeta);
      console.log(`${productResult.insertedCount}개의 제품 데이터 등록 완료`);
      
      // 2. 스캔 기록 샘플 데이터 추가
      const collection = db.collection('scan_records');
      
      // 샘플 스캔 기록 추가
      const sampleScans = [
        { storeId: '1', productCode: '56169', productName: 'POST-IT노트(656 노랑)', sessionId: 'sample_session_001', timestamp: new Date(), createdAt: new Date() },
        { storeId: '1', productCode: '1005979', productName: '3M플래그인덱스탭(686/24매)', sessionId: 'sample_session_001', timestamp: new Date(), createdAt: new Date() },
        { storeId: '1', productCode: '50056', productName: 'Post-it노트(657노랑)', sessionId: 'sample_session_001', timestamp: new Date(), createdAt: new Date() },
        { storeId: '2', productCode: '50217', productName: '3M 스카치 포장용테이프', sessionId: 'sample_session_002', timestamp: new Date(), createdAt: new Date() },
        { storeId: '3', productCode: '50059', productName: 'Post-it노트(654노랑)', sessionId: 'sample_session_003', timestamp: new Date(), createdAt: new Date() }
      ];
      
      // 기존 샘플 스캔 기록이 있는지 확인
      const existingSampleScans = await collection.countDocuments({ 
        sessionId: { $regex: /^sample_session_/ } 
      });
      
      if (existingSampleScans > 0) {
        console.log(`이미 ${existingSampleScans}개의 샘플 스캔 기록이 있습니다. 스캔 데이터 추가를 건너뜁니다.`);
        // 샘플 스캔 기록이 이미 있으면 추가하지 않음
        var scanResult = { insertedCount: 0 };
      } else {
        // 샘플 스캔 기록이 없을 때만 추가
        var scanResult = await collection.insertMany(sampleScans);
        console.log(`${scanResult.insertedCount}개의 샘플 스캔 기록 추가 완료`);
      }
      
      res.status(200).json({
        success: true,
        message: `초기 샘플 데이터 생성 완료`,
        addedProducts: productResult.insertedCount,
        addedScans: scanResult.insertedCount,
        totalSampleScans: sampleScans.length,
        existingSampleScans: existingSampleScans,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('샘플 데이터 생성 오류:', error);
      res.status(500).json({
        success: false,
        message: '샘플 데이터 생성 실패',
        error: error.message
      });
    }
  } else if (req.method === 'DELETE') {
    // 샘플/테스트 데이터만 삭제 (운영 데이터 보호)
    try {
      const { db } = await connectToDatabase();
      
      // 샘플 스캔 기록만 삭제 (sample_session으로 시작하는 것만)
      const scanDeleteResult = await db.collection('scan_records').deleteMany({
        sessionId: { $regex: /^sample_session_/ }
      });
      
      // 샘플 세션만 삭제
      const sessionDeleteResult = await db.collection('sessions').deleteMany({
        _id: { $regex: /^sample_session_/ }
      });
      
      console.log(`샘플 데이터 삭제 완료: 스캔 ${scanDeleteResult.deletedCount}개, 세션 ${sessionDeleteResult.deletedCount}개`);
      
      res.status(200).json({
        success: true,
        message: '샘플 데이터가 삭제되었습니다 (운영 데이터는 보호됨)',
        deletedScans: scanDeleteResult.deletedCount,
        deletedSessions: sessionDeleteResult.deletedCount,
        note: '제품 데이터와 매장 데이터는 보호되어 삭제되지 않았습니다.',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('샘플 데이터 삭제 오류:', error);
      res.status(500).json({
        success: false,
        message: '샘플 데이터 삭제 실패'
      });
    }
  } else {
    res.setHeader('Allow', ['POST', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}; 