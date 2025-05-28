/**
 * LiteEditor Server
 * Express + Multer를 사용한 이미지 업로드 서버
 */

// UTF-8 인코딩 설정
process.stdout.setEncoding('utf8');
process.stderr.setEncoding('utf8');

const express = require('express');
const cors = require('cors');
const path = require('path');
const uploadRoutes = require('./routes/uploadRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// 미들웨어 설정
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:8080'],
  credentials: true
}));

// UTF-8 인코딩 명시적 설정
app.use(express.json({ limit: '10mb', charset: 'utf-8' }));
app.use(express.urlencoded({ extended: true, limit: '10mb', charset: 'utf-8' }));

// 정적 파일 서빙 (public 폴더)
app.use(express.static(path.join(__dirname, '../public')));

// API 라우트
app.use('/api/upload', uploadRoutes);

// 루트 경로 - LiteEditor 서빙
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 헬스 체크 엔드포인트
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'LiteEditor Server is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 404 핸들러
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: '요청한 경로를 찾을 수 없습니다.',
    error: 'NOT_FOUND'
  });
});

// 전역 에러 핸들러
app.use((error, req, res, next) => {
  console.error('[SERVER] 에러 발생:', error);
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || '서버 내부 오류가 발생했습니다.',
    error: 'INTERNAL_SERVER_ERROR'
  });
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`🚀 LiteEditor Server가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`📂 클라이언트: http://localhost:${PORT}`);
  console.log(`🔗 API 엔드포인트: http://localhost:${PORT}/api`);
  console.log(`📊 헬스 체크: http://localhost:${PORT}/api/health`);
});

// 우아한 종료 처리
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM 신호를 받았습니다. 서버를 종료합니다.');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🔄 SIGINT 신호를 받았습니다. 서버를 종료합니다.');
  process.exit(0);
});

module.exports = app; 