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

// 데이터베이스 연결 테스트 API
export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const db = await connectToDatabase();
      
      // 데이터베이스 상태 확인
      const adminDb = global.mongoClient.db('admin');
      const serverStatus = await adminDb.command({ serverStatus: 1 });
      
      // 컬렉션 정보 조회
      const collections = await db.listCollections().toArray();
      
      // 매장 데이터 개수 확인
      const storesCount = await db.collection('stores').countDocuments();
      
      // 세션 데이터 개수 확인
      const sessionsCount = await db.collection('scan_sessions').countDocuments();
      
      const testResult = {
        status: 'success',
        message: 'MongoDB Atlas 연결 성공!',
        timestamp: new Date().toISOString(),
        database: {
          name: '3m-qr-scanner',
          collections: collections.map(col => col.name),
          stats: {
            stores: storesCount,
            sessions: sessionsCount
          }
        },
        server: {
          version: serverStatus.version,
          uptime: serverStatus.uptime,
          connections: serverStatus.connections
        }
      };
      
      res.status(200).json(testResult);
    } catch (error) {
      console.error('데이터베이스 테스트 오류:', error);
      res.status(500).json({
        status: 'error',
        message: 'MongoDB Atlas 연결 실패',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 