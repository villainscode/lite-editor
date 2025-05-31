/**
 * LiteEditor Plugin Utilities
 * 플러그인 공통 유틸리티 모듈
 */

const PluginUtil = (function() {
    // WeakMap과 WeakSet 사용으로 메모리 누수 방지
    const eventListenerCleanupMap = new WeakMap(); // DOM 요소별 cleanup 함수들
    const elementStateMap = new WeakMap(); // DOM 요소별 상태 정보
    
    // 활성화된 레이어/모달 관리를 위한 내부 상태
    const state = {
        registeredButtons: new WeakSet(),  // Set 대신 WeakSet 사용
        globalCleanupFunctions: [] // 전역 이벤트 리스너 cleanup 함수들
    };

    // 메모리 효율적인 레이어 관리 시스템
    const layerManager = {
        // WeakSet 사용으로 자동 가비지 컬렉션 허용
        activeLayers: new WeakSet(),
        activeLayersList: [], // 순회를 위한 배열 (정기적으로 정리)
        
        // 레이어 등록
        register(layer, button) {
            if (layer) {
                const layerInfo = { element: layer, button: button, type: button ? 'dropdown' : 'modal' };
                
                this.activeLayers.add(layer);
                this.activeLayersList.push(layerInfo);
                
                // WeakMap에 레이어 정보 저장
                elementStateMap.set(layer, layerInfo);
                
                // 주기적으로 배열 정리 (가비지 수집된 요소 제거)
                this._cleanupDeadReferences();
            }
        },
        
        // 레이어 등록 해제
        unregister(layer) {
            if (!layer) return;
            
            // WeakSet에서는 자동으로 제거되지만, 배열에서는 수동 제거 필요
            this.activeLayersList = this.activeLayersList.filter(item => 
                item.element !== layer && document.body.contains(item.element)
            );
            
            // WeakMap에서 제거
            elementStateMap.delete(layer);
            
            // 해당 요소의 이벤트 리스너 cleanup
            this._cleanupElementListeners(layer);
        },
        
        // 데드 레퍼런스 정리
        _cleanupDeadReferences() {
            this.activeLayersList = this.activeLayersList.filter(item => 
                item.element && document.body.contains(item.element)
            );
        },
        
        // 요소별 이벤트 리스너 정리
        _cleanupElementListeners(element) {
            const cleanupFunctions = eventListenerCleanupMap.get(element);
            if (cleanupFunctions) {
                cleanupFunctions.forEach(cleanup => {
                    try {
                        cleanup();
                    } catch (e) {
                        console.warn('이벤트 리스너 정리 중 오류:', e);
                    }
                });
                eventListenerCleanupMap.delete(element);
            }
        },
        
        // 모든 레이어 닫기 (특정 레이어 제외 가능) - ✅ 선택 영역 복원 기능 추가
        closeAll(exceptLayer, onComplete) {
            // ✅ 1. 현재 활성화된 contentArea 찾기
            const activeContentArea = document.querySelector('.lite-editor-content:focus, [contenteditable="true"]:focus') || 
                                      document.querySelector('.lite-editor-content, [contenteditable="true"]');
            
            // ✅ 2. 선택 영역 복원 필요성 확인 (기존 로직)
            let needsSelectionRestore = false;
            const currentSelection = window.getSelection();
            
            if (currentSelection && currentSelection.rangeCount > 0 && activeContentArea) {
                const range = currentSelection.getRangeAt(0);
                const selectionContainer = range.commonAncestorContainer;
                
                this.activeLayersList.forEach(item => {
                    if (item.element !== exceptLayer && document.body.contains(item.element)) {
                        if (item.element.contains(selectionContainer) || 
                            selectionContainer === item.element) {
                            needsSelectionRestore = true;
                        }
                    }
                });
            }
            
            // ✅ 3. 레이어 닫기 (기존 로직)
            this.activeLayersList.forEach(item => {
                if (item.element !== exceptLayer && document.body.contains(item.element)) {
                    if (item.type === 'dropdown') {
                        item.element.classList.remove('show');
                        if (item.button) item.button.classList.remove('active');
                    } else {
                        if (item.element.closeCallback) {
                            item.element.closeCallback();
                        }
                    }
                }
            });
            
            // ✅ 4. 선택 영역 복원 + 콜백 실행
            if (needsSelectionRestore && activeContentArea) {
                setTimeout(() => {
                    try {
                        activeContentArea.focus();
                        const range = document.createRange();
                        range.selectNodeContents(activeContentArea);
                        range.collapse(false);
                        
                        const selection = window.getSelection();
                        selection.removeAllRanges();
                        selection.addRange(range);
                        
                        if (window.errorHandler) {
                            errorHandler.colorLog('LAYER_MANAGER', '✅ 선택 영역 복원 완료', {
                                target: activeContentArea.className || activeContentArea.id || 'contentArea'
                            }, '#4caf50');
                        }
                    } catch (e) {
                        if (activeContentArea && activeContentArea.focus) {
                            activeContentArea.focus();
                        }
                        console.warn('LayerManager: 선택 영역 복원 실패, 포커스만 설정:', e);
                    }
                    
                    // ✅ 콜백 실행 (레이어 완전 닫힌 후)
                    if (onComplete && typeof onComplete === 'function') {
                        onComplete();
                    }
                }, 50); // ✅ 충분한 시간 확보
            } else {
                // ✅ 선택 영역 복원이 필요없어도 콜백 실행
                if (onComplete && typeof onComplete === 'function') {
                    setTimeout(onComplete, 10);
                }
            }
            
            // 제외된 레이어 외에는 모두 제거
            this.activeLayersList = exceptLayer ? 
                this.activeLayersList.filter(item => item.element === exceptLayer) : [];
        },
        
        // 메모리 정리 (수동 호출용)
        cleanup() {
            this.activeLayersList.forEach(item => {
                this._cleanupElementListeners(item.element);
            });
            this.activeLayersList = [];
        },
        
        // 레이어 토글
        toggle(layer, button, params = {}) {
            const isOpen = layer.classList.contains('show');
            
            // 다른 레이어 닫기
            if (params.closeOthers !== false) {
                this.closeAll(isOpen ? null : layer);
            }
            
            // 레이어 토글
            if (isOpen) {
                // 닫기
                layer.classList.remove('show');
                if (button) button.classList.remove('active');
                this.unregister(layer);
            } else {
                // 열기
                layer.classList.add('show');
                if (button) button.classList.add('active');
                
                // 위치 설정
                if (button && params.position !== false) {
                    layer.setLayerPosition(layer, button, params);
                }
                
                // 레이어 등록
                this.register(layer, button);
            }
            
            return !isOpen;
        }
    };

    // 현재 활성화된 모달/레이어 관리 (단순화)
    const activeModalManager = {
        register(modal) {
            layerManager.register(modal);
        },
        
        unregister(modal) {
            layerManager.unregister(modal);
        },
        
        closeAll() {
            layerManager.closeAll();
        },
        
        registerButton(button) {
            if (!button) return;
            if (state.registeredButtons.has(button)) return;
            state.registeredButtons.add(button);
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
        },
        
        moveCursorToEnd(element) {
            if (!element) return;
            
            try {
                const sel = this.getSafeSelection();
                if (!sel) return;
                
                const range = document.createRange();
                
                // 요소의 맨 끝으로 커서 이동
                if (element.nodeType === Node.TEXT_NODE) {
                    // 텍스트 노드인 경우 텍스트 길이만큼 오프셋 설정
                    range.setStart(element, element.length);
                    range.setEnd(element, element.length);
                } else {
                    // 요소 노드인 경우 마지막 자식 위치로 설정
                    range.selectNodeContents(element);
                    range.collapse(false); // false = 끝으로 접기
                }
                
                sel.removeAllRanges();
                sel.addRange(range);
            } catch (e) {
                console.warn('커서 이동 중 오류:', e);
            }
        },

        /**
         * 선택 영역의 오프셋 계산
         * @param {HTMLElement} container - 선택 영역을 계산할 컨테이너
         * @returns {Object|null} {start, end} 오프셋 객체 또는 null
         */
        calculateOffsets(container) {
            const sel = window.getSelection();
            if (!sel.rangeCount) return null;
            const range = sel.getRangeAt(0);

            let charIndex = 0, startOffset = -1, endOffset = -1;
            const treeWalker = document.createTreeWalker(
                container,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );

            while (treeWalker.nextNode()) {
                const node = treeWalker.currentNode;
                if (node === range.startContainer) {
                    startOffset = charIndex + range.startOffset;
                }
                if (node === range.endContainer) {
                    endOffset = charIndex + range.endOffset;
                    break;
                }
                charIndex += node.textContent.length;
            }

            if (startOffset >= 0 && endOffset < 0) {
                endOffset = startOffset;
            }
            return startOffset >= 0 ? { start: startOffset, end: endOffset } : null;
        },

        /**
         * 저장된 오프셋으로 선택 영역 복원
         * @param {HTMLElement} container - 선택 영역을 복원할 컨테이너
         * @param {Object} offsets - {start, end} 오프셋 객체
         * @returns {boolean} 복원 성공 여부
         */
        restoreFromOffsets(container, offsets) {
            if (!offsets) return false;

            const range = document.createRange();
            let charIndex = 0;
            const treeWalker = document.createTreeWalker(
                container,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );

            while (treeWalker.nextNode()) {
                const node = treeWalker.currentNode;
                const nodeLength = node.textContent.length;

                if (charIndex <= offsets.start && offsets.start <= charIndex + nodeLength) {
                    range.setStart(node, offsets.start - charIndex);
                }
                if (charIndex <= offsets.end && offsets.end <= charIndex + nodeLength) {
                    range.setEnd(node, offsets.end - charIndex);
                    break;
                }
                charIndex += nodeLength;
            }

            try {
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
                return true;
            } catch (e) {
                console.error('선택 영역 복원 실패:', e);
                return false;
            }
        },

        // PluginUtil에 복원 함수 추가
        restoreSelectionByMarker(contentArea, selector, delay = 10) {
            return new Promise((resolve) => {
                setTimeout(() => {
                    const markerElement = contentArea.querySelector(selector);
                    if (markerElement) {
                        markerElement.removeAttribute('data-selection-marker');
                        
                        const range = document.createRange();
                        range.selectNode(markerElement);
                        
                        const selection = window.getSelection();
                        selection.removeAllRanges();
                        selection.addRange(range);
                        
                        contentArea.focus({ preventScroll: true });
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                }, delay);
            });
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
            
            // 환경 설정 기반 캐시 버스터 적용
            let finalHref = href;
            if (window.LiteEditorConfig?.cacheBusting.enabled) {
                const config = window.LiteEditorConfig;
                switch (config.cacheBusting.strategy) {
                    case 'timestamp':
                        finalHref = `${href}?t=${Date.now()}`;
                        break;
                    case 'version':
                        finalHref = `${href}?v=${config.version}`;
                        break;
                    default:
                        finalHref = href;
                }
            }
            
            const linkEl = dom.createElement('link', {
                id: id,
                rel: 'stylesheet',
                type: 'text/css',
                href: finalHref
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
         * 드롭다운 생성 함수
         * @param {Object} options - 드롭다운 옵션
         * @returns {HTMLElement} 생성된 드롭다운 요소
         */
        createDropdown(options = {}) {
            const dropdown = dom.createElement('div', {
                className: `lite-editor-dropdown-menu ${options.className || ''}`,
                id: options.id || `dropdown-${Math.random().toString(36).substr(2, 9)}`
            }, {
                position: 'absolute',
                zIndex: '99999',
                display: 'none',
                backgroundColor: '#fff',
                border: '1px solid #ccc',
                borderRadius: '4px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                padding: '8px 0',
                minWidth: options.minWidth || '120px',
                ...options.style
            });
            
            // ESC 키로 닫기 기능 추가
            const keyHandler = (e) => {
                if (e.key === 'Escape' && dropdown.classList.contains('show')) {
                    dropdown.classList.remove('show');
                    layerManager.unregister(dropdown);
                    if (options.onClose) options.onClose();
                }
            };
            document.addEventListener('keydown', keyHandler);
            
            // 외부 클릭으로 닫기 기능 추가
            setupOutsideClickHandler(dropdown, () => {
                dropdown.classList.remove('show');
                layerManager.unregister(dropdown);
                if (options.onClose) options.onClose();
            }, options.excludeElements || []);
            
            // DOM에 추가
            if (options.appendTo) {
                options.appendTo.appendChild(dropdown);
            } else {
                document.body.appendChild(dropdown);
            }
            
            return dropdown;
        },
        
        /**
         * 레이어 위치 설정 함수
         * @param {HTMLElement} layer - 위치시킬 레이어 요소
         * @param {HTMLElement} reference - 기준 요소
         * @param {Object} options - 위치 옵션
         */
        setLayerPosition(layer, reference, options = {}) {
            const refRect = reference.getBoundingClientRect();
            
            // 기본 위치: 참조 요소 아래
            layer.style.top = (refRect.bottom + window.scrollY) + 'px';
            layer.style.left = refRect.left + 'px';
            
            // 추가 위치 조정
            if (options.offsetY) layer.style.top = `${parseInt(layer.style.top) + options.offsetY}px`;
            if (options.offsetX) layer.style.left = `${parseInt(layer.style.left) + options.offsetX}px`;
            
            // 뷰포트 경계 확인
            const layerRect = layer.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            
            // 오른쪽 경계 초과 시 조정
            if (layerRect.right > viewportWidth) {
                layer.style.left = (viewportWidth - layerRect.width - 10) + 'px';
            }
            
            // 하단 경계 초과 시 조정
            if (layerRect.bottom > viewportHeight) {
                layer.style.top = (refRect.top + window.scrollY - layerRect.height) + 'px';
            }
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

    // 메모리 효율적인 바깥 영역 클릭 감지
    const setupOutsideClickHandler = function(element, callback, excludeElements = []) {
        let isJustOpened = true;
        let handler = null;
        let timeoutId = null;
        
        const cleanup = () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
            if (handler) {
                document.removeEventListener('click', handler);
                handler = null;
            }
        };
        
        // WeakMap에 cleanup 함수 저장
        const cleanupFunctions = eventListenerCleanupMap.get(element) || [];
        cleanupFunctions.push(cleanup);
        eventListenerCleanupMap.set(element, cleanupFunctions);
        
        // MutationObserver로 요소 제거 감지
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.removedNodes.forEach((node) => {
                    if (node === element || (node.contains && node.contains(element))) {
                        cleanup();
                        observer.disconnect();
                    }
                });
            });
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
        
        handler = (e) => {
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
        timeoutId = setTimeout(() => {
            if (handler) {
                document.addEventListener('click', handler);
            }
            timeoutId = null;
        }, 100);
        
        return cleanup;
    };

    // 툴바 버튼 클릭 이벤트 관리
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

    // 툴바 레벨 이벤트 핸들러 추가
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
         * 모달의 닫기 이벤트(ESC 키 및 외부 클릭)를 설정
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

    const registerPlugin = function(id, plugin) {
        if (window.LiteEditor) {
          LiteEditor.registerPlugin(id, plugin);
        } else {
          errorHandler.logError('PluginUtil', errorHandler.codes.PLUGINS.REGISTER, new Error(`플러그인 "${id}" 등록 실패 - LiteEditor를 찾을 수 없습니다`));
        }
    };

    // 데이터 로드 유틸리티 추가
    const dataLoader = {
        /**
         * 외부 데이터 스크립트 로드 함수
         * @param {string} scriptPath - 스크립트 경로
         * @param {string} dataNamespace - 로드된 데이터가 저장될 전역 네임스페이스
         * @param {Function} callback - 로드 후 실행할 콜백 함수
         */
        loadExternalScript(scriptPath, dataNamespace, callback) {
            // 이미 로드된 경우 콜백 즉시 실행
            if (window[dataNamespace]) {
                if (callback) callback();
                return;
            }
            
            // 스크립트 로드
            const script = document.createElement('script');
            script.src = scriptPath;
            script.onload = function() {
                if (callback) callback();
            };
            script.onerror = function() {
                errorHandler.logError('PluginUtil', errorHandler.codes.PLUGINS.DATA_LOAD, new Error(`${scriptPath} 데이터 파일을 로드할 수 없습니다.`));
                if (callback) callback();
            };
            
            document.head.appendChild(script);
        },
        
        /**
         * 색상 데이터 로드 함수
         * @param {string} colorType - 색상 타입 ('font', 'highlight' 등)
         * @param {Array} fallbackColors - 데이터 파일이 없을 경우 사용할 기본 색상 목록
         * @returns {Array} 색상 목록 배열
         */
        loadColorData(colorType, fallbackColors) {
            let getterFunction;
            
            switch (colorType) {
                case 'font':
                    getterFunction = 'getFontColors';
                    break;
                case 'highlight':
                    getterFunction = 'getHighlightColors';
                    break;
                default:
                    getterFunction = 'getFontColors';
            }
            
            // 외부 데이터 파일이 로드되었는지 확인
            if (window.LiteEditorColorData && typeof window.LiteEditorColorData[getterFunction] === 'function') {
                // 외부 데이터 파일에서 색상 목록 가져오기
                return window.LiteEditorColorData[getterFunction]();
            } else {
                // 대체: 데이터 파일이 로드되지 않은 경우 기본 색상 목록 반환
                errorHandler.logError('PluginUtil', errorHandler.codes.PLUGINS.COLOR.LOAD, new Error(`색상 데이터 파일을 찾을 수 없습니다. 기본 ${colorType} 색상 목록을 사용합니다.`));
                return fallbackColors;
            }
        }
    };

    // setupDropdownButton 함수 정의
    const setupDropdownButton = function(button, dropdown, options = {}) {
        // 이미 설정된 버튼이면 스킵
        if (button._hasDropdownHandler) return;
        
        button._hasDropdownHandler = true;
        
        // 클릭 이벤트 핸들러
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // 현재 스크롤 위치 저장
            const currentScrollY = window.scrollY;
            
            // 선택 영역 저장 (옵션으로 제공된 경우)
            if (options.saveSelection) {
                options.saveSelection();
            }
            
            // 드롭다운 토글 (layerManager가 아직 직접 접근 가능하지 않으면 PluginUtil.layerManager 사용)
            let isOpen = false;
            if (dropdown.classList.contains('show')) {
                dropdown.classList.remove('show');
                button.classList.remove('active');
                isOpen = false;
            } else {
                // 다른 모든 드롭다운 닫기
                if (options.closeOthers !== false) {
                    activeModalManager.closeAll();
                }
                
                dropdown.classList.add('show');
                button.classList.add('active');
                isOpen = true;
                
                // 위치 설정
                if (options.position !== false) {
                    layer.setLayerPosition(dropdown, button);
                }
            }
            
            // 콜백 실행
            if (isOpen) {
                if (options.onOpen) options.onOpen();
            } else {
                if (options.onClose) options.onClose();
            }
            
            // 스크롤 위치 복원
            if (options.preserveScroll !== false) {
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        window.scrollTo(window.scrollX, currentScrollY);
                    }, 10);
                });
            }
        });
        
        return button;
    };

    // 스크롤 관리 유틸리티 추가
    const scroll = {
        /**
         * 현재 스크롤 위치 저장
         * @returns {Object} 저장된 스크롤 위치 {x, y}
         */
        savePosition() {
            return {
                x: window.scrollX,
                y: window.scrollY
            };
        },

        /**
         * 스크롤 위치 복원
         * @param {Object} position - 복원할 스크롤 위치 {x, y}
         * @param {number} delay - 복원 지연 시간(ms, 기본값: 50)
         */
        restorePosition(position, delay = 50) {
            if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
                return;
            }
            
            requestAnimationFrame(() => {
                setTimeout(() => {
                    window.scrollTo(position.x, position.y);
                }, delay);
            });
        },

        /**
         * 함수 실행 시 스크롤 위치 보존
         * @param {Function} fn - 실행할 함수
         * @param {number} delay - 복원 지연 시간(ms, 기본값: 50)
         * @returns {Function} 스크롤 보존이 적용된 함수
         */
        preservePosition(fn, delay = 50) {
            return function(...args) {
                const scrollPosition = scroll.savePosition();
                const result = fn.apply(this, args);
                scroll.restorePosition(scrollPosition, delay);
                return result;
            };
        },

        /**
         * 비동기 함수 실행 시 스크롤 위치 보존
         * @param {Function} fn - 실행할 비동기 함수
         * @param {number} delay - 복원 지연 시간(ms, 기본값: 50)
         * @returns {Function} 스크롤 보존이 적용된 비동기 함수
         */
        preservePositionAsync(fn, delay = 50) {
            return async function(...args) {
                const scrollPosition = scroll.savePosition();
                try {
                    const result = await fn.apply(this, args);
                    scroll.restorePosition(scrollPosition, delay);
                    return result;
                } catch (error) {
                    scroll.restorePosition(scrollPosition, delay);
                    throw error;
                }
            };
        }
    };

    // 전역 이벤트 리스너 관리 (cleanup 가능)
    const setupGlobalEventListeners = function() {
        // 이미 설정되었으면 스킵
        if (state.globalCleanupFunctions.length > 0) return;
        
        // 툴바 클릭 핸들러 (단순화 버전)
        const toolbarClickHandler = (e) => {
            const isToolbarButtonClick = !!e.target.closest('.lite-editor-button, .lite-editor-font-button');
            const isDropdownClick = !!e.target.closest('.lite-editor-dropdown-menu');
            const isModalClick = !!e.target.closest('.lite-editor-modal');
            const isInSeparatedToolbar = !!e.target.closest('.lite-editor-toolbar');
            const isInContentArea = !!e.target.closest('.lite-editor-content');
            
            const isEditorRelatedClick = isToolbarButtonClick || isDropdownClick || isModalClick || 
                                       isInSeparatedToolbar || isInContentArea;
            
            // 에디터와 관련 없는 외부 클릭일 때만 모든 레이어 닫기
            if (!isEditorRelatedClick) {
                layerManager.closeAll();
            }
        };
        
        // ESC 키 핸들러
        const escKeyHandler = (e) => {
            if (e.key === 'Escape') {
                layerManager.closeAll();
            }
        };
        
        // 이벤트 리스너 등록
        document.addEventListener('click', toolbarClickHandler);
        document.addEventListener('keydown', escKeyHandler);
        
        // cleanup 함수들 저장
        state.globalCleanupFunctions.push(
            () => document.removeEventListener('click', toolbarClickHandler),
            () => document.removeEventListener('keydown', escKeyHandler)
        );
    };

    // 전체 정리 함수
    const cleanup = function() {
        // 전역 이벤트 리스너 정리
        state.globalCleanupFunctions.forEach(cleanupFn => {
            try {
                cleanupFn();
            } catch (e) {
                console.warn('전역 이벤트 리스너 정리 중 오류:', e);
            }
        });
        state.globalCleanupFunctions = [];
        
        // 레이어 관리자 정리
        layerManager.cleanup();
    };

    // 초기화
    setupGlobalEventListeners();

    // 페이지 언로드 시 정리
    window.addEventListener('beforeunload', cleanup);

    // 공개 API
    const utils = {
        /**
         * 열린 레이어가 있는지 확인하고 있으면 닫기
         * @returns {boolean} 레이어가 있어서 닫았으면 true, 없으면 false
         */
        closeOpenLayersIfAny() {
            // ✅ 모든 종류의 레이어/드롭다운/모달 검사
            const layerSelectors = [
                '.lite-editor-dropdown-menu.show',           // 일반 드롭다운
                '.modal-overlay.show',                       // 모달
                '.grid-layer[style*="display: block"]',      // table 그리드 레이어
                '.grid-layer:not([style*="display: none"])', // 숨겨지지 않은 그리드 레이어
                '.lite-editor-popup-layer.show',             // 팝업 레이어
                '.table-size-selector[style*="display: block"]', // 기타 테이블 관련
                '[class*="dropdown"][style*="display: block"]',  // 기타 드롭다운
                '[class*="modal"][style*="display: block"]',     // 기타 모달
                '[class*="layer"][style*="display: block"]'      // 기타 레이어
            ];
            
            const hasOpenLayers = document.querySelector(layerSelectors.join(', '));
            
            if (hasOpenLayers) {
                // ✅ 디버깅 로그 추가
                if (window.errorHandler) {
                    errorHandler.colorLog('UTILS', '🔍 열린 레이어 감지', {
                        layerType: hasOpenLayers.className,
                        layerId: hasOpenLayers.id || 'No ID',
                        display: hasOpenLayers.style.display
                    }, '#ff9800');
                }
                
                activeModalManager.closeAll();
                return true;
            }
            return false;
        },

        /**
         * contentArea 포커스 상태 확인
         * @param {HTMLElement} contentArea - 체크할 contentArea
         * @returns {boolean} 포커스되어 있으면 true
         */
        isContentAreaFocused(contentArea) {
            if (!contentArea) return false;
            return document.activeElement === contentArea || 
                   contentArea.contains(document.activeElement);
        },

        /**
         * 플러그인 실행 전 기본 체크 (레이어 + 포커스)
         * @param {HTMLElement} contentArea - 체크할 contentArea  
         * @returns {boolean} 실행 가능하면 true, 중단해야 하면 false
         */
        canExecutePlugin(contentArea) {
            // 1. 레이어 체크 - 있으면 닫고 중단
            if (this.closeOpenLayersIfAny()) {
                return false;
            }
            
            // 2. 포커스 체크 - 없으면 중단
            if (!this.isContentAreaFocused(contentArea)) {
                return false;
            }
            
            // 3. contentArea 유효성 체크
            if (!contentArea || !contentArea.isConnected) {
                return false;
            }
            
            return true; // 모든 체크 통과
        }
    };

    return {
        dom,
        selection,
        events,
        url,
        styles,
        editor,
        layer,
        scroll,
        layerManager,
        registerPlugin,
        registerInlineFormatPlugin,
        createDropdown,
        createPopupLayer,
        setupOutsideClickHandler,
        setupToolbarButtonEvents,
        setupToolbarModalEvents,
        activeModalManager,
        modal,
        dataLoader,
        setupDropdownButton,
        utils,
        cleanup
    };
})();

// 전역 스코프에 노출
window.PluginUtil = PluginUtil;

// errorHandler는 이제 error-handler.js에서 전역으로 노출됨
// window.errorHandler = PluginUtil.errorHandler; 행 제거

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