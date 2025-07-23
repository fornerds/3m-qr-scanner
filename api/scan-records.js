const { connectToDatabase } = require('./config/database');

// 스캔 기록 API (MongoDB 연동)
module.exports = async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { storeId, productCode, productName, sessionId } = req.body;
      
      console.log('스캔 기록 저장 요청:', { storeId, productCode, productName, sessionId });
      
      if (!storeId || !productCode || !productName) {
        return res.status(400).json({
          success: false,
          message: '필수 정보가 누락되었습니다.'
        });
      }

      const { db } = await connectToDatabase();
      const collection = db.collection('scan_records');
      
      // 중복 스캔 확인 (같은 세션에서 같은 제품)
      const existingScan = await collection.findOne({
        storeId: storeId,
        productCode: productCode,
        sessionId: sessionId || 'unknown'
      });
      
      if (existingScan) {
        return res.status(200).json({
          success: true,
          message: '이미 스캔된 제품입니다.',
          isDuplicate: true
        });
      }
      
      // 새 스캔 기록 추가
      const newScan = {
        storeId: storeId,
        productCode,
        productName,
        timestamp: new Date(),
        sessionId: sessionId || 'unknown',
        createdAt: new Date()
      };
      
      const result = await collection.insertOne(newScan);
      
      // 해당 매장의 총 스캔 수 조회
      const totalScans = await collection.countDocuments({ storeId: storeId });
      
      // 응답
      res.status(200).json({
        success: true,
        message: '스캔 기록이 저장되었습니다.',
        scanRecord: {
          ...newScan,
          _id: result.insertedId
        },
        totalScans: totalScans
      });
      
    } catch (error) {
      console.error('스캔 기록 저장 오류:', error);
      res.status(500).json({
        success: false,
        message: '스캔 기록 저장에 실패했습니다.'
      });
    }
    
  } else if (req.method === 'GET') {
    try {
      const { storeId, sessionId } = req.query;
      
      console.log('스캔 기록 조회 요청:', { storeId, sessionId });
      
      if (!storeId) {
        return res.status(400).json({
          success: false,
          message: '매장 ID가 필요합니다.'
        });
      }

      const { db } = await connectToDatabase();
      const collection = db.collection('scan_records');
      
      // 조회 조건 설정
      const query = { storeId: storeId };
      if (sessionId) {
        query.sessionId = sessionId;
      }
      
      // 스캔 기록 조회 (최신순 정렬)
      const scans = await collection.find(query)
        .sort({ timestamp: -1 })
        .toArray();
      
      // 통계 계산
      const stats = {
        totalScans: scans.length,
        uniqueProducts: new Set(scans.map(scan => scan.productCode)).size,
        latestScan: scans.length > 0 ? scans[0] : null
      };
      
      res.status(200).json({
        success: true,
        storeId,
        sessionId,
        scans: scans,
        stats
      });
      
    } catch (error) {
      console.error('스캔 기록 조회 오류:', error);
      res.status(500).json({
        success: false,
        message: '스캔 기록 조회에 실패했습니다.'
      });
    }
    
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}; 