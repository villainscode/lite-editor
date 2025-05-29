/**
 * LiteEditor Numbered List Plugin
 * - 순서 있는 목록 서식과 깊이별 스타일 적용
 * - BR → P 구조 복원 지원
 * - Tab 키 들여쓰기 + 스타일 순환
 * - 히스토리 통합
 */
(function() {
  const cleanupFunctions = [];
  let tabKeyCleanup = null;
  const NUMBER_STYLES = ['decimal', 'lower-alpha', 'lower-roman'];
  
  // ✅ 플러그인 등록 (히스토리 통합)
  PluginUtil.registerPlugin('orderedList', {
    title: 'Numbered List',
    icon: 'format_list_numbered',
    action: function(contentArea, buttonElement, event) {
      if (event) event.preventDefault();
      contentArea.focus();
      
      // ✅ 히스토리에 적용 전 상태 기록
      if (window.LiteEditorHistory) {
        window.LiteEditorHistory.forceRecord(contentArea, 'Before Numbered List Action');
      }
      
      const selection = PluginUtil.selection.getSafeSelection();
      if (!selection?.rangeCount) {
        return;
      }
      
      const range = selection.getRangeAt(0);
      const existingList = findExistingList(range);
      
      try {
      if (existingList) {
        unwrapNumberedList(existingList.ol, range);
      } else {
        createNumberedList(contentArea, range);
        }
        
        // ✅ 작업 완료 후 상태 기록
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
  
  // ✅ 리스트 생성
  function createNumberedList(contentArea, range) {
    // 콜랩스된 범위 처리
    if (range.collapsed) {
      const node = range.startContainer;
      const element = node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
      const block = element.closest('p, div, h1, h2, h3, h4, h5, h6');
      if (block) {
        range.selectNodeContents(block);
      }
    }
    
    // 콘텐츠 추출 및 OL 생성
    const fragment = range.extractContents();
    const tempDiv = PluginUtil.dom.createElement('div');
    tempDiv.appendChild(fragment);
    
    const ol = PluginUtil.dom.createElement('ol', {
      'data-lite-editor-number': 'true'
    });
    
    // 원본 구조 정보 저장
    const originalStructure = {
      type: 'single-p-with-br',
      content: tempDiv.innerHTML,
      timestamp: Date.now()
    };
    ol.setAttribute('data-original-structure', JSON.stringify(originalStructure));
    
    // 텍스트를 LI로 변환
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
    restoreSelection(ol);
    
    return ol;
  }
  
  // ✅ 리스트 제거
  function unwrapNumberedList(ol, range) {
    if (!ol || ol.nodeName !== 'OL') {
      return;
    }
    
    // 원본 BR → P 구조 복원
    const originalStructureData = ol.getAttribute('data-original-structure');
    
    if (originalStructureData) {
      try {
        const originalStructure = JSON.parse(originalStructureData);
        
        if (originalStructure.type === 'single-p-with-br') {
          const p = PluginUtil.dom.createElement('p');
          const items = Array.from(ol.children).filter(child => child.nodeName === 'LI');
          const restoredContent = items.map(item => item.innerHTML).join('<br>');
          p.innerHTML = restoredContent;
          
          ol.parentNode.replaceChild(p, ol);
          restoreSelection(p);
          
          return;
        }
      } catch (error) {
        errorHandler.logWarning('NumberedList', '원본 구조 복원 실패', error);
      }
    }
    
    // 폴백: LI를 P로 변환
    const items = Array.from(ol.children).filter(child => child.nodeName === 'LI');
    const fragment = document.createDocumentFragment();
    
    items.forEach((item) => {
      const p = PluginUtil.dom.createElement('p');
      const nestedOl = item.querySelector('ol');
      p.innerHTML = nestedOl ? 
        item.innerHTML.replace(nestedOl.outerHTML, '') : 
        item.innerHTML;
      fragment.appendChild(p);
    });
    
    ol.parentNode.replaceChild(fragment, ol);
  }
  
  // ✅ Tab 들여쓰기
  function handleTabIndent(li, isShift) {
    // ✅ Tab 들여쓰기 전 상태 기록
    const contentArea = li.closest('[contenteditable="true"]');
    if (contentArea && window.LiteEditorHistory) {
      window.LiteEditorHistory.forceRecord(
        contentArea, 
        `Before Numbered List ${isShift ? 'Outdent' : 'Indent'}`
      );
    }
    
    const currentIndent = parseInt(li.getAttribute('data-indent-level') || '0');
    const newIndent = isShift ? Math.max(0, currentIndent - 1) : currentIndent + 1;
    
    // 들여쓰기 적용
    if (newIndent === 0) {
      li.removeAttribute('data-indent-level');
      li.style.removeProperty('margin-left');
      li.style.removeProperty('list-style-type');
      li.classList.remove('li-number-depth-1', 'li-number-depth-2', 'li-number-depth-3');
    } else {
      li.setAttribute('data-indent-level', newIndent);
      li.style.marginLeft = `${newIndent * 20}px`;
      
      // 스타일 순환 유지
      const styleIndex = newIndent % 3;
      const selectedStyle = NUMBER_STYLES[styleIndex];
      li.style.setProperty('list-style-type', selectedStyle, 'important');
      
      // 클래스 업데이트
      li.classList.remove('li-number-depth-1', 'li-number-depth-2', 'li-number-depth-3');
      li.classList.add(`li-number-depth-${styleIndex + 1}`);
      li.setAttribute('data-number-style', selectedStyle);
    }
    
    // ✅ 들여쓰기 후 상태 기록
    setTimeout(() => {
      if (contentArea && window.LiteEditorHistory) {
        window.LiteEditorHistory.recordState(
          contentArea, 
          `After Numbered List ${isShift ? 'Outdent' : 'Indent'}`
        );
      }
      
      // 포커스 유지
      if (contentArea) contentArea.focus();
    }, 100);
  }
  
  // Tab 키 핸들러
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
  
  // 활성 LI 찾기
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
  
  // 기본 스타일 적용
  function applyBasicStyle(ol) {
    ol.style.setProperty('list-style-type', 'decimal', 'important');
    ol.style.setProperty('padding-left', '1.5em', 'important');
  }
  
  // 선택 영역 복원
  function restoreSelection(element) {
    const timerId = setTimeout(() => {
      try {
        const range = document.createRange();
        range.selectNodeContents(element);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      } catch (e) {
        // 무시
      }
    }, 10);
    
    cleanupFunctions.push(() => clearTimeout(timerId));
  }
  
  // CSS 스타일 초기화
  function initStyles() {
    if (document.getElementById('lite-editor-numbered-list-styles')) return;
    
    const style = PluginUtil.dom.createElement('style', {
      id: 'lite-editor-numbered-list-styles'
    });
    
    style.textContent = `
      [contenteditable="true"] ol[data-lite-editor-number] { 
        list-style-type: decimal !important;
        padding-left: 1.5em !important; 
      }
      [contenteditable="true"] ol[data-lite-editor-number] li.li-number-depth-1 { 
        list-style-type: decimal !important; 
      }
      [contenteditable="true"] ol[data-lite-editor-number] li.li-number-depth-2 { 
        list-style-type: lower-alpha !important; 
      }
      [contenteditable="true"] ol[data-lite-editor-number] li.li-number-depth-3 { 
        list-style-type: lower-roman !important; 
      }
    `;
    
    document.head.appendChild(style);
  }
  
  // 초기화
  initStyles();
  document.addEventListener('keydown', handleTabKey, true);
  tabKeyCleanup = () => document.removeEventListener('keydown', handleTabKey, true);
  
  // ✅ Alt+O 단축키 (히스토리 통합)
  LiteEditor.registerShortcut('orderedList', {
    key: 'o',
    alt: true,
    action: function(contentArea) {
      // ✅ 단축키 액션 전 히스토리 기록
      if (window.LiteEditorHistory) {
        window.LiteEditorHistory.forceRecord(contentArea, 'Before Numbered List (Shortcut)');
      }
      
      const selection = PluginUtil.selection.getSafeSelection();
      if (!selection?.rangeCount) return;
      
      const range = selection.getRangeAt(0);
      const existingList = findExistingList(range);
      
      try {
      if (existingList) {
        unwrapNumberedList(existingList.ol, range);
      } else {
        createNumberedList(contentArea, range);
        }
        
        // ✅ 단축키 액션 후 히스토리 기록
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
  
  // 정리 함수
  if (PluginUtil.registerCleanup) {
    PluginUtil.registerCleanup('numberedList', function() {
      cleanupFunctions.forEach(cleanup => cleanup());
      cleanupFunctions.length = 0;
      
      if (tabKeyCleanup) tabKeyCleanup();
      document.getElementById('lite-editor-numbered-list-styles')?.remove();
    });
  }
})();