/**
 * LiteEditor imageUpload Plugin - 스크롤 점프 문제 해결
 * 이미지 업로드 플러그인
 */
(function() {
    // 🔧 PluginUtil 참조 추가
    const util = window.PluginUtil || {};
    
    // 1. 상수 및 변수 선언 영역
    const PLUGIN_ID = 'imageUpload';
    const STYLE_ID = 'imageUploadStyles';
    const CSS_PATH = 'css/plugins/imageUpload.css';
    let isEventHandlerRegistered = false;

    // 현재 커서의 위치 저장 
    let savedRange = null;

    // 🔧 에디터 내부 스크롤 처리를 위한 유틸리티
    const editorScrollManager = {
        // 에디터 내부 스크롤 위치 저장
        saveScrollPosition() {
            const editor = document.querySelector('#lite-editor');
            const editorContent = document.querySelector('.lite-editor-content');
            
            // 🔧 디버깅: 어떤 요소가 실제 스크롤 컨테이너인지 확인
            console.log('[SCROLL DEBUG] 요소 확인:', {
                editor: editor ? 'found' : 'not found',
                editorContent: editorContent ? 'found' : 'not found',
                editorScrollTop: editor ? editor.scrollTop : 'no editor',
                editorContentScrollTop: editorContent ? editorContent.scrollTop : 'no content',
                editorScrollHeight: editor ? editor.scrollHeight : 'no editor',
                editorContentScrollHeight: editorContent ? editorContent.scrollHeight : 'no content'
            });
            
            // 실제 스크롤이 있는 요소 찾기
            let scrollContainer = null;
            let scrollTop = 0;
            
            if (editorContent && editorContent.scrollTop > 0) {
                scrollContainer = editorContent;
                scrollTop = editorContent.scrollTop;
            } else if (editor && editor.scrollTop > 0) {
                scrollContainer = editor;
                scrollTop = editor.scrollTop;
            } else {
                // 스크롤이 0이어도 높이가 있는 컨테이너 찾기
                if (editorContent && editorContent.scrollHeight > editorContent.clientHeight) {
                    scrollContainer = editorContent;
                    scrollTop = editorContent.scrollTop;
                } else if (editor && editor.scrollHeight > editor.clientHeight) {
                    scrollContainer = editor;
                    scrollTop = editor.scrollTop;
                }
            }
            
            console.log('[SCROLL DEBUG] 스크롤 저장:', {
                container: scrollContainer ? scrollContainer.className : 'none',
                scrollTop: scrollTop,
                timestamp: Date.now()
            });
            
            return {
                scrollTop: scrollTop,
                container: scrollContainer,
                timestamp: Date.now()
            };
        },
        
        // 에디터 내부 스크롤 위치 복원
        restoreScrollPosition(savedPosition, delay = 0) {
            if (!savedPosition) {
                console.log('[SCROLL DEBUG] 복원할 위치 없음');
                return;
            }
            
            const restoreScroll = () => {
                // 저장된 컨테이너가 있으면 그것을 사용, 없으면 다시 찾기
                let targetContainer = savedPosition.container;
                
                if (!targetContainer) {
                    const editor = document.querySelector('#lite-editor');
                    const editorContent = document.querySelector('.lite-editor-content');
                    targetContainer = editorContent || editor;
                }
                
                if (targetContainer) {
                    targetContainer.scrollTop = savedPosition.scrollTop;
                    console.log('[SCROLL DEBUG] 스크롤 복원 시도:', {
                        container: targetContainer.className,
                        targetScrollTop: savedPosition.scrollTop,
                        actualScrollTop: targetContainer.scrollTop,
                        success: targetContainer.scrollTop === savedPosition.scrollTop
                    });
                } else {
                    console.log('[SCROLL DEBUG] 복원할 컨테이너 없음');
                }
            };
            
            if (delay > 0) {
                setTimeout(restoreScroll, delay);
            } else {
                // 즉시 복원하되 렌더링 후 한 번 더 확인
                restoreScroll();
                requestAnimationFrame(() => {
                    restoreScroll();
                });
            }
        }
    };

    function saveSelection() {
        // 🔧 PluginUtil 사용
        savedRange = util.selection.saveSelection();
    }

    function restoreSelection() {
        // 🔧 PluginUtil 사용
        if (savedRange) {
            util.selection.restoreSelection(savedRange);
        }
    }

    // 2. 모달 템플릿 
    const template = `
    <div class="modal-overlay">
        <div class="modal-content">            
            <!-- 상단 제목 및 컨텐츠 영역 -->
            <div>
                <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #333;">Insert Image</h3>
                
                <!-- URL 입력 -->
                <div style="margin-bottom: 10px;">
                    <label style="display: block; font-size: 13px; font-weight: 500; color: #666; margin-bottom: 4px;">
                    URL
                    </label>
                    <input type="url" 
                           id="image-url-input"
                           placeholder="https://" 
                           style="width: 100%; padding: 6px 8px; font-size: 13px; border: 1px solid #ccc; border-radius: 4px; outline: none;">
                </div>
                
                <!-- 구분선 -->
                <div style="display: flex; align-items: center; margin: 15px 0;">
                    <div style="font-size: 11px; color: #888; margin-right: 8px;">OR</div>
                    <div style="flex-grow: 1; height: 1px; background-color: #e0e0e0;"></div>
                </div>

                <!-- 파일 업로드 -->
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
            
            <!-- 버튼 -->
            <div style="display: flex; justify-content: flex-end;">
                <button type="button" data-action="close"
                        style="display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; margin-right: 8px; border-radius: 4px; border: none; background-color: transparent; cursor: pointer;"
                        title="Cancel">
                    <span class="material-icons" style="font-size: 18px; color: #5f6368;">close</span>
                </button>
                <button type="submit"
                        style="display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 4px; border: none; background-color: transparent; cursor: pointer;"
                        title="Insert">
                    <span class="material-icons" style="font-size: 18px; color: #5f6368;">add_circle</span>
                </button>
            </div>
        </div>
    </div>`;

    // 🔧 디버깅 함수 추가
    function logScroll(point, additionalInfo = {}) {
        console.log(`[SCROLL DEBUG] ${point}:`, {
            scrollY: window.scrollY,
            scrollX: window.scrollX,
            timestamp: Date.now(),
            ...additionalInfo
        });
    }

    // 3. 유틸리티 함수 - 완전한 이미지 컨테이너 삽입
    function insertImage(src) {
        console.log('[IMAGE_UPLOAD] insertImage 시작:', src);
        
        if (!src) {
            console.error('[IMAGE_UPLOAD] 이미지 src가 없습니다');
            return;
        }
        
        const editor = document.querySelector('.lite-editor-content');
        if (!editor) {
            console.error('[IMAGE_UPLOAD] 편집 영역을 찾을 수 없습니다!');
            return;
        }
        
        // 🔧 스크롤 위치 미리 저장
        const scrollPositions = {
            editor: editor.scrollTop,
            window: window.pageYOffset,
            body: document.body.scrollTop,
            documentElement: document.documentElement.scrollTop
        };
        console.log('[DEBUG] 스크롤 위치들 저장:', scrollPositions);
        
        // 🔧 완전한 이미지 컨테이너 HTML 생성 (리사이징 및 선택 기능 포함)
        const timestamp = Date.now();
        const imageHTML = `
            <div class="image-wrapper" 
                 contenteditable="false" 
                 draggable="true" 
                 id="img-${timestamp}"
                 data-selectable="true"
                 style="display: inline-block; position: relative; margin: 10px 0; max-width: 95%; resize: both; overflow: hidden;">
                <img src="${src}" 
                     style="width: 100%; height: auto; display: block;">
                <div class="image-resize-handle" 
                     style="position: absolute; right: 0; bottom: 0; width: 10px; height: 10px; background-image: linear-gradient(135deg, transparent 50%, #4285f4 50%, #4285f4 100%); cursor: nwse-resize; z-index: 10;"></div>
            </div><br>`;
        
        console.log('[DEBUG] 저장된 선택 영역 상태:', {
            savedRange: !!savedRange
        });
        
        // 🔧 저장된 선택 영역이 있으면 복원 후 삽입
        if (savedRange) {
            console.log('[DEBUG] 저장된 선택 영역 복원 시도...');
            try {
                util.selection.restoreSelection(savedRange);
                
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    const isInsideEditor = editor.contains(range.startContainer);
                    
                    console.log('[DEBUG] 복원된 Range:', {
                        startContainer: range.startContainer.nodeName,
                        startOffset: range.startOffset,
                        isInsideEditor: isInsideEditor
                    });
                    
                    if (isInsideEditor) {
                        // 🔧 execCommand로 완전한 이미지 컨테이너 삽입
                        const success = document.execCommand('insertHTML', false, imageHTML);
                        console.log('[DEBUG] execCommand 결과:', success);
                        
                        if (success) {
                            // 🔧 즉시 스크롤 복원
                            restoreAllScrollPositions(scrollPositions);
                            
                            // 에디터 이벤트 발생
                            const event = new Event('input', { bubbles: true });
                            editor.dispatchEvent(event);
                            
                            console.log('[DEBUG] 완전한 이미지 컨테이너 삽입 성공');
                            return;
                        }
                    }
                }
            } catch (error) {
                console.error('[DEBUG] 선택 영역 복원 실패:', error);
            }
        }
        
        // 🔧 대안: 에디터 끝에 완전한 이미지 컨테이너 삽입
        console.log('[DEBUG] 에디터 끝에 완전한 이미지 컨테이너 삽입');
        editor.insertAdjacentHTML('beforeend', imageHTML);
        
        // 🔧 스크롤 복원
        restoreAllScrollPositions(scrollPositions);
        
        // 에디터 이벤트 발생
        const event = new Event('input', { bubbles: true });
        editor.dispatchEvent(event);
        
        console.log('[IMAGE_UPLOAD] insertImage 완료');
        
        // 🔧 스크롤 복원 함수
        function restoreAllScrollPositions(positions) {
            console.log('[DEBUG] 스크롤 복원 시작:', positions);
            
            // 즉시 복원
            editor.scrollTop = positions.editor;
            window.scrollTo(0, positions.window);
            document.body.scrollTop = positions.body;
            document.documentElement.scrollTop = positions.documentElement;
            
            // 애니메이션 프레임 후 재복원
            requestAnimationFrame(() => {
                editor.scrollTop = positions.editor;
                window.scrollTo(0, positions.window);
                console.log('[DEBUG] requestAnimationFrame 후 스크롤 복원');
            });
            
            // 50ms 후 재복원
            setTimeout(() => {
                editor.scrollTop = positions.editor;
                window.scrollTo(0, positions.window);
                console.log('[DEBUG] 50ms 후 스크롤 복원');
            }, 50);
            
            // 100ms 후 재복원
            setTimeout(() => {
                editor.scrollTop = positions.editor;
                window.scrollTo(0, positions.window);
                console.log('[DEBUG] 100ms 후 스크롤 복원 완료');
            }, 100);
        }
    }

    function closeModal(modal) {
        if (!modal) return;
        
        modal.classList.remove('show');
        modal.style.opacity = '0';
        modal.style.visibility = 'hidden';
        
        // 🔧 activeModalManager 사용
        util.activeModalManager.unregister(modal);
        
        // 300ms 후 완전 제거
        setTimeout(() => {
            modal.remove();
        }, 300);
    }

    // 4. 이벤트 핸들러 설정
    function setupGlobalEvents() {
        if (isEventHandlerRegistered) return;
        
        // ESC 키로 닫기 - 전역 한 번만 등록
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.querySelector('.modal-overlay.show');
                if (modal) {
                    closeModal(modal);
                }
            }
        });
        
        isEventHandlerRegistered = true;
    }

    // 5. 모달 생성 및 표시
    function createModal() {
        saveSelection();

        // 기존 모달 제거
        const existingModal = document.querySelector('.modal-overlay');
        if (existingModal) existingModal.remove();

        // 🔧 PluginUtil 사용하여 모달 생성
        const modalContainer = util.dom.createElement('div');
        modalContainer.innerHTML = template;
        const modal = modalContainer.firstElementChild;
        document.body.appendChild(modal);

        const closeButton = modal.querySelector('button[data-action="close"]');
        const insertButton = modal.querySelector('button[type="submit"]');
        const urlInput = modal.querySelector('#image-url-input');
        const fileInput = modal.querySelector('#image-file-input');

        // 이벤트 핸들러 설정
        closeButton.addEventListener('click', () => closeModal(modal));
        
        const button = document.querySelector('.lite-editor-image-upload-button');
        util.setupOutsideClickHandler(modal, () => closeModal(modal), [button]);
        
        urlInput.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        urlInput.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') {
                e.stopPropagation();
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                const url = urlInput.value.trim();
                if (url) {
                    processImageInsertion(url, null, modal);
                }
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
            }
        });

        return modal;
    }
    
    // 🔧 processImageInsertion에서 선택 영역 복원 활성화
    function processImageInsertion(url, file, modal) {
        console.log('[IMAGE_UPLOAD] processImageInsertion 시작:', { url: !!url, file: !!file });
        
        closeModal(modal);
        
        // 🔧 선택 영역 복원 (주석 해제)
        // restoreSelection(); // 이것보다는 insertImage에서 직접 처리
        
        // 이미지 삽입
        if (url) {
            console.log('[IMAGE_UPLOAD] URL 이미지 삽입:', url);
            insertImage(url);
        } else if (file) {
            console.log('[IMAGE_UPLOAD] 파일 이미지 처리 시작');
            const reader = new FileReader();
            reader.onload = (e) => {
                console.log('[IMAGE_UPLOAD] 파일 읽기 완료, 삽입 중');
                insertImage(e.target.result);
            };
            reader.onerror = (e) => {
                console.error('[IMAGE_UPLOAD] 파일 읽기 실패:', e);
            };
            reader.readAsDataURL(file);
        }
    }

    function showModal() {
        const modal = createModal();
        const button = document.querySelector('.lite-editor-image-upload-button');
        
        if (button) {
            util.layer.setLayerPosition(modal, button);
        }
        
        setTimeout(() => {
            modal.style.removeProperty('opacity');
            modal.style.removeProperty('visibility');
            modal.classList.add('show');
            
            util.activeModalManager.register(modal);
            
            requestAnimationFrame(() => {
                const urlInput = modal.querySelector('#image-url-input');
                if (urlInput) {
                    urlInput.focus();
                }
            });
        }, 10);

        setupGlobalEvents();
    }

    /**
     * 이미지 드래그 앤 드롭 기능 초기화
     */
    function initImageDragDrop() {
        const editor = document.querySelector('#lite-editor');
        if (!editor) return;

        // 드래그 상태 변수
        let draggedImage = null;
        let dropIndicator = null;
        let selectedImage = null;
        let animationFrameId = null;

        // 에디터에 상대적 위치를 위한 스타일 설정
        if (window.getComputedStyle(editor).position === 'static') {
            editor.style.position = 'relative';
        }

        // 드롭 인디케이터 생성
        function createDropIndicator() {
            const indicator = document.createElement('div');
            indicator.className = 'image-drop-indicator';
            indicator.style.position = 'absolute';
            indicator.style.width = '2px';
            indicator.style.height = '20px';
            indicator.style.backgroundColor = '#4285f4';
            indicator.style.zIndex = '9999';
            indicator.style.pointerEvents = 'none';
            indicator.style.animation = 'cursorBlink 1s infinite';
            indicator.style.display = 'none';
            
            editor.appendChild(indicator);
            return indicator;
        }

        // 빈 영역 처리를 포함한 드롭 인디케이터 표시 함수
        function showDropIndicator(x, y) {
            if (!dropIndicator) {
                dropIndicator = createDropIndicator();
            }

            let range = document.caretRangeFromPoint(x, y);
            if (!range) return;

            const rects = range.getClientRects();
            if (!rects.length || rects.length === 0) {
                const tempSpan = document.createElement('span');
                tempSpan.style.display = 'inline-block';
                tempSpan.style.width = '0';
                tempSpan.style.height = '1em';
                tempSpan.textContent = '\u200B';
                
                range.insertNode(tempSpan);
                
                const tempRect = tempSpan.getBoundingClientRect();
                const editorRect = editor.getBoundingClientRect();
                dropIndicator.style.left = (tempRect.left - editorRect.left) + 'px';
                dropIndicator.style.top = (tempRect.top - editorRect.top) + 'px';
                dropIndicator.style.height = tempRect.height + 'px';
                
                tempSpan.parentNode.removeChild(tempSpan);
            } else {
                const rect = rects[0];
                const editorRect = editor.getBoundingClientRect();
                
                dropIndicator.style.left = (rect.left - editorRect.left) + 'px';
                dropIndicator.style.top = (rect.top - editorRect.top) + 'px';
                dropIndicator.style.height = rect.height + 'px';
            }
            
            dropIndicator.style.display = 'block';
        }

        function throttledShowIndicator(x, y) {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            
            animationFrameId = requestAnimationFrame(() => {
                showDropIndicator(x, y);
                animationFrameId = null;
            });
        }

        function hideDropIndicator() {
            if (dropIndicator) {
                dropIndicator.style.display = 'none';
            }
            
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        }

        function selectImage(imageWrapper) {
            if (selectedImage && selectedImage !== imageWrapper) {
                selectedImage.removeAttribute('data-selected');
            }
            
            selectedImage = imageWrapper;
            selectedImage.setAttribute('data-selected', 'true');
        }

        function deselectImage() {
            if (selectedImage) {
                selectedImage.removeAttribute('data-selected');
                selectedImage = null;
            }
        }

        function findClosestElement(element, selector) {
            while (element && element.nodeType === 1) {
                if (element.matches(selector)) {
                    return element;
                }
                element = element.parentElement;
            }
            return null;
        }

        // 이벤트 리스너들
        editor.addEventListener('click', (event) => {
            const imageWrapper = findClosestElement(event.target, '.image-wrapper');
            
            if (!imageWrapper) {
                deselectImage();
                return;
            }
            
            selectImage(imageWrapper);
            event.stopPropagation();
        });

        editor.addEventListener('dragstart', (event) => {
            const imageWrapper = findClosestElement(event.target, '.image-wrapper');
            if (!imageWrapper) return;

            draggedImage = imageWrapper;
            selectImage(imageWrapper);
            
            event.dataTransfer.setData('text/plain', imageWrapper.id);
            event.dataTransfer.effectAllowed = 'move';
            
            setTimeout(() => {
                imageWrapper.classList.add('dragging');
            }, 0);
        });

        editor.addEventListener('dragover', (event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            
            if (draggedImage) {
                throttledShowIndicator(event.clientX, event.clientY);
            }
        });

        editor.addEventListener('dragleave', (event) => {
            if (!editor.contains(event.relatedTarget)) {
                hideDropIndicator();
            }
        });

        editor.addEventListener('drop', (event) => {
            event.preventDefault();
            event.stopPropagation();
            
            hideDropIndicator();
            
            if (!draggedImage) return;
            
            // 🔧 드롭 시에도 스크롤 위치 보존
            const scrollPosition = editorScrollManager.saveScrollPosition();
            
            let range;
            if (document.caretRangeFromPoint) {
                range = document.caretRangeFromPoint(event.clientX, event.clientY);
            } else if (document.caretPositionFromPoint) {
                const position = document.caretPositionFromPoint(event.clientX, event.clientY);
                range = document.createRange();
                range.setStart(position.offsetNode, position.offset);
                range.collapse(true);
            }
            
            if (range) {
                if (draggedImage.parentNode) {
                    draggedImage.parentNode.removeChild(draggedImage);
                }
                
                range.insertNode(draggedImage);
                
                draggedImage.classList.remove('dragging');
                
                if (!draggedImage.nextSibling || 
                    (draggedImage.nextSibling.nodeType !== Node.ELEMENT_NODE || 
                     draggedImage.nextSibling.nodeName !== 'BR')) {
                    const br = document.createElement('br');
                    draggedImage.parentNode.insertBefore(br, draggedImage.nextSibling);
                }
                
                const selection = window.getSelection();
                selection.removeAllRanges();
                
                const newRange = document.createRange();
                newRange.setStartAfter(draggedImage);
                newRange.collapse(true);
                selection.addRange(newRange);
                
                // 🔧 스크롤 위치 복원
                editorScrollManager.restoreScrollPosition(scrollPosition);
                
                const event = new Event('input', { bubbles: true });
                editor.dispatchEvent(event);
            }
            
            draggedImage = null;
        });

        editor.addEventListener('dragend', (event) => {
            hideDropIndicator();
            
            if (draggedImage) {
                draggedImage.classList.remove('dragging');
                draggedImage = null;
            }
            
            deselectImage();
        });
    }

    // CSS 스타일 추가 함수
    function addDragAndDropStyles() {
        const styleId = 'imageUploadDragStyles';
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .image-wrapper {
                transition: opacity 0.2s ease, outline 0.2s ease;
                cursor: move;
            }
            
            .image-wrapper:hover {
                outline: 1px solid rgba(66, 133, 244, 0.3);
            }
            
            .image-wrapper[data-selected="true"] {
                outline: 2px solid #4285f4;
            }
            
            .image-wrapper.dragging {
                opacity: 0.5;
                outline: 2px dashed #4285f4;
            }
            
            @keyframes cursorBlink {
                0%, 100% { opacity: 1; }
                50% { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    // 6. 플러그인 등록
    LiteEditor.registerPlugin(PLUGIN_ID, {
        title: 'Image upload',
        icon: 'photo_camera',
        customRender: function(toolbar, contentArea) {
            util.styles.loadCssFile(STYLE_ID, CSS_PATH);

            addDragAndDropStyles();
            setTimeout(initImageDragDrop, 500);

            const button = util.dom.createElement('button', {
                className: 'lite-editor-button lite-editor-image-upload-button',
                title: 'Image upload'
            });
            
            const icon = util.dom.createElement('i', {
                className: 'material-symbols-outlined',
                textContent: 'photo_camera'
            });
            button.appendChild(icon);
            
            // 🔧 리서치 기반 버튼 클릭 처리
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // 🔧 HTML 구조 디버깅
                const editor = document.querySelector('#lite-editor');
                console.log('[HTML DEBUG] 에디터 구조:', {
                    editor: editor ? editor.outerHTML.substring(0, 200) + '...' : 'not found',
                    children: editor ? Array.from(editor.children).map(child => ({
                        tagName: child.tagName,
                        className: child.className,
                        scrollTop: child.scrollTop,
                        scrollHeight: child.scrollHeight,
                        clientHeight: child.clientHeight
                    })) : []
                });
                
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