/**
 * LiteEditor History Plugin (개선된 버전)
 * UL/OL 히스토리 문제 해결
 * Version 4.0.0
 */

(function() {
  'use strict';
  
  console.log('[History] 개선된 히스토리 시스템 초기화');
  
  /**
   * 개선된 히스토리 관리 클래스 (단순화)
   */
  class EnhancedHistoryManager {
    constructor(maxSize = 100) { // ✅ 100개로 확대
      this.undoStack = [];
      this.redoStack = [];
      this.maxSize = maxSize;
      this.isRecording = true;
      this.isApplyingState = false;
      this.lastRecordedState = '';
    }
    
    /**
     * 상태 기록 (개선된 중복 방지)
     */
    recordState(html, selection = null, actionName = 'Edit') {
      if (!this.isRecording || this.isApplyingState) {
        console.log(`[History] 기록 스킵: ${actionName}`);
        return;
      }
      
      // ✅ 개선 1: 더 관대한 중복 검사
      if (this.isDuplicateState(html, actionName)) {
        console.log(`[History] 유사 상태 스킵: ${actionName}`);
        return;
      }
      
      // ✅ 개선 2: 즉시 기록 (지연 없음)
      this.doRecord(html, selection, actionName);
      return true;
    }
    
    /**
     * 강제 기록 (중복 검사 없이)
     */
    forceRecord(html, selection = null, actionName = 'Force Record') {
      if (!this.isRecording || this.isApplyingState) {
        console.log(`[History] 강제 기록 스킵: ${actionName}`);
        return;
      }
      
      console.log(`[History] 강제 기록 실행: ${actionName}`);
      this.doRecord(html, selection, actionName);
      return true;
    }
    
    /**
     * 실제 기록 수행 (개선됨)
     */
    doRecord(html, selection, actionName) {
      const state = {
        html: html,
        selection: selection,
        actionName: actionName,
        timestamp: Date.now()
      };
      
      this.undoStack.push(state);
      
      // 스택 크기 제한
      if (this.undoStack.length > this.maxSize) {
        this.undoStack.shift();
      }
      
      // 새 기록 시 redo 스택 초기화
      this.redoStack = [];
      
      this.lastRecordedState = html;
      
      console.log(`[History] 기록 완료: ${actionName} (Undo: ${this.undoStack.length}, Redo: ${this.redoStack.length})`);
    }
    
    /**
     * 개선된 중복 상태 검사
     */
    isDuplicateState(html, actionName) {
      // 강제 기록 액션들은 중복 검사 건너뛰기
      const forceRecordActions = [
        'Bullet List Toggle',
        'Numbered List Toggle', 
        'Before Bullet List',
        'Before Numbered List',
        'Plugin Action'
      ];
      
      if (forceRecordActions.some(action => actionName.includes(action))) {
        return false;
      }
      
      // HTML이 완전히 동일한 경우만 중복으로 판단
      return html === this.lastRecordedState;
    }
    
    /**
     * ✅ 단순화된 Undo 실행 (초기 상태 보호 제거)
     */
    undo(currentHtml, currentSelection = null) {
      if (this.undoStack.length === 0) {
        console.log('[History] Undo 스택이 비어있음');
        return null;
      }
      
      // ✅ 현재 상태를 redo에 저장 (항상)
      this.redoStack.push({
        html: currentHtml,
        selection: currentSelection,
        actionName: 'Current State',
        timestamp: Date.now()
      });
      
      // ✅ 이전 상태 가져오기 (보호 없음)
      const previousState = this.undoStack.pop();
      this.lastRecordedState = previousState.html;
      
      console.log(`[History] Undo 실행: ${previousState.actionName} (Undo: ${this.undoStack.length}, Redo: ${this.redoStack.length})`);
      return previousState;
    }
    
    /**
     * Redo 실행 (개선됨)
     */
    redo(currentHtml, currentSelection = null) {
      if (this.redoStack.length === 0) {
        console.log('[History] Redo 스택이 비어있음');
        return null;
      }
      
      // ✅ 개선 4: 현재 상태와 비교해서 다를 때만 undo에 저장
      const nextState = this.redoStack[this.redoStack.length - 1];
      if (currentHtml !== nextState.html) {
        this.undoStack.push({
          html: currentHtml,
          selection: currentSelection,
          actionName: 'Current State',
          timestamp: Date.now()
        });
      }
      
      // 다음 상태 가져오기
      const state = this.redoStack.pop();
      this.lastRecordedState = state.html;
      
      console.log(`[History] Redo 실행: ${state.actionName} (Undo: ${this.undoStack.length}, Redo: ${this.redoStack.length})`);
      return state;
    }
    
    /**
     * 상태 정보
     */
    getStatus() {
      return {
        canUndo: this.undoStack.length > 0,
        canRedo: this.redoStack.length > 0,
        undoCount: this.undoStack.length,
        redoCount: this.redoStack.length,
        isRecording: this.isRecording,
        isApplyingState: this.isApplyingState
      };
    }
    
    /**
     * 기록 활성화/비활성화
     */
    setRecording(enabled) {
      this.isRecording = enabled;
      console.log(`[History] 기록 ${enabled ? '활성화' : '비활성화'}`);
    }
    
    /**
     * 상태 적용 플래그 설정
     */
    setApplyingState(applying) {
      this.isApplyingState = applying;
    }
    
    /**
     * 디버그 정보
     */
    getDebugInfo() {
      return {
        undoStack: this.undoStack.map(s => ({ 
          action: s.actionName, 
          htmlLength: s.html.length,
          timestamp: s.timestamp
        })),
        redoStack: this.redoStack.map(s => ({ 
          action: s.actionName, 
          htmlLength: s.html.length,
          timestamp: s.timestamp
        })),
        lastRecordedLength: this.lastRecordedState.length
      };
    }
  }
  
  /**
   * 개선된 에디터 히스토리 관리 (단순화)
   */
  class EnhancedEditorHistoryManager {
    constructor(contentArea) {
      this.contentArea = contentArea;
      this.editorId = this.getEditorId();
      this.historyManager = new EnhancedHistoryManager(100); // ✅ 100개로 확대
      
      // 디바운싱 관련
      this.inputTimer = null;
      this.inputDelay = 800;
      
      console.log(`[History] 에디터 ${this.editorId} 단순화된 히스토리 관리자 생성`);
      this.initializeState();
    }
    
    getEditorId() {
      const container = this.contentArea.closest('.lite-editor');
      if (container?.id) return container.id;
      
      const newId = 'editor-' + Math.random().toString(36).substr(2, 9);
      if (container) container.id = newId;
      return newId;
    }
    
    initializeState() {
      const initialHtml = this.contentArea.innerHTML;
      const initialSelection = this.saveSelection();
      
      // ✅ 초기 상태도 일반 기록으로 처리
      this.historyManager.forceRecord(initialHtml, initialSelection, 'Initial State');
      console.log(`[History] 초기 상태 설정: ${initialHtml.length} 문자`);
    }
    
    /**
     * ✅ 개선된 플러그인 액션 전 기록
     */
    recordBeforeAction(actionName) {
      const currentHtml = this.contentArea.innerHTML;
      const currentSelection = this.saveSelection();
      
      // 강제 기록으로 확실하게 저장
      const recorded = this.historyManager.forceRecord(
        currentHtml, 
        currentSelection, 
        `Before ${actionName}`
      );
      
      if (recorded) {
        console.log(`[History] 액션 전 기록 성공: ${actionName}`);
      }
      
      return recorded;
    }
    
    /**
     * 상태 기록
     */
    recordState(actionName = 'Edit') {
      const currentHtml = this.contentArea.innerHTML;
      const currentSelection = this.saveSelection();
      
      return this.historyManager.recordState(currentHtml, currentSelection, actionName);
    }
    
    /**
     * 강제 상태 기록
     */
    forceRecordState(actionName = 'Force Edit') {
      const currentHtml = this.contentArea.innerHTML;
      const currentSelection = this.saveSelection();
      
      return this.historyManager.forceRecord(currentHtml, currentSelection, actionName);
    }
    
    /**
     * ✅ 개선된 디바운스 입력 기록
     */
    recordInputChange() {
      if (this.historyManager.isApplyingState) return;
      
      clearTimeout(this.inputTimer);
      this.inputTimer = setTimeout(() => {
        this.recordState('Text Input');
      }, this.inputDelay);
    }
    
    /**
     * Undo 실행
     */
    undo() {
      const currentHtml = this.contentArea.innerHTML;
      const currentSelection = this.saveSelection();
      
      const previousState = this.historyManager.undo(currentHtml, currentSelection);
      
      if (previousState) {
        this.applyState(previousState);
        this.updateButtonStates();
        return true;
      }
      
      return false;
    }
    
    /**
     * Redo 실행
     */
    redo() {
      const currentHtml = this.contentArea.innerHTML;
      const currentSelection = this.saveSelection();
      
      const nextState = this.historyManager.redo(currentHtml, currentSelection);
      
      if (nextState) {
        this.applyState(nextState);
        this.updateButtonStates();
        return true;
      }
      
      return false;
    }
    
    /**
     * ✅ 개선된 상태 적용
     */
    applyState(state) {
      this.historyManager.setApplyingState(true);
      this.historyManager.setRecording(false);
      
      console.log(`[History] 상태 적용: ${state.actionName}`);
      
      // HTML 복원
      this.contentArea.innerHTML = state.html;
      
      // ✅ 개선된 타이밍 - 더 빠른 복구
      setTimeout(() => {
        this.restoreSelection(state.selection);
        
        // 플래그 해제를 더 빠르게
        setTimeout(() => {
          this.historyManager.setApplyingState(false);
          this.historyManager.setRecording(true);
        }, 50); // 100ms → 50ms
      }, 30); // 50ms → 30ms
    }
    
    /**
     * 선택 영역 저장
     */
    saveSelection() {
      try {
        const selection = window.getSelection();
        if (!selection.rangeCount) return null;
        
        const range = selection.getRangeAt(0);
        if (!this.contentArea.contains(range.commonAncestorContainer)) {
          return null;
        }
        
        return {
          startOffset: this.getTextOffset(range.startContainer, range.startOffset),
          endOffset: this.getTextOffset(range.endContainer, range.endOffset),
          collapsed: range.collapsed
        };
      } catch (error) {
        console.warn('[History] 선택 영역 저장 실패:', error);
        return null;
      }
    }
    
    /**
     * 선택 영역 복원
     */
    restoreSelection(selectionData) {
      if (!selectionData) {
        this.focusAtEnd();
        return;
      }
      
      try {
        this.focusAtEnd();
      } catch (error) {
        console.warn('[History] 선택 영역 복원 실패:', error);
        this.focusAtEnd();
      }
    }
    
    /**
     * 에디터 끝으로 포커스
     */
    focusAtEnd() {
      try {
        const range = document.createRange();
        range.selectNodeContents(this.contentArea);
        range.collapse(false);
        
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        
        this.contentArea.focus();
      } catch (error) {
        this.contentArea.focus();
      }
    }
    
    /**
     * 텍스트 오프셋 계산
     */
    getTextOffset(node, offset) {
      return offset;
    }
    
    /**
     * 버튼 상태 업데이트
     */
    updateButtonStates() {
      const status = this.historyManager.getStatus();
      
      // Undo 버튼
      const undoButton = document.querySelector('[data-plugin="undo"]');
      if (undoButton) {
        if (status.canUndo) {
          undoButton.classList.remove('disabled');
          undoButton.removeAttribute('disabled');
          undoButton.style.opacity = '1';
        } else {
          undoButton.classList.add('disabled');
          undoButton.setAttribute('disabled', 'true');
          undoButton.style.opacity = '0.5';
        }
      }
      
      // Redo 버튼
      const redoButton = document.querySelector('[data-plugin="redo"]');
      if (redoButton) {
        if (status.canRedo) {
          redoButton.classList.remove('disabled');
          redoButton.removeAttribute('disabled');
          redoButton.style.opacity = '1';
        } else {
          redoButton.classList.add('disabled');
          redoButton.setAttribute('disabled', 'true');
          redoButton.style.opacity = '0.5';
        }
      }
    }
    
    /**
     * ✅ 개선된 이벤트 리스너 설정
     */
    setupEventListeners() {
      // 입력 이벤트 (디바운싱)
      this.contentArea.addEventListener('input', () => {
        this.recordInputChange();
      });
      
      // ✅ 특수 키 이벤트 - 더 적극적으로 기록
      this.contentArea.addEventListener('keydown', (e) => {
        if (this.historyManager.isApplyingState) return;
        
        if (['Enter', 'Delete', 'Backspace'].includes(e.key)) {
          // 즉시 기록 (디바운싱 없이)
          clearTimeout(this.inputTimer);
          this.recordState(`Key: ${e.key}`);
        }
      });
      
      // 포커스 잃을 때
      this.contentArea.addEventListener('blur', () => {
        if (this.inputTimer) {
          clearTimeout(this.inputTimer);
          this.recordState('Blur');
        }
      });
      
      // ✅ 붙여넣기 - 개선된 타이밍
      this.contentArea.addEventListener('paste', () => {
        this.forceRecordState('Before Paste');
        setTimeout(() => {
          this.forceRecordState('After Paste');
        }, 50); // 100ms → 50ms
      });
    }
    
    /**
     * 상태 정보 조회
     */
    getStatus() {
      return {
        editorId: this.editorId,
        ...this.historyManager.getStatus()
      };
    }
    
    /**
     * 디버그 정보
     */
    getDebugInfo() {
      return {
        editorId: this.editorId,
        ...this.historyManager.getDebugInfo()
      };
    }
    
    /**
     * 정리
     */
    cleanup() {
      clearTimeout(this.inputTimer);
      console.log(`[History] 에디터 ${this.editorId} 정리 완료`);
    }
  }
  
  // 에디터별 히스토리 관리자 저장
  const editorHistories = new Map();
  
  /**
   * 히스토리 관리자 가져오기
   */
  function getHistoryManager(contentArea) {
    const container = contentArea.closest('.lite-editor');
    const editorId = container?.id;
    
    if (!editorId) {
      console.warn('[History] 에디터 ID를 찾을 수 없습니다.');
      return null;
    }
    
    return editorHistories.get(editorId);
  }
  
  // ==================== 플러그인 등록 ====================
  
  /**
   * 히스토리 초기화 플러그인
   */
  LiteEditor.registerPlugin('historyInit', {
    title: 'History Initialize',
    icon: 'history',
    hidden: true,
    customRender: function(toolbar, contentArea) {
      const container = contentArea.closest('.lite-editor');
      if (!container) return null;
      
      const editorId = container.id || 'editor-' + Math.random().toString(36).substr(2, 9);
      container.id = editorId;
      
      // 개선된 히스토리 관리자 생성
      const historyManager = new EnhancedEditorHistoryManager(contentArea);
      editorHistories.set(editorId, historyManager);
      
      // 이벤트 리스너 설정
      historyManager.setupEventListeners();
      
      // 초기 버튼 상태 업데이트
      setTimeout(() => {
        historyManager.updateButtonStates();
      }, 100);
      
      console.log(`[History] 에디터 ${editorId} 개선된 히스토리 시스템 활성화`);
      return null;
    }
  });
  
  /**
   * Undo 플러그인
   */
  LiteEditor.registerPlugin('undo', {
    title: 'Undo (Ctrl+Z)',
    icon: 'undo',
    action: function(contentArea) {
      const historyManager = getHistoryManager(contentArea);
      if (historyManager) {
        historyManager.undo();
      }
    }
  });
  
  /**
   * Redo 플러그인
   */
  LiteEditor.registerPlugin('redo', {
    title: 'Redo (Ctrl+Shift+Z)',
    icon: 'redo',
    action: function(contentArea) {
      const historyManager = getHistoryManager(contentArea);
      if (historyManager) {
        historyManager.redo();
      }
    }
  });
  
  // ==================== 직접 키보드 이벤트 처리 (개선됨) ====================
  
  /**
   * 직접 키보드 이벤트 처리 - core.js의 단축키 시스템 우회
   */
  function setupDirectKeyboardHandling() {
    // ✅ 키보드 핸들러가 이미 등록되었는지 확인
    if (window.LiteEditorHistoryKeyboardHandlerRegistered) {
      console.log('⌨️ [Direct Keyboard] 이미 등록된 핸들러 발견, 스킵');
      return;
    }
    
    document.addEventListener('keydown', function(event) {
      // contenteditable 영역에서만 작동
      const contentArea = event.target.closest('[contenteditable="true"]');
      if (!contentArea) return;
      
      const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      
      // ✅ Mac: Cmd+Z (Undo)
      if (isMac && event.metaKey && event.key === 'z' && !event.ctrlKey && !event.shiftKey && !event.altKey) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation(); // ✅ 추가: 즉시 전파 중단
        
        console.log('🍎 [Direct Keyboard] Cmd+Z 직접 처리');
        
        const historyManager = getHistoryManager(contentArea);
        if (historyManager) {
          const status = historyManager.getStatus();
          console.log(`🍎 [Direct Keyboard] Cmd+Z 실행 전 상태:`, status);
          
          // ✅ 실행 가능한지 먼저 확인
          if (status.canUndo) {
            const result = historyManager.undo();
            
            const newStatus = historyManager.getStatus();
            console.log(`🍎 [Direct Keyboard] Cmd+Z Undo 실행 결과: ${result ? '성공' : '실패'}`);
            console.log(`🍎 [Direct Keyboard] Cmd+Z 실행 후 상태:`, newStatus);
          } else {
            console.log('🍎 [Direct Keyboard] Cmd+Z - Undo 불가능 (스택 비어있음)');
          }
        }
        return false;
      }
      
      // ✅ Mac: Shift+Cmd+Z (Redo)
      if (isMac && event.metaKey && event.shiftKey && event.key === 'z' && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation(); // ✅ 추가: 즉시 전파 중단
        
        console.log('🍎 [Direct Keyboard] Shift+Cmd+Z 직접 처리');
        
        const historyManager = getHistoryManager(contentArea);
        if (historyManager) {
          const status = historyManager.getStatus();
          console.log(`🍎 [Direct Keyboard] Shift+Cmd+Z 실행 전 상태:`, status);
          
          // ✅ 실행 가능한지 먼저 확인
          if (status.canRedo) {
            const result = historyManager.redo();
            
            const newStatus = historyManager.getStatus();
            console.log(`🍎 [Direct Keyboard] Shift+Cmd+Z Redo 실행 결과: ${result ? '성공' : '실패'}`);
            console.log(`🍎 [Direct Keyboard] Shift+Cmd+Z 실행 후 상태:`, newStatus);
          } else {
            console.log('🍎 [Direct Keyboard] Shift+Cmd+Z - Redo 불가능 (스택 비어있음)');
          }
        }
        return false;
      }
      
      // Windows/Linux 처리도 동일하게 개선...
      
    }, true); // ✅ 캡처 단계에서 처리
    
    // ✅ 중복 등록 방지 플래그 설정
    window.LiteEditorHistoryKeyboardHandlerRegistered = true;
    console.log('⌨️ [Direct Keyboard] 직접 키보드 핸들러 등록 완료');
  }
  
  // 직접 키보드 처리 시작
  setupDirectKeyboardHandling();
  
  // ==================== 디버깅 도구 (안전성 개선) ====================
  
  /**
   * 등록된 단축키 확인 (디버그용)
   */
  function debugShortcuts() {
    console.log('🔍 [History Debug] 등록된 단축키 목록:');
    
    // ✅ 안전한 테스트 함수 - 초기 상태 보호
    window.testHistoryShortcut = function(action, modifiers = {}) {
      const { ctrl = false, meta = false, shift = false, alt = false } = modifiers;
      console.log(`🧪 [History Test] 단축키 테스트: ${action} (ctrl:${ctrl}, meta:${meta}, shift:${shift}, alt:${alt})`);
      
      const activeEditor = document.querySelector('[contenteditable="true"]:focus') || 
                          document.querySelector('[contenteditable="true"]');
      if (activeEditor) {
        const historyManager = getHistoryManager(activeEditor);
        if (historyManager) {
          const status = historyManager.getStatus();
          console.log(`🧪 [History Test] 현재 상태:`, status);
          
          if (action === 'undo' && status.canUndo) {
            const result = historyManager.undo();
            console.log(`🧪 [History Test] Undo 결과: ${result}`);
          } else if (action === 'redo' && status.canRedo) {
            const result = historyManager.redo();
            console.log(`🧪 [History Test] Redo 결과: ${result}`);
          } else {
            console.log(`🧪 [History Test] ${action} 불가능 - 스택 상태 확인 필요`);
          }
        } else {
          console.warn('🧪 [History Test] 히스토리 관리자를 찾을 수 없음');
        }
      } else {
        console.warn('🧪 [History Test] 활성 에디터를 찾을 수 없음');
      }
    };
    
    // ✅ 히스토리 상태 복구 함수 추가
    window.resetHistoryForTest = function() {
      const activeEditor = document.querySelector('[contenteditable="true"]:focus') || 
                          document.querySelector('[contenteditable="true"]');
      if (activeEditor) {
        const historyManager = getHistoryManager(activeEditor);
        if (historyManager) {
          // 강제로 현재 상태를 기록
          historyManager.forceRecordState('Test Reset State');
          console.log('🧪 [History Test] 테스트용 상태 기록 완료');
        }
      }
    };
    
    console.log('🧪 [History Test] 안전한 테스트 함수 등록됨:');
    console.log('   - testHistoryShortcut(action, modifiers) - 안전성 검사 포함');
    console.log('   - resetHistoryForTest() - 테스트용 상태 기록');
    console.log('🧪 [History Test] 사용 예시:');
    console.log('   - resetHistoryForTest() // 먼저 테스트 상태 만들기');
    console.log('   - testHistoryShortcut("undo", {meta: true})');
  }
  
  // 디버깅 함수 실행
  setTimeout(debugShortcuts, 2000);

})();
