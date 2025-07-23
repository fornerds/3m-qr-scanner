const { connectToDatabase } = require('./config/database');

// 제품 중요도 계산 함수 (MongoDB 기반)
const getProductImportance = async (productSku) => {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('products');
    
    // 모든 제품을 판매량 기준으로 정렬하여 순위 계산
    const allProducts = await collection.find({}).sort({ salesAvg: -1 }).toArray();
    
    // 제품의 순위 찾기 (1부터 시작)
    const rank = allProducts.findIndex(product => product.sku === productSku) + 1;
    
    if (rank === 0) {
      return 'medium'; // 제품을 찾을 수 없으면 보통으로 처리
    }
    
    // 중요도 판단
    if (rank <= 80) {
      return 'high';      // 1-80위: 높음
    } else if (rank <= 130) {
      return 'medium';    // 81-130위: 보통
    } else {
      return 'low';       // 131-150위: 낮음
    }
  } catch (error) {
    console.error('제품 중요도 계산 오류:', error);
    return 'medium';
  }
};

// 동적 재고 데이터 생성 (MongoDB 연동)
const generateInventoryData = async (storeId) => {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('scan_records');
    
    // 실제 스캔 기록 조회
    const scannedItems = await collection.countDocuments({ storeId: storeId });
    
    // 최근 스캔 10개만 가져오기 (더 많은 데이터 표시)
    const recentScansData = await collection.find({ storeId: storeId })
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray();
    
    const recentScans = recentScansData.map(scan => ({
      productCode: scan.productCode,
      productName: scan.productName,
      timestamp: scan.timestamp
    }));
    
    // MongoDB에서 전체 제품 수 조회
    const { db: productDb } = await connectToDatabase();
    const productsCollection = productDb.collection('products');
    
    const totalItems = await productsCollection.countDocuments();
    const progress = totalItems > 0 ? Math.round((scannedItems / totalItems) * 100) : 0;
    
    // 스캔되지 않은 제품들을 미진열로 분류
    const scannedProductCodes = await collection.find({ storeId: storeId }).distinct('productCode');
    const notDisplayedProducts = await productsCollection.find({
      sku: { $nin: scannedProductCodes }
    }).sort({ salesAvg: -1 }).toArray();
    
    // 미진열 제품들의 중요도 계산
    const sampleNotDisplayedItems = await Promise.all(
      notDisplayedProducts.map(async (product) => ({
        productCode: product.sku,
        productName: product.name,
        category: product.category,
        status: 'not_displayed',
        priority: await getProductImportance(product.sku),
        rank: 0, // 순위는 getProductImportance에서 계산됨
        salesAvg: product.salesAvg
      }))
    );
    
    return {
      totalItems,
      scannedItems,
      notDisplayedItems: notDisplayedProducts.length, // 실제 미진열 제품 수
      progress,
      recentScans,
      notDisplayedProducts: sampleNotDisplayedItems
    };
  } catch (error) {
    console.error('재고 데이터 생성 오류:', error);
    return {
      totalItems: 0,
      scannedItems: 0,
      notDisplayedItems: 0,
      progress: 0,
      recentScans: [],
      notDisplayedProducts: []
    };
  }
};

// 재고 현황 조회 API
module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { storeId } = req.query;
      console.log('재고 조회 요청, storeId:', storeId);
      
      // 동적으로 재고 데이터 생성
      let inventory = await generateInventoryData(storeId || '1');
      
      // 스캔 기록 조회하여 진열 상태 자동 업데이트
      let scannedProductCodes = new Set();
      try {
        const { db } = await connectToDatabase();
        const collection = db.collection('scan_records');
        const scannedProducts = await collection.find({ storeId: storeId }).toArray();
        scannedProductCodes = new Set(scannedProducts.map(scan => scan.productCode));
      } catch (error) {
        console.error('스캔 기록 조회 실패:', error);
      }
      
      // 판매량 기준으로 priority 재계산 및 진열 상태 자동 판단
      if (inventory.notDisplayedProducts) {
        inventory.notDisplayedProducts = await Promise.all(
          inventory.notDisplayedProducts
            .filter(item => !scannedProductCodes.has(item.productCode)) // 스캔된 것은 제외
            .map(async item => ({
              ...item,
              priority: await getProductImportance(item.productCode)
            }))
        );
      }
      
      res.status(200).json(inventory);
    } catch (error) {
      console.error('재고 조회 오류:', error);
      
      // 오류 시 기본 데이터 반환
      const fallbackInventory = await generateInventoryData('1');
      res.status(200).json(fallbackInventory);
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}; 