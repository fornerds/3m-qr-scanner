const express = require('express');
const router = express.Router();
const { connectToDatabase } = require('../config/database');

// QR 스캐너 세션 시작
router.post('/start-camera', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { storeId } = req.body;
    console.log(`카메라 세션 시작: 매장 ${storeId}`);

    if (!storeId) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: '매장 ID는 필수입니다.'
      });
    }

    const { db } = await connectToDatabase();

    // 기존 활성 세션 확인
    const existingSession = await db.collection('camera_sessions').findOne({
      storeId: String(storeId),
      status: 'active'
    });

    const cameraSession = {
      storeId: String(storeId),
      status: 'active',
      startTime: new Date(),
      lastActivity: new Date()
    };

    if (existingSession) {
      // 기존 세션 업데이트
      await db.collection('camera_sessions').updateOne(
        { _id: existingSession._id },
        { $set: { lastActivity: new Date() } }
      );
    } else {
      // 새 세션 생성
      await db.collection('camera_sessions').insertOne(cameraSession);
    }

    const responseTime = Date.now() - startTime;
    console.log(`카메라 세션 시작 완료 (${responseTime}ms)`);

    res.json({
      success: true,
      message: '카메라 세션이 시작되었습니다.',
      responseTime
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`카메라 세션 시작 오류 (${responseTime}ms):`, error);
    
    res.status(500).json({
      success: false,
      error: 'CAMERA_SESSION_ERROR',
      message: '카메라 세션 시작에 실패했습니다.',
      responseTime
    });
  }
});

// QR 코드 감지 처리
router.post('/qr-detected', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { qrData, storeId } = req.body;
    console.log(`QR 코드 감지: ${qrData}, 매장: ${storeId}`);

    if (!qrData || !storeId) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'QR 데이터와 매장 ID는 필수입니다.'
      });
    }

    const { db } = await connectToDatabase();

    // 제품 조회 최적화
    const product = await db.collection('products').findOne({ 
      sku: String(qrData).trim() 
    });

    if (!product) {
      const responseTime = Date.now() - startTime;
      return res.json({
        success: false,
        found: false,
        message: '제품을 찾을 수 없습니다.',
        qrData,
        responseTime
      });
    }

    // 중요도 계산
    const importance = product.salesAvg <= 80 ? 'high' : 
                      product.salesAvg <= 130 ? 'medium' : 'low';

    // 세션 활동 업데이트 (비동기)
    db.collection('camera_sessions').updateOne(
      { storeId: String(storeId), status: 'active' },
      { $set: { lastActivity: new Date() } }
    ).catch(err => console.warn('세션 업데이트 실패:', err));

    const responseTime = Date.now() - startTime;
    console.log(`QR 코드 처리 완료 (${responseTime}ms): ${product.name}`);

    res.json({
      success: true,
      found: true,
      product: {
        ...product,
        importance
      },
      qrData,
      responseTime
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`QR 코드 처리 오류 (${responseTime}ms):`, error);
    
    res.status(500).json({
      success: false,
      error: 'QR_PROCESSING_ERROR',
      message: 'QR 코드 처리 중 오류가 발생했습니다.',
      responseTime
    });
  }
});

// 카메라 세션 종료
router.post('/stop-camera', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { storeId } = req.body;
    console.log(`카메라 세션 종료: 매장 ${storeId}`);

    const { db } = await connectToDatabase();

    const filter = { storeId: String(storeId), status: 'active' };

    await db.collection('camera_sessions').updateMany(
      filter,
      { 
        $set: { 
          status: 'stopped',
          endTime: new Date(),
          lastActivity: new Date()
        } 
      }
    );

    const responseTime = Date.now() - startTime;
    console.log(`카메라 세션 종료 완료 (${responseTime}ms)`);

    res.json({
      success: true,
      message: '카메라 세션이 종료되었습니다.',
      responseTime
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`카메라 세션 종료 오류 (${responseTime}ms):`, error);
    
    res.status(500).json({
      success: false,
      error: 'CAMERA_STOP_ERROR',
      message: '카메라 세션 종료에 실패했습니다.',
      responseTime
    });
  }
});

// 활성 세션 조회
router.get('/', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { storeId } = req.query;
    console.log(`활성 세션 조회: 매장 ${storeId || '전체'}`);

    const { db } = await connectToDatabase();

    const filter = { status: 'active' };
    if (storeId) {
      filter.storeId = String(storeId);
    }

    const sessions = await db.collection('camera_sessions')
      .find(filter)
      .sort({ lastActivity: -1 })
      .toArray();

    const responseTime = Date.now() - startTime;
    console.log(`활성 세션 조회 완료 (${responseTime}ms): ${sessions.length}개`);

    res.json({
      success: true,
      data: sessions,
      count: sessions.length,
      responseTime
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`활성 세션 조회 오류 (${responseTime}ms):`, error);
    
    res.status(500).json({
      success: false,
      error: 'SESSION_FETCH_ERROR',
      message: '세션 조회에 실패했습니다.',
      responseTime
    });
  }
});

module.exports = router;
