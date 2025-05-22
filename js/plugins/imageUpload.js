/**
 * LiteEditor imageUpload Plugin
 * 이미지 업로드 플러그인
 */
(function() {
    // 1. 상수 및 변수 선언 영역
    const PLUGIN_ID = 'imageUpload';
    const STYLE_ID = 'imageUploadStyles';
    const CSS_PATH = 'css/plugins/imageUpload.css';
    let isEventHandlerRegistered = false;

    // 현재 커서의 위치 저장 
    let savedRange = null;

    function saveSelection() {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            savedRange = selection.getRangeAt(0).cloneRange();
        }
    }

    function restoreSelection() {
        const selection = window.getSelection();
        selection.removeAllRanges();
        if (savedRange) {
            selection.addRange(savedRange);
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

    // 3. 유틸리티 함수
    function insertImage(src) {
        if (!src) return;
        
        // 에디터 찾기
        const editor = document.querySelector('#lite-editor');
        if (!editor) {
            console.error('Editor element not found!');
            return;
        }
        // 에디터에 포커스 강제
        editor.focus();
        
        // 이미지 컨테이너 생성 (드래그 가능하도록)
        const container = document.createElement('div');
        container.className = 'image-wrapper';
        container.contentEditable = false;
        container.draggable = true;
        container.id = 'img-' + Date.now(); // 고유 ID 부여
        container.style.display = 'inline-block';
        container.style.position = 'relative';
        container.style.margin = '10px 0';
        container.style.maxWidth = '100%';
        container.style.resize = 'both';
        container.style.overflow = 'hidden';

        // 이미지 생성 
        const img = document.createElement('img');
        img.src = src;
        img.style.width = '100%';
        img.style.height = 'auto';
        img.style.display = 'block';
        
        // 이미지를 컨테이너에 추가
        container.appendChild(img);
        
        // 현재 선택 영역 가져오기
        let selection = window.getSelection();
        // 만약 선택 영역이 없으면, 저장해둔 선택 영역이 있다면 복원합니다.
        if (selection.rangeCount === 0 && savedRange) {
            selection.addRange(savedRange);
        }
        const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
        
        if (range) {
            // 1. 선택 영역에 이미지 삽입
            range.deleteContents();
            range.insertNode(container);

            // 2. 줄바꿈 추가
            const br = document.createElement('br');
            container.parentNode.insertBefore(br, container.nextSibling);
            
            // 커서 위치 조정
            const newRange = document.createRange();
            newRange.setStartAfter(br);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
            
            // 에디터 상태 갱신 이벤트 트리거
            const event = new Event('input', { bubbles: true });
            editor.dispatchEvent(event);
        } else {
            // 선택 영역이 없으면 편집기 끝에 추가
            editor.appendChild(container);
            
            // 줄바꿈 추가
            const br = document.createElement('br');
            editor.appendChild(br);
            
            // 커서 이동
            const newRange = document.createRange();
            newRange.setStartAfter(br);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
            
            // 에디터 상태 갱신 이벤트 트리거
            const event = new Event('input', { bubbles: true });
            editor.dispatchEvent(event);
        }
    }

    function closeModal(modal) {
        if (!modal) return;
        
        modal.classList.remove('show');
        modal.style.opacity = '0';
        modal.style.visibility = 'hidden';
        
        // 300ms 후 완전 제거
        setTimeout(() => {
            modal.remove();
        }, 300);
    }

    // 4. 이벤트 핸들러 설정
    function setupGlobalEvents() {
        if (isEventHandlerRegistered) return;
        
        // 외부 클릭 시 닫기 - 이벤트 위임 사용
        document.addEventListener('click', (e) => {
            const modal = document.querySelector('.modal-overlay.show');
            const button = document.querySelector('.lite-editor-image-upload-button');
            
            // 모달이 표시 중이고, 클릭된 요소가 모달 내부가 아니고, 
            // 현재 이미지 업로드 버튼을 클릭한 것이 아니면 모달 닫기
            if (modal && !modal.contains(e.target)) {
                // 이미지 업로드 버튼 클릭 시에는 닫지 않음 (모달 토글 동작을 위해)
                if (button === e.target || button.contains(e.target)) {
                    return;
                }
                
                // 그 외의 모든 클릭(다른 툴바 버튼 포함)은 모달 닫기
                closeModal(modal);
            }
        }, false);
        
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

        // 모달 생성 및 DOM에 추가
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = template;
        const modal = modalContainer.firstElementChild;
        document.body.appendChild(modal);

        // 모달 내부 요소 참조
        const closeButton = modal.querySelector('button[data-action="close"]');
        const insertButton = modal.querySelector('button[type="submit"]');
        const urlInput = modal.querySelector('#image-url-input');
        const fileInput = modal.querySelector('#image-file-input');

        // 이벤트 핸들러 설정
        closeButton.addEventListener('click', () => closeModal(modal));
        
        // 모달 내부 클릭이 외부로 전파되지 않도록 방지
        modal.addEventListener('click', (e) => {
            // 모달 내부 클릭은 여기서 처리하고 전파 중단
            e.stopPropagation();
        });
        
        // URL 입력 필드에 이벤트 리스너 추가
        urlInput.addEventListener('click', (e) => {
            // 이벤트 버블링 방지
            e.stopPropagation();
        });

        urlInput.addEventListener('keydown', (e) => {
            // ESC 키를 제외한 다른 키 입력은 버블링 방지
            if (e.key !== 'Escape') {
                e.stopPropagation();
            }
            // Enter 키 처리 추가
            if (e.key === 'Enter') {
                e.preventDefault();
                const url = urlInput.value.trim();
                if (url) {
                    insertImage(url);
                    closeModal(modal);
                }
            }
        });

        // 파일 선택 시 파일명 표시
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
                closeModal(modal);
                // 모달이 닫힌 후 에디터로 포커스를 전환하고 선택 영역 복원
                setTimeout(() => {
                    // 에디터 요소에 포커스 강제 전환
                    const editor = document.querySelector('#lite-editor');
                    if (editor) {
                        editor.focus();
                    }
                    restoreSelection();
                    
                    // 이미지 삽입 실행
                    if (url) {
                        insertImage(url);
                    } else {
                        const reader = new FileReader();
                        reader.onload = (e) => insertImage(e.target.result);
                        reader.readAsDataURL(file);
                    }
                }, 300);
            }
        });

        // 모달 오버레이의 클릭 이벤트
        modal.addEventListener('click', (e) => {
            if (e.target.tagName.toLowerCase() !== 'button') {
                closeModal(modal);
            }
        });
        
        // 모달 표시 후 URL 입력 필드에 자동 포커스 추가
        setTimeout(() => {
            modal.classList.add('show');
            modal.style.opacity = '1';
            modal.style.visibility = 'visible';
            
            // RAF를 사용한 안정적인 포커스 처리
            requestAnimationFrame(() => {
                urlInput.focus();
            });
        }, 10);
        
        // 스타일 및 위치 설정
        modal.style.position = 'absolute';
        modal.style.backgroundColor = 'transparent';
        modal.style.width = 'auto';
        modal.style.height = 'auto';
        modal.style.display = 'block';
        modal.style.opacity = '0';
        modal.style.visibility = 'hidden';

        return modal;
    }
    
    function showModal() {
        const modal = createModal();
        
        const button = document.querySelector('.lite-editor-image-upload-button');
        
        // 버튼 기준 위치 계산
        if (button) {
            const buttonRect = button.getBoundingClientRect();
            
            // 모달 위치 설정
            modal.style.top = (buttonRect.bottom + window.scrollY) + 'px';
            modal.style.left = (buttonRect.left + window.scrollX) + 'px';
            
            // 화면 경계 처리
            setTimeout(() => {
                const modalRect = modal.getBoundingClientRect();
                if (modalRect.right > window.innerWidth) {
                    modal.style.left = (window.innerWidth - modalRect.width - 10) + 'px';
                }
            }, 0);
        }
        
        // 모달 표시
        setTimeout(() => {
            modal.style.removeProperty('opacity');
            modal.style.removeProperty('visibility');
            modal.classList.add('show');
        }, 10);

        // 전역 이벤트 핸들러 설정
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
            
            // 에디터 내부에 추가 (body 대신)
            editor.appendChild(indicator);
            return indicator;
        }

        // 빈 영역 처리를 포함한 드롭 인디케이터 표시 함수
        function showDropIndicator(x, y) {
            if (!dropIndicator) {
                dropIndicator = createDropIndicator();
            }

            // 캐럿 위치 계산
            let range = document.caretRangeFromPoint(x, y);
            if (!range) return;

            // 빈 영역 감지 및 처리
            const rects = range.getClientRects();
            if (!rects.length || rects.length === 0) {
                // 임시 스팬 삽입 방식으로 좌표 구하기
                const tempSpan = document.createElement('span');
                tempSpan.style.display = 'inline-block';
                tempSpan.style.width = '0';
                tempSpan.style.height = '1em';
                tempSpan.textContent = '\u200B'; // 제로 너비 공백
                
                // 임시 요소 삽입
                range.insertNode(tempSpan);
                
                // 새 좌표 구하기
                const tempRect = tempSpan.getBoundingClientRect();
                
                // 인디케이터 위치 설정
                const editorRect = editor.getBoundingClientRect();
                dropIndicator.style.left = (tempRect.left - editorRect.left) + 'px';
                dropIndicator.style.top = (tempRect.top - editorRect.top) + 'px';
                dropIndicator.style.height = tempRect.height + 'px';
                
                // 임시 요소 제거
                tempSpan.parentNode.removeChild(tempSpan);
            } else {
                // 일반적인 경우: 레인지의 첫 번째 사각형 사용
                const rect = rects[0];
                const editorRect = editor.getBoundingClientRect();
                
                // 에디터 기준 상대 위치 계산
                dropIndicator.style.left = (rect.left - editorRect.left) + 'px';
                dropIndicator.style.top = (rect.top - editorRect.top) + 'px';
                dropIndicator.style.height = rect.height + 'px';
            }
            
            dropIndicator.style.display = 'block';
        }

        // requestAnimationFrame을 사용한 throttle 구현
        function throttledShowIndicator(x, y) {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            
            animationFrameId = requestAnimationFrame(() => {
                showDropIndicator(x, y);
                animationFrameId = null;
            });
        }

        // 드롭 인디케이터 숨기기
        function hideDropIndicator() {
            if (dropIndicator) {
                dropIndicator.style.display = 'none';
            }
            
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        }

        // 이미지 선택 함수
        function selectImage(imageWrapper) {
            // 이전 선택 해제
            if (selectedImage && selectedImage !== imageWrapper) {
                selectedImage.removeAttribute('data-selected');
            }
            
            // 새 이미지 선택
            selectedImage = imageWrapper;
            selectedImage.setAttribute('data-selected', 'true');
        }

        // 이미지 선택 해제
        function deselectImage() {
            if (selectedImage) {
                selectedImage.removeAttribute('data-selected');
                selectedImage = null;
            }
        }

        // 가장 가까운 요소 찾기
        function findClosestElement(element, selector) {
            while (element && element.nodeType === 1) {
                if (element.matches(selector)) {
                    return element;
                }
                element = element.parentElement;
            }
            return null;
        }

        // 이미지 클릭 이벤트 (위임)
        editor.addEventListener('click', (event) => {
            const imageWrapper = findClosestElement(event.target, '.image-wrapper');
            
            if (!imageWrapper) {
                deselectImage();
                return;
            }
            
            selectImage(imageWrapper);
            event.stopPropagation();
        });

        // 드래그 시작 처리
        editor.addEventListener('dragstart', (event) => {
            const imageWrapper = findClosestElement(event.target, '.image-wrapper');
            if (!imageWrapper) return;

            draggedImage = imageWrapper;
            selectImage(imageWrapper);
            
            // 드래그 데이터 설정
            event.dataTransfer.setData('text/plain', imageWrapper.id);
            event.dataTransfer.effectAllowed = 'move';
            
            // 시각적 피드백
            setTimeout(() => {
                imageWrapper.classList.add('dragging');
            }, 0);
        });

        // 드래그 오버 처리 (throttle 적용)
        editor.addEventListener('dragover', (event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            
            if (draggedImage) {
                throttledShowIndicator(event.clientX, event.clientY);
            }
        });

        // 드래그 리브 처리
        editor.addEventListener('dragleave', (event) => {
            if (!editor.contains(event.relatedTarget)) {
                hideDropIndicator();
            }
        });

        // 드롭 처리
        editor.addEventListener('drop', (event) => {
            event.preventDefault();
            event.stopPropagation();
            
            hideDropIndicator();
            
            if (!draggedImage) return;
            
            // 드롭 위치 계산
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
                // 원래 위치에서 이미지 제거 후 새 위치에 삽입
                if (draggedImage.parentNode) {
                    draggedImage.parentNode.removeChild(draggedImage);
                }
                
                range.insertNode(draggedImage);
                
                // 드래그 상태 초기화
                draggedImage.classList.remove('dragging');
                
                // 줄바꿈 확인 및 추가
                if (!draggedImage.nextSibling || 
                    (draggedImage.nextSibling.nodeType !== Node.ELEMENT_NODE || 
                     draggedImage.nextSibling.nodeName !== 'BR')) {
                    const br = document.createElement('br');
                    draggedImage.parentNode.insertBefore(br, draggedImage.nextSibling);
                }
                
                // 커서 위치 조정
                const selection = window.getSelection();
                selection.removeAllRanges();
                
                const newRange = document.createRange();
                newRange.setStartAfter(draggedImage);
                newRange.collapse(true);
                selection.addRange(newRange);
                
                // 에디터 상태 갱신 이벤트 트리거
                const event = new Event('input', { bubbles: true });
                editor.dispatchEvent(event);
            }
            
            draggedImage = null;
        });

        // 드래그 종료 처리
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
            // 스타일시트 로드 (한 번만)
            if (!document.querySelector(`#${STYLE_ID}`)) {
                const styleSheet = document.createElement('link');
                styleSheet.id = STYLE_ID;
                styleSheet.rel = 'stylesheet';
                styleSheet.href = CSS_PATH;
                document.head.appendChild(styleSheet);
            }

            // 드래그 앤 드롭 스타일 추가
            addDragAndDropStyles();
            
            // 드래그 앤 드롭 기능 초기화 (약간의 지연을 두어 에디터가 완전히 로드된 후 초기화)
            setTimeout(initImageDragDrop, 500);

            // 버튼 생성
            const button = document.createElement('button');
            button.className = 'lite-editor-button lite-editor-image-upload-button';
            button.setAttribute('title', 'Image upload');
            
            // 아이콘 추가
            const icon = document.createElement('i');
            icon.className = 'material-symbols-outlined';
            icon.textContent = 'photo_camera';
            button.appendChild(icon);
            
            // 클릭 이벤트
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // 기존 표시된 모달이 있는지 확인
                const existingModal = document.querySelector('.modal-overlay.show');
                if (existingModal) {
                    closeModal(existingModal);
                    return;
                }
                
                showModal();
            });
            
            // 버튼을 툴바에 추가
            toolbar.appendChild(button);
            
            // 전역 이벤트 핸들러 설정
            setupGlobalEvents();
        }
    });
})();