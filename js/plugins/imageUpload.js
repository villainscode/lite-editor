/**
 * LiteEditor Image Upload Module
 * 파일 업로드 전용 모듈 - imageLayout.js에서 사용
 */
(function() {
    'use strict';
    
    // 🔧 파일 업로드 설정
    const fileConfig = window.FILE_CONFIG || {
        maxSizeMB: 10,
        allowedTypes: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        uploadEndpoint: '/api/upload/image',
        progressThreshold: 1024 * 1024 // 1MB
    };

    /**
     * 파일 유효성 검증
     */
    function validateFile(file) {
        const errors = [];

        if (file.size > fileConfig.maxSizeMB * 1024 * 1024) {
            errors.push(`파일 크기가 너무 큽니다. (최대 ${fileConfig.maxSizeMB}MB)`);
        }

        if (!fileConfig.allowedMimeTypes.includes(file.type)) {
            errors.push(`허용되지 않은 파일 형식입니다. (${file.type})`);
        }

        const extension = file.name.split('.').pop().toLowerCase();
        if (!fileConfig.allowedTypes.includes(extension)) {
            errors.push(`허용되지 않은 파일 확장자입니다. (.${extension})`);
        }

        return errors;
    }

    /**
     * 파일 크기 포맷팅
     */
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 프로그레스바 생성 - 완전한 화면 중앙 배치
     */
    function createProgressBar() {
        // 오버레이 컨테이너
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            background: rgba(0, 0, 0, 0.7) !important;
            z-index: 999999 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            margin: 0 !important;
            padding: 0 !important;
        `;

        // 프로그레스 박스
        const progressBox = document.createElement('div');
        progressBox.style.cssText = `
            background: white !important;
            border-radius: 12px !important;
            padding: 32px !important;
            min-width: 350px !important;
            max-width: 90vw !important;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3) !important;
            text-align: center !important;
            margin: 0 !important;
            position: relative !important;
        `;

        progressBox.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                <span class="material-icons" style="
                    font-size: 32px; 
                    color: #4285f4; 
                    margin-right: 12px; 
                    animation: progressSpin 2s linear infinite;
                ">cloud_upload</span>
                <span style="font-size: 18px; font-weight: 600; color: #333;">이미지 업로드 중...</span>
            </div>
            
            <div style="
                width: 100%; 
                height: 8px; 
                background: #f0f0f0; 
                border-radius: 4px; 
                overflow: hidden; 
                margin-bottom: 16px;
                position: relative;
            ">
                <div class="progress-fill" style="
                    width: 0%; 
                    height: 100%; 
                    background: linear-gradient(90deg, #4285f4, #34a853); 
                    border-radius: 4px; 
                    transition: width 0.4s ease;
                    position: absolute;
                    top: 0;
                    left: 0;
                "></div>
            </div>
            
            <div class="progress-text" style="
                font-size: 16px; 
                color: #333; 
                font-weight: 600;
                margin-bottom: 8px;
            ">0%</div>
            
            <div class="progress-speed" style="
                font-size: 13px; 
                color: #666;
                min-height: 18px;
            ">업로드 준비 중...</div>
        `;

        // 애니메이션 CSS 추가 (더 안전하게)
        const existingStyle = document.querySelector('#progress-center-animation');
        if (!existingStyle) {
            const style = document.createElement('style');
            style.id = 'progress-center-animation';
            style.textContent = `
                @keyframes progressSpin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .progress-overlay {
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 100vw !important;
                    height: 100vh !important;
                    z-index: 999999 !important;
                }
            `;
            document.head.appendChild(style);
        }

        overlay.className = 'progress-overlay';
        overlay.appendChild(progressBox);
        document.body.appendChild(overlay);
        
        // 스크롤 방지
        document.body.style.overflow = 'hidden';
        
        return overlay;
    }

    /**
     * 프로그레스바 업데이트
     */
    function updateProgressBar(container, percent) {
        const fill = container.querySelector('.progress-fill');
        const text = container.querySelector('.progress-text');
        
        if (fill) fill.style.width = `${percent}%`;
        if (text) text.textContent = `${Math.round(percent)}%`;
    }

    /**
     * 프로그레스바 완료 처리
     */
    function completeProgressBar(container, success = true) {
        const icon = container.querySelector('.material-icons');
        const title = container.querySelector('span:not(.material-icons)');
        const fill = container.querySelector('.progress-fill');
        const text = container.querySelector('.progress-text');

        if (success) {
            if (icon) icon.textContent = 'check_circle';
            if (icon) icon.style.color = '#4caf50';
            if (title) title.textContent = '업로드 완료!';
            if (fill) fill.style.background = '#4caf50';
            if (text) text.textContent = '완료';
        } else {
            if (icon) icon.textContent = 'error';
            if (icon) icon.style.color = '#f44336';
            if (title) title.textContent = '업로드 실패';
            if (fill) fill.style.background = '#f44336';
            if (text) text.textContent = '실패';
        }

        setTimeout(() => {
            if (container.parentNode) container.remove();
        }, 2000);
    }

    /**
     * 서버 파일 업로드
     */
    async function uploadFile(file) {
        const validationErrors = validateFile(file);
        if (validationErrors.length > 0) {
            LiteEditorModal.alert('파일 업로드 오류:\n' + validationErrors.join('\n'));
            return null;
        }

        let progressBar = null;
        if (file.size >= fileConfig.progressThreshold) {
            progressBar = createProgressBar();
        }

        try {
            const formData = new FormData();
            formData.append('image', file);

            const xhr = new XMLHttpRequest();

            const response = await new Promise((resolve, reject) => {
                if (progressBar) {
                    xhr.upload.addEventListener('progress', (e) => {
                        if (e.lengthComputable) {
                            const percent = (e.loaded / e.total) * 100;
                            updateProgressBar(progressBar, percent);
                        }
                    });
                }

                xhr.addEventListener('load', () => {
                    if (xhr.status === 200) {
                        try {
                            const response = JSON.parse(xhr.responseText);
                            if (response.success) {
                                if (progressBar) completeProgressBar(progressBar, true);
                                resolve(response.data);
                            } else {
                                if (progressBar) completeProgressBar(progressBar, false);
                                reject(new Error(response.message || '업로드 실패'));
                            }
                        } catch (parseError) {
                            if (progressBar) completeProgressBar(progressBar, false);
                            reject(new Error('서버 응답 파싱 실패'));
                }
            } else {
                        if (progressBar) completeProgressBar(progressBar, false);
                        reject(new Error(`업로드 실패 (HTTP ${xhr.status})`));
                    }
                });

                xhr.addEventListener('error', () => {
                    if (progressBar) completeProgressBar(progressBar, false);
                    reject(new Error('네트워크 오류'));
                });

                xhr.open('POST', fileConfig.uploadEndpoint);
                xhr.send(formData);
            });

            // 🔧 프로그레스바 제거 시 스크롤 복원
            if (progressBar) {
                document.body.style.overflow = ''; // 스크롤 복원
                progressBar.remove();
            }

            return response;

        } catch (error) {
            // 🔧 에러 시에도 스크롤 복원
            if (progressBar) {
                document.body.style.overflow = ''; // 스크롤 복원
                progressBar.remove();
            }
            throw error;
        }
    }

    // 🔧 전역 객체로 노출
    window.ImageUploadModule = {
        validateFile,
        formatFileSize,
        uploadFile,
        fileConfig
    };

})();