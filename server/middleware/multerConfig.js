/**
 * Multer Upload Middleware for LiteEditor
 * 이미지 파일 업로드를 위한 Multer 설정
 */

const multer = require('multer');
const path = require('path');
const { generateUUID, createUploadFolder, isValidMimeType, isValidExtension } = require('../utils/fileUtils');

// 🔧 클라이언트와 동일한 설정 파일 직접 사용
const FILE_CONFIG = require('../../public/js/data/fileConfig.js');

console.log('📋 서버 파일 설정:', FILE_CONFIG);

// 동적 저장소 설정
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    try {
      const baseDir = path.join(__dirname, '../../public/images');
      const uploadPath = await createUploadFolder(baseDir);
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: function (req, file, cb) {
    try {
      // 🔧 원본 파일명 UTF-8 디코딩 처리
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      file.originalname = originalName; // 수정된 파일명으로 업데이트
      
      const uuid = generateUUID();
      const extension = path.extname(originalName).toLowerCase();
      const filename = `${uuid}${extension}`;
      
      // req에 UUID 저장 (나중에 응답에서 사용)
      req.fileUuid = uuid;
      
      cb(null, filename);
    } catch (error) {
      cb(error);
    }
  }
});

// 파일 필터링
const fileFilter = (req, file, cb) => {
  // MIME 타입 검증
  if (!isValidMimeType(file.mimetype, FILE_CONFIG.allowedMimeTypes)) {
    return cb(new Error(`허용되지 않은 파일 형식입니다. 허용 형식: ${FILE_CONFIG.allowedTypes.join(', ')}`), false);
  }
  
  // 파일 확장자 검증
  if (!isValidExtension(file.originalname, FILE_CONFIG.allowedTypes)) {
    return cb(new Error(`허용되지 않은 파일 확장자입니다. 허용 확장자: ${FILE_CONFIG.allowedTypes.join(', ')}`), false);
  }
  
  cb(null, true);
};

// Multer 설정
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: FILE_CONFIG.maxSizeMB * 1024 * 1024, // MB를 바이트로 변환
    files: 1 // 한 번에 하나의 파일만 업로드
  }
});

// 에러 처리 미들웨어
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(413).json({
          success: false,
          message: `파일 크기가 너무 큽니다. 최대 ${FILE_CONFIG.maxSizeMB}MB까지 업로드 가능합니다.`,
          error: 'FILE_TOO_LARGE'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: '한 번에 하나의 파일만 업로드할 수 있습니다.',
          error: 'TOO_MANY_FILES'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          message: '예상치 못한 필드에서 파일이 전송되었습니다.',
          error: 'UNEXPECTED_FIELD'
        });
      default:
        return res.status(400).json({
          success: false,
          message: `파일 업로드 오류: ${error.message}`,
          error: 'UPLOAD_ERROR'
        });
    }
  }
  
  // 사용자 정의 에러 (fileFilter에서 발생)
  if (error.message) {
    return res.status(400).json({
      success: false,
      message: error.message,
      error: 'VALIDATION_ERROR'
    });
  }
  
  // 기타 서버 에러
  return res.status(500).json({
    success: false,
    message: '서버 내부 오류가 발생했습니다.',
    error: 'INTERNAL_ERROR'
  });
};

module.exports = {
  upload: upload.single('image'), // 'image' 필드명으로 단일 파일 업로드
  handleUploadError,
  FILE_CONFIG
};