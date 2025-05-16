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
        
        // 이미지 로드하여 초기 크기 계산
        const tempImg = new Image();
        tempImg.onload = function() {
            // 3. 이미지 컨테이너 생성 - 인라인 스타일로 크기 지정
            const container = document.createElement('div');
            container.className = 'image-wrapper';
            
            // 초기 크기 설정 (인라인 스타일로 지정 - 저장 시 유지됨)
            // 이미지 크기 기준으로 초기값 계산 (너무 큰 이미지는 적절히 축소)
            let initialWidth = tempImg.width;
            let initialHeight = tempImg.height;
            
            // 이미지가 너무 큰 경우 최대 너비 800px로 제한
            const maxWidth = 800;
            if (initialWidth > maxWidth) {
                const ratio = maxWidth / initialWidth;
                initialWidth = maxWidth;
                initialHeight = Math.floor(initialHeight * ratio);
            }
            
            // 인라인 스타일 설정
            container.style.width = initialWidth + 'px';
            container.style.height = initialHeight + 'px';
            container.style.position = 'relative';
            container.style.display = 'inline-block';
            container.style.resize = 'both';
            container.style.overflow = 'hidden';
            container.style.maxWidth = '100%';
            container.style.boxSizing = 'border-box';
            container.style.border = 'none';
            container.contentEditable = false;
            
            // 4. 이미지 생성
            const img = document.createElement('img');
            img.src = src;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'contain';
            img.style.display = 'block';
            
            // 리사이즈 핸들 추가
            const resizeHandle = document.createElement('div');
            resizeHandle.className = 'image-resize-handle';
            resizeHandle.style.position = 'absolute';
            resizeHandle.style.right = '0';
            resizeHandle.style.bottom = '0';
            resizeHandle.style.width = '20px';
            resizeHandle.style.height = '20px';
            resizeHandle.style.backgroundImage = 'linear-gradient(135deg, transparent 50%, #4285f4 50%, #4285f4 100%)';
            resizeHandle.style.cursor = 'nwse-resize';
            resizeHandle.style.zIndex = '10';
            
            container.appendChild(img);
            container.appendChild(resizeHandle);
            
            // 컨테이너를 p 태그로 감싸기
            const containerWrapper = document.createElement('p');
            containerWrapper.appendChild(container);
            range.insertNode(containerWrapper);
            
            // 6. 컨테이너 뒤에 줄바꿈 추가
            const br = document.createElement('br');
            containerWrapper.parentNode.insertBefore(br, containerWrapper.nextSibling);
            
            // 7. 커서 위치 조정 (줄바꿈 뒤로)
            util.selection.moveCursorTo(br.nextSibling || br, 0);
            
            // 8. 에디터 상태 업데이트
            util.editor.dispatchEditorEvent(editor);
            
            // 9. 크기 변경 감지를 위한 MutationObserver 설정
            if (window.MutationObserver) {
                const observer = new MutationObserver(mutations => {
                    for (let mutation of mutations) {
                        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                            // 현재 컨테이너의 실제 크기 측정
                            const width = Math.round(container.offsetWidth);
                            const height = Math.round(container.offsetHeight);
                            
                            // 인라인 스타일에 명시적으로 px 단위로 업데이트
                            container.style.width = width + 'px';
                            container.style.height = height + 'px';
                            
                            // border 속성 제거
                            container.style.border = 'none';
                            
                            // 에디터 이벤트 발생 (수정사항 적용)
                            if (util.editor && util.editor.dispatchEditorEvent) {
                                util.editor.dispatchEditorEvent(editor);
                            }
                        }
                    }
                });
                
                observer.observe(container, {
                    attributes: true,
                    attributeFilter: ['style']
                });
            }
            
            // 10. 앵커로 스크롤 및 제거
            const anchor = document.getElementById(anchorId);
            if (anchor) {
                anchor.scrollIntoView({ block: 'nearest', behavior: 'auto' });
                anchor.remove();
            }
            
            // 11. 선택 영역 초기화
            clearSelection();
            
            container.setAttribute('data-selectable', 'true'); // 선택 가능 속성 추가
        };
        
        // 이미지 로드 시작
        tempImg.src = src;
        
        // 이미지 로드 실패 시 기본 처리
        tempImg.onerror = function() {
            // 기본 컨테이너 생성 (이미지 크기를 알 수 없는 경우)
            const container = document.createElement('div');
            container.className = 'image-wrapper';
            container.style.width = '300px';
            container.style.height = '200px';
            container.style.position = 'relative';
            container.style.display = 'inline-block';
            container.style.resize = 'both';
            container.style.overflow = 'hidden';
            container.style.maxWidth = '100%';
            container.style.border = 'none';
            container.contentEditable = false;
            
            const img = document.createElement('img');
            img.src = src;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'contain';
            img.style.display = 'block';
            
            container.appendChild(img);
            range.insertNode(container);
            
            // 컨테이너 뒤에 줄바꿈 추가
            const br = document.createElement('br');
            container.parentNode.insertBefore(br, container.nextSibling);
            
            // 에디터 상태 업데이트
            util.editor.dispatchEditorEvent(editor);
            
            // 앵커 제거
            const anchor = document.getElementById(anchorId);
            if (anchor) anchor.remove();
            
            // 선택 영역 초기화
            clearSelection();
            
            container.setAttribute('data-selectable', 'true'); // 선택 가능 속성 추가
        };
    }

    /**
     * 플러스 서클 SVG 생성 함수
     * 중복 코드 제거와 재사용성 개선을 위한 함수
     */
    function createPlusCircleSvg() {
        return `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#5f6368">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
            </svg>
        `;
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
            height: '275px',
            boxSizing: 'border-box',
            position: 'relative',
            borderRadius: '4px',
            backgroundColor: 'white',
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
        });
        
        // 모달 내용 영역
        const contentContainer = util.dom.createElement('div', {}, {
            padding: '2px'
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
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px',
            backgroundColor: '#f8f9fa',
            color: '#666',
            borderRadius: '4px',
            border: '1px dashed #ccc',
            cursor: 'pointer',
            boxSizing: 'border-box',
            gap: '8px'
        });
        
        // Material Symbols Outlined 아이콘 사용으로 변경
        const fileIcon = util.dom.createElement('span', {
            className: 'material-symbols-outlined',
            textContent: 'image_search'
        }, {
            fontSize: '24px',
            color: '#5f6368',
            marginBottom: '0'
        });
        
        const fileText = util.dom.createElement('span', {
            textContent: 'Select a File'
        }, {
            fontSize: '14px',
            fontWeight: '500'
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
            padding: '7px 7px',
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

        // buttonIcon도 동일한 재사용 함수 사용
        const buttonIcon = util.dom.createElement('div', {
            innerHTML: createPlusCircleSvg()
        }, {
            paddingBottom: '7px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
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
                    if (!LiteEditorSecurity.isValidImageUrl(url)) {
                        // 모달 먼저 닫기
                        closeImageModal();
                        
                        // 약간의 지연 후 경고 메시지 표시
                        setTimeout(() => {
                            if (typeof LiteEditorModal !== 'undefined') {
                                LiteEditorModal.alert('유효한 이미지 URL을 입력해주세요.<BR>지원 형식: jpg, jpeg, png, gif, webp, svg');
                            } else {
                                alert('유효한 이미지 URL을 입력해주세요.\n지원 형식: jpg, jpeg, png, gif, webp, svg');
                            }
                        }, 300);
                        
                        return;
                    }
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
            
            if (url) {
                // URL 보안 검사
                if (!LiteEditorSecurity.isValidImageUrl(url)) {
                    // 모달 먼저 닫기
                    closeImageModal();
                    
                    // 약간의 지연 후 경고 메시지 표시
                    setTimeout(() => {
                        if (typeof LiteEditorModal !== 'undefined') {
                            LiteEditorModal.alert('유효한 이미지 URL을 입력해주세요.<BR>지원 형식: jpg, jpeg, png, gif, webp, svg');
                        } else {
                            alert('유효한 이미지 URL을 입력해주세요.\n지원 형식: jpg, jpeg, png, gif, webp, svg');
                        }
                    }, 300); // 모달 닫힘 애니메이션과 동일한 시간 지연
                    
                    return;
                }
            }
            
            if (url || file) {
                // 유효한 입력인 경우 모달 닫기
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

        // 호버 효과 인라인 스타일 추가 다음에 추가
        const imageSelectionStyles = `
            .image-wrapper {
                transition: outline 0.2s ease, box-shadow 0.2s ease;
                cursor: pointer;
                position: relative;
            }
            
            .image-wrapper:hover {
                outline: 1px solid rgba(66, 133, 244, 0.3);
            }
            
            .image-wrapper[data-selected="true"] {
                outline: 2px solid #4285f4;
                box-shadow: 0 0 5px rgba(66, 133, 244, 0.5);
            }
            
            .image-wrapper[data-selected="true"]::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(66, 133, 244, 0.1);
                pointer-events: none;
                z-index: 1;
            }
            
            /* 정렬 스타일 */
            .image-wrapper.align-left {
                float: left;
                margin: 0 1em 0.5em 0;
            }
            
            .image-wrapper.align-center {
                float: none;
                display: block;
                margin: 0.5em auto;
            }
            
            .image-wrapper.align-right {
                float: right;
                margin: 0 0 0.5em 1em;
            }
            
            .image-wrapper.align-full {
                float: none;
                display: block;
                margin: 0.5em 0;
                width: 100%;
            }
        `;

        util.styles.addInlineStyle('imageSelectionStyles', imageSelectionStyles);
    }

    /**
     * 가장 가까운 요소 찾기
     */
    function findClosestElement(element, selector) {
        while (element && element.nodeType === 1) {
            if (element.matches(selector)) {
                return element;
            }
            element = element.parentElement;
        }
        return null;
    }

    /**
     * 이미지 선택 기능 초기화
     */
    function initImageSelection() {
        const editor = document.querySelector('#lite-editor');
        if (!editor) {
            console.error('ImageUploadPlugin: 에디터를 찾을 수 없습니다.');
            return;
        }
        
        // 에디터 클릭 이벤트 위임 처리
        editor.addEventListener('click', (event) => {
            // 이미지 컨테이너 찾기
            const imageWrapper = findClosestElement(event.target, '.image-wrapper[data-selectable="true"]');
            
            // 기존 선택된 이미지 찾기
            const prevSelected = editor.querySelector('.image-wrapper[data-selected="true"]');
            
            // 이미지 외부 클릭 시 선택 해제
            if (!imageWrapper) {
                if (prevSelected) {
                    prevSelected.removeAttribute('data-selected');
                }
                return;
            }
            
            // 리사이즈 핸들 클릭은 무시 (리사이징 동작 유지)
            if (event.target.classList.contains('image-resize-handle')) {
                return;
            }
            
            // 기존 선택된 이미지가 현재와 다르면 선택 해제
            if (prevSelected && prevSelected !== imageWrapper) {
                prevSelected.removeAttribute('data-selected');
            }
            
            // 현재 이미지 선택
            imageWrapper.setAttribute('data-selected', 'true');
            
            // 이미지 선택 시 에디터에 포커스 유지
            editor.focus({ preventScroll: true });
            
            // 이벤트 기본 동작 및 버블링 방지
            event.preventDefault();
            event.stopPropagation();
        });

        // 키보드 이벤트 처리 (방향키, 삭제 등)
        editor.addEventListener('keydown', (event) => {
            // 방향키로 이동 시 이미지 선택 해제
            if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || 
                event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                // 선택된 이미지 찾기
                const selectedImg = editor.querySelector('.image-wrapper[data-selected="true"]');
                if (selectedImg) {
                    // 선택 해제
                    selectedImg.removeAttribute('data-selected');
                }
                return; // 방향키 기본 동작 유지
            }
            
            // 삭제 키 처리 (Delete/Backspace)
            if ((event.key === 'Delete' || event.key === 'Backspace')) {
                // 선택된 이미지 찾기
                const selectedImg = editor.querySelector('.image-wrapper[data-selected="true"]');
                if (selectedImg) {
                    event.preventDefault();
                    
                    // 커서 위치 설정
                    const range = document.createRange();
                    range.setStartBefore(selectedImg);
                    range.collapse(true);
                    
                    // 이미지 제거
                    selectedImg.remove();
                    
                    // 커서 위치 설정
                    const selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(range);
                    
                    // 에디터 변경 이벤트 발생
                    const inputEvent = new Event('input', { bubbles: true });
                    editor.dispatchEvent(inputEvent);
                }
            }
        });

        // align.js와 연동 (전역 함수로 선택된 이미지에 정렬 적용)
        if (!window.LiteImageHandlers) {
            window.LiteImageHandlers = {};
        }

        // 이미지 정렬 함수 (align.js에서 호출)
        window.LiteImageHandlers.alignSelectedImage = function(alignType) {
            const selectedImg = editor.querySelector('.image-wrapper[data-selected="true"]');
            if (!selectedImg) return false;
            
            // 부모 p 태그 찾기 또는 생성
            let parentP = selectedImg.parentElement;
            if (parentP.tagName !== 'P') {
                // 부모가 P가 아니면 P로 감싸기
                parentP = document.createElement('p');
                selectedImg.parentNode.insertBefore(parentP, selectedImg);
                parentP.appendChild(selectedImg);
            }
            
            // 부모 P 태그에 텍스트 정렬 적용
            parentP.style.textAlign = alignType;
            
            // 에디터 변경 이벤트 발생
            const inputEvent = new Event('input', { bubbles: true });
            editor.dispatchEvent(inputEvent);
            
            return true;
        };

        // 현재 선택된 이미지 확인 함수 (align.js에서 호출)
        window.LiteImageHandlers.hasSelectedImage = function() {
            return !!editor.querySelector('.image-wrapper[data-selected="true"]');
        };
    }

    // 플러그인 등록
    LiteEditor.registerPlugin(PLUGIN_ID, {
        title: 'Insert Image',
        icon: 'photo_camera',
        customRender: (toolbar, contentArea) => {
            // 스타일 로드
            loadStyles();
            
            // 이미지 선택 기능 초기화 (지연 실행)
            setTimeout(initImageSelection, 500);

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