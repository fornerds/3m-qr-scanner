import { Server } from 'socket.io';
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

// Socket.io 서버 설정
const ioHandler = (req, res) => {
  if (!res.socket.server.io) {
    const io = new Server(res.socket.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    
    // Socket.io 이벤트 핸들러
    io.on('connection', (socket) => {
      console.log('사용자 연결:', socket.id);

      // 카메라 스트림 시작
      socket.on('start-camera', async (data) => {
        try {
          const { storeId, userId } = data;
          
          // 데이터베이스에 세션 생성
          const db = await connectToDatabase();
          const sessionResult = await db.collection('scan_sessions').insertOne({
            storeId,
            userId,
            startTime: new Date(),
            status: 'active',
            scannedItems: []
          });
          
          // 세션 정보 저장
          socket.sessionInfo = {
            sessionId: sessionResult.insertedId,
            storeId,
            userId,
            startTime: Date.now()
          };

          socket.join(`store-${storeId}`);
          socket.emit('camera-started', { 
            sessionId: sessionResult.insertedId 
          });
          
          console.log(`매장 ${storeId}에서 스캔 시작 - 세션: ${sessionResult.insertedId}`);
        } catch (error) {
          console.error('카메라 시작 오류:', error);
          socket.emit('error', { message: '카메라 시작 실패' });
        }
      });

      // QR 코드 감지
      socket.on('qr-detected', async (data) => {
        try {
          const { qrData, timestamp } = data;
          
          // QR 데이터 파싱
          const [productCode, productName, category, price, stock] = qrData.split('|');
          
          // 데이터베이스에 스캔 아이템 저장
          if (socket.sessionInfo) {
            const db = await connectToDatabase();
            await db.collection('scan_sessions').updateOne(
              { _id: socket.sessionInfo.sessionId },
              {
                $push: {
                  scannedItems: {
                    productCode,
                    productName,
                    category,
                    price,
                    stock,
                    timestamp: new Date(timestamp)
                  }
                }
              }
            );
          }
          
          // 실시간 업데이트 전송
          socket.emit('qr-processed', {
            productCode,
            productName,
            category,
            price,
            stock,
            timestamp: new Date(timestamp)
          });

          console.log(`QR 코드 감지: ${productCode} - ${productName}`);
        } catch (error) {
          console.error('QR 처리 오류:', error);
          socket.emit('error', { message: 'QR 코드 처리 실패' });
        }
      });

      // 프레임 데이터 전송
      socket.on('frame-data', (data) => {
        if (socket.sessionInfo) {
          // 프레임 데이터를 다른 클라이언트에게 전송
          socket.to(`store-${socket.sessionInfo.storeId}`).emit('frame-update', {
            frame: data.frame,
            timestamp: data.timestamp
          });
        }
      });

      // 스캔 중단
      socket.on('stop-camera', async () => {
        try {
          if (socket.sessionInfo) {
            // 데이터베이스에서 세션 종료
            const db = await connectToDatabase();
            await db.collection('scan_sessions').updateOne(
              { _id: socket.sessionInfo.sessionId },
              {
                $set: {
                  status: 'completed',
                  endTime: new Date(),
                  updatedAt: new Date()
                }
              }
            );
          }
          
          socket.sessionInfo = null;
          socket.emit('camera-stopped');
          console.log('카메라 스트림 중단');
        } catch (error) {
          console.error('카메라 중단 오류:', error);
        }
      });

      // 연결 해제
      socket.on('disconnect', async () => {
        try {
          if (socket.sessionInfo) {
            // 데이터베이스에서 세션 종료
            const db = await connectToDatabase();
            await db.collection('scan_sessions').updateOne(
              { _id: socket.sessionInfo.sessionId },
              {
                $set: {
                  status: 'completed',
                  endTime: new Date(),
                  updatedAt: new Date()
                }
              }
            );
          }
        } catch (error) {
          console.error('연결 해제 오류:', error);
        }
        console.log('사용자 연결 해제:', socket.id);
      });
    });

    res.socket.server.io = io;
  }
  
  res.end();
};

export default ioHandler; 