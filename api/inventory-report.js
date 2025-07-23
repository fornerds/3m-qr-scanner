const { connectToDatabase } = require('./config/database');

// 동적 제품 상태 데이터 생성 (MongoDB 연동)
const generateProductStatusData = async (storeId) => {
  try {
    const { db } = await connectToDatabase();
    const productsCollection = db.collection('products');
    
    // 모든 제품 가져오기
    const allProducts = await productsCollection.find({})
      .sort({ salesAvg: -1 })
      .toArray();
    
    // 스캔된 제품 코드 목록 조회
    const scanRecordsCollection = db.collection('scan_records');
    const scannedProductCodes = await scanRecordsCollection.distinct('productCode', { storeId: storeId });
    
    // 제품별 실제 상태 설정 (스캔 기록 기반)
    const sampleProducts = allProducts.map((product) => {
      const isScanned = scannedProductCodes.includes(product.sku);
      
      return {
        productCode: product.sku,
        productName: product.name,
        category: product.category,
        salesAvg: product.salesAvg,
        status: isScanned ? 'displayed' : 'not_displayed',
        priority: 'medium' // 기본 우선순위
      };
    });
    
    return { products: sampleProducts };
  } catch (error) {
    console.error('제품 상태 데이터 생성 오류:', error);
    return { products: [] };
  }
};

// 제품 중요도 계산 함수 (MongoDB 기반)
const getProductImportance = async (productSku) => {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('products');
    
    // 모든 제품을 판매량 기준으로 정렬하여 순위 계산
    const allProducts = await collection.find({}).sort({ salesAvg: -1 }).toArray();
    
    // 제품의 순위 찾기 (1부터 시작)
    const rank = allProducts.findIndex(product => product.sku === productSku) + 1;
    
    if (rank === 0) return 'medium';
    if (rank <= 80) return 'high';
    if (rank <= 130) return 'medium';
    return 'low';
  } catch (error) {
    console.error('제품 중요도 계산 오류:', error);
    return 'medium';
  }
};

// 재고 보고서 API
module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { storeId } = req.query;
      console.log('재고 보고서 조회 요청, storeId:', storeId);
      
      // 매장 정보 MongoDB에서 조회
      const { db } = await connectToDatabase();
      let storeInfo = {
        id: storeId || '1',
        name: '매장 정보 없음',
        address: '주소 정보 없음'
      };
      
      try {
        const storesCollection = db.collection('stores');
        const store = await storesCollection.findOne({ _id: storeId });
        if (store) {
          storeInfo = {
            id: store._id,
            name: store.name,
            address: store.address
          };
        }
      } catch (error) {
        console.error('매장 정보 조회 오류:', error);
      }
      
      // 동적으로 제품 상태 데이터 생성
      const storeData = await generateProductStatusData(storeId);
      
      // 이미 storeData에서 스캔 기록을 고려한 상태가 설정됨
      
      // 제품 데이터 처리 및 우선순위 계산
      const products = await Promise.all(
        storeData.products.map(async (product) => {
          return {
            ...product,
            priority: await getProductImportance(product.productCode),
            isAutoDetected: product.status === 'displayed'
          };
        })
      );
      
      // 통계 계산
      const summary = {
        totalProducts: products.length,
        notDisplayedCount: products.filter(p => p.status === 'not_displayed').length,
        displayedCount: products.filter(p => p.status === 'displayed').length,
        generatedAt: new Date().toISOString()
      };
      
      const report = {
        storeInfo,
        products,
        summary
      };
      
      res.status(200).json(report);
    } catch (error) {
      console.error('재고 보고서 조회 오류:', error);
      res.status(500).json({ 
        success: false, 
        message: '재고 보고서를 가져올 수 없습니다.' 
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}; 