/**
 * LiteEditor imageUpload Plugin
 * 이미지 업로드 플러그인 (리팩토링 버전)
 * 통합 레이어 관리 방식으로 수정
 */
(function() {
    // 1. 상수 및 전역 변수 선언
    const PLUGIN_ID = 'imageUpload';
    const STYLE_ID = 'imageUploadStyles';
    const CSS_PATH = 'css/plugins/imageUpload.css';
    
    // PluginUtil 참조
    const util = window.PluginUtil || {};
    if (!util.selection) {
        console.error('ImageUploadPlugin: PluginUtil.selection이 필요합니다.');
    }
    
    // 전역 상태 변수
    let savedRange = null;          // 임시로 저장된 선택 영역
    let isModalOpen = false;        // 모달 열림 상태
    let imageModal = null;          // 현재 열린 모달 참조

    /**
     * 선택 영역 저장
     */
    function saveSelection() {
        savedRange = util.selection.saveSelection();
    }

    /**
     * 저장된 선택 영역 복원
     */
    function restoreSelection() {
        if (!savedRange) return false;
        return util.selection.restoreSelection(savedRange);
    }
    
    /**
     * 선택 영역 초기화
     */
    function clearSelection() {
        savedRange = null;
    }

    /**
     * 이미지 삽입 기능
     * @param {string} src - 이미지 URL 또는 Data URL
     */
    function insertImage(src) {
        if (!src) return;
        
        const editor = document.querySelector('#lite-editor');
        if (!editor) {
            errorHandler.logError('ImageUploadPlugin', errorHandler.codes.PLUGINS.IMAGE.EDITOR_NOT_FOUND, new Error('Editor element not found!'));
            return;
        }
        
        try {
            editor.focus({ preventScroll: true });
        } catch (e) {
            editor.focus();
        }
        
        // 저장된 선택 영역 복원
        restoreSelection();
        
        // 선택 영역 가져오기
        const selection = util.selection.getSafeSelection();
        let range = (selection && selection.rangeCount > 0) ? selection.getRangeAt(0) : null;
        
        if (!range) {
            // 선택 영역이 없으면 에디터 끝에 추가할 범위 생성
            range = document.createRange();
            range.selectNodeContents(editor);
            range.collapse(false);
        }
        
        // 1. 먼저 앵커 요소 삽입 (고정 ID 사용)
        const anchorId = 'image-insert-anchor-' + Date.now();
        const anchor = document.createElement('span');
        anchor.id = anchorId;
        anchor.style.display = 'inline';
        anchor.style.width = '0';
        anchor.style.height = '0';
        anchor.style.overflow = 'hidden';
        anchor.style.lineHeight = '0';
        anchor.innerHTML = '&nbsp;'; // 일부 브라우저에서 빈 요소가 제대로 처리되지 않을 수 있음
        range.insertNode(anchor);
        
        // 2. range를 앵커 뒤로 이동 (이미지가 앵커 뒤에 삽입되도록)
        range.setStartAfter(anchor);
        range.collapse(true);
        
        // 3. 이미지 컨테이너 생성
        const container = util.dom.createElement('div', {}, {
            display: 'inline-block',
            resize: 'both',
            overflow: 'auto',
            maxWidth: '100%',
            margin: '10px 0'
        });
        container.contentEditable = false;
        
        // 4. 이미지 생성
        const img = util.dom.createElement('img', {
            src: src
        }, {
            width: '100%',
            height: 'auto',
            display: 'block'
        });
        container.appendChild(img);
        
        // 5. 컨테이너 삽입 (앵커 뒤에 삽입됨)
        range.insertNode(container);
        
        // 6. 컨테이너 뒤에 줄바꿈 추가
        const br = document.createElement('br');
        container.parentNode.insertBefore(br, container.nextSibling);
        
        // 7. 커서 위치 조정 (줄바꿈 뒤로)
        util.selection.moveCursorTo(br.nextSibling || br, 0);
        
        // 8. 에디터 상태 업데이트
        util.editor.dispatchEditorEvent(editor);
        
        // 9. 선택 영역 초기화
        clearSelection();
        
        // 10. 이미지 로드 후 앵커로 스크롤
        img.onload = function() {
            const anchor = document.getElementById(anchorId);
            if (anchor) {
                anchor.scrollIntoView({ block: 'nearest', behavior: 'auto' });
                anchor.remove();
            }
        };
        
        // 11. 이미지 로드 이벤트가 발생하지 않을 경우를 대비한 백업
        setTimeout(() => {
            const anchor = document.getElementById(anchorId);
            if (anchor) {
                anchor.scrollIntoView({ block: 'nearest', behavior: 'auto' });
                anchor.remove();
            }
        }, 500);
    }

    
    /**
     * 모달 컨텐츠 생성
     * @returns {HTMLElement} 모달 컨텐츠 요소
     */
    function createModalContent() {
        // 모달 컨텐츠 컨테이너
        const modalContent = util.dom.createElement('div', {
            className: 'modal-content'
        }, {
            width: '280px',
            height: '280px',
            boxSizing: 'border-box',
            position: 'relative',
            borderRadius: '4px',
            backgroundColor: 'white',
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
        });
        
        // 모달 내용 영역
        const contentContainer = util.dom.createElement('div', {}, {
            padding: '16px 16px 10px 16px'
        });
        
        // 제목
        const title = util.dom.createElement('h3', {
            textContent: 'Insert Image'
        }, {
            margin: '0 0 12px 0',
            fontSize: '14px',
            fontWeight: '600',
            color: '#333'
        });
        contentContainer.appendChild(title);
        
        // URL 입력 영역
        const urlContainer = util.dom.createElement('div', {}, {
            marginBottom: '10px'
        });
        
        const urlLabel = util.dom.createElement('label', {
            textContent: 'URL'
        }, {
            display: 'block',
            fontSize: '13px',
            fontWeight: '500',
            color: '#666',
            marginBottom: '4px'
        });
        
        const urlInput = util.dom.createElement('input', {
            type: 'url',
            id: 'image-url-input',
            placeholder: 'https://'
        }, {
            width: '100%',
            height: '33px',
            padding: '6px 8px',
            fontSize: '13px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            outline: 'none',
            boxSizing: 'border-box'
        });
        
        urlContainer.appendChild(urlLabel);
        urlContainer.appendChild(urlInput);
        contentContainer.appendChild(urlContainer);
        
        // 구분선
        const divider = util.dom.createElement('div', {}, {
            display: 'flex',
            alignItems: 'center',
            margin: '15px 0',
            height: '20px'
        });
        
        const orText = util.dom.createElement('div', {
            textContent: 'OR'
        }, {
            fontSize: '11px',
            color: '#888',
            marginRight: '8px'
        });
        
        const line = util.dom.createElement('div', {}, {
            flexGrow: '1',
            height: '1px',
            backgroundColor: '#e0e0e0'
        });
        
        divider.appendChild(orText);
        divider.appendChild(line);
        contentContainer.appendChild(divider);
        
        // 파일 업로드 영역
        const fileContainer = util.dom.createElement('div', {}, {
            marginBottom: '8px'
        });
        
        const fileLabel = util.dom.createElement('label', {
            textContent: 'File'
        }, {
            display: 'block',
            fontSize: '13px',
            fontWeight: '500',
            color: '#666',
            marginBottom: '4px'
        });
        
        const fileUploadContainer = util.dom.createElement('div', {}, {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '55px'
        });
        
        const fileUploadLabel = util.dom.createElement('label', {}, {
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px',
            backgroundColor: '#f8f9fa',
            color: '#666',
            borderRadius: '4px',
            border: '1px dashed #ccc',
            cursor: 'pointer',
            boxSizing: 'border-box'
        });
        
        const fileIcon = util.dom.createElement('span', {
            className: 'material-symbols-outlined',
            textContent: 'add_photo_alternate'
        }, {
            fontSize: '20px',
            marginBottom: '4px'
        });
        
        const fileText = util.dom.createElement('span', {
            textContent: 'Select a File'
        }, {
            fontSize: '12px'
        });
        
        const fileInput = util.dom.createElement('input', {
            type: 'file',
            id: 'image-file-input',
            accept: 'image/*'
        }, {
            display: 'none'
        });
        
        fileUploadLabel.appendChild(fileIcon);
        fileUploadLabel.appendChild(fileText);
        fileUploadLabel.appendChild(fileInput);
        fileUploadContainer.appendChild(fileUploadLabel);
        
        fileContainer.appendChild(fileLabel);
        fileContainer.appendChild(fileUploadContainer);
        contentContainer.appendChild(fileContainer);
        
        // 버튼 영역
        const buttonContainer = util.dom.createElement('div', {}, {
            position: 'absolute',
            bottom: '0',
            right: '0',
            width: '100%',
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '8px 16px',
            height: '40px',
            boxSizing: 'border-box',
            backgroundColor: 'white'
        });
        
        const insertButton = util.dom.createElement('button', {
            type: 'submit',
            title: 'Insert'
        }, {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '24px',
            height: '24px',
            borderRadius: '4px',
            border: 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer'
        });
        
        const buttonIcon = util.dom.createElement('span', {
            className: 'material-symbols-outlined',
            textContent: 'add_circle'
        }, {
            fontSize: '16px',
            color: '#5f6368'
        });
        
        insertButton.appendChild(buttonIcon);
        buttonContainer.appendChild(insertButton);
        
        modalContent.appendChild(contentContainer);
        modalContent.appendChild(buttonContainer);
        
        return {
            container: modalContent,
            urlInput: urlInput,
            fileInput: fileInput,
            insertButton: insertButton,
            fileTextElement: fileText
        };
    }
    
    /**
     * 모달 생성 및 설정
     */
    function createModal(button) {
        // 선택 영역 저장
        saveSelection();
        
        // 모달 오버레이 생성
        const modal = util.dom.createElement('div', {
            className: 'modal-overlay'
        }, {
            position: 'absolute',
            zIndex: '99999',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
            borderRadius: '4px',
            opacity: '0',
            visibility: 'hidden',
            transition: 'opacity 0.2s ease, visibility 0.2s ease'
        });
        
        // 모달 컨텐츠 생성
        const {container, urlInput, fileInput, insertButton, fileTextElement} = createModalContent();
        modal.appendChild(container);
        
        // 모달 이벤트 처리
        container.addEventListener('click', e => e.stopPropagation());

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
                    closeImageModal();
                }
            }
        });

        // 파일 선택 시 파일명 표시
        fileInput.addEventListener('change', e => {
            if (e.target.files.length > 0) {
                const fileName = e.target.files[0].name;
                if (fileTextElement) fileTextElement.textContent = fileName;
            }
        });

        // 삽입 버튼 클릭 처리
        insertButton.addEventListener('click', e => {
            e.preventDefault();
            
            const url = urlInput.value.trim();
            const file = fileInput.files[0];
            
            if (url || file) {
                // 모달 닫기 전에 필요한 값만 저장
                closeImageModal();
                
                // 약간의 지연 후 이미지 삽입
                setTimeout(() => {
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

        return {
            modal: modal,
            urlInput: urlInput
        };
    }
    
    /**
     * 모달 닫기
     */
    function closeImageModal() {
        if (!imageModal) return;
        
        imageModal.classList.remove('show');
        imageModal.style.opacity = '0';
        imageModal.style.visibility = 'hidden';
        
        // 버튼의 active 클래스 제거
        const button = document.querySelector('.lite-editor-image-upload-button');
        if (button) {
            button.classList.remove('active');
        }
        
        // 활성 모달 관리자에서 제거
        util.activeModalManager.unregister(imageModal);
        
        setTimeout(() => {
            if (imageModal && imageModal.parentNode) {
                imageModal.remove();
            }
            imageModal = null;
            isModalOpen = false;
        }, 300);
    }
    
    /**
     * 모달 토글
     */
    function toggleImageModal(button) {
        // 이미 열려있으면 닫기
        if (isModalOpen && imageModal) {
            closeImageModal();
            button.classList.remove('active');  // active 클래스 제거
            return;
        }
        
        // 다른 모든 활성 모달/드롭다운 닫기
        util.activeModalManager.closeAll();
        
        // 선택 영역 저장
        saveSelection();
        
        // 모달 생성
        const {modal, urlInput} = createModal(button);
        document.body.appendChild(modal);
        imageModal = modal;
        
        // active 클래스 추가
        button.classList.add('active');
        
        // 모달 위치 설정
        const buttonRect = button.getBoundingClientRect();
        modal.style.top = (buttonRect.bottom + window.scrollY) + 'px';
        modal.style.left = buttonRect.left + 'px';
        
        // 화면 경계 체크
        setTimeout(() => {
            const modalContent = modal.querySelector('.modal-content');
            if (modalContent) {
                const modalRect = modalContent.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                const topPosition = modalRect.top;
                
                // 아래쪽 경계를 벗어나면 버튼 위에 표시
                if (topPosition + modalRect.height > viewportHeight - 20) {
                    modal.style.top = (buttonRect.top + window.scrollY - modalRect.height) + 'px';
                }
            }
        }, 0);
        
        // 모달 표시
        setTimeout(() => {
            modal.classList.add('show');
            modal.style.opacity = '1';
            modal.style.visibility = 'visible';
            
            // URL 입력 필드 포커스
            requestAnimationFrame(() => urlInput.focus());
            
            isModalOpen = true;
            
            // 활성 모달로 등록
            modal.closeCallback = closeImageModal;
            util.activeModalManager.register(modal);
            
            // 외부 클릭 시 닫기 설정
            util.setupOutsideClickHandler(modal, closeImageModal, [button]);
        }, 10);
    }
    
    /**
     * 스타일 로드
     */
    function loadStyles() {
        // CSS 파일 로드
        util.styles.loadCssFile(STYLE_ID, CSS_PATH);
        
        // 호버 효과 인라인 스타일 추가
        const hoverStyles = `
            .modal-overlay button {
                transition: transform 0.1s ease !important;
            }
            .modal-overlay button:hover {
                transform: scale(0.95) !important;
                background-color: rgba(0, 0, 0, 0.05) !important;
            }
        `;
        util.styles.addInlineStyle('imageModalHoverStyles', hoverStyles);
    }

    // 플러그인 등록
    LiteEditor.registerPlugin(PLUGIN_ID, {
        title: 'Insert Image',
        icon: 'photo_camera',
        customRender: (toolbar, contentArea) => {
            // 스타일 로드
            loadStyles();

            // 버튼 생성
            const button = util.dom.createElement('button', {
                className: 'lite-editor-button lite-editor-image-upload-button',
                title: 'Insert Image'
            });
            
            // 아이콘 추가
            const icon = util.dom.createElement('i', {
                className: 'material-symbols-outlined',
                textContent: 'photo_camera'
            });
            button.appendChild(icon);
            
            // 클릭 이벤트
            button.addEventListener('click', e => {
                e.preventDefault();
                e.stopPropagation();
                toggleImageModal(button);
            });
            
            return button;
        }
    });
})();