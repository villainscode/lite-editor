/**
 * LiteEditor 서식 초기화 플러그인
 * 선택된 텍스트의 모든 서식(인라인 및 블록 레벨)을 제거합니다.
 */
(function() {
  // 제거할 인라인 태그 목록
  const INLINE_TAGS = ['B', 'I', 'U', 'STRONG', 'EM', 'MARK', 'SMALL', 'DEL', 'INS', 'SUB', 'SUP', 
                      'STRIKE', 'CODE', 'FONT', 'A', 'SPAN'];
  
  // 제거할 블록 태그 목록
  const BLOCK_TAGS = ['BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'PRE', 'UL', 'OL'];

  /**
   * 디버그 로그 출력
   */
  const log = (message, data) => {
    if (window.errorHandler) {
      window.errorHandler.colorLog('RESET', message, data);
    }
    console.log(`[RESET] ${message}`, data || '');
  };

  /**
   * 위치에 해당하는 텍스트 노드 찾기
   */
  function getTextNodeAtPosition(element, offset) {
    if (element.nodeType === Node.TEXT_NODE) {
      return element;
    }
    
    if (!element.hasChildNodes()) {
      return element;
    }
    
    const childNodes = element.childNodes;
    if (offset >= childNodes.length) {
      const lastChild = childNodes[childNodes.length - 1];
      if (lastChild.nodeType === Node.TEXT_NODE) {
        return lastChild;
      }
      return getTextNodeAtPosition(lastChild, lastChild.childNodes.length);
    }
    
    const child = childNodes[offset];
    if (child.nodeType === Node.TEXT_NODE) {
      return child;
    }
    
    return getTextNodeAtPosition(child, 0);
  }
  
  /**
   * 요소 내에서 첫 번째 텍스트 노드 찾기
   */
  function findNearestTextNode(element) {
    if (!element) return null;
    
    if (element.nodeType === Node.TEXT_NODE) {
      return element;
    }
    
    if (element.hasChildNodes()) {
      for (let i = 0; i < element.childNodes.length; i++) {
        const found = findNearestTextNode(element.childNodes[i]);
        if (found) return found;
      }
    }
    
    return null;
  }
  
  /**
   * 선택 영역이 있는 블록 태그를 처리하는 함수
   */
  function handleBlockElements(contentArea, range, startNode, endNode) {
    try {
      const directBlockElements = Array.from(contentArea.querySelectorAll(BLOCK_TAGS.join(',')))
        .filter(node => range.intersectsNode(node));
      
      let parentBlockElements = [];
      let current = startNode;
      
      while (current && current !== contentArea) {
        if (BLOCK_TAGS.includes(current.nodeName)) {
          parentBlockElements.push(current);
        }
        current = current.parentNode;
      }
      
      if (startNode !== endNode) {
        current = endNode;
        while (current && current !== contentArea) {
          if (BLOCK_TAGS.includes(current.nodeName) && 
              !parentBlockElements.includes(current)) {
            parentBlockElements.push(current);
          }
          current = current.parentNode;
        }
      }
      
      current = range.commonAncestorContainer;
      if (current.nodeType === Node.TEXT_NODE) {
        current = current.parentNode;
      }
      
      while (current && current !== contentArea) {
        if (BLOCK_TAGS.includes(current.nodeName) && 
            !parentBlockElements.includes(current) &&
            !directBlockElements.includes(current)) {
          parentBlockElements.push(current);
        }
        current = current.parentNode;
      }
      
      const allBlockElements = [...new Set([...directBlockElements, ...parentBlockElements])];
      
      if (allBlockElements.length === 0) {
        return false;
      }
      
      for (const blockElement of allBlockElements) {
          if (blockElement.nodeName === 'UL' || blockElement.nodeName === 'OL') {
          const listItems = Array.from(blockElement.querySelectorAll('li'));
          const listText = listItems.map(item => item.textContent.trim()).join('\n');
          
          const p = document.createElement('p');
          p.style.whiteSpace = 'pre-wrap';
          p.textContent = listText;
          blockElement.parentNode.replaceChild(p, blockElement);
          } else if (blockElement.nodeName === 'CODE') {
          const content = blockElement.textContent;
          const p = document.createElement('p');
          p.style.whiteSpace = 'pre-wrap';
          p.textContent = content;
          blockElement.parentNode.replaceChild(p, blockElement);
          } else {
            const p = PluginUtil.dom.createElement('p', {
              textContent: blockElement.textContent
            });
        blockElement.parentNode.replaceChild(p, blockElement);
          }
      }
      
      return true;
    } catch (error) {
      errorHandler.logError('ResetPlugin', errorHandler.codes.PLUGINS.RESET.BLOCK, error);
      return false;
    }
  }

  /**
   * 노드 참조를 사용하여 선택 복원 
   */
  function restoreSelectionByReferenceNodes(contentArea, startParent, startNode, startOffset, endParent, endNode, endOffset) {
    try {
      if (!contentArea.contains(startParent) || !contentArea.contains(endParent)) {
        log('참조 노드가 DOM에서 제거됨');
        PluginUtil.selection.moveCursorToEnd(contentArea);
        return false;
      }
      
      const selection = window.getSelection();
      const range = document.createRange();
      
      try {
        let newStartNode = findNearestTextNode(startParent);
        
        if (newStartNode) {
          range.setStart(newStartNode, 0);
        } else {
          range.setStart(startParent, 0);
        }
      } catch (e) {
        log('시작 노드 복원 실패', e);
        range.setStart(contentArea, 0);
      }
      
      try {
        let newEndNode = findNearestTextNode(endParent);
        
        if (newEndNode) {
          range.setEnd(newEndNode, newEndNode.length);
        } else {
          range.setEnd(endParent, endParent.childNodes.length);
        }
      } catch (e) {
        log('종료 노드 복원 실패', e);
        range.setEnd(contentArea, contentArea.childNodes.length);
      }
      
      selection.removeAllRanges();
      selection.addRange(range);
      
      log('선택 영역 복원됨', true);
      return true;
    } catch (error) {
      errorHandler.logError('ResetPlugin', errorHandler.codes.PLUGINS.RESET.CURSOR, error);
      PluginUtil.selection.moveCursorToEnd(contentArea);
      return false;
    }
  }

  // 인라인 태그 제거 함수
  function removeInlineFormatting(container) {
    document.execCommand('removeFormat', false, null);
    document.execCommand('unlink', false, null);
    
    INLINE_TAGS.forEach(tag => {
      const tags = Array.from(container.querySelectorAll(tag.toLowerCase()));
      tags.forEach(el => {
        if (el.parentNode) {
          const textContent = el.textContent || '';
          const textNode = document.createTextNode(textContent);
          el.parentNode.replaceChild(textNode, el);
        }
      });
    });
    
    const html = container.innerHTML;
    if (html && html.includes('<') && html.includes('>')) {
      container.textContent = container.textContent;
    }
    
    return true;
  }

  // ✅ 공통 로직을 별도 함수로 추출
  function executeResetAction(contentArea, triggerSource = 'unknown') {
    if (!contentArea) return;
    
    if (window.LiteEditorHistory) {
      window.LiteEditorHistory.forceRecord(contentArea, `Before Clear Formatting (${triggerSource})`);
    }
    
    try {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        errorHandler.logError('ResetPlugin', errorHandler.codes.PLUGINS.RESET.NO_SELECTION, new Error('선택 영역 없음'));
        return false;
      }

      const selectedText = selection.toString();
      if (!selectedText.trim()) {
        errorHandler.logError('ResetPlugin', errorHandler.codes.PLUGINS.RESET.NO_TEXT, new Error('선택된 텍스트 없음'));
        return false;
      }

      const range = selection.getRangeAt(0).cloneRange();
      const originalSelection = {
        text: selectedText,
        cleanText: selectedText.replace(/\s+/g, ' ').trim()
      };
      
      const startContainer = range.startContainer;
      const startOffset = range.startOffset;
      const endContainer = range.endContainer;
      const endOffset = range.endOffset;

      let startNode = startContainer;
      let endNode = endContainer;
      
      if (startContainer.nodeType !== Node.TEXT_NODE && startContainer.childNodes.length > 0) {
        startNode = getTextNodeAtPosition(startContainer, startOffset);
      }
      
      if (endContainer.nodeType !== Node.TEXT_NODE && endContainer.childNodes.length > 0) {
        endNode = getTextNodeAtPosition(endContainer, endOffset);
      }
      
      const startParent = startNode.parentNode;
      const endParent = endNode.parentNode;
      
      try {
        // 체크리스트 처리
        const selectionFragment = range.cloneContents();
        const tempDiv = document.createElement('div');
        tempDiv.appendChild(selectionFragment);
        
        const selectedChecklistItems = Array.from(tempDiv.querySelectorAll('div[class*="checklist"] label'));
        if (selectedChecklistItems.length > 0) {
          log('체크리스트 항목 감지됨 - 선택 영역 내 항목만 처리');
          
          const cleanedItems = selectedChecklistItems.map(item => item.textContent.replace(/\s+/g, ' ').trim());
          const checklistText = cleanedItems.join('\n');
          
          const newP = document.createElement('p');
          newP.style.whiteSpace = 'pre-wrap';
          newP.textContent = checklistText;
          
          range.deleteContents();
          range.insertNode(newP);
          
          const newRange = document.createRange();
          newRange.selectNodeContents(newP);
          selection.removeAllRanges();
          selection.addRange(newRange);
          
          return true;
        }
        
        // 리스트/코드 블록 처리
        const container = range.commonAncestorContainer;
        let listElementDirect = null;
        let codeElement = null;
        
        try {
          if (container.nodeType === Node.ELEMENT_NODE) {
            listElementDirect = container.closest('ul[data-lite-editor-bullet], ol, ul');
            codeElement = container.closest('code');
          } else if (container.nodeType === Node.TEXT_NODE && container.parentNode) {
            listElementDirect = container.parentNode.closest('ul[data-lite-editor-bullet], ol, ul');
            codeElement = container.parentNode.closest('code');
          }
        } catch (e) {
          log('closest 메소드 호출 오류', e);
        }
        
        if (listElementDirect) {
          log('리스트 태그 직접 처리');
          
          const computedStyle = window.getComputedStyle(listElementDirect);
          const originalColor = computedStyle.color || '';
          
          const listItems = Array.from(listElementDirect.querySelectorAll('li'));
          const listText = listItems.map(item => item.textContent.trim()).join('\n');
          
          const newP = document.createElement('p');
          newP.style.whiteSpace = 'pre-wrap';
          if (originalColor) newP.style.color = originalColor;
          newP.textContent = listText;
          
          listElementDirect.parentNode.replaceChild(newP, listElementDirect);
          
          const newRange = document.createRange();
          newRange.selectNodeContents(newP);
          selection.removeAllRanges();
          selection.addRange(newRange);
          
          return true;
        }
        
        if (codeElement) {
          log('CODE 태그 직접 처리');
          
          const computedStyle = window.getComputedStyle(codeElement);
          const originalColor = computedStyle.color || '';
          const codeContent = codeElement.textContent;
          
          const newP = document.createElement('p');
          newP.style.whiteSpace = 'pre-wrap';
          if (originalColor) newP.style.color = originalColor;
          newP.textContent = codeContent;
        
          codeElement.parentNode.replaceChild(newP, codeElement);
          
          const newRange = document.createRange();
          newRange.selectNodeContents(newP);
          selection.removeAllRanges();
          selection.addRange(newRange);
          
          return true;
        }
        
        // 마커 기반 처리
        const tempFragment = range.cloneContents();
        const tempDiv2 = document.createElement('div');
        tempDiv2.appendChild(tempFragment);
        
        const hasFontTag = tempDiv2.querySelector('font[color]') !== null;
        const hasStyleSpan = tempDiv2.querySelector('span[style*="background-color"], span[style*="color"]') !== null;
        const hasBasicFormatTags = tempDiv2.querySelector('b, i, u, strong, em, strike, span:not([style]), mark') !== null;
        const hasBlockTags = Array.from(tempDiv2.querySelectorAll('*')).some(el => BLOCK_TAGS.includes(el.tagName));
        
        if ((hasFontTag || hasStyleSpan || hasBasicFormatTags) && !hasBlockTags) {
          log('인라인 서식 태그만 감지 - 특별 처리');
          
          const temp = document.createElement('div');
          temp.appendChild(range.cloneContents());
          
          range.deleteContents();
          const textNode = document.createTextNode(temp.textContent);
          range.insertNode(textNode);
          
          range.selectNode(textNode);
          selection.removeAllRanges();
          selection.addRange(range);
          
          document.execCommand('removeFormat', false, null);
          document.execCommand('unlink', false, null);
          
          return true;
        }
        
        // 복잡한 마커 처리
        const markerId = 'reset-selection-' + Date.now();
        const markerElement = document.createElement('p');
        markerElement.id = markerId;
        markerElement.setAttribute('data-reset-marker', 'true');
        markerElement.style.whiteSpace = 'pre-wrap';
        markerElement.textContent = originalSelection.text;

        range.deleteContents();
        range.insertNode(markerElement);
        
        if (markerElement) {
          handleBlockElements(contentArea, range, startNode, endNode);
          
          const elementsToRemove = [];
          INLINE_TAGS.forEach(tag => {
            const selector = tag.toLowerCase();
            const selectedTags = contentArea.querySelectorAll(selector);
      
            selectedTags.forEach(el => {
              if (markerElement.contains(el) || range.intersectsNode(el)) {
                elementsToRemove.push(el);
              }
            });
          });
          
          elementsToRemove
            .sort((a, b) => b.contains(a) ? -1 : (a.contains(b) ? 1 : 0))
            .forEach(el => {
              try {
                if (el.parentNode) {
                  const textNode = document.createTextNode(el.textContent);
                  el.parentNode.replaceChild(textNode, el);
                }
              } catch (e) {
                log('태그 제거 중 오류', e);
              }
            });
          
          document.execCommand('removeFormat', false, null);
          document.execCommand('unlink', false, null);
          
          const targetMarker = document.getElementById(markerId);
          if (targetMarker) {
            removeInlineFormatting(targetMarker);
            targetMarker.style.whiteSpace = 'pre-wrap';
            
            const range = document.createRange();
            range.selectNodeContents(targetMarker);
            selection.removeAllRanges();
            selection.addRange(range);
          } else {
            restoreSelectionByReferenceNodes(contentArea, startParent, startNode, startOffset, endParent, endNode, endOffset);
          }
        }
        
      } catch (error) {
        errorHandler.logError('ResetPlugin', errorHandler.codes.PLUGINS.RESET.FORMAT, error);
        contentArea.focus();
        return false;
      }
      
      setTimeout(() => {
        if (window.LiteEditorHistory) {
          window.LiteEditorHistory.recordState(contentArea, `After Clear Formatting (${triggerSource})`);
        }
      }, 100);
      
      return true;
    } catch (error) {
      errorHandler.logError('ResetPlugin', errorHandler.codes.PLUGINS.RESET.FORMAT, error);
      contentArea.focus();
      return false;
    }
  }

  // 서식 초기화 플러그인 등록
  PluginUtil.registerPlugin('reset', {
    title: 'Clear Formatting (⌘⇧\\)',
    icon: 'format_clear',
    action: function(contentArea, buttonElement, event) {
      if (event) event.preventDefault();
      contentArea.focus();
      executeResetAction(contentArea, 'Button Click');
    }
  });

  // 단축키 등록
  document.addEventListener('keydown', function(e) {
    const contentArea = e.target.closest('[contenteditable="true"]');
    if (!contentArea) return;
    
    const editorContainer = contentArea.closest('.lite-editor, .lite-editor-content');
    if (!editorContainer) return;

    const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);

    if (e.shiftKey && ((isMac && e.metaKey) || (!isMac && e.ctrlKey)) && !e.altKey && e.key === '\\') {
      try {
        e.preventDefault();
        e.stopPropagation();
        executeResetAction(contentArea, 'Cmd+Shift+\\');
      } catch (error) {
        if (window.errorHandler) {
          errorHandler.logWarning('ResetPlugin', 'Cmd+Shift+\\ 처리 중 확장 프로그램 충돌', error);
        }
      }
    }
  }, true);

})();