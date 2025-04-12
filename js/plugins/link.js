/**
 * LiteEditor Link Plugin
 * 텍스트에 링크를 추가하는 기능을 제공하는 플러그인
 */
(function() {
    // 플러그인 상수 정의
    const PLUGIN_ID = 'link';
    const STYLE_ID = 'linkStyles';
    const CSS_PATH = 'css/plugins/link.css';

    // 전역 상태 변수
    let savedRange = null;          // 임시로 저장된 선택 영역
    let activeModal = null;         // 현재 활성화된 링크 입력 모달

    /**
     * URL 유틸리티 함수
     */
    const URLUtils = {
        /**
         * URL 유효성 검사
         * @param {string} url - 검사할 URL
         * @returns {boolean} 유효성 여부
         */
        isValid: function(url) {
            // IP 주소, 로컬호스트, 포트 번호를 포함한 URL 검증
            const domainRegex = /^(https?:\/\/)?(([a-zA-Z0-9\u3131-\u314E\uAC00-\uD7A3-]+\.)+([a-zA-Z\u3131-\u314E\uAC00-\uD7A3]{2,}))(:\d+)?(\/[^\s]*)?(\?.*)?$/;
            // 유효하지 않은 형식 검사 (wwww 등)
            const invalidPrefixRegex = /^(https?:\/\/)?(wwww\.|ww\.|w{5,}\.|w{1,2}\.)/i;
            
            return domainRegex.test(url) && !invalidPrefixRegex.test(url);
        },

        /**
         * URL을 정규화 (프로토콜 추가)
         * @param {string} url - 입력 URL
         * @returns {string} 정규화된 URL
         */
        normalize: function(url) {
            return /^https?:\/\//i.test(url) ? url : 'https://' + url;
        },

        /**
         * URL에서 도메인 부분 추출
         * @param {string} url - 입력 URL
         * @returns {string} 도메인 부분
         */
        extractDomain: function(url) {
            return url.replace(/^https?:\/\//i, '');
        }
    };

    /**
     * 선택 영역 관리 객체
     */
    const SelectionManager = {
        /**
         * 현재 선택 영역을 저장
         * @returns {boolean} 저장 성공 여부
         */
        save: function() {
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) {
                // 선택 영역이 없어도 true 반환하여 모달이 표시되도록 함
                savedRange = null;
                return true;
            }
            
            const range = selection.getRangeAt(0);
            if (range.collapsed) {
                // 선택 영역이 없어도 true 반환하여 모달이 표시되도록 함
                savedRange = null;
                return true;
            }
            
            savedRange = range.cloneRange();
            return true;
        },
        
        /**
         * 저장된 선택 영역을 복원
         * @returns {boolean} 복원 성공 여부
         */
        restore: function() {
            if (!savedRange) return false;
            
            try {
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(savedRange);
                return true;
            } catch (e) {
                console.warn('선택 영역 복원 실패:', e);
                return false;
            }
        },
        
        /**
         * 선택 영역 초기화
         */
        clear: function() {
            savedRange = null;
        }
    };

    /**
     * 링크 모달 관리 객체
     */
    const LinkModal = {
        /**
         * 링크 입력 모달을 생성하고 표시
         * @param {HTMLElement} buttonElement - 링크 버튼 요소
         * @param {HTMLElement} contentArea - 에디터 콘텐츠 영역
         * @returns {HTMLElement} 생성된 모달 요소
         */
        show: function(buttonElement, contentArea) {
            if (!SelectionManager.save()) {
                console.warn('선택 영역 저장 실패');
                return;
            }
            
            this.close();
            
            activeModal = document.createElement('div');
            activeModal.className = 'lite-editor-link-popup';
            activeModal.innerHTML = `
                <input type="text" placeholder="https://" class="lite-editor-link-input">
                <button class="lite-editor-link-button">OK</button>
            `;
            
            this.positionModal(buttonElement);
            this.setupEvents(activeModal, contentArea, buttonElement);
            
            return activeModal;
        },
        
        /**
         * 모달의 위치를 설정
         * @param {HTMLElement} buttonElement - 링크 버튼 요소
         */
        positionModal: function(buttonElement) {
            const buttonRect = buttonElement.getBoundingClientRect();
            document.body.appendChild(activeModal);
            
            activeModal.style.top = (buttonRect.bottom + window.scrollY) + 'px';
            activeModal.style.left = (buttonRect.left + window.scrollX) + 'px';
            
            const modalRect = activeModal.getBoundingClientRect();
            if (modalRect.right > window.innerWidth) {
                activeModal.style.left = (window.innerWidth - modalRect.width - 10) + 'px';
            }
        },
        
        /**
         * 모달의 이벤트 핸들러 설정
         * @param {HTMLElement} modal - 모달 요소
         * @param {HTMLElement} contentArea - 에디터 콘텐츠 영역
         * @param {HTMLElement} buttonElement - 링크 버튼 요소
         */
        setupEvents: function(modal, contentArea, buttonElement) {
            const urlInput = modal.querySelector('input');
            const okButton = modal.querySelector('button');
            
            // 확인 버튼 클릭 이벤트
            okButton.addEventListener('click', () => {
                const url = urlInput.value.trim();
                if (!URLUtils.isValid(url)) {
                    LiteEditorModal.alert('올바른 URL을 입력해주세요.\n예: https://example.com');
                    return;
                }
                
                contentArea.focus();
                setTimeout(() => this.applyLink(url, contentArea), 0);
            });
            
            // URL 입력 필드 엔터 이벤트
            urlInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const url = urlInput.value.trim();
                    if (!URLUtils.isValid(url)) {
                        LiteEditorModal.alert('올바른 URL을 입력해주세요.\n예: https://example.com');
                        return;
                    }
                    
                    contentArea.focus();
                    setTimeout(() => this.applyLink(url, contentArea), 0);
                }
            });

            // 모달 클릭 이벤트 전파 방지
            modal.addEventListener('click', (e) => e.stopPropagation());
            
            // 전역 이벤트 설정
            this.setupGlobalEvents(buttonElement);
            
            // URL 입력 필드에 포커스
            setTimeout(() => urlInput.focus({ preventScroll: true }), 0);
        },
        
        /**
         * 전역 이벤트 핸들러 설정
         * @param {HTMLElement} buttonElement - 링크 버튼 요소
         */
        setupGlobalEvents: function(buttonElement) {
            // 모달 외부 클릭 시 닫기
            document.addEventListener('click', (e) => {
                if (activeModal && !activeModal.contains(e.target) && !buttonElement.contains(e.target)) {
                    SelectionManager.clear();
                    this.close();
                }
            }, true);
            
            // ESC 키로 모달 닫기
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && activeModal) {
                    SelectionManager.clear();
                    this.close();
                }
            });
        },
        
        /**
         * 활성화된 모달을 닫고 정리
         */
        close: function() {
            if (activeModal && activeModal.parentNode) {
                activeModal.parentNode.removeChild(activeModal);
                activeModal = null;
            }
        },
        
        /**
         * 선택된 텍스트에 링크를 적용
         * @param {string} url - 적용할 URL
         * @param {HTMLElement} contentArea - 에디터 콘텐츠 영역
         */
        applyLink: function(url, contentArea) {
            url = url.trim();
            if (!url) return;
            
            const finalUrl = URLUtils.normalize(url);
            
            try {
                if (savedRange && SelectionManager.restore()) {
                    // 선택 영역이 있는 경우 기존 로직 실행
                    document.execCommand('createLink', false, finalUrl);
                    
                    const newLink = contentArea.querySelector('a[href="' + finalUrl + '"]');
                    if (newLink) {
                        newLink.setAttribute('target', '_blank');
                        
                        // 커서를 링크 뒤로 이동
                        const range = document.createRange();
                        range.setStartAfter(newLink);
                        range.collapse(true);
                        
                        const selection = window.getSelection();
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }
                } else {
                    // 선택 영역이 없는 경우 현재 커서 위치에 링크 삽입
                    const linkText = URLUtils.extractDomain(url);
                    const linkElement = `<a href="${finalUrl}" target="_blank">${linkText}</a>`;
                    document.execCommand('insertHTML', false, linkElement);
                    
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
                }
                
                contentArea.dispatchEvent(new Event('input', { bubbles: true }));
                
            } catch (e) {
                console.error('링크 적용 실패:', e);
            } finally {
                SelectionManager.clear();
                this.close();
            }
        }
    };

    // 플러그인 등록
    LiteEditor.registerPlugin(PLUGIN_ID, {
        title: 'Link',
        icon: 'link',
        customRender: function(toolbar, contentArea) {
            if (!document.getElementById(STYLE_ID)) {
                const styleSheet = document.createElement('link');
                styleSheet.id = STYLE_ID;
                styleSheet.rel = 'stylesheet';
                styleSheet.href = CSS_PATH;
                document.head.appendChild(styleSheet);
            }
            
            const button = document.createElement('button');
            button.className = 'lite-editor-button lite-editor-link-button';
            button.setAttribute('title', 'Insert link');
            
            const icon = document.createElement('i');
            icon.className = 'material-icons';
            icon.textContent = 'link';
            button.appendChild(icon);
            
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                LinkModal.show(button, contentArea);
            });
            
            toolbar.appendChild(button);
        }
    });
})();