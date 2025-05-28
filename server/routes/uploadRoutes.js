/**
 * Upload Routes for LiteEditor
 * 이미지 파일 업로드 API 라우트
 */

const express = require('express');
const path = require('path');
const { upload, handleUploadError } = require('../middleware/multerConfig');
const { createFileInfo, getTodayFolder } = require('../utils/fileUtils');

const router = express.Router();

/**
 * POST /api/upload/image
 * 이미지 파일 업로드 엔드포인트
 */
router.post('/image', upload, (req, res) => {
  try {
    // 업로드된 파일이 없는 경우
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '업로드할 파일이 선택되지 않았습니다.',
        error: 'NO_FILE'
      });
    }

    // 상대 경로 생성 (웹에서 접근 가능한 경로)
    const todayFolder = getTodayFolder();
    const relativePath = `/images/${todayFolder}/${req.file.filename}`;
    
    // 파일 정보 객체 생성
    const fileInfo = createFileInfo(req.file, req.fileUuid, relativePath);
    
    // 서버 로그 - 안전한 문자열 처리
    const safeOriginalName = fileInfo.originalName || '[인코딩 오류]';
    const safeFilename = fileInfo.filename || '[알 수 없음]';
    console.log(`[UPLOAD] 이미지 업로드 성공: ${safeOriginalName} -> ${safeFilename}`);
    
    // 성공 응답
    res.status(200).json({
      success: true,
      message: '이미지가 성공적으로 업로드되었습니다.',
      data: fileInfo
    });
    
  } catch (error) {
    console.error('[UPLOAD] 업로드 처리 중 오류:', error);
    
    res.status(500).json({
      success: false,
      message: '파일 업로드 처리 중 오류가 발생했습니다.',
      error: 'PROCESSING_ERROR'
    });
  }
});

/**
 * GET /api/upload/config
 * 업로드 설정 정보 반환 (클라이언트에서 검증용)
 */
router.get('/config', (req, res) => {
  const { FILE_CONFIG } = require('../middleware/multerConfig');
  
  res.status(200).json({
    success: true,
    data: {
      maxSizeMB: FILE_CONFIG.maxSizeMB,
      allowedTypes: FILE_CONFIG.allowedTypes,
      allowedMimeTypes: FILE_CONFIG.allowedMimeTypes
    }
  });
});

/**
 * POST /api/upload/validate
 * 파일 유효성 사전 검증 (클라이언트에서 사용)
 */
router.post('/validate', express.json(), (req, res) => {
  const { filename, size, mimetype } = req.body;
  const { FILE_CONFIG } = require('../middleware/multerConfig');
  const { isValidMimeType, isValidExtension, formatFileSize } = require('../utils/fileUtils');
  
  const errors = [];
  
  // 크기 검증
  if (size > FILE_CONFIG.maxSizeMB * 1024 * 1024) {
    errors.push(`파일 크기가 너무 큽니다. (${formatFileSize(size)} > ${FILE_CONFIG.maxSizeMB}MB)`);
  }
  
  // MIME 타입 검증
  if (!isValidMimeType(mimetype, FILE_CONFIG.allowedMimeTypes)) {
    errors.push(`허용되지 않은 파일 형식입니다. (${mimetype})`);
  }
  
  // 확장자 검증
  if (!isValidExtension(filename, FILE_CONFIG.allowedTypes)) {
    errors.push(`허용되지 않은 파일 확장자입니다.`);
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: '파일 유효성 검증 실패',
      errors: errors
    });
  }
  
  res.status(200).json({
    success: true,
    message: '파일이 유효합니다.'
  });
});

// 에러 처리 미들웨어 적용
router.use(handleUploadError);

module.exports = router; 