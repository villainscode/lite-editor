/**
 * LiteEditor History Plugin (버그 수정 완성 버전)
 * 에디터 상태를 기록하고 undo, redo 기능을 제공하는 플러그인
 */

(function() {
    // 전역 히스토리 관리자 생성
    const historyManager = new class HistoryManager {
        constructor() {
            this.instances = new Map(); // 에디터 인스턴스별 히스토리 관리
        }
        
        // 에디터 인스턴스에 대한 히스토리 관리자 초기화 또는 가져오기
        getInstanceHistory(editorId) {
            if (!this.instances.has(editorId)) {
                this.instances.set(editorId, {
                    undoStack: [],
                    redoStack: [],
                    currentState: '',
                    isRecording: true,
                    isInternalChange: false,
                    maxStackSize: 30, // 🔧 메모리 효율성: 30으로 감소
                    lastRecordTime: 0,
                    minInterval: 300, // 🔧 성능 최적화: 300ms로 조정
                    pendingRecord: false // 🔧 중복 기록 방지 플래그
                });
            }
            return this.instances.get(editorId);
        }
        
        // 🔧 수정: 안전한 상태 기록
        recordStateBeforeChange(editorId, contentArea) {
            const history = this.getInstanceHistory(editorId);
            
            // 기록 중지 상태이거나 내부 변경 중이면 무시
            if (!history.isRecording || history.isInternalChange || history.pendingRecord) return;
            
            const currentHtml = contentArea.innerHTML;
            const now = Date.now();
            
            // 🔧 수정: 이전 상태와 비교 (올바른 로직)
            if (history.currentState === currentHtml) return;
            
            // 성능 최적화: 최소 간격 체크
            if (now - history.lastRecordTime < history.minInterval) return;
            
            // 🔧 중복 기록 방지
            history.pendingRecord = true;
            
            // 현재 상태를 undo 스택에 저장
            if (history.currentState !== '') {
                history.undoStack.push(history.currentState);
                
                // 🔧 메모리 관리: 스택 크기 제한
                if (history.undoStack.length > history.maxStackSize) {
                    history.undoStack.shift();
                }
            }
            
            // redo 스택 초기화
            history.redoStack = [];
            
            // 상태 업데이트
            history.currentState = currentHtml;
            history.lastRecordTime = now;
            
            // 🔧 플래그 해제
            setTimeout(() => {
                history.pendingRecord = false;
            }, 50);
        }
        
        // 초기 상태 설정
        setInitialState(editorId, contentArea) {
            const history = this.getInstanceHistory(editorId);
            history.currentState = contentArea.innerHTML;
            history.undoStack = [];
            history.redoStack = [];
            history.lastRecordTime = Date.now();
        }
        
        // Undo 실행
        undo(editorId, contentArea) {
            const history = this.getInstanceHistory(editorId);
            
            if (history.undoStack.length === 0) return false;
            
            // 현재 상태를 redo 스택에 저장
            history.redoStack.push(history.currentState);
            
            // 이전 상태로 복원
            const previousState = history.undoStack.pop();
            
            // 상태 변경 적용
            this.applyStateChange(history, contentArea, previousState);
            
            return true;
        }
        
        // Redo 실행
        redo(editorId, contentArea) {
            const history = this.getInstanceHistory(editorId);
            
            if (history.redoStack.length === 0) return false;
            
            // 현재 상태를 undo 스택에 저장
            history.undoStack.push(history.currentState);
            
            // 다음 상태로 복원
            const nextState = history.redoStack.pop();
            
            // 상태 변경 적용
            this.applyStateChange(history, contentArea, nextState);
            
            return true;
        }
        
        // 🔧 수정: 안전한 상태 변경 적용
        applyStateChange(history, contentArea, newState) {
            // 내부 변경 플래그 설정
            history.isInternalChange = true;
            history.isRecording = false;
            
            // 🔧 수정: 오프셋 기반 선택 영역 저장 (DOM 참조 없음)
            const selectionOffsets = this.saveSelectionOffsets(contentArea);
            
            // 상태 적용
            contentArea.innerHTML = newState;
            history.currentState = newState;
            
            // 🔧 수정: 오프셋 기반 선택 영역 복원
            this.restoreSelectionOffsets(contentArea, selectionOffsets);
            
            // 비동기로 플래그 해제
            requestAnimationFrame(() => {
                setTimeout(() => {
                    history.isInternalChange = false;
                    history.isRecording = true;
                }, 0);
            });
        }
        
        // 🔧 수정: 메모리 안전한 선택 영역 저장 (오프셋 기반)
        saveSelectionOffsets(contentArea) {
            const selection = window.getSelection();
            if (selection.rangeCount === 0) return null;
            
            try {
                const range = selection.getRangeAt(0);
                
                // 🔧 DOM 참조 대신 텍스트 오프셋 사용
                return {
                    startOffset: this.getTextOffset(contentArea, range.startContainer, range.startOffset),
                    endOffset: this.getTextOffset(contentArea, range.endContainer, range.endOffset),
                    isCollapsed: range.collapsed
                };
            } catch (e) {
                return null;
            }
        }
        
        // 🔧 수정: 오프셋 기반 선택 영역 복원
        restoreSelectionOffsets(contentArea, offsetData) {
            if (!offsetData) {
                this.moveCursorToEnd(contentArea);
                return;
            }
            
            try {
                const selection = window.getSelection();
                const range = document.createRange();
                
                // 오프셋을 DOM 위치로 변환
                const startPos = this.getPositionFromOffset(contentArea, offsetData.startOffset);
                const endPos = this.getPositionFromOffset(contentArea, offsetData.endOffset);
                
                if (startPos && endPos) {
                    range.setStart(startPos.node, startPos.offset);
                    range.setEnd(endPos.node, endPos.offset);
                    
                    selection.removeAllRanges();
                    selection.addRange(range);
                } else {
                    this.moveCursorToEnd(contentArea);
                }
            } catch (e) {
                this.moveCursorToEnd(contentArea);
            }
        }
        
        // 🔧 새로운 함수: 텍스트 오프셋 계산
        getTextOffset(container, node, offset) {
            let textOffset = 0;
            const walker = document.createTreeWalker(
                container,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );
            
            let currentNode;
            while (currentNode = walker.nextNode()) {
                if (currentNode === node) {
                    return textOffset + offset;
                }
                textOffset += currentNode.textContent.length;
            }
            
            return textOffset;
        }
        
        // 🔧 새로운 함수: 오프셋에서 DOM 위치 찾기
        getPositionFromOffset(container, targetOffset) {
            let currentOffset = 0;
            const walker = document.createTreeWalker(
                container,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );
            
            let currentNode;
            while (currentNode = walker.nextNode()) {
                const nodeLength = currentNode.textContent.length;
                
                if (currentOffset + nodeLength >= targetOffset) {
                    return {
                        node: currentNode,
                        offset: targetOffset - currentOffset
                    };
                }
                
                currentOffset += nodeLength;
            }
            
            // 마지막 노드의 끝으로 설정
            if (currentNode) {
                return {
                    node: currentNode,
                    offset: currentNode.textContent.length
                };
            }
            
            return null;
        }
        
        // 커서를 에디터 끝으로 이동
        moveCursorToEnd(contentArea) {
            try {
                const selection = window.getSelection();
                const range = document.createRange();
                
                range.selectNodeContents(contentArea);
                range.collapse(false);
                
                selection.removeAllRanges();
                selection.addRange(range);
                
                contentArea.focus();
            } catch (e) {
                contentArea.focus();
            }
        }
        
        // 디버깅용 상태 확인
        getDebugInfo(editorId) {
            const history = this.getInstanceHistory(editorId);
            return {
                undoCount: history.undoStack.length,
                redoCount: history.redoStack.length,
                isRecording: history.isRecording,
                isInternalChange: history.isInternalChange,
                pendingRecord: history.pendingRecord,
                lastRecordTime: new Date(history.lastRecordTime).toLocaleTimeString(),
                // 🔧 메모리 사용량 정보 추가
                memoryUsage: {
                    undoStackSize: JSON.stringify(history.undoStack).length,
                    redoStackSize: JSON.stringify(history.redoStack).length
                }
            };
        }
        
        // 🔧 새로운 함수: 메모리 정리
        cleanup(editorId) {
            if (this.instances.has(editorId)) {
                const history = this.instances.get(editorId);
                // 스택 정리
                history.undoStack = [];
                history.redoStack = [];
                // 인스턴스 제거
                this.instances.delete(editorId);
            }
        }
    }();
    
    // 인스턴스별 정리 함수 저장
    const cleanupFunctions = new Map();
    
    // 🔧 수정: 중복 이벤트 리스너 방지
    function setupKeyboardShortcuts(editorId, contentArea) {
        const keydownHandler = function(e) {
            // Cmd+Z (Mac) 또는 Ctrl+Z (Windows) - Undo
            if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
                historyManager.undo(editorId, contentArea);
                return;
            }
            
            // Cmd+Shift+Z (Mac) 또는 Ctrl+Y (Windows) - Redo
            if (((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) || 
                ((e.ctrlKey) && e.key === 'y')) {
                e.preventDefault();
                e.stopPropagation();
                historyManager.redo(editorId, contentArea);
                return;
            }
        };
        
        contentArea.addEventListener('keydown', keydownHandler);
        return keydownHandler;
    }
    
    // 🔧 수정: 성능 최적화된 히스토리 추적
    function setupHistoryTracking(editorId, contentArea) {
        // 초기 상태 설정
        historyManager.setInitialState(editorId, contentArea);
        
        // 🔧 성능 최적화: 더 짧은 디바운스
        function debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }
        
        // 🔧 변경 전 상태 기록 (100ms 디바운스로 성능 향상)
        const recordBeforeChange = debounce(() => {
            historyManager.recordStateBeforeChange(editorId, contentArea);
        }, 100);
        
        // 🔧 수정: 히스토리 전용 키다운 핸들러 (단축키와 분리)
        const historyKeydownHandler = function(e) {
            // 시스템 단축키나 방향키는 무시
            if (e.metaKey || e.ctrlKey || e.altKey || 
                ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Escape'].includes(e.key)) {
                return;
            }
            
            // 실제 내용 변경이 예상되는 키만 처리
            if (e.key.length === 1 || ['Backspace', 'Delete', 'Enter'].includes(e.key)) {
                recordBeforeChange();
            }
        };
        
        // 붙여넣기 전 상태 기록
        const pasteHandler = function(e) {
            historyManager.recordStateBeforeChange(editorId, contentArea);
        };
        
        // 포커스 잃을 때 상태 기록
        const blurHandler = function() {
            historyManager.recordStateBeforeChange(editorId, contentArea);
        };
        
        // 드래그 앤 드롭 처리
        const dropHandler = function(e) {
            historyManager.recordStateBeforeChange(editorId, contentArea);
        };
        
        // 🔧 수정: 히스토리 전용 이벤트 리스너만 등록
        contentArea.addEventListener('keydown', historyKeydownHandler);
        contentArea.addEventListener('paste', pasteHandler);
        contentArea.addEventListener('blur', blurHandler);
        contentArea.addEventListener('drop', dropHandler);
        
        return {
            historyKeydownHandler,
            pasteHandler,
            blurHandler,
            dropHandler
        };
    }
    
    // History Initialize Plugin
    LiteEditor.registerPlugin('historyInit', {
        title: 'History Initialize',
        icon: 'history',
        hidden: true,
        customRender: function(toolbar, contentArea) {
            const editorContainer = contentArea.closest('.lite-editor');
            if (!editorContainer) return null;
            
            const editorId = editorContainer.id || 'editor-' + Math.random().toString(36).substr(2, 9);
            editorContainer.id = editorId;
            
            // 키보드 단축키 설정
            const keydownShortcutHandler = setupKeyboardShortcuts(editorId, contentArea);
            
            // 히스토리 추적 설정
            const historyHandlers = setupHistoryTracking(editorId, contentArea);
            
            // 🔧 수정: 정리 함수 등록 (중복 제거)
            cleanupFunctions.set(editorId, function() {
                contentArea.removeEventListener('keydown', keydownShortcutHandler);
                contentArea.removeEventListener('keydown', historyHandlers.historyKeydownHandler);
                contentArea.removeEventListener('paste', historyHandlers.pasteHandler);
                contentArea.removeEventListener('blur', historyHandlers.blurHandler);
                contentArea.removeEventListener('drop', historyHandlers.dropHandler);
                historyManager.cleanup(editorId);
            });
            
            return null;
        }
    });
    
    // Undo Plugin
    LiteEditor.registerPlugin('undo', {
        title: 'Undo (⌘Z)',
        icon: 'undo',
        action: function(contentArea) {
            const editorContainer = contentArea.closest('.lite-editor');
            if (!editorContainer || !editorContainer.id) return;
            
            const success = historyManager.undo(editorContainer.id, contentArea);
            
            if (window.DEBUG_MODE && success) {
                console.log('Undo 실행:', historyManager.getDebugInfo(editorContainer.id));
            }
        }
    });
    
    // Redo Plugin
    LiteEditor.registerPlugin('redo', {
        title: 'Redo (⌘⇧Z)',
        icon: 'redo',
        action: function(contentArea) {
            const editorContainer = contentArea.closest('.lite-editor');
            if (!editorContainer || !editorContainer.id) return;
            
            const success = historyManager.redo(editorContainer.id, contentArea);
            
            if (window.DEBUG_MODE && success) {
                console.log('Redo 실행:', historyManager.getDebugInfo(editorContainer.id));
            }
        }
    });
    
    // 🔧 개선된 공개 API
    window.LiteEditorHistory = {
        // 정리 함수
        cleanup: function(editorId) {
            const cleanup = cleanupFunctions.get(editorId);
            if (cleanup) {
                cleanup();
                cleanupFunctions.delete(editorId);
            }
        },
        
        // 수동 상태 기록
        recordState: function(editorId) {
            const contentArea = document.querySelector(`#${editorId} [contenteditable]`);
            if (contentArea) {
                historyManager.recordStateBeforeChange(editorId, contentArea);
            }
        },
        
        // 디버깅 정보 조회
        getDebugInfo: function(editorId) {
            return historyManager.getDebugInfo(editorId);
        },
        
        // 히스토리 초기화
        clearHistory: function(editorId) {
            const history = historyManager.getInstanceHistory(editorId);
            history.undoStack = [];
            history.redoStack = [];
        },
        
        // 🔧 새로운 함수: 전체 메모리 정리
        cleanupAll: function() {
            cleanupFunctions.forEach((cleanup, editorId) => {
                cleanup();
            });
            cleanupFunctions.clear();
            historyManager.instances.clear();
        }
    };
    
    // 🔧 페이지 언로드 시 자동 정리
    window.addEventListener('beforeunload', () => {
        window.LiteEditorHistory.cleanupAll();
    });
})();
