/**
 * LiteEditor Code Plugin
 * 텍스트 코드 서식 플러그인
 */

(function() {
  const util = window.PluginUtil;
  
  LiteEditor.registerPlugin('code', {
    title: 'Code',
    icon: 'code',
    
    action: function(contentArea, buttonElement, event) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      
      if (!util.utils.canExecutePlugin(contentArea)) {
        return;
      }
      
      contentArea.focus();
      applyCodeFormat(contentArea);
    },
    
    customRender: function(toolbar, contentArea) {
      const button = util.dom.createElement('button', {
        className: 'lite-editor-button',
        title: 'Code'
      });

      const icon = util.dom.createElement('i', {
        className: 'material-icons',
        textContent: 'code'
      });
      button.appendChild(icon);

      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!util.utils.canExecutePlugin(contentArea)) {
            return;
        }
        
        contentArea.focus();
        applyCodeFormat(contentArea);
      });

      return button;
    }
  });

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

  function applyCodeFormat(contentArea) {
    const selection = util.selection.getSafeSelection();
    if (!selection || !selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    
    const existingCodeElement = isInsideCodeElement(range, contentArea);
    if (existingCodeElement) {
      return; // 중첩 방지
    }
    
    if (range.collapsed) {
      createEmptyCodeBlock(contentArea, range);
    } else {
      wrapSelectedTextWithCode(contentArea, range);
    }
  }

  function createEmptyCodeBlock(contentArea, range) {
    // 항상 P 태그 내부에 생성하도록 보장
    let targetParagraph = null;
    
    let currentNode = range.startContainer;
    if (currentNode.nodeType === Node.TEXT_NODE) {
      currentNode = currentNode.parentElement;
    }
    
    while (currentNode && currentNode !== contentArea) {
      if (currentNode.tagName === 'P') {
        targetParagraph = currentNode;
        break;
      }
      currentNode = currentNode.parentElement;
    }
    
    // P 태그가 없으면 새로 생성
    if (!targetParagraph) {
      targetParagraph = document.createElement('p');
      targetParagraph.textContent = '\u200B';
      range.insertNode(targetParagraph);
      range.selectNodeContents(targetParagraph);
      range.collapse(true);
    }

    const codeElement = util.dom.createElement('code', {
      'contenteditable': 'true'
    });
    
    codeElement.style.display = 'block';
    codeElement.style.width = '100%';
    codeElement.textContent = '\u200B';

    setupCodeBlockKeyboardEvents(codeElement, contentArea);
    
    // P 태그 내용을 code로 교체
    targetParagraph.innerHTML = '';
    targetParagraph.appendChild(codeElement);
    
    setTimeout(() => {
      const newRange = document.createRange();
      newRange.selectNodeContents(codeElement);
      newRange.collapse(true);
      
      const sel = util.selection.getSafeSelection();
      sel.removeAllRanges();
      sel.addRange(newRange);
      codeElement.focus();
    }, 10);
  }

  function wrapSelectedTextWithCode(contentArea, range) {
    const offsets = util.selection.calculateOffsets(contentArea);
    const selectedContent = range.extractContents();
    
    const tempDiv = document.createElement('div');
    tempDiv.appendChild(selectedContent.cloneNode(true));
    
    // 블록 요소들을 텍스트로 변환
    let processedHTML = tempDiv.innerHTML;
    
    processedHTML = processedHTML.replace(/<(p|div|h[1-6]|li|ul|ol|blockquote)[^>]*>/gi, '');
    processedHTML = processedHTML.replace(/<\/(p|div|h[1-6]|li|ul|ol|blockquote)>/gi, '\n');
    processedHTML = processedHTML.replace(/&nbsp;/g, '___NBSP_PLACEHOLDER___');
    processedHTML = processedHTML.replace(/<br\s*\/?>/gi, '\n');
    
    let selectedText = processedHTML.replace(/<[^>]*>/g, '');
    selectedText = selectedText.replace(/___NBSP_PLACEHOLDER___/g, '\u00A0');
    selectedText = selectedText.replace(/\n{3,}/g, '\n\n');
    selectedText = selectedText.trim();
    
    if (!selectedText) {
      range.insertNode(selectedContent);
      return;
    }

    try {
      let finalHTML = selectedText
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\u00A0/g, '&nbsp;')
        .replace(/\n/g, '<br>');

      const codeElement = util.dom.createElement('code');
      codeElement.innerHTML = finalHTML;
      
      if (selectedText.includes('\n')) {
        codeElement.style.display = 'inline-block';
        codeElement.style.whiteSpace = 'pre-wrap';
      }

      setupCodeBlockKeyboardEvents(codeElement, contentArea);
      range.insertNode(codeElement);
      insertLineBreakIfNeeded(codeElement);
      
      setTimeout(() => {
        const newRange = document.createRange();
        newRange.setStartAfter(codeElement);
        newRange.collapse(true);
        
        const sel = util.selection.getSafeSelection();
        sel.removeAllRanges();
        sel.addRange(newRange);
        contentArea.focus();
      }, 10);
      
    } catch (error) {
      range.insertNode(selectedContent);
      if (offsets) {
        util.selection.restoreFromOffsets(contentArea, offsets);
      }
    }
  }

  function insertLineBreakIfNeeded(codeElement) {
    const nextNode = codeElement.nextSibling;
    
    if (nextNode && nextNode.nodeType === Node.TEXT_NODE) {
      const nextText = nextNode.textContent;
      
      if (nextText && !nextText.startsWith(' ') && nextText.trim()) {
        const br = document.createElement('br');
        codeElement.parentNode.insertBefore(br, nextNode);
        return true;
      }
    }
    
    return false;
  }

  function setupCodeBlockKeyboardEvents(codeElement, contentArea) {
    const keyboardHandler = (e) => {
      if (e.key === 'Enter') {
        const selection = util.selection.getSafeSelection();
        if (!selection || !selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        let currentElement = range.startContainer;
        
        if (currentElement.nodeType === Node.TEXT_NODE) {
          currentElement = currentElement.parentElement;
        }
        
        let codeBlock = null;
        while (currentElement && currentElement !== contentArea) {
          if (currentElement.tagName === 'CODE') {
            codeBlock = currentElement;
            break;
          }
          currentElement = currentElement.parentElement;
        }
        
        if (codeBlock) {
          if (e.shiftKey) {
            e.preventDefault();
            e.stopImmediatePropagation();
            insertLineBreakInCode(codeBlock);
          } else {
            e.preventDefault();
            e.stopImmediatePropagation();
            exitCodeBlockToNewParagraph(codeBlock, contentArea);
          }
        }
      }
    };
    
    contentArea.addEventListener('keydown', keyboardHandler, true);
    
    return () => {
      contentArea.removeEventListener('keydown', keyboardHandler, true);
    };
  }

  function insertLineBreakInCode(codeElement) {
    const selection = util.selection.getSafeSelection();
    if (!selection || !selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    
    const br = document.createElement('br');
    range.deleteContents();
    range.insertNode(br);
    
    range.setStartAfter(br);
    range.collapse(true);
    
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function exitCodeBlockToNewParagraph(codeElement, contentArea) {
    try {
      const newParagraph = document.createElement('p');
      newParagraph.textContent = '\u200B';
      
      // code 요소 바로 다음에 삽입
      const codeParent = codeElement.parentNode;
      
      if (codeParent) {
        if (codeElement.nextSibling) {
          codeParent.insertBefore(newParagraph, codeElement.nextSibling);
        } else {
          codeParent.appendChild(newParagraph);
        }
      } else {
        contentArea.appendChild(newParagraph);
      }
      
      setTimeout(() => {
        const newRange = document.createRange();
        newRange.selectNodeContents(newParagraph);
        newRange.collapse(true);
        
        const selection = util.selection.getSafeSelection();
        selection.removeAllRanges();
        selection.addRange(newRange);
        
        contentArea.focus();
      }, 10);
      
    } catch (error) {
      try {
        const fallbackP = document.createElement('p');
        fallbackP.textContent = '\u200B';
        contentArea.appendChild(fallbackP);
        
        setTimeout(() => {
          const range = document.createRange();
          range.setStart(fallbackP, 0);
          range.collapse(true);
          
          const selection = util.selection.getSafeSelection();
          selection.removeAllRanges();
          selection.addRange(range);
          
          contentArea.focus();
        }, 10);
      } catch (e) {
        // 최후의 수단도 실패하면 무시
      }
    }
  }
})();