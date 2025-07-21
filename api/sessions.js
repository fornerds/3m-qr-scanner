// 메모리 기반 세션 데이터 저장소
let SESSIONS_DATA = [
  {
    id: '1',
    storeId: '1',
    status: 'completed',
    startTime: '2024-01-15 14:00',
    endTime: '2024-01-15 14:30',
    scannedItems: 45,
    totalItems: 50,
    createdAt: new Date('2024-01-15T14:00:00'),
    updatedAt: new Date('2024-01-15T14:30:00')
  },
  {
    id: '2',
    storeId: '1',
    status: 'completed',
    startTime: '2024-01-14 10:00',
    endTime: '2024-01-14 10:45',
    scannedItems: 38,
    totalItems: 50,
    createdAt: new Date('2024-01-14T10:00:00'),
    updatedAt: new Date('2024-01-14T10:45:00')
  }
];

// 스캔 세션 관리 API
module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { storeId } = req.query;
      console.log('세션 조회 요청, storeId:', storeId);
      
      const sessions = SESSIONS_DATA
        .filter(session => !storeId || session.storeId === storeId)
        .filter(session => session.status === 'completed')
        .sort((a, b) => new Date(b.endTime) - new Date(a.endTime))
        .slice(0, 10);
      
      res.status(200).json(sessions);
    } catch (error) {
      console.error('세션 조회 오류:', error);
      res.status(500).json({ error: '세션 조회 실패' });
    }
  } else if (req.method === 'POST') {
    try {
      const sessionData = req.body;
      console.log('세션 저장 요청:', sessionData);
      
      const newSession = {
        ...sessionData,
        id: String(SESSIONS_DATA.length + 1),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      SESSIONS_DATA.push(newSession);
      
      res.status(201).json({ 
        success: true, 
        sessionId: newSession.id,
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
      
      const sessionIndex = SESSIONS_DATA.findIndex(session => session.id === sessionId);
      
      if (sessionIndex !== -1) {
        SESSIONS_DATA[sessionIndex] = {
          ...SESSIONS_DATA[sessionIndex],
          ...updateData,
          updatedAt: new Date()
        };
        
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