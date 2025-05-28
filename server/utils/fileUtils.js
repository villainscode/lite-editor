/**
 * File Utilities for LiteEditor Server
 * 파일 처리 관련 유틸리티 함수들
 */

const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * 16자리 UUID 생성 (PRD 요구사항)
 * @returns {string} 16자리 UUID
 */
function generateUUID() {
  return uuidv4().replace(/-/g, '').substring(0, 16);
}

/**
 * 오늘 날짜 폴더 경로 생성
 * @returns {string} YYYY-MM-DD 형식의 날짜 문자열
 */
function getTodayFolder() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 업로드 폴더 생성 및 경로 반환
 * @param {string} baseDir - 기본 디렉토리 (public/images)
 * @returns {Promise<string>} 생성된 폴더의 절대 경로
 */
async function createUploadFolder(baseDir) {
  const todayFolder = getTodayFolder();
  const uploadPath = path.join(baseDir, todayFolder);
  
  try {
    await fs.ensureDir(uploadPath);
    return uploadPath;
  } catch (error) {
    throw new Error(`업로드 폴더 생성 실패: ${error.message}`);
  }
}

/**
 * 파일 확장자 추출
 * @param {string} filename - 파일명
 * @returns {string} 확장자 (점 포함)
 */
function getFileExtension(filename) {
  return path.extname(filename).toLowerCase();
}

/**
 * 파일 크기를 사람이 읽기 쉬운 형태로 변환
 * @param {number} bytes - 바이트 크기
 * @returns {string} 포맷된 크기 문자열
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 파일 MIME 타입 검증
 * @param {string} mimetype - 검증할 MIME 타입
 * @param {Array} allowedTypes - 허용된 MIME 타입 배열
 * @returns {boolean} 유효성 여부
 */
function isValidMimeType(mimetype, allowedTypes) {
  return allowedTypes.includes(mimetype);
}

/**
 * 파일 확장자 검증
 * @param {string} filename - 파일명
 * @param {Array} allowedExtensions - 허용된 확장자 배열
 * @returns {boolean} 유효성 여부
 */
function isValidExtension(filename, allowedExtensions) {
  const ext = getFileExtension(filename).substring(1); // 점 제거
  return allowedExtensions.includes(ext.toLowerCase());
}

/**
 * 파일 정보 객체 생성
 * @param {Object} file - Multer 파일 객체
 * @param {string} uuid - 생성된 UUID
 * @param {string} relativePath - 상대 경로
 * @returns {Object} 파일 정보 객체
 */
function createFileInfo(file, uuid, relativePath) {
  const extension = getFileExtension(file.originalname).substring(1);
  
  return {
    path: relativePath,
    filename: file.filename,
    originalName: file.originalname,
    uuid: uuid,
    extension: extension,
    size: file.size,
    formattedSize: formatFileSize(file.size),
    uploadDate: new Date().toISOString(),
    mimeType: file.mimetype
  };
}

module.exports = {
  generateUUID,
  getTodayFolder,
  createUploadFolder,
  getFileExtension,
  formatFileSize,
  isValidMimeType,
  isValidExtension,
  createFileInfo
}; 