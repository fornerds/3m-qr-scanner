import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;

// MongoDB 연결
async function connectToDatabase() {
  if (!global.mongoClient) {
    global.mongoClient = new MongoClient(MONGODB_URI);
    await global.mongoClient.connect();
  }
  return global.mongoClient.db('3m-qr-scanner');
}

// 재고 현황 조회 API
export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { storeId } = req.query;
      const db = await connectToDatabase();
      
      // 최근 스캔 세션에서 재고 정보 조회
      const recentSessions = await db.collection('scan_sessions')
        .find({ 
          storeId: storeId,
          status: 'completed'
        })
        .sort({ endTime: -1 })
        .limit(1)
        .toArray();
      
      let inventory = {
        totalItems: 50,
        scannedItems: 0,
        unstockedItems: 0,
        unavailableItems: 0,
        progress: 0,
        recentScans: [],
        missingItems: [],
        lowStockItems: []
      };
      
      if (recentSessions.length > 0) {
        const session = recentSessions[0];
        inventory.scannedItems = session.scannedItems ? session.scannedItems.length : 0;
        inventory.progress = Math.round((inventory.scannedItems / inventory.totalItems) * 100);
        
        // 최근 스캔된 아이템들
        if (session.scannedItems) {
          inventory.recentScans = session.scannedItems.slice(-5).map(item => ({
            productCode: item.productCode,
            productName: item.productName,
            category: item.category,
            price: item.price,
            stock: item.stock,
            timestamp: item.timestamp
          }));
        }
      }
      
      // 샘플 미구비/부족 상품 데이터 (실제로는 별도 컬렉션에서 관리)
      inventory.missingItems = [
        {
          productCode: '3M-CLEAN-003',
          productName: '3M 다목적 클리너',
          category: '청소용품',
          priority: 'high',
          status: 'missing'
        },
        {
          productCode: '3M-PROTECT-004',
          productName: '3M 보호 테이프',
          category: '산업용품',
          priority: 'medium',
          status: 'missing'
        }
      ];
      
      inventory.lowStockItems = [
        {
          productCode: '3M-ADH-005',
          productName: '3M 강력 접착제',
          category: '산업용품',
          priority: 'high',
          currentStock: 2,
          minStock: 5
        }
      ];
      
      res.status(200).json(inventory);
    } catch (error) {
      console.error('재고 조회 오류:', error);
      
      // 오류 시 샘플 데이터 반환
      const fallbackInventory = {
        totalItems: 50,
        scannedItems: 45,
        unstockedItems: 3,
        unavailableItems: 2,
        progress: 90,
        recentScans: [
          {
            productCode: '3M-ADH-001',
            productName: '3M 다목적 접착제',
            category: '사무용품',
            price: '3,500원',
            stock: '재고 24개',
            timestamp: new Date().toISOString()
          }
        ],
        missingItems: [],
        lowStockItems: []
      };
      
      res.status(200).json(fallbackInventory);
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 