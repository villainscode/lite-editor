/**
 * LiteEditor Link Plugin
 * 텍스트에 링크를 추가하는 기능을 제공하는 플러그인
 * 리팩토링: 미디어 플러그인과 동일한 UI 스타일 적용
 */
(function() {
    // 플러그인 상수 정의
    const PLUGIN_ID = 'link';
    const STYLE_ID = 'linkStyles';
    const CSS_PATH = 'css/plugins/link.css';
    
    // 드롭다운 UI 설정
    const DROPDOWN_WIDTH = 300;    // 드롭다운 너비 (px)
    const DROPDOWN_HEIGHT = 90;    // 드롭다운 높이 (px)
    
    // PluginUtil 참조
    const util = window.PluginUtil || {};
    if (!util.selection) {
        console.error('LinkPlugin: PluginUtil.selection이 필요합니다.');
    }
    
    // 전역 상태 변수
    let savedRange = null;          // 임시로 저장된 선택 영역
    let isDropdownOpen = false;     // 드롭다운 열림 상태

    // CSS 파일 로드
    if (util.styles && util.styles.loadCssFile) {
        util.styles.loadCssFile(STYLE_ID, CSS_PATH);
    }


    /**
     * URL 유효성 검사
     */
    function isValidUrl(url) {
        // security-manager.js로 이동한 로직 사용
        if (typeof LiteEditorSecurity !== 'undefined' && LiteEditorSecurity.isValidUrl) {
            return LiteEditorSecurity.isValidUrl(url);
        }
        
        // 폴백: 기본 검사 (security-manager.js가 없는 경우)
        return /^(https?:\/\/)?(([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,})(:\d+)?(\/[^\s]*)?$/.test(url);
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
     * 선택된 텍스트에 링크를 적용 - 공통 유틸리티 사용
     * @param {string} url - 적용할 URL
     * @param {HTMLElement} contentArea - 에디터 콘텐츠 영역
     */
    function applyLink(url, contentArea) {
        const applyWithScroll = util.scroll.preservePosition(() => {
        try {
            url = url.trim();
            if (!url) return;
            
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
        } catch (e) {
            errorHandler.logError('LinkPlugin', errorHandler.codes.PLUGINS.LINK.APPLY, e);
        }
        });
        
        applyWithScroll();
    }

    // 플러그인 등록
    LiteEditor.registerPlugin(PLUGIN_ID, {
        title: 'Link',
        icon: 'link',
        customRender: function(toolbar, contentArea) {
            // 1. 링크 버튼 생성
            const linkButton = util.dom.createElement('button', {
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
            });
            
            // 4. 헤더 생성
            const header = util.dom.createElement('div', {
                className: 'lite-editor-link-header'
            });
            
            const title = util.dom.createElement('span', {
                className: 'lite-editor-link-title',
                textContent: 'Enter the URL to insert link'
            });
            
            header.appendChild(title);
            dropdownMenu.appendChild(header);
            
            // 5. 입력 그룹 생성
            const inputGroup = util.dom.createElement('div', {
                className: 'lite-editor-link-input-group'
            });
            
            const urlInput = util.dom.createElement('input', {
                type: 'url',
                className: 'lite-editor-link-input',
                placeholder: 'https://'
            });
            
            const submitButton = util.dom.createElement('button', {
                type: 'submit',
                className: 'lite-editor-link-button',
                title: 'Insert',
                textContent: 'OK'
            });
            
            inputGroup.appendChild(urlInput);
            inputGroup.appendChild(submitButton);
            dropdownMenu.appendChild(inputGroup);
            
            // 6. 드롭다운을 document.body에 추가
            document.body.appendChild(dropdownMenu);
            
            // 7. 버튼 이벤트 설정
            const processUrl = (url) => {
                if (!isValidUrl(url)) {
                    errorHandler.showUserAlert('P703');
                    return;
                }
                
                // 드롭다운 닫기
                dropdownMenu.classList.remove('show');
                dropdownMenu.style.display = 'none';
                linkButton.classList.remove('active');
                isDropdownOpen = false;
                
                // 모달 관리 시스템에서 제거
                util.activeModalManager.unregister(dropdownMenu);
                
                // 링크 적용
                applyLink(url, contentArea);
            };
            
            submitButton.addEventListener('click', () => processUrl(urlInput.value.trim()));
            
            // 링크 입력 필드 이벤트 핸들러
            urlInput.addEventListener('keydown', e => {
                // ESC 키를 제외한 모든 키 이벤트의 버블링 방지
                if (e.key !== 'Escape') {
                    e.stopPropagation();
                }
                
                // Enter 키 처리 추가
                if (e.key === 'Enter') {
                    e.preventDefault();
                    processUrl(urlInput.value.trim());
                }
            });
            
            // 7. 직접 구현한 드롭다운 토글 로직 - 공통 유틸리티 사용
            linkButton.addEventListener('click', util.scroll.preservePosition((e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // 선택 영역 저장
                saveSelection();
                
                // 현재 드롭다운의 상태 확인
                const isVisible = dropdownMenu.classList.contains('show');
                
                // 다른 모든 드롭다운 닫기 - activeModalManager 사용
                // 이미 열려있는 상태에서 닫는 경우에는 closeAll을 호출하지 않음
                if (!isVisible) {
                    util.activeModalManager.closeAll();
                }
                
                if (isVisible) {
                    // 닫기
                    dropdownMenu.classList.remove('show');
                    dropdownMenu.style.display = 'none';
                    linkButton.classList.remove('active');
                    isDropdownOpen = false;
                    
                    // 모달 관리 시스템에서 제거
                    util.activeModalManager.unregister(dropdownMenu);
                } else {
                    // 열기
                    dropdownMenu.classList.add('show');
                    dropdownMenu.style.display = 'flex'; // flex로 변경 (레이아웃 유지)
                    linkButton.classList.add('active');
                    isDropdownOpen = true;
                    
                    // 위치 설정
                    const buttonRect = linkButton.getBoundingClientRect();
                    dropdownMenu.style.top = (buttonRect.bottom + window.scrollY) + 'px';
                    dropdownMenu.style.left = buttonRect.left + 'px';
                    
                    // 입력창 초기화 및 포커스
                    urlInput.value = '';
                    setTimeout(() => urlInput.focus(), 10);
                    
                    // 활성 모달 등록 (관리 시스템에 추가)
                    dropdownMenu.closeCallback = () => {
                        dropdownMenu.classList.remove('show');
                        dropdownMenu.style.display = 'none';
                        linkButton.classList.remove('active');
                        isDropdownOpen = false;
                    };
                    
                    util.activeModalManager.register(dropdownMenu);
                    
                    // 외부 클릭 시 닫기 설정 - 열 때만 등록
                    util.setupOutsideClickHandler(dropdownMenu, () => {
                        dropdownMenu.classList.remove('show');
                        dropdownMenu.style.display = 'none';
                        linkButton.classList.remove('active');
                        isDropdownOpen = false;
                        util.activeModalManager.unregister(dropdownMenu);
                    }, [linkButton]);
                }
            }));
            
            return linkButton;
        }
    });
})();