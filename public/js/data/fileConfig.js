/**
 * LiteEditor File Upload Configuration
 * 파일 업로드 관련 설정 (클라이언트 + 서버 공용)
 */

const FILE_CONFIG = {
  // 최대 파일 크기 (메가바이트)
  maxSizeMB: 10,
  
  // 허용된 파일 확장자
  allowedTypes: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  
  // 허용된 MIME 타입
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  
  // 프로그레스바 표시 기준 (바이트)
  progressThreshold: 1024 * 1024, // 1MB 이상일 때 프로그레스바 표시
  
  // 업로드 API 엔드포인트
  uploadEndpoint: '/api/upload/image'
};

// 브라우저 환경에서 전역 스코프에 노출
if (typeof window !== 'undefined') {
  window.FILE_CONFIG = FILE_CONFIG;
}

// Node.js 환경에서 모듈로 내보내기
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FILE_CONFIG;
} 