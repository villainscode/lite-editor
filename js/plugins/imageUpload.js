/**
 * LiteEditor imageUpload Plugin - 안정적인 최적화 버전
 * 이미지 업로드, 리사이징, 드래그앤드롭 기능
 */
(function() {
    const util = window.PluginUtil || {};
    
    // 상수 및 변수 선언
    const PLUGIN_ID = 'imageUpload';
    const STYLE_ID = 'imageUploadStyles';
    const CSS_PATH = 'css/plugins/imageUpload.css';
    let isEventHandlerRegistered = false;
    let savedRange = null;

    // 🔧 유틸리티 함수들 - 기존 기능 완전 보존
    function saveSelection() {
        savedRange = util.selection ? util.selection.saveSelection() : null;
    }

    function getEditorElements() {
        return {
            container: document.querySelector('#lite-editor'),
            content: document.querySelector('.lite-editor-content')
        };
    }

    function saveScrollPositions() {
        const { container, content } = getEditorElements();
        
        return {
            editor: content ? content.scrollTop : 0,
            container: container ? container.scrollTop : 0,
            window: window.pageYOffset,
            body: document.body.scrollTop,
            documentElement: document.documentElement.scrollTop
        };
    }

    function restoreScrollPositions(positions) {
        if (!positions) return;
        
        const { content } = getEditorElements();
        
        const restore = () => {
            if (content) content.scrollTop = positions.editor;
            window.scrollTo(0, positions.window);
            document.body.scrollTop = positions.body;
            document.documentElement.scrollTop = positions.documentElement;
        };

        // 다단계 복원 - 기존과 동일
        restore();
        requestAnimationFrame(restore);
        setTimeout(restore, 50);
        setTimeout(restore, 100);
    }

    function generateImageHTML(src) {
        const timestamp = Date.now();
        return `
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
    }

    // 🔧 기존 insertImage 함수 로직 완전 보존
    function insertImage(src) {
        console.log('[IMAGE_UPLOAD] insertImage 시작:', src);
        
        if (!src) {
            console.error('[IMAGE_UPLOAD] 이미지 src가 없습니다');
            return;
        }
        
        const { content: editor } = getEditorElements();
        if (!editor) {
            console.error('[IMAGE_UPLOAD] 편집 영역을 찾을 수 없습니다!');
            return;
        }
        
        // 스크롤 위치 저장
        const scrollPositions = saveScrollPositions();
        console.log('[DEBUG] 스크롤 위치들 저장:', scrollPositions);
        
        const imageHTML = generateImageHTML(src);
        
        console.log('[DEBUG] 저장된 선택 영역 상태:', {
            savedRange: !!savedRange
        });
        
        // 저장된 선택 영역이 있으면 복원 후 삽입
        if (savedRange && util.selection) {
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
                        const success = document.execCommand('insertHTML', false, imageHTML);
                        console.log('[DEBUG] execCommand 결과:', success);
                        
                        if (success) {
                            restoreScrollPositions(scrollPositions);
                            
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
        
        // 대안: 에디터 끝에 삽입
        console.log('[DEBUG] 에디터 끝에 완전한 이미지 컨테이너 삽입');
        editor.insertAdjacentHTML('beforeend', imageHTML);
        
        restoreScrollPositions(scrollPositions);
        
        const event = new Event('input', { bubbles: true });
        editor.dispatchEvent(event);
        
        console.log('[IMAGE_UPLOAD] insertImage 완료');
    }

    // 모달 템플릿 - 기존과 동일
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

    // 모달 관리 함수들 - 기존과 동일
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
        const closeButton = modal.querySelector('button[data-action="close"]');
        const insertButton = modal.querySelector('button[type="submit"]');
        const urlInput = modal.querySelector('#image-url-input');
        const fileInput = modal.querySelector('#image-file-input');

        closeButton.addEventListener('click', () => closeModal(modal));
        
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
            }
        });
    }

    function processImageInsertion(url, file, modal) {
        console.log('[IMAGE_UPLOAD] processImageInsertion 시작:', { url: !!url, file: !!file });
        
        closeModal(modal);
        
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
        
        isEventHandlerRegistered = true;
    }

    // 🔧 드래그 앤 드롭 기능 - 기존 로직 완전 보존
    function initImageDragDrop() {
        const { container: editor } = getEditorElements();
        if (!editor) return;

        let draggedImage = null;
        let dropIndicator = null;
        let selectedImage = null;
        let animationFrameId = null;

        if (window.getComputedStyle(editor).position === 'static') {
            editor.style.position = 'relative';
        }

        function createDropIndicator() {
            const indicator = document.createElement('div');
            indicator.className = 'image-drop-indicator';
            Object.assign(indicator.style, {
                position: 'absolute',
                width: '2px',
                height: '20px',
                backgroundColor: '#4285f4',
                zIndex: '9999',
                pointerEvents: 'none',
                animation: 'cursorBlink 1s infinite',
                display: 'none'
            });
            
            editor.appendChild(indicator);
            return indicator;
        }

        function showDropIndicator(x, y) {
            if (!dropIndicator) {
                dropIndicator = createDropIndicator();
            }

            let range = document.caretRangeFromPoint(x, y);
            if (!range) return;

            const rects = range.getClientRects();
            const editorRect = editor.getBoundingClientRect();

            if (!rects.length) {
                const tempSpan = document.createElement('span');
                Object.assign(tempSpan.style, {
                    display: 'inline-block',
                    width: '0',
                    height: '1em'
                });
                tempSpan.textContent = '\u200B';
                
                range.insertNode(tempSpan);
                
                const tempRect = tempSpan.getBoundingClientRect();
                Object.assign(dropIndicator.style, {
                    left: (tempRect.left - editorRect.left) + 'px',
                    top: (tempRect.top - editorRect.top) + 'px',
                    height: tempRect.height + 'px',
                    display: 'block'
                });
                
                tempSpan.parentNode.removeChild(tempSpan);
            } else {
                const rect = rects[0];
                Object.assign(dropIndicator.style, {
                    left: (rect.left - editorRect.left) + 'px',
                    top: (rect.top - editorRect.top) + 'px',
                    height: rect.height + 'px',
                    display: 'block'
                });
            }
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

        // 이벤트 리스너들 - 기존과 동일
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
            
            setTimeout(() => imageWrapper.classList.add('dragging'), 0);
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
            
            // 🔧 드롭 시 스크롤 위치 보존
            const scrollPositions = saveScrollPositions();
            
            let range = document.caretRangeFromPoint?.(event.clientX, event.clientY);
            
            if (!range && document.caretPositionFromPoint) {
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
                
                // br 태그 추가
                if (!draggedImage.nextSibling || 
                    (draggedImage.nextSibling.nodeType !== Node.ELEMENT_NODE || 
                     draggedImage.nextSibling.nodeName !== 'BR')) {
                    const br = document.createElement('br');
                    draggedImage.parentNode.insertBefore(br, draggedImage.nextSibling);
                }
                
                // 선택 위치 조정
                const selection = window.getSelection();
                selection.removeAllRanges();
                
                const newRange = document.createRange();
                newRange.setStartAfter(draggedImage);
                newRange.collapse(true);
                selection.addRange(newRange);
                
                // 스크롤 위치 복원
                restoreScrollPositions(scrollPositions);
                
                const { content } = getEditorElements();
                if (content) {
                    const event = new Event('input', { bubbles: true });
                    content.dispatchEvent(event);
                }
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

    // 플러그인 등록 - 기존과 동일
    LiteEditor.registerPlugin(PLUGIN_ID, {
        title: 'Image upload',
        icon: 'photo_camera',
        customRender: function(toolbar, contentArea) {
            if (util.styles && util.styles.loadCssFile) {
                util.styles.loadCssFile(STYLE_ID, CSS_PATH);
            }

            addDragAndDropStyles();
            setTimeout(initImageDragDrop, 500);

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