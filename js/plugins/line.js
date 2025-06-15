/**
 * LiteEditor Line Plugin (메모리 안전 버전)
 * 메모리 누수 방지 및 리소스 정리
 */

(function() {
    // 🔧 추가: 플러그인 인스턴스 관리
    const pluginInstances = new WeakMap();

    // ✅ 공통 로직을 별도 함수로 추출
    function executeLineAction(contentArea, triggerSource = 'unknown') {
        if (!contentArea) return;
        if (!PluginUtil.utils.canExecutePlugin(contentArea)) return;
        
        contentArea.focus();
        
        // 히스토리 기록
        if (window.LiteEditorHistory) {
            window.LiteEditorHistory.forceRecord(contentArea, `Before Insert Line (${triggerSource})`);
        }
        
        insertLine(contentArea);
        
        // 히스토리 완료 기록
        setTimeout(() => {
            if (window.LiteEditorHistory) {
                window.LiteEditorHistory.recordState(contentArea, `After Insert Line (${triggerSource})`);
            }
        }, 100);
    }

    // ✅ 플러그인 등록 (간소화)
    PluginUtil.registerPlugin('line', {
        title: 'Insert Line',
        icon: 'horizontal_rule',
        action: function(contentArea, buttonElement, event) {
            if (event) event.preventDefault();
            executeLineAction(contentArea, 'Button Click');
        }
    });

    /**
     * HR 라인 삽입 함수 (공통 함수 사용)
     */
    function insertLine(contentArea) {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
            appendHrToEnd(contentArea);
            return;
        }
        
        const range = selection.getRangeAt(0);
        const selectionContainer = range.commonAncestorContainer;
        const isSelectionInContentArea = contentArea.contains(selectionContainer) || 
                                       selectionContainer === contentArea;
        
        if (!isSelectionInContentArea) {
            appendHrToEnd(contentArea);
            return;
        }
        
        const hr = createHrElement();
        
        try {
            if (!range.collapsed) {
                range.deleteContents();
            }
            
            range.insertNode(hr);
            
            const newRange = document.createRange();
            newRange.setStartAfter(hr);
            newRange.collapse(true);
            
            selection.removeAllRanges();
            selection.addRange(newRange);
            
        } catch (error) {
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

    // ✅ 단축키 등록 (Alt+Shift+H)
    document.addEventListener('keydown', function(e) {
        const contentArea = e.target.closest('[contenteditable="true"]');
        if (!contentArea) return;
        
        const editorContainer = contentArea.closest('.lite-editor, .lite-editor-content');
        if (!editorContainer) return;

        const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);

        // ✅ Alt+Shift+H (Mac/Windows 공통)
        if (e.altKey && e.shiftKey && !e.metaKey && !e.ctrlKey && e.key.toLowerCase() === 'h') {
            try {
                e.preventDefault();
                e.stopPropagation();
                executeLineAction(contentArea, 'Alt+Shift+H');
            } catch (error) {
                if (window.errorHandler) {
                    errorHandler.logWarning('LinePlugin', 'Alt+Shift+H 처리 중 확장 프로그램 충돌', error);
                }
            }
        }
    }, true);

    // 🔧 추가: 페이지 언로드 시 정리
    window.addEventListener('beforeunload', function() {
        // 모든 플러그인 인스턴스 정리
        pluginInstances.clear();
    });

})();
