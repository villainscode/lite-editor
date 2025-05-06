/**
 * LiteEditor Link Plugin
 * 텍스트에 링크를 추가하는 기능을 제공하는 플러그인
 * 리팩토링: 공통 드롭다운 유틸리티 적용
 */
(function() {
    // 플러그인 상수 정의
    const PLUGIN_ID = 'link';
    const STYLE_ID = 'linkStyles';
    const CSS_PATH = 'css/plugins/link.css';
    
    // PluginUtil 참조
    const util = window.PluginUtil || {};
    
    // 전역 상태 변수
    let savedRange = null;          // 임시로 저장된 선택 영역
    let isDropdownOpen = false;     // 드롭다운 열림 상태

    // link.js 파일 상단에 디버깅 유틸리티 추가
    function debugLog(action, data) {
        console.log(
            `%c[LINK MODAL] ${action}`,
            'color:#e91e63;font-weight:bold;',
            data
        );
    }

    /**
     * URL 유효성 검사
     */
    function isValidUrl(url) {
        const domainRegex = /^(https?:\/\/)?(([a-zA-Z0-9\u3131-\u314E\uAC00-\uD7A3-]+\.)+([a-zA-Z\u3131-\u314E\uAC00-\uD7A3]{2,}))(:\d+)?(\/[^\s]*)?(\?.*)?$/;
        const invalidPrefixRegex = /^(https?:\/\/)?(wwww\.|ww\.|w{5,}\.|w{1,2}\.)/i;
        return domainRegex.test(url) && !invalidPrefixRegex.test(url);
    }

    /**
     * 현재 선택 영역을 저장
     */
    function saveSelection() {
        savedRange = util.selection.saveSelection();
    }
    
    /**
     * 저장된 선택 영역을 복원
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
     * 선택된 텍스트에 링크를 적용
     * @param {string} url - 적용할 URL
     * @param {HTMLElement} contentArea - 에디터 콘텐츠 영역
     */
    function applyLink(url, contentArea) {
        try {
            url = url.trim();
            if (!url) return;
            
            // 현재 스크롤 위치 저장
            const currentScrollY = window.scrollY;
            const currentScrollX = window.scrollX;
            
            // URL 정규화 (PluginUtil 활용)
            const finalUrl = util.url.normalizeUrl(url);
            
            // 포커스 설정 (스크롤 방지)
            try {
                contentArea.focus({ preventScroll: true });
            } catch (e) {
                contentArea.focus();
            }
            
            // 선택 영역 복원
            restoreSelection();
            
            // 선택 영역이 있는 경우
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0 && !selection.getRangeAt(0).collapsed) {
                document.execCommand('createLink', false, finalUrl);
                
                const newLink = contentArea.querySelector('a[href="' + finalUrl + '"]');
                if (newLink) {
                    newLink.setAttribute('target', '_blank');
                }
            } else {
                // 선택 영역이 없는 경우 현재 커서 위치에 링크 삽입
                const linkText = url.replace(/^https?:\/\//i, '');
                const linkElement = `<a href="${finalUrl}" target="_blank">${linkText}</a>`;
                document.execCommand('insertHTML', false, linkElement);
            }
            
            // 커서를 링크 뒤로 이동
            const newLink = contentArea.querySelector('a[href="' + finalUrl + '"]');
            if (newLink) {
                const range = document.createRange();
                range.setStartAfter(newLink);
                range.collapse(true);
                
                selection.removeAllRanges();
                selection.addRange(range);
            }
            
            // 에디터 이벤트 발생
            util.editor.dispatchEditorEvent(contentArea);
            
            // 스크롤 위치 복원
            requestAnimationFrame(() => {
                setTimeout(() => {
                    window.scrollTo(currentScrollX, currentScrollY);
                }, 50);
            });
        } catch (e) {
            console.error('링크 적용 실패:', e);
        }
    }

    // 플러그인 등록
    LiteEditor.registerPlugin(PLUGIN_ID, {
        title: 'Link',
        icon: 'link',
        customRender: function(toolbar, contentArea) {
            // 1. 링크 버튼 생성
            const linkButton = util.dom.createElement('div', {
                className: 'lite-editor-button',
                title: 'Insert Link'
            });
            
            // 2. 버튼 아이콘 추가
            const icon = util.dom.createElement('i', {
                className: 'material-icons',
                textContent: 'link'
            });
            linkButton.appendChild(icon);
            
            // 3. 드롭다운 메뉴 생성
            const dropdownMenu = util.dom.createElement('div', {
                className: 'lite-editor-dropdown-menu link-dropdown',
                id: 'link-dropdown-' + Math.random().toString(36).substr(2, 9)
            }, {
                width: '264px',
                height: '49px',
                padding: '8px',
                boxShadow: '0 1px 5px rgba(0,0,0,0.1)',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                overflow: 'hidden'
            });
            
            // 4. 링크 입력 UI 생성
            const inputContainer = util.dom.createElement('div', {
                className: 'link-input-container'
            }, {
                display: 'flex',
                width: '100%',
                height: '33px',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '6px'
            });
            
            const urlInput = util.dom.createElement('input', {
                type: 'url',
                placeholder: 'https://',
                className: 'lite-editor-link-input'
            }, {
                width: '210px',
                height: '33px',
                padding: '6px 8px',
                fontSize: '13px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                outline: 'none',
                boxSizing: 'border-box',
                verticalAlign: 'middle'
            });
            
            const submitButton = util.dom.createElement('button', {
                className: 'lite-editor-link-button',
                textContent: 'OK'
            }, {
                marginLeft: '4px',
                padding: '5px 10px',
                border: 'none',
                borderRadius: '3px',
                backgroundColor: '#4285f4',
                color: 'white',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500',
                height: '33px',
                minWidth: '36px',
                boxSizing: 'border-box'
            });
            
            inputContainer.appendChild(urlInput);
            inputContainer.appendChild(submitButton);
            dropdownMenu.appendChild(inputContainer);
            
            // 5. 드롭다운을 document.body에 추가
            document.body.appendChild(dropdownMenu);
            
            // 6. 버튼 이벤트 설정
            const processUrl = (url) => {
                if (!isValidUrl(url)) {
                    if (typeof LiteEditorModal !== 'undefined') {
                        LiteEditorModal.alert('Please enter a valid URL.<BR>Example: https://example.com');
                    } else {
                        alert('Please enter a valid URL. Example: https://example.com');
                    }
                    return;
                }
                
                // 드롭다운 닫기
                if (linkButton._dropdownAPI) {
                    linkButton._dropdownAPI.close();
                }
                
                // 링크 적용
                applyLink(url, contentArea);
            };
            
            submitButton.addEventListener('click', () => processUrl(urlInput.value.trim()));
            
            urlInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    processUrl(urlInput.value.trim());
                }
            });
            
            // 7. 드롭다운 설정
            linkButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // 현재 스크롤 위치 저장
                const currentScrollY = window.scrollY;
                
                // 드롭다운 API 사용
                const dropdownAPI = util.dropdown.setupDropdown(linkButton, dropdownMenu, {
                    buttonActiveClass: 'active',
                    toolbar: toolbar,
                    onOpen: () => {
                        // 선택 영역 저장
                        saveSelection();
                        
                        // 입력창 초기화 및 포커스
                        urlInput.value = '';
                        setTimeout(() => urlInput.focus(), 10);
                    },
                    onClose: () => {
                        // 드롭다운 상태 업데이트
                        isDropdownOpen = false;
                    }
                });
                
                // 토글 수행
                dropdownAPI.toggle(e);
                
                // 상태 업데이트
                isDropdownOpen = dropdownAPI.isOpen();
                
                // 스크롤 위치 복원
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        window.scrollTo(window.scrollX, currentScrollY);
                    }, 50);
                });
            });
            
            return linkButton;
        }
    });
})();