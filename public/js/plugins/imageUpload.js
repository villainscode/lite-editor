/**
 * LiteEditor Image Upload Plugin
 * URL 입력 + 파일 업로드 기능 통합 버전
 * @security-manager.js, @plugin-util.js, @error-handler.js 활용
 */
(function() {
    'use strict';
    
    const PLUGIN_ID = 'imageUpload';
    const MODULE_NAME = 'IMAGE_UPLOAD';
    
    // 전역 참조
    const util = window.PluginUtil || {};
    const errorHandler = window.errorHandler || {};
    const security = window.LiteEditorSecurity || {};
    const fileConfig = window.FILE_CONFIG || {
        maxSizeMB: 5,
        allowedTypes: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        uploadEndpoint: '/api/upload/image'
    };
    
    // 내부 상태
    let savedRange = null;
    let selectedImage = null;
    let isEventHandlerRegistered = false;
    let activeProgressBar = null;

    /**
     * 선택 영역 저장
     */
    function saveSelection() {
        savedRange = util.selection ? util.selection.saveSelection() : null;
    }

    /**
     * 모던한 프로그레스바 생성
     */
    function createProgressBar() {
        const progressContainer = util.dom.createElement('div', {
            className: 'upload-progress-container'
        }, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            width: '320px',
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            padding: '16px',
            zIndex: '99999',
            border: '1px solid #e0e0e0'
        });

        const header = util.dom.createElement('div', {
            className: 'progress-header'
        }, {
            display: 'flex',
            alignItems: 'center',
            marginBottom: '12px'
        });

        const icon = util.dom.createElement('span', {
            className: 'material-icons',
            textContent: 'cloud_upload'
        }, {
            fontSize: '20px',
            color: '#4285f4',
            marginRight: '8px'
        });

        const title = util.dom.createElement('span', {
            textContent: '이미지 업로드 중...'
        }, {
            fontSize: '14px',
            fontWeight: '500',
            color: '#333'
        });

        header.appendChild(icon);
        header.appendChild(title);

        const progressBarBg = util.dom.createElement('div', {
            className: 'progress-bar-bg'
        }, {
            width: '100%',
            height: '4px',
            backgroundColor: '#f0f0f0',
            borderRadius: '2px',
            overflow: 'hidden'
        });

        const progressBarFill = util.dom.createElement('div', {
            className: 'progress-bar-fill'
        }, {
            width: '0%',
            height: '100%',
            backgroundColor: '#4285f4',
            borderRadius: '2px',
            transition: 'width 0.3s ease'
        });

        const statusText = util.dom.createElement('div', {
            className: 'progress-status',
            textContent: '0%'
        }, {
            fontSize: '12px',
            color: '#666',
            marginTop: '8px',
            textAlign: 'center'
        });

        progressBarBg.appendChild(progressBarFill);
        progressContainer.appendChild(header);
        progressContainer.appendChild(progressBarBg);
        progressContainer.appendChild(statusText);

        document.body.appendChild(progressContainer);

        return {
            container: progressContainer,
            fill: progressBarFill,
            status: statusText,
            header: header
        };
    }

    /**
     * 프로그레스바 업데이트
     */
    function updateProgressBar(progressBar, percent, status) {
        if (!progressBar) return;
        
        progressBar.fill.style.width = `${percent}%`;
        progressBar.status.textContent = status || `${Math.round(percent)}%`;
    }

    /**
     * 프로그레스바 완료 처리
     */
    function completeProgressBar(progressBar, success = true) {
        if (!progressBar) return;

        const icon = progressBar.header.querySelector('.material-icons');
        const title = progressBar.header.querySelector('span:not(.material-icons)');

        if (success) {
            icon.textContent = 'check_circle';
            icon.style.color = '#4caf50';
            title.textContent = '업로드 완료!';
            progressBar.fill.style.backgroundColor = '#4caf50';
            updateProgressBar(progressBar, 100, '완료');
        } else {
            icon.textContent = 'error';
            icon.style.color = '#f44336';
            title.textContent = '업로드 실패';
            progressBar.fill.style.backgroundColor = '#f44336';
            progressBar.status.textContent = '실패';
        }

        // 2초 후 자동 제거
        setTimeout(() => {
            if (progressBar.container && progressBar.container.parentNode) {
                progressBar.container.remove();
            }
            activeProgressBar = null;
        }, 2000);
    }

    /**
     * 파일 유효성 검증
     */
    function validateFile(file) {
        const errors = [];

        // 파일 크기 검증
        if (file.size > fileConfig.maxSizeMB * 1024 * 1024) {
            errors.push(`파일 크기가 너무 큽니다. (최대 ${fileConfig.maxSizeMB}MB)`);
        }

        // MIME 타입 검증
        if (!fileConfig.allowedMimeTypes.includes(file.type)) {
            errors.push(`허용되지 않은 파일 형식입니다. (${file.type})`);
        }

        // 파일 확장자 검증 (추가 보안)
        const extension = file.name.split('.').pop().toLowerCase();
        if (!fileConfig.allowedTypes.includes(extension)) {
            errors.push(`허용되지 않은 파일 확장자입니다. (.${extension})`);
        }

        return errors;
    }

    /**
     * 파일 업로드 함수
     */
    async function uploadFile(file) {
        // 유효성 검증
        const validationErrors = validateFile(file);
        if (validationErrors.length > 0) {
            errorHandler.showUserAlert('P803', validationErrors.join('\n'));
            return null;
        }

        // 프로그레스바 생성 (1MB 이상일 때만)
        let progressBar = null;
        if (file.size >= fileConfig.progressThreshold) {
            progressBar = createProgressBar();
            activeProgressBar = progressBar;
        }

        try {
            const formData = new FormData();
            formData.append('image', file);

            const xhr = new XMLHttpRequest();

            return new Promise((resolve, reject) => {
                // 프로그레스 이벤트
                if (progressBar) {
                    xhr.upload.addEventListener('progress', (e) => {
                        if (e.lengthComputable) {
                            const percent = (e.loaded / e.total) * 100;
                            updateProgressBar(progressBar, percent);
                        }
                    });
                }

                // 완료 이벤트
                xhr.addEventListener('load', () => {
                    if (xhr.status === 200) {
                        try {
                            const response = JSON.parse(xhr.responseText);
                            if (response.success) {
                                if (progressBar) {
                                    completeProgressBar(progressBar, true);
                                }
                                resolve(response.data);
                            } else {
                                if (progressBar) {
                                    completeProgressBar(progressBar, false);
                                }
                                reject(new Error(response.message || '업로드 실패'));
                            }
                        } catch (parseError) {
                            if (progressBar) {
                                completeProgressBar(progressBar, false);
                            }
                            reject(new Error('서버 응답 파싱 실패'));
                        }
                    } else {
                        if (progressBar) {
                            completeProgressBar(progressBar, false);
                        }
                        reject(new Error(`업로드 실패 (HTTP ${xhr.status})`));
                    }
                });

                // 에러 이벤트
                xhr.addEventListener('error', () => {
                    if (progressBar) {
                        completeProgressBar(progressBar, false);
                    }
                    reject(new Error('네트워크 오류'));
                });

                // 요청 전송
                xhr.open('POST', fileConfig.uploadEndpoint);
                xhr.send(formData);
            });

        } catch (error) {
            if (progressBar) {
                completeProgressBar(progressBar, false);
            }
            throw error;
        }
    }

    /**
     * 모달 템플릿
     */
    const template = `
    <div class="modal-overlay">
        <div class="modal-content">            
            <div>
                <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #333;">이미지 삽입</h3>
                
                <div style="margin-bottom: 10px;">
                    <label style="display: block; font-size: 13px; font-weight: 500; color: #666; margin-bottom: 4px;">
                        URL 입력
                    </label>
                    <input type="url" 
                           id="image-url-input"
                           placeholder="https://example.com/image.jpg" 
                           style="width: 100%; padding: 8px 12px; font-size: 13px; border: 1px solid #ddd; border-radius: 6px; outline: none; box-sizing: border-box;">
                </div>
                
                <div style="display: flex; align-items: center; margin: 15px 0;">
                    <div style="font-size: 11px; color: #888; margin-right: 8px;">또는</div>
                    <div style="flex-grow: 1; height: 1px; background-color: #e0e0e0;"></div>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="display: block; font-size: 13px; font-weight: 500; color: #666; margin-bottom: 4px;">
                        파일 업로드
                    </label>
                    <div style="display: flex; align-items: center; justify-content: center; width: 100%;">
                        <label style="width: 100%; display: flex; flex-direction: column; align-items: center; padding: 16px; background-color: #f8f9fa; color: #666; border-radius: 6px; border: 2px dashed #ddd; cursor: pointer; transition: all 0.2s ease;">
                            <span class="material-icons" style="font-size: 24px; margin-bottom: 6px; color: #4285f4;">add_photo_alternate</span>
                            <span class="upload-text" style="font-size: 12px; text-align: center;">파일을 선택하거나<br>여기로 드래그하세요</span>
                            <span class="file-info" style="font-size: 11px; color: #999; margin-top: 4px;">최대 ${fileConfig.maxSizeMB}MB, ${fileConfig.allowedTypes.join(', ').toUpperCase()}</span>
                            <input type="file" id="image-file-input" style="display: none;" accept="${fileConfig.allowedMimeTypes.join(',')}">
                        </label>
                    </div>
                </div>
            </div>
            
            <div style="display: flex; justify-content: flex-end; gap: 8px;">
                <button type="button" id="cancel-btn"
                        style="padding: 8px 16px; border-radius: 6px; border: 1px solid #ddd; background-color: #fff; color: #666; cursor: pointer; font-size: 13px;">
                    취소
                </button>
                <button type="submit"
                        style="padding: 8px 16px; border-radius: 6px; border: none; background-color: #4285f4; color: #fff; cursor: pointer; font-size: 13px;">
                    삽입
                </button>
            </div>
        </div>
    </div>`;

    /**
     * 모달 관리 함수들
     */
    function closeModal(modal) {
        if (!modal) return;
        
        modal.classList.remove('show');
        modal.style.opacity = '0';
        modal.style.visibility = 'hidden';
        
        if (util.activeModalManager) {
            util.activeModalManager.unregister(modal);
        }
        
        setTimeout(() => modal.remove(), 300);
    }

    function createModal() {
        saveSelection();

        const existingModal = document.querySelector('.modal-overlay');
        if (existingModal) existingModal.remove();

        const modalContainer = util.dom ? util.dom.createElement('div') : document.createElement('div');
        modalContainer.innerHTML = template;
        const modal = modalContainer.firstElementChild;
        document.body.appendChild(modal);

        setupModalEvents(modal);
        return modal;
    }

    function setupModalEvents(modal) {
        const insertButton = modal.querySelector('button[type="submit"]');
        const cancelButton = modal.querySelector('#cancel-btn');
        const urlInput = modal.querySelector('#image-url-input');
        const fileInput = modal.querySelector('#image-file-input');
        const fileLabel = fileInput.parentElement;
        const uploadText = modal.querySelector('.upload-text');

        // 🔧 모달 내부 클릭 시 이벤트 버블링 방지
        modal.querySelector('.modal-content').addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // 🔧 모달 외부 클릭으로 닫기 (배경 클릭 시)
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal);
            }
        });

        // 취소 버튼
        cancelButton.addEventListener('click', () => closeModal(modal));

        // 🔧 URL 입력 이벤트 (클릭 시 이벤트 전파 방지)
        urlInput.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        urlInput.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') e.stopPropagation();
            if (e.key === 'Enter') {
                e.preventDefault();
                const url = urlInput.value.trim();
                if (url) processImageInsertion(url, null, modal);
            }
        });

        // 파일 선택 이벤트
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                uploadText.innerHTML = `선택됨: ${file.name}<br><span style="color: #4285f4;">${formatFileSize(file.size)}</span>`;
                fileLabel.style.borderColor = '#4285f4';
                fileLabel.style.backgroundColor = '#f0f7ff';
            }
        });

        // 드래그 앤 드롭 이벤트
        fileLabel.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileLabel.style.borderColor = '#4285f4';
            fileLabel.style.backgroundColor = '#f0f7ff';
        });

        fileLabel.addEventListener('dragleave', (e) => {
            e.preventDefault();
            if (!fileInput.files[0]) {
                fileLabel.style.borderColor = '#ddd';
                fileLabel.style.backgroundColor = '#f8f9fa';
            }
        });

        fileLabel.addEventListener('drop', (e) => {
            e.preventDefault();
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                fileInput.files = files;
                fileInput.dispatchEvent(new Event('change'));
            }
        });

        // 삽입 버튼
        insertButton.addEventListener('click', async (e) => {
            e.preventDefault();
            
            const url = urlInput.value.trim();
            const file = fileInput.files[0];
            
            if (url || file) {
                await processImageInsertion(url, file, modal);
            } else {
                errorHandler.showUserAlert('P803', 'URL을 입력하거나 파일을 선택해주세요.');
            }
        });
    }

    /**
     * 이미지 삽입 처리
     */
    async function processImageInsertion(url, file, modal) {
        try {
            closeModal(modal);

            let finalUrl = url;

            if (file) {
                // 파일 업로드
                const uploadResult = await uploadFile(file);
                if (!uploadResult) return;

                finalUrl = uploadResult.path;
                
                // 업로드 결과 alert로 표시 (PRD 요구사항) - 원본 파일명 추가
                const alertMessage = `업로드 완료!
원본 파일명: ${uploadResult.originalName}
경로: ${uploadResult.path}
저장된 파일명: ${uploadResult.filename}
UUID: ${uploadResult.uuid}
크기: ${uploadResult.formattedSize}
확장자: ${uploadResult.extension}`;
                alert(alertMessage);
            }

            // 이미지 삽입
            if (finalUrl) {
                insertImage(finalUrl);
            }

        } catch (error) {
            errorHandler.logError(MODULE_NAME, 'P801', error);
            errorHandler.showUserAlert('P801', `업로드 실패: ${error.message}`);
        }
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
     * 모달 표시
     */
    function showModal() {
        const modal = createModal();
        const button = document.querySelector('.lite-editor-image-upload-button');
        
        if (button && util.layer && util.layer.setLayerPosition) {
            util.layer.setLayerPosition(modal, button);
        }
        
        setTimeout(() => {
            modal.style.removeProperty('opacity');
            modal.style.removeProperty('visibility');
            modal.classList.add('show');
            
            if (util.activeModalManager) {
                util.activeModalManager.register(modal);
                modal.closeCallback = () => closeModal(modal);
            }
            
            requestAnimationFrame(() => {
                const urlInput = modal.querySelector('#image-url-input');
                if (urlInput) urlInput.focus();
            });
        }, 10);

        setupGlobalEvents();
    }

    /**
     * 이미지 삽입 함수
     */
    function insertImage(src) {
        if (!src) {
            errorHandler.logError(MODULE_NAME, 'P803', '빈 URL');
            return;
        }

        // URL 보안 체크
        if (security.isValidImageUrl && !security.isValidImageUrl(src)) {
            errorHandler.showUserAlert('P803');
            return;
        }

        const contentArea = document.querySelector('.lite-editor-content');
        if (!contentArea) {
            errorHandler.logError(MODULE_NAME, 'P802', 'Content area를 찾을 수 없음');
            return;
        }

        // 스크롤 위치 저장
        const scrollPosition = util.scroll ? util.scroll.savePosition() : null;

        try {
            contentArea.focus({ preventScroll: true });
            
            // 선택 영역 복원
            const selectionRestored = util.selection ? util.selection.restoreSelection(savedRange) : false;
            
            // 고유 ID 생성
            const timestamp = Date.now();
            const imageId = `img-${timestamp}`;
            
            // 이미지 컨테이너 생성
            const wrapper = document.createElement('div');
            wrapper.className = 'image-wrapper';
            wrapper.id = imageId;
            wrapper.contentEditable = false;
            wrapper.setAttribute('data-selectable', 'true');
            wrapper.draggable = true;
            
            // 기본 스타일
            wrapper.style.display = 'inline-block';
            wrapper.style.position = 'relative';
            wrapper.style.margin = '10px 0';
            wrapper.style.maxWidth = '95%';
            wrapper.style.resize = 'both';
            wrapper.style.overflow = 'hidden';
            wrapper.style.boxSizing = 'border-box';
            
            // 이미지 요소 생성
            const img = document.createElement('img');
            img.src = src;
            img.style.width = '100%';
            img.style.height = 'auto';
            img.style.display = 'block';

            wrapper.appendChild(img);
                
            // 에디터에 삽입
            let insertSuccess = false;
            
            if (selectionRestored) {
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    const isInsideEditor = contentArea.contains(range.startContainer);
                    
                    if (isInsideEditor) {
                        range.deleteContents();
                        range.insertNode(wrapper);
                        insertSuccess = true;
                    }
                }
            }
            
            // 대안: 에디터 끝에 삽입
            if (!insertSuccess) {
                contentArea.appendChild(wrapper);
            }
            
            // 스크롤 위치 복원
            if (scrollPosition && util.scroll) {
                util.scroll.restorePosition(scrollPosition);
            }
            
            // 에디터 이벤트 발생
            if (util.editor && util.editor.dispatchEditorEvent) {
                util.editor.dispatchEditorEvent(contentArea);
            }
            
            errorHandler.logInfo(MODULE_NAME, `이미지 삽입 완료: ${imageId}`);
            
        } catch (error) {
            errorHandler.logError(MODULE_NAME, 'P801', error);
            if (scrollPosition && util.scroll) {
                util.scroll.restorePosition(scrollPosition);
            }
        }
    }

    /**
     * 전역 이벤트 설정
     */
    function setupGlobalEvents() {
        if (isEventHandlerRegistered) return;
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.querySelector('.modal-overlay.show');
                if (modal) closeModal(modal);
            }
        });
        
        isEventHandlerRegistered = true;
    }

    /**
     * CSS 스타일 로드
     */
    function loadStyles() {
        const cssId = 'imageUploadStyles';
        if (document.getElementById(cssId)) return;

        const css = `
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
        }
        
        .modal-overlay.show {
            opacity: 1;
            visibility: visible;
        }
        
        .modal-content {
            background: white;
            border-radius: 8px;
            padding: 20px;
            width: 400px;
            max-width: 90vw;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }
        
        .image-wrapper {
            border: 2px dashed transparent;
            transition: all 0.2s ease;
        }
        
        .image-wrapper:hover {
            border-color: #4285f4;
        }
        
        .image-wrapper.selected {
            border-color: #4285f4;
            box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.2);
        }
        `;

        util.styles.addInlineStyle(cssId, css);
    }

    /**
     * 플러그인 초기화
     */
    function init() {
        loadStyles();
        
        if (util.registerPlugin) {
            util.registerPlugin(PLUGIN_ID, {
                title: 'Image Upload',
                icon: 'add_photo_alternate',
                action: showModal
            });
        }
    }

    // 플러그인 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();