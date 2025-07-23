const { connectToDatabase } = require('./config/database');

// QR 스캔 실시간 처리 API (MongoDB 연동)
const ioHandler = async (req, res) => {
  // Socket.io 기능을 Vercel에서 사용하기 어려우므로 일반 HTTP API로 변경
  if (req.method === 'POST') {
    try {
      const { action, data } = req.body;
      
      switch (action) {
        case 'start-camera':
          try {
            const { db } = await connectToDatabase();
            const collection = db.collection('sessions');
            
            const sessionId = Date.now().toString();
            const newSession = {
              _id: sessionId,
              storeId: data.storeId,
              userId: data.userId,
              startTime: new Date(),
              status: 'active',
              scannedItems: [],
              createdAt: new Date()
            };
            
            await collection.insertOne(newSession);
            
            res.status(200).json({ 
              success: true,
              sessionId,
              message: '카메라 세션 시작됨'
            });
          } catch (error) {
            console.error('세션 시작 오류:', error);
            res.status(500).json({
              success: false,
              message: '세션 시작 실패'
            });
          }
          break;
          
        case 'qr-detected':
          try {
            const { db } = await connectToDatabase();
            const sessionsCollection = db.collection('sessions');
            const scanRecordsCollection = db.collection('scan_records');
            
            const session = await sessionsCollection.findOne({ _id: data.sessionId });
            if (session) {
              const scannedItem = {
                productCode: data.productCode,
                productName: data.productName,
                category: data.category,
                price: data.price,
                stock: data.stock,
                timestamp: new Date()
              };
              
              // 세션에 스캔 아이템 추가
              await sessionsCollection.updateOne(
                { _id: data.sessionId },
                { $push: { scannedItems: scannedItem } }
              );
              
              // 스캔 기록에도 저장
              await scanRecordsCollection.insertOne({
                storeId: session.storeId,
                productCode: data.productCode,
                productName: data.productName,
                sessionId: data.sessionId,
                timestamp: new Date(),
                createdAt: new Date()
              });
              
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
          } catch (error) {
            console.error('QR 처리 오류:', error);
            res.status(500).json({
              success: false,
              message: 'QR 처리 실패'
            });
          }
          break;
          
        case 'stop-camera':
          try {
            const { db } = await connectToDatabase();
            const collection = db.collection('sessions');
            
            const result = await collection.findOneAndUpdate(
              { _id: data.sessionId },
              { 
                $set: { 
                  status: 'completed',
                  endTime: new Date(),
                  updatedAt: new Date()
                }
              },
              { returnDocument: 'after' }
            );
            
            if (result.value) {
              res.status(200).json({
                success: true,
                session: result.value,
                message: '카메라 세션 종료됨'
              });
            } else {
              res.status(404).json({
                success: false,
                message: '세션을 찾을 수 없습니다'
              });
            }
          } catch (error) {
            console.error('세션 종료 오류:', error);
            res.status(500).json({
              success: false,
              message: '세션 종료 실패'
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
    try {
      // 활성 세션 조회 (MongoDB)
      const { db } = await connectToDatabase();
      const collection = db.collection('sessions');
      
      const activeSessions = await collection.find({ status: 'active' }).toArray();
      
      res.status(200).json({
        success: true,
        sessions: activeSessions,
        message: '활성 세션 조회 완료'
      });
    } catch (error) {
      console.error('세션 조회 오류:', error);
      res.status(500).json({
        success: false,
        message: '세션 조회 실패'
      });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

module.exports = ioHandler; 