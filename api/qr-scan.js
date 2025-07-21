// 메모리 기반 세션 저장소
let activeSessions = new Map();

// Socket.io 서버 설정 (MongoDB 없이 간단한 메모리 기반)
const ioHandler = (req, res) => {
  // Socket.io 기능을 Vercel에서 사용하기 어려우므로 일반 HTTP API로 변경
  if (req.method === 'POST') {
    try {
      const { action, data } = req.body;
      
      switch (action) {
        case 'start-camera':
          const sessionId = Date.now().toString();
          activeSessions.set(sessionId, {
            sessionId,
            storeId: data.storeId,
            userId: data.userId,
            startTime: new Date(),
            status: 'active',
            scannedItems: []
          });
          
          res.status(200).json({ 
            success: true,
            sessionId,
            message: '카메라 세션 시작됨'
          });
          break;
          
        case 'qr-detected':
          const session = activeSessions.get(data.sessionId);
          if (session) {
            const scannedItem = {
              productCode: data.productCode,
              productName: data.productName,
              category: data.category,
              price: data.price,
              stock: data.stock,
              timestamp: new Date()
            };
            
            session.scannedItems.push(scannedItem);
            
            res.status(200).json({
              success: true,
              scannedItem,
              message: 'QR 코드 처리 완료'
            });
          } else {
            res.status(404).json({
              success: false,
              message: '세션을 찾을 수 없습니다'
            });
          }
          break;
          
        case 'stop-camera':
          const endSession = activeSessions.get(data.sessionId);
          if (endSession) {
            endSession.status = 'completed';
            endSession.endTime = new Date();
            
            res.status(200).json({
              success: true,
              session: endSession,
              message: '카메라 세션 종료됨'
            });
          } else {
            res.status(404).json({
              success: false,
              message: '세션을 찾을 수 없습니다'
            });
          }
          break;
          
        default:
          res.status(400).json({
            success: false,
            message: '알 수 없는 액션입니다'
          });
      }
    } catch (error) {
      console.error('QR 스캔 API 오류:', error);
      res.status(500).json({
        success: false,
        message: 'QR 스캔 처리 실패'
      });
    }
  } else if (req.method === 'GET') {
    // 활성 세션 조회
    const sessions = Array.from(activeSessions.values());
    res.status(200).json({
      success: true,
      sessions: sessions.filter(s => s.status === 'active'),
      message: '활성 세션 조회 완료'
    });
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

module.exports = ioHandler; 