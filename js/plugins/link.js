/**
 * LiteEditor Link Plugin
 * 텍스트에 링크를 추가하는 기능을 제공하는 플러그인
 */
(function() {
    // 플러그인 상수 정의
    const PLUGIN_ID = 'link';
    const STYLE_ID = 'linkStyles';
    const CSS_PATH = 'css/plugins/link.css';
    
    // PluginUtil 참조
    const util = window.PluginUtil;
    
    // 전역 상태 변수
    let savedRange = null;          // 임시로 저장된 선택 영역
    let activeModal = null;         // 현재 활성화된 링크 입력 모달
    let modalCleanupFn = null;      // 모달 이벤트 정리 함수

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
        if (savedRange) {
            util.selection.restoreSelection(savedRange);
            return true;
        }
        return false;
    }
    
    /**
     * 선택 영역 초기화
     */
    function clearSelection() {
        savedRange = null;
    }

    /**
     * 링크 입력 모달을 생성하고 표시
     * @param {HTMLElement} buttonElement - 링크 버튼 요소
     * @param {HTMLElement} contentArea - 에디터 콘텐츠 영역
     */
    function showLinkModal(buttonElement, contentArea) {
        debugLog('SHOWING MODAL', { 
            buttonElement: !!buttonElement,
            contentArea: !!contentArea,
            activeModalBefore: !!activeModal
        });
        
        // 선택 영역 저장
        saveSelection();
        
        // 기존 모달 닫기
        closeLinkModal();
        
        // 다른 활성화된 모달 모두 닫기
        util.activeModalManager.closeAll();
        
        // 모달 생성
        activeModal = document.createElement('div');
        activeModal.className = 'lite-editor-link-popup';
        activeModal.innerHTML = `
            <input type="text" placeholder="https://" class="lite-editor-link-input">
            <button class="lite-editor-link-button">OK</button>
        `;
        
        // 모달 위치 설정 및 등록
        document.body.appendChild(activeModal);
        util.layer.setLayerPosition(activeModal, buttonElement);
        
        activeModal.closeCallback = closeLinkModal;
        util.activeModalManager.register(activeModal);
        
        // 이벤트 설정
        const urlInput = activeModal.querySelector('input');
        const okButton = activeModal.querySelector('button');
        
        const processUrl = (url) => {
            if (!isValidUrl(url)) {
                if (typeof LiteEditorModal !== 'undefined') {
                    LiteEditorModal.alert('Please enter a valid URL.<BR>Example: https://example.com');
                } else {
                    alert('Please enter a valid URL.<BR>Example: https://example.com');
                }
                return;
            }
            
            contentArea.focus();
            setTimeout(() => applyLink(url, contentArea), 0);
        };
        
        okButton.addEventListener('click', () => processUrl(urlInput.value.trim()));
        
        urlInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                processUrl(urlInput.value.trim());
            }
        });

        activeModal.addEventListener('click', e => e.stopPropagation());
        
        modalCleanupFn = util.modal.setupModalCloseEvents(activeModal, () => {
            clearSelection();
            closeLinkModal();
        });
        
        setTimeout(() => urlInput.focus({ preventScroll: true }), 0);
        
        debugLog('MODAL SHOWN', { activeModal: !!activeModal });
        
        return activeModal;
    }
    
    /**
     * 활성화된 모달을 닫고 정리
     */
    function closeLinkModal() {
        debugLog('CLOSING MODAL', { 
            activeModal: !!activeModal,
            hasParent: activeModal && !!activeModal.parentNode,
            modalCleanupFn: !!modalCleanupFn
        });
        
        // 모달 이벤트 정리
        if (modalCleanupFn) {
            modalCleanupFn();
            modalCleanupFn = null;
        }
        
        if (activeModal && activeModal.parentNode) {
            // 활성 모달에서 제거
            util.activeModalManager.unregister(activeModal);
            
            activeModal.parentNode.removeChild(activeModal);
            activeModal = null;
            
            debugLog('MODAL CLOSED', { activeModal: null });
        }
    }
    
    /**
     * 선택된 텍스트에 링크를 적용
     * @param {string} url - 적용할 URL
     * @param {HTMLElement} contentArea - 에디터 콘텐츠 영역
     */
    function applyLink(url, contentArea) {
        url = url.trim();
        if (!url) return;
        
        // URL 정규화 (PluginUtil 활용)
        const finalUrl = util.url.normalizeUrl(url);
        
        try {
            if (restoreSelection()) {
                // 선택 영역이 있는 경우
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
                
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
            }
            
            // 에디터 이벤트 발생 (PluginUtil 활용)
            util.editor.dispatchEditorEvent(contentArea);
            
        } catch (e) {
            console.error('링크 적용 실패:', e);
        } finally {
            clearSelection();
            closeLinkModal();
        }
    }

    // 플러그인 등록
    LiteEditor.registerPlugin(PLUGIN_ID, {
        title: 'Link',
        icon: 'link',
        customRender: function(toolbar, contentArea) {
            // 툴바에 모달 이벤트 등록
            util.setupToolbarModalEvents(toolbar);
            
            // CSS 파일 로드 (PluginUtil 활용)
            util.styles.loadCssFile(STYLE_ID, CSS_PATH);
            
            // 버튼 생성 (PluginUtil 활용)
            const button = util.dom.createElement('button', {
                className: 'lite-editor-button lite-editor-link-button',
                title: 'Insert Link'
            });
            
            // 아이콘 추가
            const icon = util.dom.createElement('i', {
                className: 'material-icons',
                textContent: 'link'
            });
            button.appendChild(icon);
            
            // 버튼을 활성 모달 관리자에 등록
            util.activeModalManager.registerButton(button);
            
            // 클릭 이벤트
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // 토글 로직 단순화: 이미 열려있으면 닫고, 아니면 열기
                if (activeModal && document.body.contains(activeModal)) {
                    closeLinkModal();
                } else {
                    // 다른 모달 닫기
                    util.activeModalManager.closeAll();
                    // 새 모달 열기
                    showLinkModal(button, contentArea);
                }
            });
            
            toolbar.appendChild(button);
            return button;
        }
    });
})();