const { connectToDatabase } = require('./config/database');

// 스캔 세션 관리 API (MongoDB 연동)
module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { storeId } = req.query;
      console.log('세션 조회 요청, storeId:', storeId);
      
      const { db } = await connectToDatabase();
      const collection = db.collection('sessions');
      
      const query = { status: 'completed' };
      if (storeId) {
        query.storeId = storeId;
      }
      
      const sessions = await collection.find(query)
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
      const sessionData = req.body;
      console.log('세션 저장 요청:', sessionData);
      
      const { db } = await connectToDatabase();
      const collection = db.collection('sessions');
      
      const sessionCount = await collection.countDocuments();
      const newSession = {
        ...sessionData,
        _id: String(sessionCount + 1),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await collection.insertOne(newSession);
      
      res.status(201).json({ 
        success: true, 
        sessionId: newSession._id,
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
      console.log('세션 업데이트 요청, sessionId:', sessionId);
      
      const { db } = await connectToDatabase();
      const collection = db.collection('sessions');
      
      const result = await collection.updateOne(
        { _id: sessionId },
        { 
          $set: {
            ...updateData,
            updatedAt: new Date()
          }
        }
      );
      
      if (result.matchedCount > 0) {
        res.status(200).json({ 
          success: true, 
          message: '세션이 업데이트되었습니다.'
        });
      } else {
        res.status(404).json({ 
          success: false, 
          message: '세션을 찾을 수 없습니다.'
        });
      }
    } catch (error) {
      console.error('세션 업데이트 오류:', error);
      res.status(500).json({ error: '세션 업데이트 실패' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}; 