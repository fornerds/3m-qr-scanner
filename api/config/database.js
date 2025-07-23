const { MongoClient } = require('mongodb');

// MongoDB 연결 설정
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/3m-inventory';
const DB_NAME = '3m-inventory';

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  try {
    const client = new MongoClient(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // 5초 타임아웃
    });

    await client.connect();
    const db = client.db(DB_NAME);

    cachedClient = client;
    cachedDb = db;

    console.log('MongoDB 연결 성공');
    return { client, db };
  } catch (error) {
    console.error('MongoDB 연결 오류:', error);
    console.log('MongoDB가 실행 중인지 확인하세요. 로컬: mongodb://localhost:27017');
    throw error;
  }
}

module.exports = { connectToDatabase, DB_NAME }; 