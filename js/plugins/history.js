/**
 * LiteEditor History Plugin (개선된 버전)
 * UL/OL 히스토리 문제 해결
 * Version 4.0.0
 */

(function() {
  'use strict';
  
  /**
   * 개선된 히스토리 관리 클래스 (단순화)
   */
  class EnhancedHistoryManager {
    constructor(maxSize = 100) {
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
        return;
      }
      
      if (this.isDuplicateState(html, actionName)) {
        return;
      }
      
      this.doRecord(html, selection, actionName);
      return true;
    }
    
    /**
     * 강제 기록 (중복 검사 없이)
     */
    forceRecord(html, selection = null, actionName = 'Force Record') {
      if (!this.isRecording || this.isApplyingState) {
        return;
      }
      
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
     * 단순화된 Undo 실행 (초기 상태 보호 제거)
     */
    undo(currentHtml, currentSelection = null) {
      if (this.undoStack.length === 0) {
        return null;
      }
      
      // 현재 상태를 redo에 저장 (항상)
      this.redoStack.push({
        html: currentHtml,
        selection: currentSelection,
        actionName: 'Current State',
        timestamp: Date.now()
      });
      
      // 이전 상태 가져오기 (보호 없음)
      const previousState = this.undoStack.pop();
      this.lastRecordedState = previousState.html;
      
      return previousState;
    }
    
    /**
     * Redo 실행 (개선됨)
     */
    redo(currentHtml, currentSelection = null) {
      if (this.redoStack.length === 0) {
        return null;
      }
      
      // 현재 상태와 비교해서 다를 때만 undo에 저장
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
      this.historyManager = new EnhancedHistoryManager(100);
      
      // 디바운싱 관련
      this.inputTimer = null;
      this.inputDelay = 800;
      
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
      
      // 초기 상태도 일반 기록으로 처리
      this.historyManager.forceRecord(initialHtml, initialSelection, 'Initial State');
    }
    
    /**
     * 개선된 플러그인 액션 전 기록
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
     * 개선된 디바운스 입력 기록
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
     * 개선된 상태 적용
     */
    applyState(state) {
      this.historyManager.setApplyingState(true);
      this.historyManager.setRecording(false);
      
      // HTML 복원
      this.contentArea.innerHTML = state.html;
      
      // 개선된 타이밍 - 더 빠른 복구
      setTimeout(() => {
        this.restoreSelection(state.selection);
        
        // 플래그 해제를 더 빠르게
        setTimeout(() => {
          this.historyManager.setApplyingState(false);
          this.historyManager.setRecording(true);
        }, 50);
      }, 30);
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
     * 개선된 이벤트 리스너 설정
     */
    setupEventListeners() {
      // 입력 이벤트 (디바운싱)
      this.contentArea.addEventListener('input', () => {
        this.recordInputChange();
      });
      
      // 특수 키 이벤트 - 더 적극적으로 기록
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
      
      // 붙여넣기 - 개선된 단일 기록 방식
      this.contentArea.addEventListener('paste', () => {
        this.forceRecordState('Before Paste');
        
        // ✅ input 이벤트 대신 즉시 기록 (디바운싱 없이)
        setTimeout(() => {
          // 디바운싱 타이머 무시하고 즉시 기록
          clearTimeout(this.inputTimer);
          this.recordState('Paste Complete');
        }, 100); // 짧은 딜레이로 붙여넣기 완료 후 기록
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
      
      return null;
    }
  });
  
  /**
   * Undo 플러그인
   */
  LiteEditor.registerPlugin('undo', {
    title: 'Undo',
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
    title: 'Redo',
    icon: 'redo',
    action: function(contentArea) {
      const historyManager = getHistoryManager(contentArea);
      if (historyManager) {
        historyManager.redo();
      }
    }
  });
  
  // ==================== 전역 API 노출 ====================
  
  /**
   * 전역 히스토리 API
   */
  window.LiteEditorHistory = {
    /**
     * 에디터의 히스토리 관리자 가져오기
     */
    getManager: function(contentArea) {
      return getHistoryManager(contentArea);
    },
    
    /**
     * 상태 기록
     */
    recordState: function(contentAreaOrId, actionName = 'Manual Record') {
      let contentArea;
      if (typeof contentAreaOrId === 'string') {
        const editorId = contentAreaOrId;
        const manager = editorHistories.get(editorId);
        if (!manager) return false;
        contentArea = manager.contentArea;
      } else {
        contentArea = contentAreaOrId;
      }
      
      const manager = getHistoryManager(contentArea);
      return manager ? manager.recordState(actionName) : false;
    },
    
    /**
     * 강제 상태 기록
     */
    forceRecord: function(contentAreaOrId, actionName = 'Force Record') {
      let contentArea;
      if (typeof contentAreaOrId === 'string') {
        const editorId = contentAreaOrId;
        const manager = editorHistories.get(editorId);
        if (!manager) return false;
        contentArea = manager.contentArea;
      } else {
        contentArea = contentAreaOrId;
      }
      
      const manager = getHistoryManager(contentArea);
      return manager ? manager.forceRecordState(actionName) : false;
    },
    
    /**
     * 액션 전 기록
     */
    recordBeforeAction: function(contentAreaOrId, actionName) {
      let contentArea;
      if (typeof contentAreaOrId === 'string') {
        const editorId = contentAreaOrId;
        const manager = editorHistories.get(editorId);
        if (!manager) return false;
        contentArea = manager.contentArea;
      } else {
        contentArea = contentAreaOrId;
      }
      
      const manager = getHistoryManager(contentArea);
      return manager ? manager.recordBeforeAction(actionName) : false;
    },
    
    /**
     * 상태 정보 조회
     */
    getStatus: function(contentAreaOrId) {
      let manager;
      if (typeof contentAreaOrId === 'string') {
        manager = editorHistories.get(contentAreaOrId);
      } else {
        manager = getHistoryManager(contentAreaOrId);
      }
      
      return manager ? manager.getStatus() : null;
    }
  };

})();
