/**
 * LiteEditor Plugin Utilities
 * 플러그인 공통 유틸리티 모듈
 */

const PluginUtil = (function() {
    // 활성화된 레이어/모달 관리를 위한 내부 상태
    const state = {
        activeModals: new Set(),  // 현재 활성화된 모달/레이어 추적
        registeredButtons: new Set()  // 등록된 버튼 추적
    };

    // 현재 활성화된 모달/레이어 관리 (단순화)
    const activeModalManager = {
        activeModals: new Set(),
        
        register(modal) {
            if (modal) this.activeModals.add(modal);
        },
        
        unregister(modal) {
            if (modal) this.activeModals.delete(modal);
        },
        
        closeAll() {
            this.activeModals.forEach(modal => {
                if (modal.closeCallback) modal.closeCallback();
            });
            this.activeModals.clear();
        },
        
        // 버튼 등록 로직 단순화
        registerButton(button) {
            if (!button) return;
            
            // 한 번만 등록하도록
            if (button._hasClickHandler) return;
            
            button._hasClickHandler = true;
        }
    };

    // DOM 조작 유틸리티
    const dom = {
        /**
         * 요소 생성 및 속성 지정 헬퍼
         * @param {string} tag - HTML 태그명
         * @param {Object} attributes - 속성 객체
         * @param {Object} styles - 스타일 객체
         * @returns {HTMLElement} 생성된 요소
         */
        createElement(tag, attributes = {}, styles = {}) {
            const element = document.createElement(tag);
            
            Object.entries(attributes).forEach(([key, value]) => {
                if (key === 'className') {
                    element.className = value;
                } else if (key === 'textContent') {
                    element.textContent = value;
                } else if (key === 'innerHTML') {
                    element.innerHTML = value;
                } else {
                    element.setAttribute(key, value);
                }
            });
            
            Object.entries(styles).forEach(([key, value]) => {
                element.style[key] = value;
            });
            
            return element;
        },

        /**
         * SVG 요소 생성 헬퍼
         * @param {string} tag - SVG 태그명
         * @param {Object} attributes - 속성 객체
         * @returns {SVGElement} 생성된 SVG 요소
         */
        createSvgElement(tag, attributes = {}) {
            const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
            
            Object.entries(attributes).forEach(([key, value]) => {
                element.setAttribute(key, value);
            });
            
            return element;
        },

        /**
         * 가장 가까운 블록 요소 찾기
         * @param {HTMLElement} element - 시작 요소
         * @param {HTMLElement} [container=null] - 검색 범위를 제한할 컨테이너
         * @returns {HTMLElement|null} 찾은 블록 요소 또는 null
         */
        findClosestBlock(element, container = null) {
            const blockTags = ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE', 'TABLE', 'UL', 'OL', 'LI'];
            
            // 이미 블록 요소면 그대로 반환
            if (blockTags.includes(element.nodeName)) {
                return element;
            }
            
            // 부모 요소들을 순회하면서 블록 요소 찾기
            let current = element;
            while (current && current !== container) {
                if (blockTags.includes(current.nodeName)) {
                    return current;
                }
                current = current.parentNode;
            }
            
            // 블록 요소를 찾지 못한 경우 null 반환
            return null;
        },
        
        /**
         * 요소가 블록 레벨 요소인지 확인
         * @param {Element} element - 확인할 요소
         * @returns {boolean} - 블록 요소 여부
         */
        isBlockElement(element) {
            if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
            
            const blockTags = ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'PRE'];
            return blockTags.includes(element.nodeName);
        }
    };

    // 선택 영역 관리 유틸리티
    const selection = {
        /**
         * 현재 선택 영역 저장
         * @returns {Range|null} 저장된 Range 객체
         */
        saveSelection() {
            // liteEditorSelection이 있으면 먼저 사용
            if (window.liteEditorSelection) {
                window.liteEditorSelection.save();
                return window.liteEditorSelection.get();
            }
            
            const sel = window.getSelection();
            if (sel.rangeCount > 0) {
                return sel.getRangeAt(0).cloneRange();
            }
            return null;
        },

        /**
         * 저장된 선택 영역 복원
         * @param {Range} savedRange - 저장된 Range 객체
         * @returns {boolean} 복원 성공 여부
         */
        restoreSelection(savedRange) {
            if (!savedRange) return false;
            
            // liteEditorSelection이 있으면 먼저 사용
            if (window.liteEditorSelection) {
                window.liteEditorSelection.restore();
                return true;
            }
            
            try {
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(savedRange);
                return true;
            } catch (e) {
                console.error('선택 영역 복원 실패:', e);
                return false;
            }
        },
        
        /**
         * 안전하게 Selection 객체 가져오기
         * @returns {Selection|null} Selection 객체 또는 null
         */
        getSafeSelection() {
            try {
                return window.getSelection();
            } catch (e) {
                console.warn('Selection 객체를 가져오는 중 오류 발생:', e);
                return null;
            }
        },
        
        /**
         * 커서가 블록의 시작 위치에 있는지 확인
         * @param {Range} range - 선택 범위
         * @returns {boolean} - 시작 위치 여부
         */
        isAtStartOfBlock(range) {
            if (!range) return false;
            
            if (range.startOffset > 0) return false;
            
            const node = range.startContainer;
            if (node.nodeType === Node.TEXT_NODE) {
                // 텍스트 노드면 이전 형제 노드가 없어야 시작 위치로 판단
                let prevNode = node.previousSibling;
                while (prevNode) {
                    if (prevNode.textContent.trim() !== '') return false;
                    prevNode = prevNode.previousSibling;
                }
                return true;
            }
            
            return range.startOffset === 0;
        },
        
        /**
         * 커서를 지정된 노드의 위치로 이동
         * @param {Node} node - 커서를 위치시킬 노드
         * @param {number} offset - 오프셋 위치
         */
        moveCursorTo(node, offset) {
            try {
                const sel = this.getSafeSelection();
                if (!sel) return;
                
                const range = document.createRange();
                
                range.setStart(node, offset);
                range.collapse(true);
                
                sel.removeAllRanges();
                sel.addRange(range);
            } catch (e) {
                console.warn('커서 이동 중 오류:', e);
            }
        }
    };

    // 이벤트 유틸리티
    const events = {
        /**
         * 디바운스 함수
         * @param {Function} func - 실행할 함수
         * @param {number} wait - 대기 시간(ms)
         * @returns {Function} 디바운스된 함수
         */
        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        /**
         * 쓰로틀 함수
         * @param {Function} func - 실행할 함수
         * @param {number} limit - 제한 시간(ms)
         * @returns {Function} 쓰로틀된 함수
         */
        throttle(func, limit) {
            let inThrottle;
            return function executedFunction(...args) {
                if (!inThrottle) {
                    func(...args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        }
    };

    // URL 관련 유틸리티
    const url = {
        /**
         * URL 유효성 검사
         * @param {string} url - 검사할 URL
         * @returns {boolean} 유효성 여부
         */
        isValidUrl(url) {
            try {
                new URL(url);
                return true;
            } catch {
                return false;
            }
        },

        /**
         * URL 정규화
         * @param {string} url - 정규화할 URL
         * @returns {string} 정규화된 URL
         */
        normalizeUrl(url) {
            if (!url) return '';
            if (!/^https?:\/\//i.test(url)) {
                return 'http://' + url;
            }
            return url;
        }
    };

    // 스타일 관리 유틸리티
    const styles = {
        /**
         * CSS 파일 로드
         * @param {string} id - 스타일 요소 ID
         * @param {string} href - CSS 파일 경로
         * @returns {boolean} 로드 성공 여부
         */
        loadCssFile(id, href) {
            if (document.getElementById(id)) return true;
            
            const linkEl = dom.createElement('link', {
                id: id,
                rel: 'stylesheet',
                type: 'text/css',
                href: href
            });
            
            document.head.appendChild(linkEl);
            return true;
        },

        /**
         * 인라인 스타일 추가
         * @param {string} id - 스타일 요소 ID
         * @param {string} css - CSS 문자열
         * @returns {boolean} 추가 성공 여부
         */
        addInlineStyle(id, css) {
            if (document.getElementById(id)) return true;
            
            const styleEl = dom.createElement('style', {
                id: id,
                type: 'text/css',
                textContent: css
            });
            
            document.head.appendChild(styleEl);
            return true;
        }
    };

    // 에디터 이벤트 유틸리티
    const editor = {
        /**
         * 에디터 이벤트 발생
         * @param {HTMLElement} editorElement - 에디터 요소
         */
        dispatchEditorEvent(editorElement) {
            if (!editorElement) return;
            editorElement.dispatchEvent(new Event('input', { bubbles: true }));
        },

        /**
         * 선택된 텍스트 가져오기
         * @returns {string} 선택된 텍스트
         */
        getSelectedText() {
            const selection = window.getSelection();
            return selection.toString();
        }
    };

    // 레이어 위치 관리 유틸리티
    const layer = {
        /**
         * 레이어 위치 설정
         * @param {HTMLElement} layerElement - 레이어 요소
         * @param {HTMLElement} targetElement - 기준 요소
         * @param {Object} options - 위치 옵션
         */
        setLayerPosition(layerElement, targetElement, options = {}) {
            const targetRect = targetElement.getBoundingClientRect();
            const { offsetX = 0, offsetY = 0 } = options;
            
            layerElement.style.top = (targetRect.bottom + window.scrollY + offsetY) + 'px';
            layerElement.style.left = (targetRect.left + window.scrollX + offsetX) + 'px';
            
            // 화면 경계 체크
            setTimeout(() => {
                const layerRect = layerElement.getBoundingClientRect();
                if (layerRect.right > window.innerWidth) {
                    layerElement.style.left = (window.innerWidth - layerRect.width - 10) + 'px';
                }
            }, 0);
        }
    };

    // 인라인 서식 플러그인 등록 헬퍼
    const registerInlineFormatPlugin = function(id, title, icon, command) {
        if (window.LiteEditor) {
            LiteEditor.registerPlugin(id, {
                title: title,
                icon: icon,
                action: function(contentArea, buttonElement, event) {
                    if (window.LiteEditorUtils) {
                        LiteEditorUtils.applyInlineFormat(contentArea, buttonElement, command || id, event);
                    }
                }
            });
        }
    };

    // 블록 서식 플러그인 등록 헬퍼
    const registerBlockFormatPlugin = function(id, title, icon, tag, customAction) {
        if (window.LiteEditor) {
            LiteEditor.registerPlugin(id, {
                title: title,
                icon: icon,
                action: function(contentArea, buttonElement, event) {
                    if (customAction) {
                        customAction(contentArea, buttonElement, event);
                    } else {
                        document.execCommand('formatBlock', false, `<${tag || id}>`);
                    }
                }
            });
        }
    };

    // 드롭다운 메뉴 생성 및 관리
    const createDropdown = function(options = {}) {
        const {
            className = 'lite-editor-dropdown-menu',
            items = [],
            onSelect = () => {}
        } = options;
        
        const dropdown = dom.createElement('div', { 
            className: className 
        });
        
        items.forEach(item => {
            const itemElement = dom.createElement('div', {
                className: 'lite-editor-dropdown-item',
                textContent: item.text || '',
                'data-value': item.value || ''
            });
            
            if (item.icon) {
                const iconElement = dom.createElement('span', {
                    className: 'material-icons',
                    textContent: item.icon
                });
                itemElement.insertBefore(iconElement, itemElement.firstChild);
            }
            
            itemElement.addEventListener('click', () => {
                onSelect(item.value, item);
                dropdown.classList.remove('show');
            });
            
            dropdown.appendChild(itemElement);
        });
        
        document.body.appendChild(dropdown);
        
        return dropdown;
    };

    // 팝업 레이어 생성 및 관리
    const createPopupLayer = function(options = {}) {
        const {
            className = 'lite-editor-popup-layer',
            content = '',
            width = 'auto',
            onClose = () => {}
        } = options;
        
        const layer = dom.createElement('div', { 
            className: className 
        }, {
            width: typeof width === 'number' ? width + 'px' : width
        });
        
        if (typeof content === 'string') {
            layer.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            layer.appendChild(content);
        }
        
        const closeButton = dom.createElement('button', {
            className: 'lite-editor-popup-close',
            textContent: '×'
        });
        
        closeButton.addEventListener('click', () => {
            layer.classList.remove('show');
            onClose();
        });
        
        layer.insertBefore(closeButton, layer.firstChild);
        document.body.appendChild(layer);
        
        return layer;
    };

    // 바깥 영역 클릭 감지 (단순화)
    const setupOutsideClickHandler = function(element, callback, excludeElements = []) {
        let isJustOpened = true;
        
        const handler = (e) => {
            // 방금 열린 경우는 첫 클릭 무시
            if (isJustOpened) {
                isJustOpened = false;
                return;
            }
            
            // 제외할 요소들 확인
            const shouldExclude = excludeElements.some(el => 
                el === e.target || (el && el.contains && el.contains(e.target))
            );
            
            if (!element.contains(e.target) && document.body.contains(element) && !shouldExclude) {
                callback(e);
            }
        };
        
        // 지연 등록으로 현재 클릭이 외부 클릭으로 인식되는 것 방지
        setTimeout(() => {
            document.addEventListener('click', handler);
        }, 100);
        
        return () => document.removeEventListener('click', handler);
    };

    // 툴바 버튼 클릭 이벤트 관리 (단순화)
    const setupToolbarButtonEvents = function(button, dropdown, toolbar) {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const isActive = dropdown.classList.contains('show');
            
            // 다른 모든 드롭다운 닫기
            if (toolbar) {
                const dropdowns = toolbar.querySelectorAll('.lite-editor-dropdown-menu.show');
                dropdowns.forEach(d => {
                    if (d !== dropdown) {
                        d.classList.remove('show');
                    }
                });
            }
            
            // 다른 모든 활성화된 모달 닫기
            activeModalManager.closeAll();
            
            // 현재 드롭다운 토글
            dropdown.classList.toggle('show');
            
            // 열리는 경우 활성 모달로 등록
            if (!isActive) {
                layer.setLayerPosition(dropdown, button);
                dropdown.closeCallback = () => {
                    dropdown.classList.remove('show');
                };
                activeModalManager.register(dropdown);
            } else {
                activeModalManager.unregister(dropdown);
            }
        });
        
        // 바깥 클릭 시 닫기
        setupOutsideClickHandler(dropdown, () => {
            dropdown.classList.remove('show');
            activeModalManager.unregister(dropdown);
        });
    };

    // 툴바 레벨 이벤트 핸들러 추가 (단순화)
    const setupToolbarModalEvents = function(toolbar) {
        if (!toolbar || toolbar._hasModalEvents) return;
        
        toolbar.addEventListener('click', (e) => {
            // 툴바 영역 클릭 시 모든 모달 닫기 (단, 레이어 내부 클릭은 제외)
            if (!e.target.closest('.lite-editor-dropdown-menu') && 
                !e.target.closest('.lite-editor-link-popup') &&
                !e.target.closest('.grid-layer')) {
                activeModalManager.closeAll();
            }
        });
        
        toolbar._hasModalEvents = true;
    };

    // 모달 관리 유틸리티
    const modal = {
        /**
         * 모달의 닫기 이벤트(ESC 키 및 외부 클릭)를 설정 (단순화)
         */
        setupModalCloseEvents(modalElement, closeCallback, excludeElements = []) {
            if (!modalElement || !closeCallback) return () => {};
            
            modalElement.closeCallback = closeCallback;
            activeModalManager.register(modalElement);
            
            const outsideClickRemover = setupOutsideClickHandler(modalElement, () => {
                closeCallback();
                activeModalManager.unregister(modalElement);
            }, excludeElements);
            
            const escKeyHandler = (e) => {
                if (e.key === 'Escape' && document.body.contains(modalElement)) {
                    closeCallback();
                    activeModalManager.unregister(modalElement);
                    document.removeEventListener('keydown', escKeyHandler);
                }
            };
            
            document.addEventListener('keydown', escKeyHandler);
            
            return function cleanup() {
                outsideClickRemover();
                document.removeEventListener('keydown', escKeyHandler);
                activeModalManager.unregister(modalElement);
            };
        }
    };

    // FIX core.js에 있는 registerPlugin 함수를 따로 분리하여 util을 호출하는 구조로 변경해야 함 
    const registerPlugin = function(id, plugin) {
        if (window.LiteEditor) {
          LiteEditor.registerPlugin(id, plugin);
        } else {
          console.warn(`플러그인 "${id}" 등록 실패 - LiteEditor를 찾을 수 없습니다`);
        }
      };

    // 레이어 관리 유틸리티
    const layerManager = {
        createLayer(options) { /* ... */ },
        toggleLayer(layer, button) { /* ... */ },
        showLayer(layer, button) { /* ... */ },
        hideLayer(layer) { /* ... */ },
        setupLayerEvents(layer, closeCallback, excludeElements) { /* ... */ }
    };

    // 공개 API
    return {
        dom,
        selection,
        events,
        url,
        styles,
        editor,
        layer,
        registerPlugin,
        registerInlineFormatPlugin,
        registerBlockFormatPlugin,
        createDropdown,
        createPopupLayer,
        setupOutsideClickHandler,
        setupToolbarButtonEvents,
        setupToolbarModalEvents,
        activeModalManager,
        modal,
        layerManager
    };
})();

