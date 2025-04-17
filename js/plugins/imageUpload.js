/**
 * LiteEditor imageUpload Plugin
 * 이미지 업로드 플러그인 (최적화 버전)
 */
(function() {
    // 1. 상수 및 전역 변수 선언
    const PLUGIN_ID = 'imageUpload';
    const STYLE_ID = 'imageUploadStyles';
    const CSS_PATH = 'css/plugins/imageUpload.css';
    const HOVER_STYLE_ID = 'modalHoverStyles';
    let isGlobalEventsRegistered = false;
    let savedRange = null;

    // 2. 선택 영역 유틸리티
    function saveSelection() {
        const sel = window.getSelection();
        if (sel.rangeCount > 0) {
            savedRange = sel.getRangeAt(0).cloneRange();
        }
    }

    function restoreSelection() {
        const sel = window.getSelection();
        sel.removeAllRanges();
        if (savedRange) {
            sel.addRange(savedRange);
        }
    }

    // 3. 에디터 상태 업데이트 유틸리티
    function dispatchEditorEvent(editor) {
        editor.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // 4. 호버 스타일 추가 (한 번만)
    function addModalHoverStyles() {
        if (document.getElementById(HOVER_STYLE_ID)) return;
        
        const styleEl = document.createElement('style');
        styleEl.id = HOVER_STYLE_ID;
        styleEl.type = 'text/css';
        styleEl.innerText = `
            .modal-overlay button {
                transition: transform 0.1s ease !important;
            }
            .modal-overlay button:hover {
                transform: scale(0.95) !important;
                background-color: rgba(0, 0, 0, 0.05) !important;
            }
        `;
        document.head.appendChild(styleEl);
    }

    // 5. 이미지 삽입 기능
    function insertImage(src) {
        if (!src) return;
        
        const editor = document.querySelector('#lite-editor');
        if (!editor) {
            console.error('Editor element not found!');
            return;
        }
        
        editor.focus();
        restoreSelection();

        // 컨테이너 div 생성 (리사이징을 위해)
        const container = document.createElement('div');
        container.contentEditable = false;
        Object.assign(container.style, {
            display: 'inline-block',
            resize: 'both',
            overflow: 'auto',
            maxWidth: '100%',
            margin: '10px 0'
        });

        // 이미지 생성 및 스타일 적용
        const img = document.createElement('img');
        img.src = src;
        Object.assign(img.style, {
            width: '100%',
            height: 'auto',
            display: 'block'
        });

        // 이미지를 컨테이너에 추가
        container.appendChild(img);

        // 선택 영역 가져오기
        const sel = window.getSelection();
        let range = (sel.rangeCount > 0) ? sel.getRangeAt(0) : null;
        
        if (!range) {
            // 선택 영역이 없으면 에디터 끝에 추가할 범위 생성
            range = document.createRange();
            range.selectNodeContents(editor);
            range.collapse(false);
        }
        
        // 컨테이너 삽입
        range.deleteContents();
        range.insertNode(container);

        // 컨테이너 뒤에 줄바꿈 추가
        const br = document.createElement('br');
        container.parentNode.insertBefore(br, container.nextSibling);
        
        // 커서 위치 조정 (줄바꿈 뒤로)
        const newRange = document.createRange();
        newRange.setStartAfter(br);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);

        // 에디터 상태 업데이트
        dispatchEditorEvent(editor);
        saveSelection();
    }

    // 6. 모달 닫기
    function closeModal(modal) {
        if (!modal) return;
        
        modal.classList.remove('show');
        modal.style.opacity = '0';
        modal.style.visibility = 'hidden';
        
        setTimeout(() => modal.remove(), 300);
    }

    // 7. 전역 이벤트 설정
    function setupGlobalEvents() {
        if (isGlobalEventsRegistered) return;
        
        // 외부 클릭 시 모달 닫기
        document.addEventListener('click', (e) => {
            const modal = document.querySelector('.modal-overlay.show');
            const uploadBtn = document.querySelector('.lite-editor-image-upload-button');
            
            if (modal && !modal.contains(e.target) && 
                !(uploadBtn === e.target || uploadBtn.contains(e.target))) {
                closeModal(modal);
            }
        }, true);
        
        // ESC 키로 모달 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.querySelector('.modal-overlay.show');
                if (modal) closeModal(modal);
            }
        });
        
        isGlobalEventsRegistered = true;
    }

    // 8. 모달 템플릿
    const modalTemplate = `
    <div class="modal-overlay">
        <div class="modal-content">
            <div>
                <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #333;">Insert Image</h3>
                <div style="margin-bottom: 10px;">
                    <label style="display: block; font-size: 13px; font-weight: 500; color: #666; margin-bottom: 4px;">URL</label>
                    <input type="url" id="image-url-input" placeholder="https://" style="width: 100%; padding: 6px 8px; font-size: 13px; border: 1px solid #ccc; border-radius: 4px; outline: none;">
                </div>
                <div style="display: flex; align-items: center; margin: 15px 0;">
                    <div style="font-size: 11px; color: #888; margin-right: 8px;">OR</div>
                    <div style="flex-grow: 1; height: 1px; background-color: #e0e0e0;"></div>
                </div>
                <div style="margin-bottom: 10px;">
                    <label style="display: block; font-size: 13px; font-weight: 500; color: #666; margin-bottom: 4px;">File</label>
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
                <button type="submit" style="display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 4px; border: none; background-color: transparent; cursor: pointer;" title="Insert">
                    <span class="material-icons" style="font-size: 18px; color: #5f6368;">add_circle</span>
                </button>
            </div>
        </div>
    </div>`;

    // 9. 모달 생성 및 설정
    function createModal() {
        saveSelection();
        
        // 기존 모달 제거
        const existing = document.querySelector('.modal-overlay');
        if (existing) existing.remove();

        // 모달 생성 및 DOM에 추가
        const container = document.createElement('div');
        container.innerHTML = modalTemplate;
        const modal = container.firstElementChild;
        document.body.appendChild(modal);

        // 모달 기본 스타일 설정
        Object.assign(modal.style, {
            position: 'absolute',
            backgroundColor: 'transparent',
            display: 'block',
            width: 'auto',
            height: 'auto',
            opacity: '0',
            visibility: 'hidden'
        });

        // 내부 요소 참조
        const insertBtn = modal.querySelector('button[type="submit"]');
        const urlInput = modal.querySelector('#image-url-input');
        const fileInput = modal.querySelector('#image-file-input');
        
        // 모달 컨텐츠 클릭 시 이벤트 전파 중단
        modal.querySelector('.modal-content').addEventListener('click', e => e.stopPropagation());

        // URL 입력 필드 엔터키 처리
        urlInput.addEventListener('keydown', e => {
            if (e.key !== 'Escape') {
                e.stopPropagation(); // ESC 키를 제외한 키 입력은 버블링 방지
            }
            
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
        fileInput.addEventListener('change', e => {
            if (e.target.files.length > 0) {
                const fileName = e.target.files[0].name;
                const labelSpan = fileInput.parentElement.querySelector('span:not(.material-icons)');
                if (labelSpan) labelSpan.textContent = fileName;
            }
        });

        // 삽입 버튼 클릭 처리
        insertBtn.addEventListener('click', e => {
            e.preventDefault();
            
            const url = urlInput.value.trim();
            const file = fileInput.files[0];
            
            if (url || file) {
                closeModal(modal);
                
                // 모달이 닫힌 후 이미지 삽입 처리
                setTimeout(() => {
                    const editor = document.querySelector('#lite-editor');
                    if (editor) editor.focus();
                    restoreSelection();
                    
                    if (url) {
                        insertImage(url);
                    } else if (file) {
                        const reader = new FileReader();
                        reader.onload = ev => insertImage(ev.target.result);
                        reader.readAsDataURL(file);
                    }
                }, 300);
            }
        });

        // 모달 오버레이의 클릭 이벤트 처리
        modal.addEventListener('click', e => {
            if (e.target.tagName.toLowerCase() !== 'button') {
                closeModal(modal);
            }
        });

        // 모달 표시 및 URL 입력 필드 포커스
        setTimeout(() => {
            modal.classList.add('show');
            modal.style.opacity = '1';
            modal.style.visibility = 'visible';
            requestAnimationFrame(() => urlInput.focus());
        }, 10);

        return modal;
    }

    // 10. 모달 표시
    function showModal() {
        const modal = createModal();
        
        // 버튼 위치 기준으로 모달 위치 계산
        const btn = document.querySelector('.lite-editor-image-upload-button');
        if (btn) {
            const rect = btn.getBoundingClientRect();
            modal.style.top = (rect.bottom + window.scrollY) + 'px';
            modal.style.left = (rect.left + window.scrollX) + 'px';
            
            // 화면 경계 체크
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
        
        // 전역 이벤트 설정
        setupGlobalEvents();
        // 호버 스타일 추가
        addModalHoverStyles();
    }

    // 11. 플러그인 등록
    LiteEditor.registerPlugin(PLUGIN_ID, {
        title: 'Image upload',
        icon: 'photo_camera',
        customRender: (toolbar, contentArea) => {
            // 스타일시트 로드 (한 번만)
            if (!document.getElementById(STYLE_ID)) {
                const link = document.createElement('link');
                link.id = STYLE_ID;
                link.rel = 'stylesheet';
                link.href = CSS_PATH;
                document.head.appendChild(link);
            }

            // 버튼 생성
            const button = document.createElement('button');
            button.className = 'lite-editor-button lite-editor-image-upload-button';
            button.title = 'Image upload';
            
            // 아이콘 추가
            const icon = document.createElement('i');
            icon.className = 'material-symbols-outlined';
            icon.textContent = 'photo_camera';
            button.appendChild(icon);
            
            // 클릭 이벤트
            button.addEventListener('click', e => {
                e.preventDefault();
                e.stopPropagation();
                
                // 기존 표시된 모달이 있는지 확인하고 토글
                const existingModal = document.querySelector('.modal-overlay.show');
                if (existingModal) {
                    closeModal(existingModal);
                    return;
                }
                
                showModal();
            });
            
            // 버튼을 툴바에 추가
            toolbar.appendChild(button);
            
            // 전역 이벤트 설정
            setupGlobalEvents();
        }
    });

    // 함수 선언 (파일 상단 다른 함수들과 함께 선언)
    function addTableHoverStyles() {
        const styleId = 'tableHoverStyles';
        if (document.getElementById(styleId)) return;
        
        const styleEl = document.createElement('style');
        styleEl.id = styleId;
        styleEl.type = 'text/css';
        styleEl.innerText = `
            .grid-layer button {
                transition: transform 0.1s ease !important;
            }
            .grid-layer button:hover {
                transform: scale(0.95) !important;
                background-color: rgba(0, 0, 0, 0.05) !important;
            }
        `;
        document.head.appendChild(styleEl);
    }

    // 4. 그리드 레이어 스타일 추가 함수 수정
    function addTableStyles() {
        if (document.getElementById(STYLE_ID)) return;
        
        // CSS 파일 로드
        const linkEl = document.createElement('link');
        linkEl.id = STYLE_ID;
        linkEl.rel = 'stylesheet';
        linkEl.type = 'text/css';
        linkEl.href = CSS_PATH;
        document.head.appendChild(linkEl);
        
        // 호버 스타일 추가
        addTableHoverStyles();
    }
})();