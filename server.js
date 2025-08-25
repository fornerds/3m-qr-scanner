const express = require('express');
const cors = require('cors');
const path = require('path');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 5000;

// 미들웨어 설정
app.use(compression()); // gzip 압축
app.use(cors());
app.use(express.json({ limit: '50mb' })); // JSON 요청 크기 제한 증가
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 요청 로깅 미들웨어 (개발환경에서만)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// API 라우트 설정 (성능 최적화된 버전들)
app.use('/api/products', require('./routes/products'));
app.use('/api/stores', require('./routes/stores'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/qr-scan', require('./routes/qr-scan'));
app.use('/api/scan-records', require('./routes/scan-records'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/inventory-report', require('./routes/inventory-report'));
app.use('/api/ai-analyze-shelf', require('./routes/ai-analyze-shelf'));

// React 빌드 파일 서빙 (프로덕션 환경)
if (process.env.NODE_ENV === 'production') {
  // React 빌드 폴더 지정
  app.use(express.static(path.join(__dirname, 'build')));
  
  // 모든 라우트를 React 앱으로 리디렉션
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
} else {
  // 개발 환경에서는 간단한 응답
  app.get('/', (req, res) => {
    res.json({ 
      message: '3M 다이소 QR Scanner API Server', 
      version: '1.0.0',
      environment: 'development',
      uptime: process.uptime()
    });
  });
}

// 글로벌 에러 핸들링 미들웨어
app.use((err, req, res, next) => {
  console.error('서버 에러:', err.stack);
  
  // MongoDB 관련 에러
  if (err.name === 'MongoError' || err.name === 'MongoServerError') {
    return res.status(503).json({
      success: false,
      error: 'DATABASE_ERROR',
      message: '데이터베이스 연결에 문제가 발생했습니다.'
    });
  }
  
  // 파일 크기 초과 에러
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: 'PAYLOAD_TOO_LARGE',
      message: '요청 크기가 너무 큽니다. 이미지 크기를 줄여주세요.'
    });
  }
  
  res.status(500).json({
    success: false,
    error: 'INTERNAL_SERVER_ERROR',
    message: process.env.NODE_ENV === 'development' ? err.message : '서버 내부 오류가 발생했습니다.'
  });
});

// 404 핸들링
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    error: 'NOT_FOUND',
    message: '요청한 리소스를 찾을 수 없습니다.',
    path: req.path
  });
});

// Graceful shutdown 처리
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

// 서버 시작
const server = app.listen(PORT, () => {
  console.log(`🚀 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`📝 환경: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🕐 시작 시간: ${new Date().toISOString()}`);
  
  if (process.env.NODE_ENV !== 'production') {
    console.log(`🔗 로컬 서버: http://localhost:${PORT}`);
  }
});

module.exports = app;
