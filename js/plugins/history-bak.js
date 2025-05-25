/**
 * LiteEditor History Plugin (수정 버전)
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
            currentHtml: '',
            isRecording: true,
            maxStackSize: 100,
            isInternalChange: false // 내부 변경 플래그
          });
        }
        return this.instances.get(editorId);
      }
      
      // 상태 기록 (변경 전에 호출해야 함)
      recordState(editorId, contentArea) {
        const history = this.getInstanceHistory(editorId);
        
        if (!history.isRecording || history.isInternalChange) return;
        
        const currentHtml = contentArea.innerHTML;
        
        // 변경사항이 없으면 기록하지 않음
        if (history.currentHtml === currentHtml) return;
        
        // 현재 상태를 undo 스택에 저장
        if (history.currentHtml !== '') { // 빈 문자열이 아닐 때만 저장
          history.undoStack.push(history.currentHtml);
          
          // 스택 크기 제한
          if (history.undoStack.length > history.maxStackSize) {
            history.undoStack.shift();
          }
        }
        
        // redo 스택 초기화 (새 작업 발생 시)
        history.redoStack = [];
        
        // 현재 상태 업데이트
        history.currentHtml = currentHtml;
      }
      
      // 초기 상태 설정
      setInitialState(editorId, contentArea) {
        const history = this.getInstanceHistory(editorId);
        history.currentHtml = contentArea.innerHTML;
        history.undoStack = [];
        history.redoStack = [];
      }
      
      // Undo 실행
      undo(editorId, contentArea) {
        const history = this.getInstanceHistory(editorId);
        
        if (history.undoStack.length === 0) return false;
        
        // 현재 상태를 redo 스택에 저장
        history.redoStack.push(history.currentHtml);
        
        // 이전 상태로 복원
        const previousState = history.undoStack.pop();
        
        // 내부 변경 플래그 설정
        history.isInternalChange = true;
        history.isRecording = false;
        
        contentArea.innerHTML = previousState;
        history.currentHtml = previousState;
        
        // 커서 위치 복원 (선택적)
        this.restoreCursorPosition(contentArea);
        
        // 플래그 해제
        setTimeout(() => {
          history.isInternalChange = false;
          history.isRecording = true;
        }, 0);
        
        return true;
      }
      
      // Redo 실행
      redo(editorId, contentArea) {
        const history = this.getInstanceHistory(editorId);
        
        if (history.redoStack.length === 0) return false;
        
        // 현재 상태를 undo 스택에 저장
        history.undoStack.push(history.currentHtml);
        
        // 다음 상태로 복원
        const nextState = history.redoStack.pop();
        
        // 내부 변경 플래그 설정
        history.isInternalChange = true;
        history.isRecording = false;
        
        contentArea.innerHTML = nextState;
        history.currentHtml = nextState;
        
        // 커서 위치 복원 (선택적)
        this.restoreCursorPosition(contentArea);
        
        // 플래그 해제
        setTimeout(() => {
          history.isInternalChange = false;
          history.isRecording = true;
        }, 0);
        
        return true;
      }
      
      // 커서 위치 복원 (기본적인 구현)
      restoreCursorPosition(contentArea) {
        // contentEditable 요소의 끝으로 커서 이동
        const range = document.createRange();
        const selection = window.getSelection();
        
        if (contentArea.lastChild) {
          range.selectNodeContents(contentArea);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        }
        
        contentArea.focus();
      }
    }();
    
    // 인스턴스별 정리 함수 저장
    const cleanupFunctions = new Map();
    
    // 키보드 단축키 핸들러 설정
    function setupKeyboardShortcuts(editorId, contentArea) {
      const keydownHandler = function(e) {
        // ⌘+Z (Mac) 또는 Ctrl+Z (Windows)
        if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          historyManager.undo(editorId, contentArea);
          return;
        }
        
        // ⌘+Shift+Z (Mac) 또는 Ctrl+Y (Windows)
        if (((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) || 
            ((e.ctrlKey) && e.key === 'y')) {
          e.preventDefault();
          historyManager.redo(editorId, contentArea);
          return;
        }
      };
      
      contentArea.addEventListener('keydown', keydownHandler);
      
      return keydownHandler; // 정리를 위해 반환
    }
    
    // 내용 변경 감지 및 기록 설정
    function setupHistoryTracking(editorId, contentArea) {
      // 초기 상태 기록
      historyManager.setInitialState(editorId, contentArea);
      
      // Debounce 함수
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
      
      // 변경 전 상태를 기록하는 함수 (debounced)
      const recordCurrentState = debounce(() => {
        historyManager.recordState(editorId, contentArea);
      }, 300); // 300ms 디바운스
      
      // 키 입력 시 변경 전 상태 기록
      const keydownHandler = function(e) {
        // 특수 키들은 무시
        if (e.metaKey || e.ctrlKey || e.altKey || 
            ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
          return;
        }
        
        recordCurrentState();
      };
      
      // 붙여넣기 전 상태 기록
      const pasteHandler = function(e) {
        historyManager.recordState(editorId, contentArea);
      };
      
      // 포커스 잃을 때 상태 기록
      const blurHandler = function() {
        historyManager.recordState(editorId, contentArea);
      };
      
      // 이벤트 리스너 등록
      contentArea.addEventListener('keydown', keydownHandler);
      contentArea.addEventListener('paste', pasteHandler);
      contentArea.addEventListener('blur', blurHandler);
      
      // 정리 함수들을 반환
      return {
        keydownHandler,
        pasteHandler,
        blurHandler
      };
    }
    
    // History Initialize Plugin
    LiteEditor.registerPlugin('historyInit', {
      title: 'History Initialize',
      icon: 'history',
      hidden: true, // 툴바에 표시하지 않음
      customRender: function(toolbar, contentArea) {
        const editorContainer = contentArea.closest('.lite-editor');
        if (!editorContainer) return null;
        
        const editorId = editorContainer.id || 'editor-' + Math.random().toString(36).substr(2, 9);
        editorContainer.id = editorId;
        
        // 키보드 단축키 설정
        const keydownShortcutHandler = setupKeyboardShortcuts(editorId, contentArea);
        
        // 변경 감지 설정
        const historyHandlers = setupHistoryTracking(editorId, contentArea);
        
        // 정리 함수 등록
        cleanupFunctions.set(editorId, function() {
          contentArea.removeEventListener('keydown', keydownShortcutHandler);
          contentArea.removeEventListener('keydown', historyHandlers.keydownHandler);
          contentArea.removeEventListener('paste', historyHandlers.pasteHandler);
          contentArea.removeEventListener('blur', historyHandlers.blurHandler);
          historyManager.instances.delete(editorId);
        });
        
        return null; // 버튼을 렌더링하지 않음
      }
    });
    
    // Undo Plugin
    LiteEditor.registerPlugin('undo', {
      title: 'Undo (⌘Z)',
      icon: 'undo',
      action: function(contentArea) {
        const editorContainer = contentArea.closest('.lite-editor');
        if (!editorContainer || !editorContainer.id) return;
        
        historyManager.undo(editorContainer.id, contentArea);
      }
    });
    
    // Redo Plugin
    LiteEditor.registerPlugin('redo', {
      title: 'Redo (⌘⇧Z)',
      icon: 'redo',
      action: function(contentArea) {
        const editorContainer = contentArea.closest('.lite-editor');
        if (!editorContainer || !editorContainer.id) return;
        
        historyManager.redo(editorContainer.id, contentArea);
      }
    });
    
    // 공개 정리 함수
    window.LiteEditorHistory = {
      cleanup: function(editorId) {
        const cleanup = cleanupFunctions.get(editorId);
        if (cleanup) {
          cleanup();
          cleanupFunctions.delete(editorId);
        }
      },
      
      // 디버깅용 함수들
      getHistory: function(editorId) {
        return historyManager.getInstanceHistory(editorId);
      },
      
      manualRecord: function(editorId) {
        const contentArea = document.querySelector(`#${editorId} [contenteditable]`);
        if (contentArea) {
          historyManager.recordState(editorId, contentArea);
        }
      }
    };
  })();