// 전역 스코프에 노출
window.PluginUtil = PluginUtil;

// 더 단순한 토글 구현
let isModalOpen = false;
let modalElement = null;

function toggleLinkModal(button, contentArea) {
    if (isModalOpen && modalElement) {
        // 닫기
        modalElement.remove();
        modalElement = null;
        isModalOpen = false;
        return;
    }
    
    // 열기
    isModalOpen = true;
    modalElement = createLinkModal(button, contentArea);
    
    // 외부 클릭 처리 - 다음 클릭부터 적용되도록 타임아웃 사용
    setTimeout(() => {
        document.addEventListener('click', function closeModal(e) {
            // 모달 내부 또는 버튼 클릭이면 무시
            if (modalElement.contains(e.target) || button.contains(e.target)) {
                return;
            }
            
            // 모달 닫기
            if (modalElement) {
                modalElement.remove();
                modalElement = null;
                isModalOpen = false;
            }
            
            // 이벤트 리스너 제거
            document.removeEventListener('click', closeModal);
        });
    }, 100);
}

// plugin-util.js에 추가할 코드 구조
const ui = {
    createStyledDropdown(label, options, defaultValue, width) { /* ... */ },
    createFormGroup(label, input) { /* ... */ },
    createButton(options) { /* ... */ },
    createIconButton(icon, title, onClick) { /* ... */ }
};

const gridComponents = {
    createGrid(rows, cols, options) { /* ... */ },
    createSelectableGrid(size, selectionCallback) { /* ... */ }
};
