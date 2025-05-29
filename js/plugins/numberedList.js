/**
 * LiteEditor Numbered List Plugin (Simplified)
 * - CSS Counter 기반 번호 재계산
 * - 깊이별 스타일 순환 적용
 * - Tab 키 들여쓰기 + 히스토리 통합
 * - bulletList.js 구조 기반 간소화
 */
(function() {
  const cleanupFunctions = [];
  let tabKeyCleanup = null;
  
  // 스타일 순환 정의
  const NUMBER_STYLES = ['decimal', 'lower-alpha', 'lower-roman'];
  
  // ✅ 플러그인 등록 (히스토리 통합)
  PluginUtil.registerPlugin('orderedList', {
    title: 'Numbered List',
    icon: 'format_list_numbered',
    action: function(contentArea, buttonElement, event) {
      if (event) event.preventDefault();
      contentArea.focus();
      
      // 히스토리 기록
      if (window.LiteEditorHistory) {
        window.LiteEditorHistory.forceRecord(contentArea, 'Before Numbered List Action');
      }
      
      const selection = PluginUtil.selection.getSafeSelection();
      if (!selection?.rangeCount) {
        errorHandler.logWarning('NumberedList', '선택 영역이 없습니다.');
        return;
      }
      
      const range = selection.getRangeAt(0);
      const existingList = findExistingList(range);
      
      try {
        if (existingList) {
          unwrapNumberedList(existingList.ol, range, contentArea);
        } else {
          createNumberedList(contentArea, range);
        }
        
        // 작업 완료 후 히스토리 기록
        setTimeout(() => {
          if (window.LiteEditorHistory) {
            window.LiteEditorHistory.recordState(contentArea, 'After Numbered List Action');
          }
        }, 100);
        
      } catch (error) {
        errorHandler.logError('PLUGINS', 'P601', error);
      }
    }
  });
  
  // ✅ 기존 리스트 찾기
  function findExistingList(range) {
    const container = range.commonAncestorContainer;
    const element = container.nodeType === Node.TEXT_NODE ? container.parentNode : container;
    
    // 리스트 아이템 또는 OL 확인
    const listItem = element.closest('li');
    if (listItem) {
      const ol = listItem.closest('ol[data-lite-editor-number]');
      if (ol) {
        return { listItem, ol };
      }
    }
    
    const ol = element.closest('ol[data-lite-editor-number]') || 
               element.querySelector('ol[data-lite-editor-number]');
    if (ol) {
      return { ol };
    }
    
    return null;
  }
  
  // ✅ 번호 리스트 생성 (간소화)
  function createNumberedList(contentArea, range) {
    errorHandler.logDebug('NumberedList', '리스트 생성 시작');
    
    // 선택 영역이 콜랩스된 경우 현재 블록 전체 선택
    if (range.collapsed) {
      const node = range.startContainer;
      const element = node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
      const block = PluginUtil.dom.findClosestBlock(element, contentArea);
      if (block) {
        range.selectNodeContents(block);
      }
    }
    
    // ✅ 선택 영역 오프셋 저장 (단순화)
    const savedOffsets = PluginUtil.selection.calculateOffsets(contentArea);
    
    // 콘텐츠 추출 및 OL 생성
    const fragment = range.extractContents();
    const tempDiv = PluginUtil.dom.createElement('div');
    tempDiv.appendChild(fragment);
    
    const ol = PluginUtil.dom.createElement('ol', {
      'data-lite-editor-number': 'true'
    });
    
    // 원본 구조 정보 저장 (bulletList.js 방식)
    const originalStructure = {
      type: 'numbered-list-conversion',
      content: tempDiv.innerHTML,
      savedOffsets: savedOffsets,
      timestamp: Date.now()
    };
    ol.setAttribute('data-original-structure', JSON.stringify(originalStructure));
    
    // 텍스트를 LI로 변환 (bulletList.js 방식)
    let content = tempDiv.innerHTML
      .replace(/<\/(div|p)>/gi, '<br>')
      .replace(/<(div|p)[^>]*>/gi, '')
      .replace(/(<br\s*\/?>)+$/, '');
    
    const lines = content.split(/<br\s*\/?>/i).filter(line => line.trim());
    if (lines.length === 0) lines.push('&nbsp;');
    
    lines.forEach((line) => {
      const li = PluginUtil.dom.createElement('li', { 
        innerHTML: line.trim() || '&nbsp;' 
      });
      ol.appendChild(li);
    });
    
    range.insertNode(ol);
    applyBasicStyle(ol);
    
    // ✅ 간소화된 선택 영역 복원
    setTimeout(() => {
      restoreSelection(ol, contentArea, savedOffsets);
      contentArea.focus();
    }, 50);
    
    errorHandler.logDebug('NumberedList', '리스트 생성 완료');
    return ol;
  }
  
  // ✅ 번호 리스트 해제 (간소화)
  function unwrapNumberedList(ol, range, contentArea) {
    if (!ol || ol.nodeName !== 'OL') return;
    
    errorHandler.logDebug('NumberedList', '리스트 해제 시작');
    
    // 원본 구조 복원 시도
    const originalStructureData = ol.getAttribute('data-original-structure');
    
    if (originalStructureData) {
      try {
        const originalStructure = JSON.parse(originalStructureData);
        
        if (originalStructure.type === 'numbered-list-conversion') {
          const p = PluginUtil.dom.createElement('p');
          const items = Array.from(ol.children).filter(child => child.nodeName === 'LI');
          const restoredContent = items.map(item => item.innerHTML).join('<br>');
          p.innerHTML = restoredContent;
          
          ol.parentNode.replaceChild(p, ol);
          
          // ✅ 간소화된 선택 영역 복원
          setTimeout(() => {
            if (originalStructure.savedOffsets) {
              const restored = PluginUtil.selection.restoreFromOffsets(contentArea, originalStructure.savedOffsets);
              if (!restored) {
                restoreSelection(p, contentArea);
              }
            } else {
              restoreSelection(p, contentArea);
            }
            contentArea.focus();
          }, 50);
          
          errorHandler.logDebug('NumberedList', '원본 구조 복원 완료');
          return;
        }
      } catch (error) {
        errorHandler.logWarning('NumberedList', '원본 구조 복원 실패', error);
      }
    }
    
    // 폴백: LI를 P로 변환 (bulletList.js 방식)
    const items = Array.from(ol.children).filter(child => child.nodeName === 'LI');
    const fragment = document.createDocumentFragment();
    
    items.forEach((item) => {
      const p = PluginUtil.dom.createElement('p');
      p.innerHTML = item.innerHTML;
      fragment.appendChild(p);
    });
    
    ol.parentNode.replaceChild(fragment, ol);
    
    errorHandler.logDebug('NumberedList', '리스트 해제 완료');
  }
  
  // ✅ Tab 들여쓰기 처리 (bulletList.js 방식 참고)
  function handleTabIndent(li, isShift) {
    // 히스토리 기록
    const contentArea = li.closest('[contenteditable="true"]');
    if (contentArea && window.LiteEditorHistory) {
      window.LiteEditorHistory.forceRecord(
        contentArea, 
        `Before Numbered List ${isShift ? 'Outdent' : 'Indent'}`
      );
    }
    
    const currentIndent = parseInt(li.getAttribute('data-indent-level') || '0');
    const newIndent = isShift ? Math.max(0, currentIndent - 1) : currentIndent + 1;
    
    errorHandler.logDebug('NumberedList', `들여쓰기 ${isShift ? '감소' : '증가'}`, {
      currentIndent,
      newIndent
    });
    
    // 들여쓰기 레벨 적용
    if (newIndent === 0) {
      li.removeAttribute('data-indent-level');
      li.removeAttribute('data-number-style');
      li.style.removeProperty('margin-left');
    } else {
      li.setAttribute('data-indent-level', newIndent);
      li.style.marginLeft = `${newIndent * 20}px`;
      
      // 스타일 순환 적용
      const styleIndex = (newIndent - 1) % 3;
      const selectedStyle = NUMBER_STYLES[styleIndex];
      li.setAttribute('data-number-style', selectedStyle);
    }
    
    // CSS Counter 갱신
    const ol = li.closest('ol[data-lite-editor-number]');
    if (ol) {
      applyCounterStyles(ol);
    }
    
    // 히스토리 기록
    setTimeout(() => {
      if (contentArea && window.LiteEditorHistory) {
        window.LiteEditorHistory.recordState(
          contentArea, 
          `After Numbered List ${isShift ? 'Outdent' : 'Indent'}`
        );
      }
      contentArea.focus();
    }, 100);
  }
  
  // ✅ 활성 LI 찾기 (bulletList.js 동일)
  function findActiveLi() {
    const selection = PluginUtil.selection.getSafeSelection();
    if (!selection?.rangeCount) return null;
    
    const range = selection.getRangeAt(0);
    const element = range.commonAncestorContainer.nodeType === Node.TEXT_NODE 
      ? range.commonAncestorContainer.parentNode 
      : range.commonAncestorContainer;
    
    const li = element.closest('li');
    return li?.closest('ol[data-lite-editor-number]') ? li : null;
  }
  
  // ✅ 기본 스타일 적용 (bulletList.js 방식)
  function applyBasicStyle(ol) {
    ol.style.setProperty('list-style-type', 'none', 'important');
    ol.style.setProperty('padding-left', '1.5em', 'important');
  }
  
  // ✅ CSS Counter 스타일 적용 (간소화)
  function applyCounterStyles(ol) {
    // CSS Counter 리셋을 위해 display 재설정
    ol.style.display = 'none';
    ol.offsetHeight; // 리플로우 강제
    ol.style.display = '';
  }
  
  // ✅ 선택 영역 복원 (bulletList.js 방식 + 오프셋 지원)
  function restoreSelection(element, contentArea, savedOffsets) {
    // 오프셋 복원 시도
    if (savedOffsets && contentArea) {
      const restored = PluginUtil.selection.restoreFromOffsets(contentArea, savedOffsets);
      if (restored) {
        errorHandler.logDebug('NumberedList', '오프셋 기반 선택 복원 성공');
        return;
      }
    }
    
    // 폴백: 요소 내용 선택 (bulletList.js 방식)
    const timerId = setTimeout(() => {
      try {
        const range = document.createRange();
        range.selectNodeContents(element);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        errorHandler.logDebug('NumberedList', '요소 내용 선택 완료');
      } catch (e) {
        errorHandler.logWarning('NumberedList', '선택 영역 복원 실패', e);
      }
    }, 10);
    
    cleanupFunctions.push(() => clearTimeout(timerId));
  }
  
  // ✅ Tab 키 핸들러 (bulletList.js 동일)
  const handleTabKey = function(event) {
    if (event.key !== 'Tab') return;
    
    const contentArea = event.target.closest('[contenteditable="true"]');
    if (!contentArea) return;
    
    const li = findActiveLi();
    if (!li) return;
    
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    
    handleTabIndent(li, event.shiftKey);
  };
  
  // ✅ Enter 키 핸들러 (간소화)
  const handleEnterKey = function(event) {
    if (event.key !== 'Enter') return;
    
    const contentArea = event.target.closest('[contenteditable="true"]');
    if (!contentArea) return;
    
    const li = findActiveLi();
    if (!li) return;
    
    // 빈 리스트 아이템에서 Enter: 리스트 해제
    const isEmpty = li.textContent.trim() === '' || li.innerHTML.trim() === '&nbsp;';
    
    if (isEmpty) {
      event.preventDefault();
      event.stopPropagation();
      
      const ol = li.closest('ol[data-lite-editor-number]');
      const p = PluginUtil.dom.createElement('p', { innerHTML: '&nbsp;' });
      
      ol.parentNode.insertBefore(p, ol.nextSibling);
      li.remove();
      
      // 빈 ol 제거
      if (ol.children.length === 0) {
        ol.remove();
      } else {
        applyCounterStyles(ol);
      }
      
      // 커서를 새 문단으로 이동
      PluginUtil.selection.moveCursorTo(p, 0);
    }
  };
  
  // ✅ CSS 스타일 초기화 (margin-left 제거)
  function initStyles() {
    if (document.getElementById('lite-editor-numbered-list-styles')) return;
    
    const style = PluginUtil.dom.createElement('style', {
      id: 'lite-editor-numbered-list-styles'
    });
    
    style.textContent = `
      /* CSS Counter 기반 번호 시스템 */
      [contenteditable="true"] ol[data-lite-editor-number] { 
        list-style: none !important;
        padding-left: 1.5em !important;
        counter-reset: main-counter;
      }
      
      /* 0depth 기본 카운터 */
      [contenteditable="true"] ol[data-lite-editor-number] li:not([data-indent-level]) {
        counter-increment: main-counter;
      }
      [contenteditable="true"] ol[data-lite-editor-number] li:not([data-indent-level])::before {
        content: counter(main-counter) ". ";
        font-weight: normal;
        margin-right: 0.5em;
      }
      
      /* 1depth - lower-alpha (margin-left 제거) */
      [contenteditable="true"] ol[data-lite-editor-number] li[data-indent-level="1"] {
        counter-reset: sub-counter-1;
        counter-increment: sub-counter-1;
      }
      [contenteditable="true"] ol[data-lite-editor-number] li[data-indent-level="1"]::before {
        content: counter(sub-counter-1, lower-alpha) ". ";
        font-weight: normal;
        margin-right: 0.5em;
      }
      
      /* 2depth - lower-roman (margin-left 제거) */
      [contenteditable="true"] ol[data-lite-editor-number] li[data-indent-level="2"] {
        counter-reset: sub-counter-2;
        counter-increment: sub-counter-2;
      }
      [contenteditable="true"] ol[data-lite-editor-number] li[data-indent-level="2"]::before {
        content: counter(sub-counter-2, lower-roman) ". ";
        font-weight: normal;
        margin-right: 0.5em;
      }
      
      /* 3depth 이상 순환 (margin-left 제거) */
      [contenteditable="true"] ol[data-lite-editor-number] li[data-indent-level="3"] {
        counter-reset: sub-counter-3;
        counter-increment: sub-counter-3;
      }
      [contenteditable="true"] ol[data-lite-editor-number] li[data-indent-level="3"]::before {
        content: counter(sub-counter-3) ". ";
        font-weight: normal;
        margin-right: 0.5em;
      }
      
      /* 4depth 이상도 지원 (순환) */
      [contenteditable="true"] ol[data-lite-editor-number] li[data-indent-level="4"] {
        counter-reset: sub-counter-4;
        counter-increment: sub-counter-4;
      }
      [contenteditable="true"] ol[data-lite-editor-number] li[data-indent-level="4"]::before {
        content: counter(sub-counter-4, lower-alpha) ". ";
        font-weight: normal;
        margin-right: 0.5em;
      }
    `;
    
    document.head.appendChild(style);
    errorHandler.logDebug('NumberedList', 'CSS 스타일 초기화 완료');
  }
  
  // ✅ 초기화 (bulletList.js 방식)
  initStyles();
  document.addEventListener('keydown', handleTabKey, true);
  document.addEventListener('keydown', handleEnterKey, true);
  
  tabKeyCleanup = () => {
    document.removeEventListener('keydown', handleTabKey, true);
    document.removeEventListener('keydown', handleEnterKey, true);
  };
  
  // ✅ Alt+O 단축키 등록
  LiteEditor.registerShortcut('orderedList', {
    key: 'o',
    alt: true,
    action: function(contentArea) {
      if (window.LiteEditorHistory) {
        window.LiteEditorHistory.forceRecord(contentArea, 'Before Numbered List (Shortcut)');
      }
      
      const selection = PluginUtil.selection.getSafeSelection();
      if (!selection?.rangeCount) return;
      
      const range = selection.getRangeAt(0);
      const existingList = findExistingList(range);
      
      try {
        if (existingList) {
          unwrapNumberedList(existingList.ol, range, contentArea);
        } else {
          createNumberedList(contentArea, range);
        }
        
        setTimeout(() => {
          if (window.LiteEditorHistory) {
            window.LiteEditorHistory.recordState(contentArea, 'After Numbered List (Shortcut)');
          }
        }, 100);
        
      } catch (error) {
        errorHandler.logError('PLUGINS', 'P601', error);
      }
    }
  });
  
  // ✅ 정리 함수 (bulletList.js 방식)
  if (PluginUtil.registerCleanup) {
    PluginUtil.registerCleanup('numberedList', function() {
      cleanupFunctions.forEach(cleanup => cleanup());
      cleanupFunctions.length = 0;
      
      if (tabKeyCleanup) tabKeyCleanup();
      document.getElementById('lite-editor-numbered-list-styles')?.remove();
      
      errorHandler.logDebug('NumberedList', '플러그인 정리 완료');
    });
  }
})();