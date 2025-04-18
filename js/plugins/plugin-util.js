/**
 * LiteEditor Plugin Utilities
 * 플러그인 공통 유틸리티 모듈
 */

const PluginUtil = (function() {
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
        }
    };

    // 선택 영역 관리 유틸리티
    const selection = {
        /**
         * 현재 선택 영역 저장
         * @returns {Range|null} 저장된 Range 객체
         */
        saveSelection() {
            const sel = window.getSelection();
            if (sel.rangeCount > 0) {
                return sel.getRangeAt(0).cloneRange();
            }
            return null;
        },

        /**
         * 저장된 선택 영역 복원
         * @param {Range} savedRange - 저장된 Range 객체
         */
        restoreSelection(savedRange) {
            if (savedRange) {
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(savedRange);
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

    // 공개 API
    return {
        dom,
        selection,
        events,
        url,
        styles,
        editor,
        layer
    };
})();

// 전역 스코프에 노출
window.PluginUtil = PluginUtil;
