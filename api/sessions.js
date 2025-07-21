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

// 스캔 세션 관리 API
export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { storeId } = req.query;
      const db = await connectToDatabase();
      
      const sessions = await db.collection('scan_sessions')
        .find({ 
          storeId: storeId,
          status: 'completed' 
        })
        .sort({ endTime: -1 })
        .limit(10)
        .toArray();
      
      res.status(200).json(sessions);
    } catch (error) {
      console.error('세션 조회 오류:', error);
      res.status(500).json({ error: '세션 조회 실패' });
    }
  } else if (req.method === 'POST') {
    try {
      const db = await connectToDatabase();
      const sessionData = req.body;
      
      const result = await db.collection('scan_sessions').insertOne({
        ...sessionData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      res.status(201).json({ 
        success: true, 
        sessionId: result.insertedId,
        message: '스캔 세션이 저장되었습니다.'
      });
    } catch (error) {
      console.error('세션 저장 오류:', error);
      res.status(500).json({ error: '세션 저장 실패' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { sessionId } = req.query;
      const updateData = req.body;
      
      const db = await connectToDatabase();
      await db.collection('scan_sessions').updateOne(
        { _id: sessionId },
        { 
          $set: {
            ...updateData,
            updatedAt: new Date()
          }
        }
      );
      
      res.status(200).json({ 
        success: true, 
        message: '세션이 업데이트되었습니다.'
      });
    } catch (error) {
      console.error('세션 업데이트 오류:', error);
      res.status(500).json({ error: '세션 업데이트 실패' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 