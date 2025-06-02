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
     * HR 요소 생성 (스타일 속성 없이)
     */
    function createHrElement() {
        const hr = document.createElement('hr');
        hr.className = 'lite-editor-hr';
        // style 속성 설정 제거 - CSS 클래스만 사용
        return hr;
    }

    /**
     * code 내부인지 확인하는 함수 추가
     */
    function isInsideCodeElement(range, contentArea) {
        let currentElement = range.startContainer;
        
        if (currentElement.nodeType === Node.TEXT_NODE) {
            currentElement = currentElement.parentElement;
        }
        
        while (currentElement && currentElement !== contentArea) {
            if (currentElement.tagName === 'CODE') {
                return currentElement;
            }
            currentElement = currentElement.parentElement;
        }
        
        return null;
    }

    /**
     * blockquote 내부인지 확인하는 함수 추가
     */
    function isInsideBlockquote(range, contentArea) {
        let currentElement = range.startContainer;
        
        if (currentElement.nodeType === Node.TEXT_NODE) {
            currentElement = currentElement.parentElement;
        }
        
        while (currentElement && currentElement !== contentArea) {
            if (currentElement.tagName === 'BLOCKQUOTE') {
                return currentElement;
            }
            currentElement = currentElement.parentElement;
        }
        
        return null;
    }

    /**
     * HR 라인 삽입 함수 (개선된 버전)
     */
    function insertLine(contentArea) {
        if (!PluginUtil.utils.canExecutePlugin(contentArea)) {
            return;
        }
        
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            
            // code 내부인지 체크 추가
            const insideCode = isInsideCodeElement(range, contentArea);
            if (insideCode) {
                if (window.errorHandler) {
                    errorHandler.showToast('Code 블록 내부에서는 라인을 삽입할 수 없습니다.', 'warning');
                }
                return; // hr 삽입 중단
            }
            
            // blockquote 내부인지 체크
            const insideBlockquote = isInsideBlockquote(range, contentArea);
            if (insideBlockquote) {
                if (window.errorHandler) {
                    errorHandler.showToast('Blockquote 내부에서는 라인을 삽입할 수 없습니다.', 'warning');
                }
                return; // hr 삽입 중단
            }
        }
        
        contentArea.focus();
        
        // 기존 HR 삽입 로직...
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
            // 현재 커서가 있는 블록 요소 찾기
            let currentBlock = range.startContainer;
            if (currentBlock.nodeType === Node.TEXT_NODE) {
                currentBlock = currentBlock.parentNode;
            }
            
            // contentArea의 직접 자식이 될 때까지 올라가기
            while (currentBlock && currentBlock.parentNode !== contentArea) {
                currentBlock = currentBlock.parentNode;
            }
            
            // 선택 영역에 내용이 있으면 삭제
            if (!range.collapsed) {
                range.deleteContents();
            }
            
            // HR과 새 P를 삽입할 위치 결정
            if (currentBlock && currentBlock.parentNode === contentArea) {
                // 현재 블록 다음에 HR 삽입
                if (currentBlock.nextSibling) {
                    contentArea.insertBefore(hr, currentBlock.nextSibling);
                } else {
                    contentArea.appendChild(hr);
                }
                
                // 공백이 들어간 새 P 생성
                const newP = document.createElement('p');
                const spaceNode = document.createTextNode('\u00A0'); // non-breaking space
                newP.appendChild(spaceNode);
                
                // HR 다음에 새 P 삽입
                if (hr.nextSibling) {
                    contentArea.insertBefore(newP, hr.nextSibling);
                } else {
                    contentArea.appendChild(newP);
                }
                
                // 커서를 새 P의 공백 끝으로 이동
                // setTimeout으로 DOM 업데이트 후 실행
                setTimeout(() => {
                    const newRange = document.createRange();
                    newRange.setStart(spaceNode, 1); // 공백 뒤
                    newRange.setEnd(spaceNode, 1);
                    newRange.collapse(true);
                    
                    const sel = window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(newRange);
                    
                    // 포커스 재설정
                    contentArea.focus();
                    
                    if (window.errorHandler) {
                        errorHandler.colorLog('LINE', '✅ HR 삽입 및 커서 이동 완료', {
                            hrPosition: Array.from(contentArea.children).indexOf(hr),
                            newPPosition: Array.from(contentArea.children).indexOf(newP),
                            cursorInNewP: true
                        }, '#4caf50');
                    }
                }, 10);
                
            } else {
                // Fallback: 현재 위치를 찾을 수 없으면 끝에 추가
                appendHrToEnd(contentArea);
            }
            
        } catch (error) {
            console.error('LINE: HR 삽입 중 오류', error);
            appendHrToEnd(contentArea);
        }
    }

    /**
     * 맨 끝에 HR 추가 (개선된 버전)
     */
    function appendHrToEnd(contentArea) {
        if (!contentArea || !contentArea.isConnected) {
            console.warn('LINE: appendHrToEnd contentArea 오류');
            return;
        }
        
        const hr = createHrElement();
        contentArea.appendChild(hr);
        
        // 공백이 들어간 새 P 추가
        const newP = document.createElement('p');
        const spaceNode = document.createTextNode('\u00A0');
        newP.appendChild(spaceNode);
        contentArea.appendChild(newP);
        
        // 커서를 새 P로 이동
        setTimeout(() => {
            const range = document.createRange();
            range.setStart(spaceNode, 1);
            range.setEnd(spaceNode, 1);
            range.collapse(true);
            
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
            
            contentArea.focus();
        }, 10);
        
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
