const { connectToDatabase } = require('./config/database');

// 시스템 상태 확인 및 헬스체크 API (MongoDB 연동)
module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    const { action } = req.query;
    
    // 헬스체크
    if (action === 'health') {
      return res.status(200).json({ 
        status: 'ok', 
        message: 'API is working!',
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url
      });
    }
    
    // 시스템 상태 확인 (기본)
    try {
      // MongoDB 연결 테스트
      const { db } = await connectToDatabase();
      
      // 제품 데이터 통계 확인
      const productsCollection = db.collection('products');
      const allProducts = await productsCollection.find({}).toArray();
      
      // 카테고리 통계 계산
      const categories = {};
      allProducts.forEach(product => {
        if (product.category) {
          categories[product.category] = (categories[product.category] || 0) + 1;
        }
      });
      
      // 컬렉션별 문서 수 확인
      const storesCount = await db.collection('stores').countDocuments();
      const scansCount = await db.collection('scan_records').countDocuments();
      const sessionsCount = await db.collection('sessions').countDocuments();
      
      const testResult = {
        status: 'success',
        message: '시스템 상태 확인 완료! (MongoDB 연동)',
        timestamp: new Date().toISOString(),
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          uptime: process.uptime()
        },
        database: {
          connected: true,
          collections: {
            products: allProducts.length,
            stores: storesCount,
            scan_records: scansCount,
            sessions: sessionsCount
          }
        },
        data: {
          products: {
            total: allProducts.length,
            categories: categories,
            topProducts: allProducts.sort((a, b) => b.salesAvg - a.salesAvg).slice(0, 5).map(p => ({
              sku: p.sku,
              name: p.name,
              salesAvg: p.salesAvg
            }))
          }
        },
        apis: {
          products: 'active',
          stores: 'active',
          sessions: 'active',
          inventory: 'active'
        }
      };
      
      res.status(200).json(testResult);
    } catch (error) {
      console.error('시스템 테스트 오류:', error);
      res.status(500).json({
        status: 'error',
        message: '시스템 상태 확인 실패',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}; 