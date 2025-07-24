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
    
    // 모든 제품을 반환하고 클라이언트에서 필터링 (성능 최적화)
    const sampleProducts = allProducts.map((product, index) => {
      return {
        productCode: product.sku,
        productName: product.name,
        category: product.category,
        salesAvg: product.salesAvg,
        status: 'not_displayed', // 기본값, 클라이언트에서 계산
        priority: getProductImportance(index + 1), // 이미 정렬된 상태이므로 인덱스 + 1이 순위
        rank: index + 1
      };
    });
    
    return { 
      products: sampleProducts,
      scannedProductCodes: scannedProductCodes // 클라이언트 필터링용
    };
  } catch (error) {
    console.error('제품 상태 데이터 생성 오류:', error);
    return { products: [] };
  }
};

// 제품 중요도 계산 함수 (배치 처리)
const getProductImportance = (rank) => {
  if (rank <= 80) return 'high';
  if (rank <= 130) return 'medium';
  return 'low';
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
      
      // 제품 데이터 처리 (이미 우선순위가 계산되어 있음)
      const products = storeData.products.map((product) => {
        return {
          ...product,
          isAutoDetected: product.status === 'displayed'
        };
      });
      
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