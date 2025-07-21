// 시스템 상태 확인 API (MongoDB 없이)
module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { findProductBySku, getAllProducts, getProductStats } = require('../src/data/products.js');
      
      // 제품 데이터 통계 확인
      const productStats = getProductStats();
      const allProducts = getAllProducts();
      
      const testResult = {
        status: 'success',
        message: '시스템 상태 확인 완료!',
        timestamp: new Date().toISOString(),
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          uptime: process.uptime()
        },
        data: {
          products: {
            total: allProducts.length,
            categories: productStats.categories,
            stats: productStats
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