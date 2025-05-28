/**
 * LiteEditor Line Plugin (메모리 안전 버전)
 * 메모리 누수 방지 및 리소스 정리
 */

(function() {
    // PluginUtil 참조
    const util = window.PluginUtil;
    
    // 🔧 추가: 플러그인 인스턴스 관리
    const pluginInstances = new WeakMap();
    
    /**
     * 라인 버튼 렌더링 (메모리 안전 버전)
     */
    function renderLineButton(toolbar, contentArea) {
        const lineButton = util.dom.createElement('button', {
            className: 'lite-editor-button lite-editor-line-button',
            title: 'Insert Line'
        });

        const lineIcon = util.dom.createElement('i', {
            className: 'material-icons',
            textContent: 'horizontal_rule'
        });
        lineButton.appendChild(lineIcon);
        
        // 🔧 개선: 메모리 안전한 이벤트 핸들러
        const clickHandler = function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // 🔧 개선: contentArea 유효성 검사
            if (contentArea && contentArea.isConnected) {
                insertLine(contentArea);
            }
        };
        
        lineButton.addEventListener('click', clickHandler);
        
        // 🔧 추가: 정리 함수 등록
        pluginInstances.set(lineButton, {
            cleanup: () => {
                lineButton.removeEventListener('click', clickHandler);
                // DOM 참조 해제
                lineButton.innerHTML = '';
            }
        });
        
        return lineButton;
    }

    // 플러그인 등록
    util.registerPlugin('line', {
        title: 'Insert Line',
        icon: 'horizontal_rule', 
        customRender: renderLineButton,
        
        // 🔧 추가: 플러그인 정리 함수
        cleanup: function(editor) {
            const buttons = editor.toolbar?.querySelectorAll('.lite-editor-line-button');
            if (buttons) {
                buttons.forEach(button => {
                    const instance = pluginInstances.get(button);
                    if (instance && instance.cleanup) {
                        instance.cleanup();
                        pluginInstances.delete(button);
                    }
                });
            }
        }
    });

    /**
     * HR 라인 삽입 함수 (메모리 안전 버전)
     */
    function insertLine(contentArea) {
        // 🔧 추가: contentArea 유효성 검사
        if (!contentArea || !contentArea.isConnected) {
            console.warn('LINE: contentArea가 유효하지 않음');
            return;
        }
        
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
            appendHrToEnd(contentArea);
            return;
        }
        
        const range = selection.getRangeAt(0);
        const hr = createHrElement();
        
        try {
            // 선택된 텍스트 삭제 (있다면)
            if (!range.collapsed) {
                range.deleteContents();
            }
            
            // HR 직접 삽입
            range.insertNode(hr);
            
            // 🔧 개선: 새로운 Range 생성 (기존 Range 재사용 방지)
            const newRange = document.createRange();
            newRange.setStartAfter(hr);
            newRange.collapse(true);
            
            selection.removeAllRanges();
            selection.addRange(newRange);
            
            if (window.errorHandler) {
                errorHandler.colorLog('LINE', '✅ HR 삽입 성공', {
                    위치: 'Range API 직접 삽입'
                }, '#4caf50');
            }
            
        } catch (error) {
            // 🔧 대안: 간단한 DOM 삽입
            insertHrFallback(range, hr, contentArea);
        }
    }

    /**
     * HR 요소 생성 (메모리 효율적)
     */
    function createHrElement() {
        const hr = document.createElement('hr');
        hr.className = 'lite-editor-hr';
        
        // 🔧 개선: 스타일 객체 재사용
        if (!createHrElement.styleCache) {
            createHrElement.styleCache = `
                display: block !important;
                height: 2px !important;
                border: 0 !important;
                border-top: 2px solid #c9c9c9 !important;
                margin: 10px 0 !important;
                padding: 0 !important;
                width: 100% !important;
            `;
        }
        
        hr.style.cssText = createHrElement.styleCache;
        return hr;
    }

    /**
     * 대안 삽입 방법 (메모리 안전)
     */
    function insertHrFallback(range, hr, contentArea) {
        // 🔧 추가: 매개변수 유효성 검사
        if (!range || !hr || !contentArea) {
            console.warn('LINE: insertHrFallback 매개변수 오류');
            return;
        }
        
        if (range.startContainer === contentArea) {
            // DIV 레벨 클릭
            const targetElement = contentArea.children[range.startOffset];
            if (targetElement) {
                contentArea.insertBefore(hr, targetElement);
            } else {
                contentArea.appendChild(hr);
            }
        } else {
            // 요소 내부 클릭 - 가장 가까운 위치에 삽입
            let insertPoint = range.startContainer;
            if (insertPoint.nodeType === Node.TEXT_NODE) {
                insertPoint = insertPoint.parentNode;
            }
            
            // 🔧 개선: 무한 루프 방지
            let depth = 0;
            const maxDepth = 10;
            
            while (insertPoint.parentNode !== contentArea && 
                   insertPoint.parentNode && 
                   depth < maxDepth) {
                insertPoint = insertPoint.parentNode;
                depth++;
            }
            
            if (depth >= maxDepth) {
                console.warn('LINE: DOM 트리 깊이 초과, 맨 끝에 추가');
                contentArea.appendChild(hr);
                return;
            }
            
            if (insertPoint.nextSibling) {
                contentArea.insertBefore(hr, insertPoint.nextSibling);
            } else {
                contentArea.appendChild(hr);
            }
        }
        
        if (window.errorHandler) {
            errorHandler.colorLog('LINE', '✅ HR 삽입 성공 (대안)', {
                위치: 'DOM 직접 삽입'
            }, '#ff9800');
        }
    }

    /**
     * 맨 끝에 HR 추가 (메모리 안전)
     */
    function appendHrToEnd(contentArea) {
        // 🔧 추가: contentArea 유효성 검사
        if (!contentArea || !contentArea.isConnected) {
            console.warn('LINE: appendHrToEnd contentArea 오류');
            return;
        }
        
        const hr = createHrElement();
        contentArea.appendChild(hr);
        
        if (window.errorHandler) {
            errorHandler.colorLog('LINE', '✅ HR 삽입 성공 (끝)', {
                위치: '맨 끝에 추가'
            }, '#2196f3');
        }
    }

    // 🔧 추가: 페이지 언로드 시 정리
    window.addEventListener('beforeunload', function() {
        // 모든 플러그인 인스턴스 정리
        pluginInstances.clear();
    });

})();
