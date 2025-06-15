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

  // ✅ 공통 로직을 별도 함수로 추출 (수정)
  function executeResetAction(contentArea, triggerSource = 'unknown') {
    if (!contentArea) return;
    
    // ✅ 1. 먼저 선택 영역 저장 (DOM 변경 전에)
    const savedRange = PluginUtil.selection.saveSelection();
    const scrollPosition = PluginUtil.scroll.savePosition();
    
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
      
      try {
        // ✅ 2. 체크리스트 처리 (선택 영역 복원 추가)
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
          
          // ✅ PluginUtil 사용한 선택 영역 복원
          setTimeout(() => {
            contentArea.focus({ preventScroll: true });
            const newRange = document.createRange();
            newRange.selectNodeContents(newP);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(newRange);
            PluginUtil.scroll.restorePosition(scrollPosition);
          }, 10);
          
          return true;
        }
        
        // ✅ 3. 리스트/코드 블록 처리 (선택 영역 복원 추가)
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
          
          // ✅ PluginUtil 사용한 선택 영역 복원
          setTimeout(() => {
            contentArea.focus({ preventScroll: true });
            const newRange = document.createRange();
            newRange.selectNodeContents(newP);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(newRange);
            PluginUtil.scroll.restorePosition(scrollPosition);
          }, 10);
          
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
          
          // ✅ PluginUtil 사용한 선택 영역 복원
          setTimeout(() => {
            contentArea.focus({ preventScroll: true });
            const newRange = document.createRange();
            newRange.selectNodeContents(newP);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(newRange);
            PluginUtil.scroll.restorePosition(scrollPosition);
          }, 10);
          
          return true;
        }
        
        // ✅ 4. 인라인 서식 처리 (가장 간단한 케이스)
        const tempFragment = range.cloneContents();
        const tempDiv2 = document.createElement('div');
        tempDiv2.appendChild(tempFragment);
        
        const hasFontTag = tempDiv2.querySelector('font[color]') !== null;
        const hasStyleSpan = tempDiv2.querySelector('span[style*="background-color"], span[style*="color"]') !== null;
        const hasBasicFormatTags = tempDiv2.querySelector('b, i, u, strong, em, strike, span:not([style]), mark') !== null;
        const hasBlockTags = Array.from(tempDiv2.querySelectorAll('*')).some(el => BLOCK_TAGS.includes(el.tagName));
        
        if ((hasFontTag || hasStyleSpan || hasBasicFormatTags) && !hasBlockTags) {
          log('인라인 서식 태그만 감지 - 특별 처리');
          
          // ✅ 포커스 후 선택 영역 복원
          contentArea.focus({ preventScroll: true });
          const restored = PluginUtil.selection.restoreSelection(savedRange);
          
          if (restored) {
            document.execCommand('removeFormat', false, null);
            document.execCommand('unlink', false, null);
            
            // ✅ 스크롤 위치 복원
            PluginUtil.scroll.restorePosition(scrollPosition);
            return true;
          }
        }
        
        // ✅ 5. 복잡한 블록 처리 (blockquote 등) - 핵심 수정 부분
        const blockElements = Array.from(contentArea.querySelectorAll(BLOCK_TAGS.join(',')))
          .filter(node => {
            try {
              return range.intersectsNode(node);
            } catch (e) {
              return false;
            }
          });
        
        if (blockElements.length > 0) {
          log('블록 요소 처리 시작', { count: blockElements.length });
          
          // ✅ 블록 요소들을 P 태그로 변환
          const convertedTexts = [];
          blockElements.forEach(blockElement => {
            let textContent = '';
            
            if (blockElement.nodeName === 'UL' || blockElement.nodeName === 'OL') {
              const listItems = Array.from(blockElement.querySelectorAll('li'));
              textContent = listItems.map(item => item.textContent.trim()).join('\n');
            } else {
              textContent = blockElement.textContent.trim();
            }
            
            convertedTexts.push(textContent);
            
            // ✅ 블록 요소를 P 태그로 교체
            const newP = document.createElement('p');
            newP.style.whiteSpace = 'pre-wrap';
            newP.textContent = textContent;
            
            if (blockElement.parentNode) {
              blockElement.parentNode.replaceChild(newP, blockElement);
            }
          });
          
          // ✅ 변환 후 선택 영역 복원 (가장 중요한 부분)
          setTimeout(() => {
            contentArea.focus({ preventScroll: true });
            
            // 변환된 텍스트를 기준으로 새로운 선택 영역 생성
            const allText = convertedTexts.join('\n');
            const textNodes = [];
            
            // 모든 텍스트 노드 수집
            const walker = document.createTreeWalker(
              contentArea,
              NodeFilter.SHOW_TEXT,
              null,
              false
            );
            
            while (walker.nextNode()) {
              if (walker.currentNode.textContent.trim()) {
                textNodes.push(walker.currentNode);
              }
            }
            
            // 변환된 텍스트와 일치하는 노드 찾기
            let targetNode = null;
            for (const node of textNodes) {
              if (node.textContent.includes(convertedTexts[0]) || 
                  convertedTexts[0].includes(node.textContent.trim())) {
                targetNode = node;
                break;
              }
            }
            
            if (targetNode) {
              const newRange = document.createRange();
              newRange.setStart(targetNode, 0);
              newRange.setEnd(targetNode, Math.min(targetNode.length, originalSelection.cleanText.length));
              
              const sel = window.getSelection();
              sel.removeAllRanges();
              sel.addRange(newRange);
              
              log('블록 요소 변환 후 선택 영역 복원 성공');
            } else {
              // ✅ 폴백: 에디터 끝으로 커서 이동
              PluginUtil.selection.moveCursorToEnd(contentArea);
              log('블록 요소 변환 후 선택 영역 복원 실패 - 커서를 끝으로 이동');
            }
            
            PluginUtil.scroll.restorePosition(scrollPosition);
          }, 10);
          
          return true;
        }
        
        // ✅ 6. 기본 폴백 처리
        log('기본 서식 제거 처리');
        contentArea.focus({ preventScroll: true });
        const restored = PluginUtil.selection.restoreSelection(savedRange);
        
        if (restored) {
          document.execCommand('removeFormat', false, null);
          document.execCommand('unlink', false, null);
        }
        
        PluginUtil.scroll.restorePosition(scrollPosition);
        
      } catch (error) {
        errorHandler.logError('ResetPlugin', errorHandler.codes.PLUGINS.RESET.FORMAT, error);
        
        // ✅ 에러 시에도 포커스 유지
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