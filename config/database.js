const { MongoClient } = require('mongodb');

// MongoDB 연결 설정 (성능 최적화)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/3m-inventory';
const DB_NAME = '3m-inventory';

// 연결 풀 설정 (성능 최적화)
const CLIENT_OPTIONS = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10, // 최대 연결 풀 크기
  minPoolSize: 2,  // 최소 연결 풀 크기
  maxIdleTimeMS: 30000, // 30초 후 유휴 연결 종료
  serverSelectionTimeoutMS: 5000, // 5초 타임아웃
  socketTimeoutMS: 30000, // 소켓 타임아웃
  bufferMaxEntries: 0, // 버퍼링 비활성화
  retryWrites: true,
  retryReads: true,
  compressors: ['zlib'], // 압축 사용
  zlibCompressionLevel: 6
};

let cachedClient = null;
let cachedDb = null;

// 연결 상태 모니터링
let connectionStatus = 'disconnected';
let lastConnectionTime = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

async function connectToDatabase() {
  // 이미 연결되어 있으면 기존 연결 반환
  if (cachedClient && cachedDb && connectionStatus === 'connected') {
    try {
      // 연결 상태 확인
      await cachedClient.db(DB_NAME).admin().ping();
      return { client: cachedClient, db: cachedDb };
    } catch (error) {
      console.warn('기존 연결이 유효하지 않음, 재연결 시도');
      cachedClient = null;
      cachedDb = null;
      connectionStatus = 'disconnected';
    }
  }

  try {
    connectionStatus = 'connecting';
    console.log('MongoDB 연결 시도 중...');
    
    const client = new MongoClient(MONGODB_URI, CLIENT_OPTIONS);
    await client.connect();
    
    // 연결 확인
    await client.db(DB_NAME).admin().ping();
    
    const db = client.db(DB_NAME);

    // 인덱스 확인 및 생성 (성능 최적화)
    await createOptimizedIndexes(db);

    // 캐싱
    cachedClient = client;
    cachedDb = db;
    connectionStatus = 'connected';
    lastConnectionTime = new Date();
    reconnectAttempts = 0;

    // 연결 이벤트 리스너 설정
    setupConnectionEventListeners(client);

    console.log('✅ MongoDB 연결 성공');
    console.log(`📊 데이터베이스: ${DB_NAME}`);
    console.log(`🔗 연결 시간: ${lastConnectionTime.toISOString()}`);
    
    return { client, db };
  } catch (error) {
    connectionStatus = 'error';
    reconnectAttempts++;
    
    console.error('❌ MongoDB 연결 오류:', error.message);
    
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      console.log(`🔄 재연결 시도 ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}...`);
      await new Promise(resolve => setTimeout(resolve, 2000 * reconnectAttempts));
      return connectToDatabase();
    }
    
    throw new Error(`MongoDB 연결 실패: ${error.message}`);
  }
}

// 최적화된 인덱스 생성
async function createOptimizedIndexes(db) {
  try {
    const collections = {
      'products': [
        { sku: 1 }, // 제품 조회 최적화
        { category: 1, active: 1 }, // 카테고리별 조회 최적화
        { salesAvg: -1 }, // 판매량 정렬 최적화
        { name: "text", category: "text" } // 텍스트 검색 최적화
      ],
      'stores': [
        { _id: 1 }, // 기본 조회 최적화
        { createdAt: -1 } // 생성일 정렬 최적화
      ],
      'scan_records': [
        { storeId: 1, timestamp: -1 }, // 매장별 스캔 기록 조회 최적화
        { productCode: 1 }, // 제품별 스캔 기록 조회 최적화
        { sessionId: 1 }, // 세션별 조회 최적화
        { storeId: 1, productCode: 1, sessionId: 1 }, // 복합 인덱스 (중복 체크 최적화)
      ],
      'sessions': [
        { storeId: 1, status: 1 }, // 매장별 세션 조회 최적화
        { status: 1, endTime: -1 } // 상태별, 종료 시간별 정렬 최적화
      ]
    };

    for (const [collectionName, indexes] of Object.entries(collections)) {
      const collection = db.collection(collectionName);
      
      for (const index of indexes) {
        try {
          await collection.createIndex(index, { background: true });
        } catch (indexError) {
          // 이미 존재하는 인덱스는 무시
          if (!indexError.message.includes('already exists')) {
            console.warn(`인덱스 생성 실패 (${collectionName}):`, indexError.message);
          }
        }
      }
    }
    
    console.log('📊 최적화된 인덱스 생성 완료');
  } catch (error) {
    console.warn('인덱스 생성 중 일부 오류 발생:', error.message);
  }
}

// 연결 이벤트 리스너 설정
function setupConnectionEventListeners(client) {
  client.on('serverHeartbeatFailed', () => {
    console.warn('⚠️  MongoDB 서버 하트비트 실패');
    connectionStatus = 'unstable';
  });

  client.on('serverHeartbeatSucceeded', () => {
    if (connectionStatus === 'unstable') {
      console.log('✅ MongoDB 서버 하트비트 복구');
      connectionStatus = 'connected';
    }
  });

  client.on('close', () => {
    console.log('🔌 MongoDB 연결 종료');
    connectionStatus = 'disconnected';
  });
}

// 연결 상태 확인
function getConnectionStatus() {
  return {
    status: connectionStatus,
    lastConnectionTime,
    reconnectAttempts,
    isConnected: connectionStatus === 'connected'
  };
}

// Graceful shutdown
async function closeConnection() {
  if (cachedClient) {
    console.log('🔒 MongoDB 연결 종료 중...');
    await cachedClient.close();
    cachedClient = null;
    cachedDb = null;
    connectionStatus = 'disconnected';
    console.log('✅ MongoDB 연결 종료 완료');
  }
}

module.exports = { 
  connectToDatabase, 
  getConnectionStatus, 
  closeConnection, 
  DB_NAME 
};
