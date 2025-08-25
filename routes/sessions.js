const express = require('express');
const router = express.Router();
const { connectToDatabase } = require('../config/database');
const { ObjectId } = require('mongodb');

// 📋 세션 목록 조회 (페이징 및 필터링)
router.get('/', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { 
      storeId, 
      status, 
      limit = 20, 
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    console.log('📋 세션 목록 조회:', { storeId, status, limit, offset });

    const { db } = await connectToDatabase();

    // 필터 조건 구성
    const matchStage = {};
    if (storeId) matchStage.storeId = String(storeId);
    if (status) matchStage.status = status;

    // 🚀 Aggregation으로 세션과 관련 통계 조회
    const pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: 'scan_records',
          localField: 'sessionId',
          foreignField: 'sessionId',
          as: 'scanRecords'
        }
      },
      {
        $lookup: {
          from: 'stores',
          localField: 'storeId',
          foreignField: '_id',
          as: 'storeInfo'
        }
      },
      {
        $addFields: {
          scanCount: { $size: '$scanRecords' },
          storeName: { $arrayElemAt: ['$storeInfo.name', 0] },
          duration: {
            $cond: {
              if: '$endTime',
              then: { $subtract: ['$endTime', '$startTime'] },
              else: { $subtract: [new Date(), '$startTime'] }
            }
          }
        }
      },
      {
        $project: {
          scanRecords: 0,
          storeInfo: 0
        }
      },
      { $sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 } }
    ];

    // 총 개수와 데이터 병렬 조회
    const [totalResult, sessions] = await Promise.all([
      db.collection('sessions').aggregate([
        { $match: matchStage },
        { $count: 'total' }
      ]).toArray(),
      db.collection('sessions').aggregate([
        ...pipeline,
        { $skip: parseInt(offset) },
        { $limit: parseInt(limit) }
      ]).toArray()
    ]);

    const totalCount = totalResult[0]?.total || 0;
    const responseTime = Date.now() - startTime;

    console.log(`✅ 세션 목록 조회 완료 (${responseTime}ms): ${sessions.length}개 / 전체 ${totalCount}개`);

    res.json({
      success: true,
      data: sessions,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: totalCount > parseInt(offset) + parseInt(limit)
      },
      responseTime
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`❌ 세션 목록 조회 오류 (${responseTime}ms):`, error);
    
    res.status(500).json({
      success: false,
      error: 'SESSIONS_FETCH_ERROR',
      message: '세션 목록 조회에 실패했습니다.',
      responseTime
    });
  }
});

// ➕ 새 세션 생성
router.post('/', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { storeId, sessionName, description = '' } = req.body;
    console.log('➕ 새 세션 생성:', { storeId, sessionName });

    if (!storeId || !sessionName) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: '매장 ID와 세션명은 필수입니다.',
        required: ['storeId', 'sessionName']
      });
    }

    const { db } = await connectToDatabase();

    // 매장 존재 확인
    const store = await db.collection('stores').findOne({ _id: String(storeId) });
    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'STORE_NOT_FOUND',
        message: '해당 매장을 찾을 수 없습니다.'
      });
    }

    // 새 세션 ID 생성
    const sessionId = `session_${storeId}_${Date.now()}`;

    const newSession = {
      sessionId,
      storeId: String(storeId),
      sessionName: sessionName.trim(),
      description: description.trim(),
      status: 'active',
      startTime: new Date(),
      endTime: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection('sessions').insertOne(newSession);

    const responseTime = Date.now() - startTime;
    console.log(`✅ 새 세션 생성 완료 (${responseTime}ms): ${sessionId}`);

    res.status(201).json({
      success: true,
      message: '새 세션이 생성되었습니다.',
      data: newSession,
      responseTime
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`❌ 세션 생성 오류 (${responseTime}ms):`, error);
    
    res.status(500).json({
      success: false,
      error: 'SESSION_CREATE_ERROR',
      message: '세션 생성에 실패했습니다.',
      responseTime
    });
  }
});

// ✏️ 세션 업데이트
router.put('/:id', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { id } = req.params;
    const updateData = req.body;
    console.log(`✏️ 세션 업데이트: ${id}`);

    const { db } = await connectToDatabase();

    // 기존 세션 확인
    const existingSession = await db.collection('sessions').findOne({ 
      sessionId: id 
    });

    if (!existingSession) {
      return res.status(404).json({
        success: false,
        error: 'SESSION_NOT_FOUND',
        message: '해당 세션을 찾을 수 없습니다.'
      });
    }

    // 업데이트할 필드 필터링
    const allowedFields = ['sessionName', 'description', 'status', 'endTime'];
    const filteredUpdate = {};
    
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        filteredUpdate[field] = updateData[field];
      }
    });

    // 세션 종료 시 endTime 자동 설정
    if (filteredUpdate.status === 'completed' && !filteredUpdate.endTime) {
      filteredUpdate.endTime = new Date();
    }

    filteredUpdate.updatedAt = new Date();

    await db.collection('sessions').updateOne(
      { sessionId: id },
      { $set: filteredUpdate }
    );

    const responseTime = Date.now() - startTime;
    console.log(`✅ 세션 업데이트 완료 (${responseTime}ms)`);

    res.json({
      success: true,
      message: '세션이 업데이트되었습니다.',
      data: { ...existingSession, ...filteredUpdate },
      responseTime
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`❌ 세션 업데이트 오류 (${responseTime}ms):`, error);
    
    res.status(500).json({
      success: false,
      error: 'SESSION_UPDATE_ERROR',
      message: '세션 업데이트에 실패했습니다.',
      responseTime
    });
  }
});

// 🗑️ 세션 삭제 (관련 스캔 기록도 함께 삭제)
router.delete('/:id', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { id } = req.params;
    console.log(`🗑️ 세션 삭제: ${id}`);

    const { db } = await connectToDatabase();

    // 세션 존재 확인
    const existingSession = await db.collection('sessions').findOne({ 
      sessionId: id 
    });

    if (!existingSession) {
      return res.status(404).json({
        success: false,
        error: 'SESSION_NOT_FOUND',
        message: '해당 세션을 찾을 수 없습니다.'
      });
    }

    // 트랜잭션으로 관련 데이터 함께 삭제
    const session = db.client.startSession();
    
    try {
      await session.withTransaction(async () => {
        // 관련 스캔 기록 삭제
        const scanDeleteResult = await db.collection('scan_records').deleteMany(
          { sessionId: id },
          { session }
        );

        // 세션 삭제
        await db.collection('sessions').deleteOne(
          { sessionId: id },
          { session }
        );

        console.log(`✅ 관련 스캔 기록 ${scanDeleteResult.deletedCount}개 함께 삭제`);
      });
    } finally {
      await session.endSession();
    }

    const responseTime = Date.now() - startTime;
    console.log(`✅ 세션 삭제 완료 (${responseTime}ms)`);

    res.json({
      success: true,
      message: '세션과 관련 데이터가 삭제되었습니다.',
      deletedSession: {
        sessionId: id,
        sessionName: existingSession.sessionName
      },
      responseTime
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`❌ 세션 삭제 오류 (${responseTime}ms):`, error);
    
    res.status(500).json({
      success: false,
      error: 'SESSION_DELETE_ERROR',
      message: '세션 삭제에 실패했습니다.',
      responseTime
    });
  }
});

module.exports = router;
