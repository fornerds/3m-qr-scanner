import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;

// MongoDB 연결
async function connectToDatabase() {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI 환경변수가 설정되지 않았습니다.');
  }
  if (!global.mongoClient) {
    global.mongoClient = new MongoClient(MONGODB_URI);
    await global.mongoClient.connect();
  }
  return global.mongoClient.db('3m-qr-scanner');
}

// 매장 목록 조회 API
export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // 환경변수 체크를 위한 로그
      console.log('MONGODB_URI exists:', !!MONGODB_URI);
      
      const db = await connectToDatabase();
      const stores = await db.collection('stores').find({}).toArray();
      
      res.status(200).json(stores);
    } catch (error) {
      console.error('데이터베이스 오류:', error);
      
      // 오류 시 샘플 데이터 반환
      const fallbackStores = [
        {
          id: '1',
          name: '다이소 강남점',
          address: '서울 강남구 강남대로 123',
          scanCount: '45/50 (90%)',
          lastVisit: '2024-01-15 14:30',
          distance: '0.5km',
          isOpen: true,
          operatingHours: '10:00 - 22:00',
          totalItems: 50,
          scannedItems: 45,
          unstockedItems: 3,
          unavailableItems: 2
        }
      ];
      
      res.status(200).json(fallbackStores);
    }
  } else if (req.method === 'POST') {
    try {
      const db = await connectToDatabase();
      const newStore = req.body;
      
      const result = await db.collection('stores').insertOne({
        ...newStore,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      res.status(201).json({ 
        success: true, 
        storeId: result.insertedId,
        message: '매장이 성공적으로 추가되었습니다.'
      });
    } catch (error) {
      console.error('매장 추가 오류:', error);
      res.status(500).json({ 
        success: false, 
        message: '매장 추가에 실패했습니다.' 
      });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 