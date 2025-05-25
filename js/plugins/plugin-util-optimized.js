/**
 * LiteEditor Plugin Utilities - Memory Optimized Version
 * 메모리 누수 문제를 해결한 최적화된 플러그인 공통 유틸리티 모듈
 */

const PluginUtil = (function() {
    // WeakMap과 WeakSet 사용으로 메모리 누수 방지
    const eventListenerCleanupMap = new WeakMap(); // DOM 요소별 cleanup 함수들
    const elementStateMap = new WeakMap(); // DOM 요소별 상태 정보
    
    // 활성화된 레이어/모달 관리를 위한 내부 상태
    const state = {
        registeredButtons: new WeakSet(), // Set 대신 WeakSet 사용
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
        
        // 모든 레이어 닫기
        closeAll(exceptLayer) {
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
            
            // 정리
            this.activeLayersList = exceptLayer ? 
                this.activeLayersList.filter(item => item.element === exceptLayer) : [];
        },
        
        // 메모리 정리 (수동 호출용)
        cleanup() {
            this.activeLayersList.forEach(item => {
                this._cleanupElementListeners(item.element);
            });
            this.activeLayersList = [];
        }
    };

    // 현재 활성화된 모달/레이어 관리 (layerManager 위임)
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
        
        // 버튼 등록 (WeakSet 사용)
        registerButton(button) {
            if (!button) return;
            if (state.registeredButtons.has(button)) return;
            state.registeredButtons.add(button);
        }
    };

    // DOM 조작 유틸리티 (기존과 동일하지만 cleanup 개선)
    const dom = {
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

        createSvgElement(tag, attributes = {}) {
            const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
            
            Object.entries(attributes).forEach(([key, value]) => {
                element.setAttribute(key, value);
            });
            
            return element;
        },

        findClosestBlock(element, container = null) {
            const blockTags = ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE', 'TABLE', 'UL', 'OL', 'LI'];
            
            if (blockTags.includes(element.nodeName)) {
                return element;
            }
            
            let current = element;
            while (current && current !== container) {
                if (blockTags.includes(current.nodeName)) {
                    return current;
                }
                current = current.parentNode;
            }
            
            return null;
        },
        
        isBlockElement(element) {
            if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
            
            const blockTags = ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'PRE'];
            return blockTags.includes(element.nodeName);
        }
    };

    // 메모리 효율적인 이벤트 리스너 관리
    const setupOutsideClickHandlerOptimized = function(element, callback, excludeElements = []) {
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
        
        // 약한 참조로 cleanup 함수 저장
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
        
        // 이벤트 핸들러 정의
        handler = (e) => {
            const shouldExclude = excludeElements.some(el => 
                el === e.target || (el && el.contains && el.contains(e.target))
            );
            
            if (!element.contains(e.target) && document.body.contains(element) && !shouldExclude) {
                callback(e);
            }
        };
        
        // 지연 등록
        timeoutId = setTimeout(() => {
            if (handler) {
                document.addEventListener('click', handler);
            }
            timeoutId = null;
        }, 100);
        
        return cleanup;
    };

    // 전역 이벤트 리스너 관리 (cleanup 가능)
    const setupGlobalEventListeners = function() {
        // 이미 설정되었으면 스킵
        if (state.globalCleanupFunctions.length > 0) return;
        
        // 툴바 클릭 핸들러
        const toolbarClickHandler = (e) => {
            const isToolbarButtonClick = !!e.target.closest('.lite-editor-button, .lite-editor-font-button');
            const isDropdownClick = !!e.target.closest('.lite-editor-dropdown-menu');
            const isModalClick = !!e.target.closest('.lite-editor-modal');
            
            if (!isToolbarButtonClick && !isDropdownClick && !isModalClick) {
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

    // 나머지 유틸리티 함수들 (기존과 동일)
    const selection = {
        saveSelection() {
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

        restoreSelection(savedRange) {
            if (!savedRange) return false;
            
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
        
        getSafeSelection() {
            try {
                return window.getSelection();
            } catch (e) {
                console.warn('Selection 객체를 가져오는 중 오류 발생:', e);
                return null;
            }
        }
    };

    // 스크롤 관리 유틸리티
    const scroll = {
        savePosition() {
            return {
                x: window.scrollX,
                y: window.scrollY
            };
        },

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

        preservePosition(fn, delay = 50) {
            return function(...args) {
                const scrollPosition = scroll.savePosition();
                const result = fn.apply(this, args);
                scroll.restorePosition(scrollPosition, delay);
                return result;
            };
        },

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

    // 초기화
    setupGlobalEventListeners();

    // 페이지 언로드 시 정리
    window.addEventListener('beforeunload', cleanup);

    // 공개 API
    return {
        dom,
        selection,
        scroll,
        layerManager,
        activeModalManager,
        cleanup, // 수동 정리 함수 노출
        setupOutsideClickHandler: setupOutsideClickHandlerOptimized,
        
        // 기타 유틸리티들...
        events: {
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
        }
    };
})();

// 전역 스코프에 노출
window.PluginUtil = PluginUtil; 