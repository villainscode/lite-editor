/**
 * LiteEditor imageUpload Plugin - 메인 이미지 레이아웃 플러그인
 * ImageUploadModule을 사용하여 파일 업로드 처리
 */
(function() {
    const util = window.PluginUtil || {};
    const errorHandler = window.errorHandler || {};
    const security = window.LiteEditorSecurity || {};
    
    // 상수 및 변수 선언
    const PLUGIN_ID = 'imageUpload';
    const MODULE_NAME = 'IMAGE_UPLOAD';
    const STYLE_ID = 'imageUploadStyles';
    const CSS_PATH = 'css/plugins/imageUpload.css';
    let isEventHandlerRegistered = false;
    let savedRange = null;
    let selectedImage = null;
    let copiedImageData = null;
    let isCut = false;

    // selection 저장 함수
    function saveSelection() {
        savedRange = util.selection ? util.selection.saveSelection() : null;
    }

    // 모달 템플릿
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
        
        setTimeout(() => {
            if (modal.parentNode) {
                modal.remove();
            }
        }, 300);
    }

    function createModal() {
        saveSelection();

        const existingModal = document.querySelector('.modal-overlay');
        if (existingModal) existingModal.remove();

        const modalContainer = util.dom ? util.dom.createElement('div') : document.createElement('div');
        modalContainer.innerHTML = template;
        const modal = modalContainer.firstElementChild;
        
        // ✅ 식별자 추가
        modal.classList.add('image-upload-modal');
        
        document.body.appendChild(modal);

        setupModalEvents(modal);
        setupModalCloseEvents(modal);
        return modal;
    }

    function setupModalEvents(modal) {
        const insertButton = modal.querySelector('button[type="submit"]');
        const urlInput = modal.querySelector('#image-url-input');
        const fileInput = modal.querySelector('#image-file-input');

        if (!insertButton) return;

        // ✅ URL 입력 포커스 보호
        urlInput.addEventListener('focus', (e) => {
            e.stopPropagation(); // 포커스 이벤트 보호
        });

        urlInput.addEventListener('click', (e) => {
            e.stopPropagation(); // 클릭 이벤트 보호
        });

        // ✅ URL 입력 키 이벤트
        urlInput.addEventListener('keydown', (e) => {
            e.stopPropagation();
            
            if (e.key === 'Enter') {
                e.preventDefault();
                const url = urlInput.value.trim();
                
                if (url) {
                    processImageInsertion(url, null, modal);
                } else {
                    // ✅ Enter로 빈 URL 시: Alert만 표시, 콜백에서 모달 닫기
                    errorHandler.showUserAlert('P803');
                    
                    // Alert 후 모달 닫기 (link.js와 동일한 방식)
                    setTimeout(() => {
                        modal.style.transition = 'opacity 0.5s ease-out';
                        modal.style.opacity = '0';
                        
                        setTimeout(() => {
                            closeModal(modal);
                        }, 500);
                    }, 100); // Alert가 완전히 표시된 후 실행
                }
            }
            
            if (e.key === 'Escape') {
                closeModal(modal);
            }
        });

        // ✅ 파일 입력 보호
        fileInput.addEventListener('change', (e) => {
            e.stopPropagation();
            
            const file = e.target.files[0];
            const textSpan = fileInput.parentElement.querySelector('span:not(.material-icons)');
            
            if (file && textSpan) {
                const fileSize = window.ImageUploadModule?.formatFileSize(file.size) || 
                                `${Math.round(file.size / 1024)}KB`;
                    
                textSpan.innerHTML = `${file.name}<br><span style="color: #4285f4; font-size: 11px;">${fileSize}</span>`;
                fileInput.parentElement.style.borderColor = '#4285f4';
                fileInput.parentElement.style.backgroundColor = '#f0f7ff';
            } else if (textSpan) {
                textSpan.textContent = 'Select a File';
                fileInput.parentElement.style.borderColor = '#ccc';
                fileInput.parentElement.style.backgroundColor = '#f8f9fa';
            }
        });

        // ✅ 파일 선택 영역 보호
        const fileLabel = fileInput.parentElement;
        fileLabel.addEventListener('click', (e) => {
            e.stopPropagation(); // 파일 선택 영역 클릭 보호
        });

        // ✅ Insert 버튼
        insertButton.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const url = urlInput.value.trim();
            const file = fileInput.files[0];
            
            if (file) {
                // ✅ 파일 선택 시: Alert + fade out 콜백
                LiteEditorModal.alert('업로드 기능 준비중입니다.\n\nURL 링크를 통한 이미지 삽입을 이용해 주세요.', {
                    onConfirm: () => {
                        // Alert 확인 후 fade out 처리
                        setTimeout(() => {
                            modal.style.transition = 'opacity 0.5s ease-out';
                            modal.style.opacity = '0';
                            
                            setTimeout(() => {
                                closeModal(modal);
                                
                                // 에디터 포커스 복원
                                const contentArea = document.querySelector('.lite-editor-content');
                                if (contentArea) {
                                    try {
                                        contentArea.focus({ preventScroll: true });
                                        if (savedRange && util.selection) {
                                            util.selection.restoreSelection(savedRange);
                                        }
                                    } catch (e) {
                                        contentArea.focus();
                                    }
                                }
                            }, 500);
                        }, 10);
                    }
                });
                return;
            }
            
            if (url) {
                await processImageInsertion(url, null, modal);
            } else {
                // ✅ 빈 URL 시: Alert + fade out 콜백
                LiteEditorModal.alert('유효한 이미지 URL을 입력해주세요', {
                    onConfirm: () => {
                        setTimeout(() => {
                            modal.style.transition = 'opacity 0.5s ease-out';
                            modal.style.opacity = '0';
                            
                            setTimeout(() => {
                                closeModal(modal);
                                
                                const contentArea = document.querySelector('.lite-editor-content');
                                if (contentArea) {
                                    try {
                                        contentArea.focus({ preventScroll: true });
                                        if (savedRange && util.selection) {
                                            util.selection.restoreSelection(savedRange);
                                        }
                                    } catch (e) {
                                        contentArea.focus();
                                    }
                                }
                            }, 500);
                        }, 10);
                    }
                });
            }
        });

        // ✅ 모달 컨텐츠 전체 보호
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.addEventListener('click', (e) => {
                e.stopPropagation(); // 모달 내부 모든 클릭 보호
            });
        }
    }

    function setupModalCloseEvents(modal) {
        // 1. 모달 배경 클릭으로만 닫기 (가장 안전한 방법)
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal);
            }
        });

        // 2. 개선된 외부 클릭 감지 (bubble phase 사용, 더 정교한 조건)
        const outsideClickHandler = (e) => {
            if (!modal.parentNode || !modal.classList.contains('show')) {
                document.removeEventListener('click', outsideClickHandler);
                return;
            }

            // ✅ 모달 내부 요소들 보호
            if (modal.contains(e.target)) {
                return; // 모달 내부 클릭은 무시
            }

            // ✅ input, button, select 등 폼 요소들 보호
            const isFormElement = e.target.matches('input, textarea, select, button, [contenteditable]');
            if (isFormElement) {
                return; // 폼 요소 클릭은 무시
            }

            closeModal(modal);
            document.removeEventListener('click', outsideClickHandler);
        };

        // ✅ bubble phase로 변경 (capture phase 제거)
        setTimeout(() => {
            document.addEventListener('click', outsideClickHandler);
        }, 100); // 100ms 지연으로 모달 생성 직후 닫히는 것 방지

        // 3. ✅ 툴바 버튼만 정확히 감지 (모달 외부에서만)
        const toolbarClickHandler = (e) => {
            // 모달 내부 클릭은 완전히 무시
            if (modal.contains(e.target)) {
                return;
            }

            // 툴바 버튼 클릭만 감지
            const toolbar = e.target.closest('.lite-editor-toolbar');
            const clickedButton = e.target.closest('.lite-editor-button');
            const imageUploadButton = e.target.closest('.lite-editor-image-upload-button');
            
            // 툴바 내의 다른 플러그인 버튼이 클릭된 경우만
            if (toolbar && clickedButton && !imageUploadButton) {
                closeModal(modal);
                document.removeEventListener('click', toolbarClickHandler);
            }
        };

        // 툴바 클릭 감지도 지연 등록
        setTimeout(() => {
            document.addEventListener('click', toolbarClickHandler);
        }, 100);

        // 4. ✅ 다른 모달 생성 감지만 유지 (MutationObserver)
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const isOtherModal = node.classList?.contains('modal-overlay') && node !== modal;
                        const hasOtherModal = node.querySelector?.('.modal-overlay:not(.image-upload-modal)');
                        
                        if (isOtherModal || hasOtherModal) {
                            closeModal(modal);
                        }
                    }
                });
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });

        // 모달 닫힐 때 모든 이벤트 정리
        modal.addEventListener('modalClosed', () => {
            document.removeEventListener('click', outsideClickHandler);
            document.removeEventListener('click', toolbarClickHandler);
            observer.disconnect();
        });

        // 5. activeModalManager 연동
        if (util.activeModalManager) {
            util.activeModalManager.register(modal, () => {
                closeModal(modal);
            });
        }
    }

    // 이미지 삽입 프로세스
    async function processImageInsertion(url, file, modal) {
        // ✅ 먼저 모달 닫기 (성공/실패 관계없이)
        closeModal(modal);
        
        try {
            let finalUrl = url;

            if (file) {
                if (!window.ImageUploadModule) {
                    throw new Error('ImageUploadModule이 로드되지 않았습니다');
                }

                const uploadResult = await window.ImageUploadModule.uploadFile(file);
                if (!uploadResult) {
                    return;
                }

                finalUrl = uploadResult.path;
                
                const jsonString = JSON.stringify(uploadResult, null, 2);
                LiteEditorModal.alert(`업로드 완료!\n\n서버 응답 JSON:\n${jsonString}`);
            }

            if (finalUrl) {
                insertImage(finalUrl);
            }

        } catch (error) {
            errorHandler.logError?.(MODULE_NAME, 'P801', error);
            errorHandler.showUserAlert?.('P801', `업로드 실패: ${error.message}`);
        }
    }

    function showModal() {
        const modal = createModal();
        const button = document.querySelector('.lite-editor-image-upload-button');
        
        if (button && util.layer && util.layer.setLayerPosition) {
            util.layer.setLayerPosition(modal, button);
        }
        
        modal.style.removeProperty('opacity');
        modal.style.removeProperty('visibility');
        modal.classList.add('show');
        
        if (util.activeModalManager) {
            modal.closeCallback = () => closeModal(modal);
            util.activeModalManager.register(modal);
        }
        
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal(modal);
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
        
        const urlInput = modal.querySelector('#image-url-input');
        if (urlInput) urlInput.focus();

        setupGlobalEvents();
    }

    function setupGlobalEvents() {
        if (isEventHandlerRegistered) return;
        
        // ESC 키로 모든 모달 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.querySelector('.modal-overlay.show');
                if (modal) closeModal(modal);
            }
        });
        
        // ✅ 다른 플러그인이 활성화될 때 imageUpload 모달 닫기
        document.addEventListener('pluginActivated', (e) => {
            if (e.detail?.pluginId !== PLUGIN_ID) {
                const modal = document.querySelector('.modal-overlay.show');
                if (modal) closeModal(modal);
            }
        });
        
        setupCopyPasteEvents();
        isEventHandlerRegistered = true;
    }

    // 이미지 삽입 함수
    function insertImage(src) {
        if (!src) return;

        const isUploadedImage = src.startsWith('/images/');
        
        if (!isUploadedImage && security.isValidImageUrl && !security.isValidImageUrl(src)) {
            errorHandler.showUserAlert?.('P803');
            return;
        }

        const contentArea = document.querySelector('.lite-editor-content');
        if (!contentArea) return;

        const scrollPosition = util.scroll ? util.scroll.savePosition() : null;
        
        try {
            contentArea.focus({ preventScroll: true });
            
            const selectionRestored = util.selection ? util.selection.restoreSelection(savedRange) : false;
            
            const timestamp = Date.now();
            const imageId = `img-${timestamp}`;
            
            const wrapper = document.createElement('div');
            wrapper.className = 'image-wrapper';
            wrapper.id = imageId;
            wrapper.contentEditable = false;
            wrapper.setAttribute('data-selectable', 'true');
            wrapper.draggable = true;
            
            wrapper.style.display = 'inline-block';
            wrapper.style.position = 'relative';
            wrapper.style.margin = '10px 0';
            wrapper.style.maxWidth = '95%';
            wrapper.style.resize = 'both';
            wrapper.style.overflow = 'hidden';
            wrapper.style.boxSizing = 'border-box';
            
            const img = document.createElement('img');
            img.src = src;
            img.style.width = '100%';
            img.style.height = 'auto';
            img.style.display = 'block';

            const resizeHandle = document.createElement('div');
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
            
            if (!insertSuccess) {
                contentArea.appendChild(wrapper);
            }
            
            if (scrollPosition && util.scroll) {
                util.scroll.restorePosition(scrollPosition);
            }
            
            if (util.editor && util.editor.dispatchEditorEvent) {
                util.editor.dispatchEditorEvent(contentArea);
            }
            
            setupImageEvents(wrapper);
            
        } catch (error) {
            errorHandler.logError?.(MODULE_NAME, 'P801', error);
            if (scrollPosition && util.scroll) {
                util.scroll.restorePosition(scrollPosition);
            }
        }
    }

    // 이미지 이벤트 설정
    function setupImageEvents(imageWrapper) {
        imageWrapper.addEventListener('click', (e) => {
            e.stopPropagation();
            selectImage(imageWrapper);
        });
        
        setupDragAndDrop(imageWrapper);
        
        const resizeHandle = imageWrapper.querySelector('[style*="cursor: nwse-resize"]');
        if (resizeHandle) {
            setupResizeHandle(imageWrapper, resizeHandle);
        }
    }

    // 이미지 선택 관리
    function selectImage(imageWrapper) {
        if (selectedImage && selectedImage !== imageWrapper) {
            selectedImage.style.filter = '';
            selectedImage.style.border = '';
        }
        
        selectedImage = imageWrapper;
        selectedImage.style.filter = 'brightness(0.7)';
        selectedImage.style.border = '2px solid #4285f4';
    }

    function deselectImage() {
        if (selectedImage) {
            selectedImage.style.filter = '';
            selectedImage.style.border = '';
            selectedImage = null;
        }
    }

    // 리사이즈 핸들 설정
    function setupResizeHandle(imageWrapper, resizeHandle) {
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
            
            imageWrapper.style.border = 'none';
            imageWrapper.style.filter = '';
            
            document.addEventListener('mousemove', handleResize);
            document.addEventListener('mouseup', stopResize);
        });

        function handleResize(e) {
            if (!isResizing) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            const newWidth = startWidth + deltaX;
            const newHeight = startHeight + deltaY;
            
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

            const contentArea = document.querySelector('.lite-editor-content');
            if (contentArea && util.editor && util.editor.dispatchEditorEvent) {
                util.editor.dispatchEditorEvent(contentArea);
            }
        }
    }

    // 드래그앤드롭 설정
    function setupDragAndDrop(imageWrapper) {
        imageWrapper.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', imageWrapper.id);
            imageWrapper.style.opacity = '0.5';
        });

        imageWrapper.addEventListener('dragend', (e) => {
            imageWrapper.style.opacity = '1';
        });
        
        setupDropZone();
    }

    let isDropZoneSetup = false;
    function setupDropZone() {
        if (isDropZoneSetup) return;
        isDropZoneSetup = true;
        
        const contentArea = document.querySelector('.lite-editor-content');
        if (!contentArea) return;

        contentArea.addEventListener('dragover', (e) => {
            if (e.dataTransfer.types.includes('text/plain')) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            }
        });

        contentArea.addEventListener('drop', (e) => {
            const draggedId = e.dataTransfer.getData('text/plain');
            const draggedElement = document.getElementById(draggedId);
            
            if (!draggedElement?.classList.contains('image-wrapper')) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            // ✅ 브라우저 호환성 개선
            let range = null;
            
            try {
                // Chrome/Safari용 caretRangeFromPoint
                if (document.caretRangeFromPoint) {
                    range = document.caretRangeFromPoint(e.clientX, e.clientY);
                }
                // Firefox용 caretPositionFromPoint
                else if (document.caretPositionFromPoint) {
                    const position = document.caretPositionFromPoint(e.clientX, e.clientY);
                    if (position) {
                        range = document.createRange();
                        range.setStart(position.offsetNode, position.offset);
                    }
                }
                
                // ✅ 유효한 드롭 위치 검증
                if (range && contentArea.contains(range.startContainer)) {
                    const startContainer = range.startContainer;
                    
                    // 드래그된 요소 자신이나 그 내부에 드롭하는 것 방지
                    if (draggedElement.contains(startContainer) || draggedElement === startContainer) {
                        console.warn('[IMAGE_DRAG] 자기 자신에게는 드롭할 수 없습니다.');
                        return;
                    }
                    
                    // 다른 이미지 내부에 드롭하는 것 방지
                    const parentImageWrapper = startContainer.closest?.('.image-wrapper');
                    if (parentImageWrapper && parentImageWrapper !== draggedElement) {
                        console.warn('[IMAGE_DRAG] 다른 이미지 내부에는 드롭할 수 없습니다.');
                        return;
                    }
                    
                    // ✅ 안전한 DOM 조작
                    draggedElement.style.opacity = '1';
                    const originalParent = draggedElement.parentNode;
                    draggedElement.remove();
                    
                    try {
                        range.insertNode(draggedElement);
                        contentArea.focus();
                        
                        // 커서 위치를 드롭된 이미지 뒤로 설정
                        range.setStartAfter(draggedElement);
                        range.collapse(true);
                        const selection = window.getSelection();
                        selection.removeAllRanges();
                        selection.addRange(range);
                        
                        // 에디터 이벤트 발생
                        if (util.editor?.dispatchEditorEvent) {
                            util.editor.dispatchEditorEvent(contentArea);
                        }
                        
                        console.log('[IMAGE_DRAG] 이미지 이동 완료');
                        
                    } catch (insertError) {
                        console.error('[IMAGE_DRAG] 삽입 실패:', insertError);
                        // 실패 시 원래 위치로 복구
                        if (originalParent) {
                            originalParent.appendChild(draggedElement);
                        } else {
                            contentArea.appendChild(draggedElement);
                        }
                        contentArea.focus();
                    }
                    
                } else {
                    console.warn('[IMAGE_DRAG] 유효하지 않은 드롭 위치입니다.');
                    draggedElement.style.opacity = '1';
                }
                
            } catch (error) {
                console.error('[IMAGE_DRAG] 드롭 처리 중 오류:', error);
                draggedElement.style.opacity = '1';
                
                // 에러 발생 시 기본 위치에 추가
                if (!draggedElement.parentNode) {
                    contentArea.appendChild(draggedElement);
                }
            }
        });
    }

    // 복사/붙여넣기 기능
    function setupCopyPasteEvents() {
        document.addEventListener('keydown', (e) => {
            // ✅ 붙여넣기는 copiedImageData가 있으면 selectedImage 없어도 허용
            if (e.key === 'v' && (e.ctrlKey || e.metaKey) && copiedImageData) {
                // ✅ 현재 포커스된 요소가 특정 플러그인 레이어 내부인지 확인
                const focusedElement = document.activeElement;
                const mediaDropdown = focusedElement?.closest('.media-dropdown');
                const codeBlockLayer = focusedElement?.closest('.lite-editor-code-block-layer');
                
                if (mediaDropdown || codeBlockLayer) {
                    // 특정 플러그인 레이어 내부에서는 이미지 붙여넣기 차단
                    console.log('플러그인 레이어 내부에서 이미지 붙여넣기 차단:', {
                        mediaDropdown: !!mediaDropdown,
                        codeBlockLayer: !!codeBlockLayer
                    });
                    return;
                }
                
                console.log('붙여넣기 시도:', { copiedImageData: !!copiedImageData, isCut, selectedImage: !!selectedImage });
                e.preventDefault();
                pasteImageAtCursor();
                return;
            }
            
            // 복사/잘라내기는 selectedImage가 필요
            if (!selectedImage || !(e.ctrlKey || e.metaKey)) return;
            
            switch(e.key) {
                case 'c': {
                    e.preventDefault();
                    // ✅ 선택 스타일 제거 후 복사
                    const originalFilter = selectedImage.style.filter;
                    const originalBorder = selectedImage.style.border;
                    
                    selectedImage.style.filter = '';
                    selectedImage.style.border = '';
                    
                    copiedImageData = selectedImage.outerHTML;
                    
                    // 원래 스타일 복원
                    selectedImage.style.filter = originalFilter;
                    selectedImage.style.border = originalBorder;
                    
                    isCut = false;
                    break;
                }
                    
                case 'x': {
                    e.preventDefault();
                    // ✅ 선택 스타일 제거 후 복사 (복사와 동일한 로직 적용)
                    const originalFilter = selectedImage.style.filter;
                    const originalBorder = selectedImage.style.border;
                    
                    selectedImage.style.filter = '';
                    selectedImage.style.border = '';
                    
                    copiedImageData = selectedImage.outerHTML;
                    
                    // ✅ 잘라내기는 바로 이미지 제거
                    isCut = true;
                    selectedImage.remove(); // 바로 제거
                    selectedImage = null;   // 참조도 제거
                    break;
                }
            }
        });
        
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.image-wrapper')) {
                deselectImage();
            }
        });
    }

    function pasteImageAtCursor() {
        const contentArea = document.querySelector('.lite-editor-content');
        if (!contentArea || !copiedImageData) return;
        
        const selection = window.getSelection();
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = copiedImageData;
        const newImageWrapper = tempDiv.firstElementChild;
        
        newImageWrapper.id = `img-${Date.now()}`;
        newImageWrapper.style.opacity = '1';
        newImageWrapper.style.filter = '';
        newImageWrapper.style.border = '';
        
        if (selection?.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(newImageWrapper);
            
            range.setStartAfter(newImageWrapper);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
        } else {
            contentArea.appendChild(newImageWrapper);
        }
        
        setupImageEvents(newImageWrapper);
        util.editor?.dispatchEditorEvent?.(contentArea);
        
        // ✅ 붙여넣기 후 데이터 초기화
        isCut = false;
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
                
                // ✅ 다른 모든 모달/레이어 강제 닫기
                closeAllOtherModals();
                
                showModal();
            });
            
            toolbar.appendChild(button);
            setupGlobalEvents();
        }
    });

    // ✅ 다른 모든 모달/레이어 닫기 함수 추가
    function closeAllOtherModals() {
        // activeModalManager 사용
        if (util.activeModalManager) {
            util.activeModalManager.closeAll();
        }
        
        // 직접 모달들 찾아서 닫기
        const allModals = document.querySelectorAll('.modal-overlay, .layer-popup, [class*="modal"], [class*="popup"]');
        allModals.forEach(modal => {
            if (modal.style.display !== 'none' && modal.style.visibility !== 'hidden') {
                modal.style.display = 'none';
                modal.style.visibility = 'hidden';
                modal.classList.remove('show', 'active', 'open');
            }
        });
        
        // 특정 플러그인 레이어들 닫기
        const layerSelectors = [
            '.table-size-selector',
            '.link-modal',
            '.color-picker',
            '.font-selector'
        ];
        
        layerSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                el.style.display = 'none';
                el.style.visibility = 'hidden';
                el.classList.remove('show', 'active', 'open');
            });
        });
    }
})();