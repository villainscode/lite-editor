/**
 * LiteEditor History Plugin
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
          lastHtml: null,
          isRecording: true,
          maxStackSize: 100 // 스택 최대 크기 제한
        });
      }
      return this.instances.get(editorId);
    }
    
    // 상태 기록
    recordState(editorId, contentArea) {
      const history = this.getInstanceHistory(editorId);
      
      if (!history.isRecording) return; // 기록 중지 상태면 무시
      
      const currentHtml = contentArea.innerHTML;
      
      // 변경사항이 없으면 기록하지 않음
      if (history.lastHtml === currentHtml) return;
      
      // 변경사항 기록
      history.undoStack.push(history.lastHtml);
      
      // 스택 크기 제한
      if (history.undoStack.length > history.maxStackSize) {
        history.undoStack.shift();
      }
      
      // redo 스택 초기화 (새 작업 발생 시)
      history.redoStack = [];
      
      // 현재 상태 저장
      history.lastHtml = currentHtml;
    }
    
    // 초기 상태 설정
    setInitialState(editorId, contentArea) {
      const history = this.getInstanceHistory(editorId);
      history.lastHtml = contentArea.innerHTML;
      history.undoStack = [];
      history.redoStack = [];
    }
    
    // Undo 실행
    undo(editorId, contentArea) {
      const history = this.getInstanceHistory(editorId);
      
      if (history.undoStack.length === 0) return false;
      
      // 현재 상태 저장 (redo용)
      history.redoStack.push(history.lastHtml);
      
      // 이전 상태로 복원
      const previousState = history.undoStack.pop();
      
      // 기록 일시 중지 (복원 중 이벤트 발생 방지)
      history.isRecording = false;
      contentArea.innerHTML = previousState;
      history.lastHtml = previousState;
      
      // 기록 재개
      setTimeout(() => {
        history.isRecording = true;
      }, 0);
      
      return true;
    }
    
    // Redo 실행
    redo(editorId, contentArea) {
      const history = this.getInstanceHistory(editorId);
      
      if (history.redoStack.length === 0) return false;
      
      // 현재 상태 저장 (undo용)
      history.undoStack.push(history.lastHtml);
      
      // 다음 상태로 복원
      const nextState = history.redoStack.pop();
      
      // 기록 일시 중지 (복원 중 이벤트 발생 방지)
      history.isRecording = false;
      contentArea.innerHTML = nextState;
      history.lastHtml = nextState;
      
      // 기록 재개
      setTimeout(() => {
        history.isRecording = true;
      }, 0);
      
      return true;
    }
  }();
  
  // 키보드 단축키 핸들러 설정
  function setupKeyboardShortcuts(editorId, contentArea) {
    contentArea.addEventListener('keydown', function(e) {
      // ⌘+Z (Mac) 또는 Ctrl+Z (Windows)
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        historyManager.undo(editorId, contentArea);
      }
      
      // ⌘+Shift+Z (Mac) 또는 Ctrl+Y (Windows)
      if (((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) || 
          ((e.ctrlKey) && e.key === 'y')) {
        e.preventDefault();
        historyManager.redo(editorId, contentArea);
      }
    });
  }
  
  // 내용 변경 감지 및 기록 설정
  function setupHistoryTracking(editorId, contentArea) {
    // 초기 상태 기록
    historyManager.setInitialState(editorId, contentArea);
    
    // 입력 및 붙여넣기 이벤트에서 상태 기록
    const recordEvents = ['input', 'paste'];
    
    recordEvents.forEach(eventType => {
      contentArea.addEventListener(eventType, function() {
        historyManager.recordState(editorId, contentArea);
      });
    });
    
    // 포맷 이벤트 후 상태 기록을 위한 MutationObserver 설정
    const observer = new MutationObserver(function(mutations) {
      historyManager.recordState(editorId, contentArea);
    });
    
    // DOM 변경 감시 시작
    observer.observe(contentArea, {
      childList: true,
      attributes: true,
      characterData: true,
      subtree: true
    });
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
      
      // 키보드 단축키 및 변경 감지 설정
      setupKeyboardShortcuts(editorId, contentArea);
      setupHistoryTracking(editorId, contentArea);
      
      return null; // 버튼을 렌더링하지 않음
    }
  });
  
  // Undo Plugin (기존 플러그인 대체)
  LiteEditor.registerPlugin('undo', {
    title: 'Undo (⌘Z)',
    icon: 'undo',
    action: function(contentArea) {
      const editorContainer = contentArea.closest('.lite-editor');
      if (!editorContainer || !editorContainer.id) return;
      
      historyManager.undo(editorContainer.id, contentArea);
    }
  });
  
  // Redo Plugin (기존 플러그인 대체)
  LiteEditor.registerPlugin('redo', {
    title: 'Redo (⌘⇧Z)',
    icon: 'redo',
    action: function(contentArea) {
      const editorContainer = contentArea.closest('.lite-editor');
      if (!editorContainer || !editorContainer.id) return;
      
      historyManager.redo(editorContainer.id, contentArea);
    }
  });
})();
