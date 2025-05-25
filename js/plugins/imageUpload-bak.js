/**
 * LiteEditor imageUpload Plugin - 리셋 버전
 * 이미지 업로드 기본 기능만 포함 - 0525 오전 드래그앤드롭 개발 직전코드
 */
(function() {
    const util = window.PluginUtil || {};
    
    // 상수 및 변수 선언
    const PLUGIN_ID = 'imageUpload';
    const STYLE_ID = 'imageUploadStyles';
    const CSS_PATH = 'css/plugins/imageUpload.css';
    let isEventHandlerRegistered = false;
    let savedRange = null;
    let selectedImage = null;
    let copiedImageData = null;
    let isCut = false;

    // 🔧 selection 저장 함수
    function saveSelection() {
        savedRange = util.selection ? util.selection.saveSelection() : null;
    }

    // 🔧 에디터 요소 찾기
    function getEditorElements() {
        return {
            container: document.querySelector('#lite-editor'),
            content: document.querySelector('.lite-editor-content')
        };
    }

    // 🔧 모달 템플릿
    const template = `
    <div class="modal-overlay">
        <div class="modal-content">            
            <div>
                <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #333;">Insert Image</h3>
                
                <div style="margin-bottom: 10px;">
                    <label style="display: block; font-size: 13px; font-weight: 500; color: #666; margin-bottom: 4px;">
                    URL
                    </label>
                    <input type="url" 
                           id="image-url-input"
                           placeholder="https://" 
                           style="width: 100%; padding: 6px 8px; font-size: 13px; border: 1px solid #ccc; border-radius: 4px; outline: none;">
                </div>
                
                <div style="display: flex; align-items: center; margin: 15px 0;">
                    <div style="font-size: 11px; color: #888; margin-right: 8px;">OR</div>
                    <div style="flex-grow: 1; height: 1px; background-color: #e0e0e0;"></div>
                </div>

                <div style="margin-bottom: 10px;">
                    <label style="display: block; font-size: 13px; font-weight: 500; color: #666; margin-bottom: 4px;">
                     File
                    </label>
                    <div style="display: flex; align-items: center; justify-content: center; width: 100%;">
                        <label style="width: 100%; display: flex; flex-direction: column; align-items: center; padding: 10px; background-color: #f8f9fa; color: #666; border-radius: 4px; border: 1px dashed #ccc; cursor: pointer;">
                            <span class="material-icons" style="font-size: 20px; margin-bottom: 4px;">add_photo_alternate</span>
                            <span style="font-size: 12px;">Select a File</span>
                            <input type="file" id="image-file-input" style="display: none;" accept="image/*">
                        </label>
                    </div>
                </div>
            </div>
            
            <div style="display: flex; justify-content: flex-end;">
                <button type="submit"
                        style="display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 4px; border: none; background-color: transparent; cursor: pointer;"
                        title="Insert">
                    <span class="material-icons" style="font-size: 18px; color: #5f6368;">add_circle</span>
                </button>
            </div>
        </div>
    </div>`;

    // 모달 관리 함수들
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
        const urlInput = modal.querySelector('#image-url-input');
        const fileInput = modal.querySelector('#image-file-input');

        const button = document.querySelector('.lite-editor-image-upload-button');
        if (util.setupOutsideClickHandler) {
            util.setupOutsideClickHandler(modal, () => closeModal(modal), [button]);
        }
        
        urlInput.addEventListener('click', (e) => e.stopPropagation());

        urlInput.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') e.stopPropagation();
            if (e.key === 'Enter') {
                e.preventDefault();
                const url = urlInput.value.trim();
                if (url) processImageInsertion(url, null, modal);
            }
        });

        fileInput.addEventListener('change', (e) => {
            const fileName = e.target.files[0]?.name;
            const textSpan = fileInput.parentElement.querySelector('span:not(.material-icons)');
            
            if (fileName && textSpan) {
                textSpan.textContent = fileName;
            }
        });

        insertButton.addEventListener('click', (e) => {
            e.preventDefault();
            
            const url = urlInput.value.trim();
            const file = fileInput.files[0];
            
            if (url || file) {
                processImageInsertion(url, file, modal);
            } else {
                console.log('URL 또는 파일이 필요합니다');
            }
        });
    }

    function processImageInsertion(url, file, modal) {
        console.log('[IMAGE_UPLOAD] 처리 시작:', { url: !!url, file: !!file });
        
        closeModal(modal);
        
        if (url) {
            console.log('[IMAGE_UPLOAD] URL 이미지:', url);
            insertImage(url);
        } else if (file) {
            console.log('[IMAGE_UPLOAD] 파일 처리 시작');
            const reader = new FileReader();
            reader.onload = (e) => {
                console.log('[IMAGE_UPLOAD] 파일 읽기 완료');
                insertImage(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    }

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
            }
            
            requestAnimationFrame(() => {
                const urlInput = modal.querySelector('#image-url-input');
                if (urlInput) urlInput.focus();
            });
        }, 10);

        setupGlobalEvents();
    }

    function setupGlobalEvents() {
        if (isEventHandlerRegistered) return;
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.querySelector('.modal-overlay.show');
                if (modal) closeModal(modal);
            }
        });
        
        setupCopyPasteEvents();
        
        isEventHandlerRegistered = true;
    }

    // 🔧 이미지 삽입 함수 (media.js 스타일 참고)
    function insertImage(src) {
        const MODULE_NAME = 'IMAGE_UPLOAD';
        const errorHandler = window.errorHandler || {};
        const security = window.LiteEditorSecurity || {};
        
        if (!src) {
            errorHandler.logError && errorHandler.logError(MODULE_NAME, 'P803', '빈 URL');
            return;
        }

        // URL 보안 체크 (security-manager.js 활용)
        if (security.isValidImageUrl && !security.isValidImageUrl(src)) {
            errorHandler.showUserAlert && errorHandler.showUserAlert('P803');
            return;
        }

        const contentArea = document.querySelector('.lite-editor-content');
        if (!contentArea) {
            errorHandler.logError && errorHandler.logError(MODULE_NAME, 'P802', 'Content area를 찾을 수 없음');
            return;
        }

        // 🔧 스크롤 위치 저장 (plugin-util.js 활용)
        const scrollPosition = util.scroll ? util.scroll.savePosition() : null;
        
        // 현재 선택 영역 정보 로그 (debugging)
        if (errorHandler.logSelectionOffsets) {
            const selectionInfo = errorHandler.logSelectionOffsets(contentArea);
            errorHandler.colorLog && errorHandler.colorLog(MODULE_NAME, '이미지 삽입 위치', selectionInfo, '#9c27b0');
        }

        try {
            contentArea.focus({ preventScroll: true });
            
            // 선택 영역 복원
            const selectionRestored = util.selection ? util.selection.restoreSelection(savedRange) : false;
            
            // 고유 ID 생성
            const timestamp = Date.now();
            const imageId = `img-${timestamp}`;
            
            // 🔧 이미지 컨테이너 생성 (media.js 스타일 참고)
            const wrapper = document.createElement('div');
            wrapper.className = 'image-wrapper';
            wrapper.id = imageId;
            wrapper.contentEditable = false;
            wrapper.setAttribute('data-selectable', 'true');
            
            // 기본 스타일 (원본 크기, 최대 95%)
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
            
            // 🔧 리사이즈 핸들 추가 (media.js 스타일)
            const resizeHandle = util.dom ? util.dom.createElement('div', {
                className: 'image-resize-handle'
            }) : document.createElement('div');
            
            resizeHandle.style.position = 'absolute';
            resizeHandle.style.right = '0';
            resizeHandle.style.bottom = '0';
            resizeHandle.style.width = '10px';
            resizeHandle.style.height = '10px';
            resizeHandle.style.backgroundImage = 'linear-gradient(135deg, transparent 50%, #4285f4 50%, #4285f4 100%)';
            resizeHandle.style.cursor = 'nwse-resize';
            resizeHandle.style.zIndex = '10';
            
            wrapper.appendChild(img);
            wrapper.appendChild(resizeHandle);
            
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
            
            // 🔧 스크롤 위치 복원 (plugin-util.js 활용)
            if (scrollPosition && util.scroll) {
                util.scroll.restorePosition(scrollPosition);
            }
            
            // 에디터 이벤트 발생
            if (util.editor && util.editor.dispatchEditorEvent) {
                util.editor.dispatchEditorEvent(contentArea);
            }
            
            errorHandler.colorLog && errorHandler.colorLog(MODULE_NAME, '이미지 삽입 완료', { id: imageId, src: src.substring(0, 50) + '...' }, '#4caf50');
            
            // 이미지 이벤트 설정
            setupImageEvents(wrapper);
            
        } catch (error) {
            errorHandler.logError && errorHandler.logError(MODULE_NAME, 'P801', error);
            if (scrollPosition && util.scroll) {
                util.scroll.restorePosition(scrollPosition);
            }
        }
    }

    // 🔧 이미지 이벤트 설정 함수
    function setupImageEvents(imageWrapper) {
        const MODULE_NAME = 'IMAGE_UPLOAD';
        const errorHandler = window.errorHandler || {};
        
        // 클릭 선택 (dimmed 처리)
        imageWrapper.addEventListener('click', (e) => {
            e.stopPropagation();
            selectImage(imageWrapper);
        });
        
        // 리사이징 핸들 이벤트 (media.js 스타일)
        const resizeHandle = imageWrapper.querySelector('.image-resize-handle');
        if (resizeHandle) {
            setupResizeHandle(imageWrapper, resizeHandle);
        }
    }

    // 🔧 이미지 선택 관리 (dimmed 처리)
    function selectImage(imageWrapper) {
        const MODULE_NAME = 'IMAGE_UPLOAD';
        const errorHandler = window.errorHandler || {};
        
        // 기존 선택 해제
        if (selectedImage && selectedImage !== imageWrapper) {
            selectedImage.style.filter = '';
            selectedImage.style.border = '';
        }
        
        // 새 이미지 선택 (dimmed 처리)
        selectedImage = imageWrapper;
        selectedImage.style.filter = 'brightness(0.7)';
        selectedImage.style.border = '2px solid #4285f4';
        
        errorHandler.colorLog && errorHandler.colorLog(MODULE_NAME, '이미지 선택됨', { id: imageWrapper.id }, '#ff9800');
    }

    function deselectImage() {
        const MODULE_NAME = 'IMAGE_UPLOAD';
        const errorHandler = window.errorHandler || {};
        
        if (selectedImage) {
            selectedImage.style.filter = '';
            selectedImage.style.border = '';
            selectedImage = null;
            
            errorHandler.colorLog && errorHandler.colorLog(MODULE_NAME, '이미지 선택 해제됨', null, '#757575');
        }
    }

    // 🔧 리사이즈 핸들 설정 (media.js 스타일 참고)
    function setupResizeHandle(imageWrapper, resizeHandle) {
        const MODULE_NAME = 'IMAGE_UPLOAD';
        const errorHandler = window.errorHandler || {};
        
        let isResizing = false;
        let startX, startY, startWidth, startHeight;

        resizeHandle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            
            const rect = imageWrapper.getBoundingClientRect();
            startWidth = rect.width;
            startHeight = rect.height;
            
            // 리사이징 시 테두리 제거
            imageWrapper.style.border = 'none';
            imageWrapper.style.filter = '';
            
            document.addEventListener('mousemove', handleResize);
            document.addEventListener('mouseup', stopResize);
            
            errorHandler.colorLog && errorHandler.colorLog(MODULE_NAME, '리사이징 시작', { id: imageWrapper.id }, '#ff9800');
        });

        function handleResize(e) {
            if (!isResizing) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            const newWidth = startWidth + deltaX;
            const newHeight = startHeight + deltaY;
            
            // 최소 크기 제한
            if (newWidth > 50 && newHeight > 50) {
                imageWrapper.style.width = newWidth + 'px';
                imageWrapper.style.height = newHeight + 'px';
            }
        }

        function stopResize() {
            if (!isResizing) return;
            
            isResizing = false;
            document.removeEventListener('mousemove', handleResize);
            document.removeEventListener('mouseup', stopResize);
            
            // 에디터 이벤트 발생
            const contentArea = document.querySelector('.lite-editor-content');
            if (contentArea && util.editor && util.editor.dispatchEditorEvent) {
                util.editor.dispatchEditorEvent(contentArea);
            }
            
            errorHandler.colorLog && errorHandler.colorLog(MODULE_NAME, '리사이징 완료', { 
                id: imageWrapper.id,
                width: imageWrapper.style.width,
                height: imageWrapper.style.height
            }, '#4caf50');
        }
    }

    // 🔧 복사/붙여넣기 기능 (setupGlobalEvents 함수 내 추가)
    function setupCopyPasteEvents() {
        const MODULE_NAME = 'IMAGE_UPLOAD';
        const errorHandler = window.errorHandler || {};
        
        document.addEventListener('keydown', (e) => {
            if (!selectedImage) return;
            
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 'c': // 복사
                        e.preventDefault();
                        
                        // 🔧 새로운 복사 시에만 기존 데이터 초기화
                        copiedImageData = selectedImage.outerHTML;
                        isCut = false; // 복사는 항상 cut=false
                        
                        // 🔧 복사 시 상세 로그
                        errorHandler.colorLog && errorHandler.colorLog(MODULE_NAME, '이미지 복사됨', { 
                            id: selectedImage.id,
                            tagName: selectedImage.tagName,
                            className: selectedImage.className,
                            dataLength: copiedImageData.length,
                            hasResizeHandle: !!selectedImage.querySelector('.image-resize-handle'),
                            htmlPreview: copiedImageData.substring(0, 200) + '...',
                            imageSource: selectedImage.querySelector('img') ? selectedImage.querySelector('img').src.substring(0, 50) + '...' : 'none'
                        }, '#4caf50');
                        break;
                        
                    case 'x': // 잘라내기
                        e.preventDefault();
                        
                        // 🔧 새로운 잘라내기 시에만 기존 데이터 초기화
                        copiedImageData = selectedImage.outerHTML;
                        isCut = true; // 잘라내기 플래그 설정
                        selectedImage.style.opacity = '0.3';
                        
                        errorHandler.colorLog && errorHandler.colorLog(MODULE_NAME, '이미지 잘라내기됨', { 
                            id: selectedImage.id,
                            htmlPreview: copiedImageData.substring(0, 200) + '...'
                        }, '#ff9800');
                        break;
                        
                    case 'v': // 붙여넣기
                        if (copiedImageData) {
                            e.preventDefault();
                            pasteImageAtCursor();
                        }
                        break;
                }
            }
        });
        
        // 외부 클릭으로 이미지 선택 해제
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.image-wrapper')) {
                deselectImage();
            }
        });
    }

    // 🔧 이미지 붙여넣기 함수 (수정)
    function pasteImageAtCursor() {
        const MODULE_NAME = 'IMAGE_UPLOAD';
        const errorHandler = window.errorHandler || {};
        const contentArea = document.querySelector('.lite-editor-content');
        
        // 🔧 초기 상태 로그 추가
        errorHandler.colorLog && errorHandler.colorLog(MODULE_NAME, '붙여넣기 시도', { 
            hasContentArea: !!contentArea,
            hasCopiedData: !!copiedImageData,
            copiedDataLength: copiedImageData ? copiedImageData.length : 0,
            isCut: isCut
        }, '#2196f3');
        
        if (!contentArea || !copiedImageData) {
            errorHandler.colorLog && errorHandler.colorLog(MODULE_NAME, '붙여넣기 실패 - 조건 미충족', { 
                contentArea: !!contentArea,
                copiedImageData: !!copiedImageData
            }, '#f44336');
            return;
        }
        
        const selection = window.getSelection();
        
        // 🔧 Selection 상태 로그 추가
        errorHandler.colorLog && errorHandler.colorLog(MODULE_NAME, 'Selection 상태', { 
            hasSelection: !!selection,
            rangeCount: selection ? selection.rangeCount : 0,
            isCollapsed: selection && selection.rangeCount > 0 ? selection.getRangeAt(0).collapsed : null
        }, '#9c27b0');
        
        // 🔧 Selection이 없는 경우 커서를 에디터 끝으로 이동
        if (!selection || selection.rangeCount === 0) {
            errorHandler.colorLog && errorHandler.colorLog(MODULE_NAME, 'Selection 없음 - 에디터 끝에 삽입', null, '#ff9800');
            
            // 에디터 끝에 직접 삽입
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = copiedImageData;
            const newImageWrapper = tempDiv.firstElementChild;
            
            // 새 ID 생성
            const timestamp = Date.now();
            newImageWrapper.id = `img-${timestamp}`;
            newImageWrapper.style.opacity = '1';
            
            // 🔧 잘라내기였다면 원본 제거 (한 번만)
            if (isCut && selectedImage) {
                selectedImage.remove();
                deselectImage();
                isCut = false; // ✅ 잘라내기는 한 번만 실행되도록
            }
            
            contentArea.appendChild(newImageWrapper);
            setupImageEvents(newImageWrapper);
            
            // 🔧 복사 데이터는 유지 (잘라내기만 초기화됨)
            // copiedImageData = null; // ❌ 제거: 여러 번 붙여넣기 허용
            
            // 에디터 이벤트 발생
            if (util.editor && util.editor.dispatchEditorEvent) {
                util.editor.dispatchEditorEvent(contentArea);
            }
            
            // 🔧 상세 로그 출력
            errorHandler.colorLog && errorHandler.colorLog(MODULE_NAME, '이미지 붙여넣기 완료 (에디터 끝)', { 
                id: newImageWrapper.id,
                insertMethod: 'appendChild',
                originalHtml: copiedImageData.substring(0, 200) + '...',
                finalHtml: newImageWrapper.outerHTML.substring(0, 200) + '...',
                wasCut: false // 이미 처리됨
            }, '#4caf50');
            
            return;
        }
        
        // 🔧 기존 Range 기반 삽입 로직
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            
            // 🔧 Range 정보 로그
            errorHandler.colorLog && errorHandler.colorLog(MODULE_NAME, 'Range 정보', { 
                startContainer: range.startContainer.nodeName,
                startOffset: range.startOffset,
                endContainer: range.endContainer.nodeName,
                endOffset: range.endOffset,
                collapsed: range.collapsed
            }, '#9c27b0');
            
            // 🔧 잘라내기였다면 원본 제거 (한 번만)
            if (isCut && selectedImage) {
                errorHandler.colorLog && errorHandler.colorLog(MODULE_NAME, '잘라내기 원본 제거', { 
                    originalId: selectedImage.id 
                }, '#ff5722');
                selectedImage.remove();
                deselectImage();
                isCut = false; // ✅ 잘라내기는 한 번만 실행되도록
            }
            
            // 새 이미지 HTML 생성
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = copiedImageData;
            const newImageWrapper = tempDiv.firstElementChild;
            
            // 새 ID 생성
            const timestamp = Date.now();
            const oldId = newImageWrapper.id;
            newImageWrapper.id = `img-${timestamp}`;
            newImageWrapper.style.opacity = '1';
            
            // 🔧 HTML 변환 과정 로그
            errorHandler.colorLog && errorHandler.colorLog(MODULE_NAME, 'HTML 변환 과정', { 
                originalHtml: copiedImageData.substring(0, 200) + '...',
                tempDivInnerHTML: tempDiv.innerHTML.substring(0, 200) + '...',
                newElementTagName: newImageWrapper.tagName,
                oldId: oldId,
                newId: newImageWrapper.id,
                hasResizeHandle: !!newImageWrapper.querySelector('.image-resize-handle')
            }, '#673ab7');
            
            // 현재 커서 위치에 삽입
            range.deleteContents();
            range.insertNode(newImageWrapper);
            
            // 이벤트 설정
            setupImageEvents(newImageWrapper);
            
            // 커서를 이미지 다음으로 이동
            range.setStartAfter(newImageWrapper);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
            
            // 🔧 복사 데이터는 유지 (잘라내기만 초기화됨)
            // copiedImageData = null; // ❌ 제거: 여러 번 붙여넣기 허용
            
            // 에디터 이벤트 발생
            if (util.editor && util.editor.dispatchEditorEvent) {
                util.editor.dispatchEditorEvent(contentArea);
            }
            
            // 🔧 최종 상세 로그 출력
            errorHandler.colorLog && errorHandler.colorLog(MODULE_NAME, '이미지 붙여넣기 완료 (Range 삽입)', { 
                id: newImageWrapper.id,
                insertMethod: 'range.insertNode',
                wasCut: false, // 이미 처리됨
                finalHtml: newImageWrapper.outerHTML.substring(0, 200) + '...',
                parentElement: newImageWrapper.parentElement ? newImageWrapper.parentElement.tagName : 'none',
                nextSibling: newImageWrapper.nextSibling ? newImageWrapper.nextSibling.nodeName : 'none',
                previousSibling: newImageWrapper.previousSibling ? newImageWrapper.previousSibling.nodeName : 'none'
            }, '#4caf50');
        }
    }

    // 플러그인 등록
    LiteEditor.registerPlugin(PLUGIN_ID, {
        title: 'Image upload',
        icon: 'photo_camera',
        customRender: function(toolbar, contentArea) {
            if (util.styles && util.styles.loadCssFile) {
                util.styles.loadCssFile(STYLE_ID, CSS_PATH);
            }

            const button = util.dom ? 
                util.dom.createElement('button', {
                    className: 'lite-editor-button lite-editor-image-upload-button',
                    title: 'Image upload'
                }) : 
                (() => {
                    const btn = document.createElement('button');
                    btn.className = 'lite-editor-button lite-editor-image-upload-button';
                    btn.title = 'Image upload';
                    return btn;
                })();
            
            const icon = util.dom ? 
                util.dom.createElement('i', {
                    className: 'material-symbols-outlined',
                    textContent: 'photo_camera'
                }) :
                (() => {
                    const i = document.createElement('i');
                    i.className = 'material-symbols-outlined';
                    i.textContent = 'photo_camera';
                    return i;
                })();
            button.appendChild(icon);
            
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const existingModal = document.querySelector('.modal-overlay.show');
                if (existingModal) {
                    closeModal(existingModal);
                    return;
                }
                
                showModal();
            });
            
            toolbar.appendChild(button);
            setupGlobalEvents();
        }
    });
})();