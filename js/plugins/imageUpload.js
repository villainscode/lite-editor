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

    // 2. 모달 템플릿 
    const template = `
    <div class="modal-overlay">
        <div class="modal-content">            
            <div>
                <!-- URL 입력 -->
                <div style="margin-bottom: 10px;">
                    <label style="display: block; font-size: 13px; font-weight: 500; color: #666; margin-bottom: 4px;">
                        Image URL
                    </label>
                    <input type="url" 
                           placeholder="https://" 
                           style="width: 100%; padding: 6px 8px; font-size: 13px; border: 1px solid #ccc; border-radius: 4px; outline: none;">
                </div>

                 <!-- 구분선 -->
                <div style="display: flex; align-items: center; margin: 8px 0;">
                    <div style="flex-grow: 1; height: 1px; background-color: #e0e0e0;"></div>
                    <div style="margin: 0 10px; font-size: 11px; color: #666;">or</div>
                    <div style="flex-grow: 1; height: 1px; background-color: #e0e0e0;"></div>
                </div>

                <!-- 파일 업로드 -->
                <div style="margin-bottom: 10px;">
                    <label style="display: block; font-size: 13px; font-weight: 500; color: #666; margin-bottom: 4px;">
                        Image File
                    </label>
                    <div style="display: flex; align-items: center; justify-content: center; width: 100%;">
                        <label style="width: 100%; display: flex; flex-direction: column; align-items: center; padding: 10px; background-color: #f8f9fa; color: #666; border-radius: 4px; border: 1px dashed #ccc; cursor: pointer;">
                            <span class="material-icons" style="font-size: 20px; margin-bottom: 4px;">add_photo_alternate</span>
                            <span style="font-size: 12px;">Select a File</span>
                            <input type="file" style="display: none;" accept="image/*">
                        </label>
                    </div>
                </div>
            </div>
            
            <!-- 버튼 -->
            <div style="display: flex; justify-content: flex-end; margin-top: 12px;">
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
        const contentArea = document.querySelector('.lite-editor-content');
        if (!contentArea) {
            console.error('Content area not found');
            return;
        }

        // 에디터에 포커스
        contentArea.focus();

        // 현재 선택 영역 복원
        if (window.liteEditorSelection) {
            window.liteEditorSelection.restore();
        }

        // 이미지 요소 생성
        const img = document.createElement('img');
        img.src = src;
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.style.display = 'block';
        img.style.margin = '10px 0';

        // 현재 선택 영역 가져오기
        const selection = window.getSelection();
        let range;

        if (selection.rangeCount > 0) {
            range = selection.getRangeAt(0);
        } else {
            // 선택 영역이 없으면 새로운 범위 생성
            range = document.createRange();
            range.selectNodeContents(contentArea);
            range.collapse(false); // 끝에 커서 위치
        }

        // 선택된 내용 삭제 (있는 경우)
        range.deleteContents();

        // 이미지 삽입
        range.insertNode(img);

        // 이미지 뒤에 줄바꿈 추가
        const br = document.createElement('br');
        img.parentNode.insertBefore(br, img.nextSibling);

        // 커서를 이미지 뒤로 이동
        const newRange = document.createRange();
        newRange.setStartAfter(br);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);

        // 변경 이벤트 발생
        contentArea.dispatchEvent(new Event('input', { bubbles: true }));

        // 선택 영역 저장
        if (window.liteEditorSelection) {
            window.liteEditorSelection.save();
        }
    }

    function closeModal(modal) {
        if (!modal) return;
        
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
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
                
                // 입력창이 포커스된 상태라면 모달을 닫지 않음
                const urlInput = modal.querySelector('input[type="url"]');
                if (urlInput && urlInput === document.activeElement) {
                    return;
                }
                
                // 그 외의 모든 클릭(다른 툴바 버튼 포함)은 모달 닫기
                closeModal(modal);
            }
        }, true);
        
        // ESC 키로 닫기 - 전역 한 번만 등록
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.querySelector('.modal-overlay.show');
                if (modal) closeModal(modal);
            }
        });
        
        isEventHandlerRegistered = true;
    }

    // 5. 모달 생성 및 표시
    function createModal() {
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
        const fileInput = modal.querySelector('input[type="file"]');
        const urlInput = modal.querySelector('input[type="url"]');

        // 이벤트 핸들러 설정
        closeButton.addEventListener('click', () => closeModal(modal));
        
        // URL 입력창 이벤트 핸들러 추가
        urlInput.addEventListener('input', (e) => {
            const url = e.target.value.trim();
            if (url) {
                // URL이 입력되었을 때 파일 입력을 비활성화
                fileInput.disabled = true;
            } else {
                fileInput.disabled = false;
            }
        });

        // URL 입력창 포커스 이벤트 추가
        urlInput.addEventListener('focus', () => {
            urlInput.style.borderColor = '#9ca3af';
            urlInput.style.boxShadow = '0 0 0 1px rgba(156, 163, 175, 0.5)';
        });

        urlInput.addEventListener('blur', () => {
            urlInput.style.borderColor = '#ccc';
            urlInput.style.boxShadow = 'none';
        });
        
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                const fileName = e.target.files[0].name;
                const textSpan = modal.querySelector('.flex-col span:last-child');
                textSpan.textContent = fileName;
                // 파일이 선택되었을 때 URL 입력을 비활성화
                urlInput.disabled = true;
            } else {
                urlInput.disabled = false;
            }
        });

        insertButton.addEventListener('click', (e) => {
            e.preventDefault();
            
            const url = urlInput.value.trim();
            const file = fileInput.files[0];
            
            if (url) {
                // 현재 선택 영역 저장
                if (window.liteEditorSelection) {
                    window.liteEditorSelection.save();
                }
                
                // 이미지 삽입
                insertImage(url);
            } else if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    // 현재 선택 영역 저장
                    if (window.liteEditorSelection) {
                        window.liteEditorSelection.save();
                    }
                    
                    // 이미지 삽입
                    insertImage(e.target.result);
                };
                reader.readAsDataURL(file);
            }
            
            closeModal(modal);
        });

        // 모달 내부 클릭 이벤트 전파 방지
        modal.addEventListener('click', (e) => {
            e.stopPropagation();
        });

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
                showModal();
            });
            
            // 버튼을 툴바에 추가
            toolbar.appendChild(button);
        }
    });
})();