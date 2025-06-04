window.LiteEditorKeyboardManager = {
  handlers: [],
  
  registerHandler(priority, selector, callback) {
    this.handlers.push({ priority, selector, callback });
    this.handlers.sort((a, b) => b.priority - a.priority); // 높은 우선순위부터
  },
  
  handleKeydown(e, contentArea) {
    if (e.key !== 'Enter') return;
    
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    const currentElement = range.startContainer.nodeType === Node.TEXT_NODE 
      ? range.startContainer.parentElement 
      : range.startContainer;
    
    for (const handler of this.handlers) {
      const element = currentElement.closest(handler.selector);
      if (element) {
        const result = handler.callback(e, element, currentElement, range, contentArea);
        if (result === true) { // 처리되었음
          e.preventDefault();
          e.stopImmediatePropagation();
          return;
        }
      }
    }
  }
};

// 우선순위: code(100) > font(80) > color(70) > highlight(60)
LiteEditorKeyboardManager.registerHandler(100, 'code', (e, codeElement, currentElement, range, contentArea) => {
  if (e.shiftKey) {
    // code 내부에서 Shift+Enter: 줄바꿈
    const br = document.createElement('br');
    range.deleteContents();
    range.insertNode(br);
    range.setStartAfter(br);
    range.collapse(true);
    
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  } else {
    // code에서 Enter: 블록 밖으로 나가기
    const newParagraph = document.createElement('p');
    newParagraph.textContent = '\u200B';
    
    const codeParent = codeElement.parentNode;
    if (codeParent) {
      if (codeElement.nextSibling) {
        codeParent.insertBefore(newParagraph, codeElement.nextSibling);
      } else {
        codeParent.appendChild(newParagraph);
      }
    }
    
    setTimeout(() => {
      const newRange = document.createRange();
      newRange.selectNodeContents(newParagraph);
      newRange.collapse(true);
      
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(newRange);
      contentArea.focus();
    }, 10);
    return true;
  }
});

LiteEditorKeyboardManager.registerHandler(80, 'font, span[style*="font-family"]', (e, fontElement, currentElement, range, contentArea) => {
  // 시스템 폰트 확인 함수 (fontFamily.js에서 가져옴)
  const isSystemFont = (fontFamily) => {
    if (!fontFamily) return true;
    const systemFonts = ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Arial', 'sans-serif', 'serif', 'monospace'];
    return systemFonts.some(sysFont => fontFamily.toLowerCase().includes(sysFont.toLowerCase()));
  };
  
  let isInFontArea = false;
  
  if (fontElement.tagName === 'FONT') {
    isInFontArea = true;
  } else if (fontElement.tagName === 'SPAN') {
    const fontFamily = fontElement.style.fontFamily;
    isInFontArea = fontFamily && !isSystemFont(fontFamily);
  }
  
  if (!isInFontArea) return false;
  
  if (e.shiftKey) {
    // ✅ 수정: execCommand 대신 직접 <br> 태그 삽입 (다른 플러그인과 동일한 방식)
    const br = document.createElement('br');
    range.deleteContents();
    range.insertNode(br);
    range.setStartAfter(br);
    range.collapse(true);
    
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  } else {
    // font에서 Enter: 블록 밖으로 나가기
    const parentBlock = fontElement.closest('p, div, h1, h2, h3, h4, h5, h6, li') || fontElement;
    const newP = document.createElement('p');
    newP.appendChild(document.createTextNode('\u00A0'));
    
    if (parentBlock.parentNode) {
      parentBlock.parentNode.insertBefore(newP, parentBlock.nextSibling);
      
      const newRange = document.createRange();
      newRange.setStart(newP.firstChild, 0);
      newRange.collapse(true);
      
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
    return true;
  }
});

LiteEditorKeyboardManager.registerHandler(70, 'font[color], span[style*="color:"]', (e, colorElement, currentElement, range, contentArea) => {
  if (e.shiftKey) {
    // ✅ 수정: color 내부에서 Shift+Enter도 직접 처리
    const br = document.createElement('br');
    range.deleteContents();
    range.insertNode(br);
    range.setStartAfter(br);
    range.collapse(true);
    
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  } else {
    // color에서 Enter: 블록 밖으로 나가기
    const parentBlock = colorElement.closest('p, div, h1, h2, h3, h4, h5, h6, li') || colorElement;
    const newP = document.createElement('p');
    newP.appendChild(document.createTextNode('\u00A0'));
    
    if (parentBlock.parentNode) {
      parentBlock.parentNode.insertBefore(newP, parentBlock.nextSibling);
      
      const newRange = document.createRange();
      newRange.setStart(newP.firstChild, 0);
      newRange.collapse(true);
      
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
    return true;
  }
});

LiteEditorKeyboardManager.registerHandler(60, 'span[style*="background-color"]', (e, highlightElement, currentElement, range, contentArea) => {
  // highlight 감지 함수 (highlight.js에서 가져옴)
  const isHighlightElement = (element) => {
    if (!element || element.tagName !== 'SPAN') return false;
    const bgColor = element.style.backgroundColor;
    return bgColor && bgColor !== 'transparent';
  };
  
  if (!isHighlightElement(highlightElement)) return false;
  
  if (e.shiftKey) {
    // highlight 내부에서 Shift+Enter: 줄바꿈
    const br = document.createElement('br');
    range.deleteContents();
    range.insertNode(br);
    range.setStartAfter(br);
    range.collapse(true);
    
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  } else {
    // highlight에서 Enter: 블록 밖으로 나가기
    const parentBlock = highlightElement.closest('p, div, h1, h2, h3, h4, h5, h6, li') || highlightElement;
    const newP = document.createElement('p');
    newP.appendChild(document.createTextNode('\u00A0'));
    
    if (parentBlock.parentNode) {
      parentBlock.parentNode.insertBefore(newP, parentBlock.nextSibling);
      
      const newRange = document.createRange();
      newRange.setStart(newP.firstChild, 0);
      newRange.collapse(true);
      
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
    return true;
  }
});

// 5. Heading 플러그인 등록
LiteEditorKeyboardManager.registerHandler(90, 'h1, h2, h3', (e, headingElement, currentElement, range, contentArea) => {
  if (e.shiftKey) {
    // heading 내부에서 Shift+Enter: 기본 동작
    return false;
  } else {
    // heading에서 Enter: 블록 밖으로 나가기
    const newP = document.createElement('p');
    newP.appendChild(document.createTextNode('\u00A0'));
    
    const parentBlock = headingElement.closest('div, section, article') || headingElement;
    if (parentBlock.parentNode) {
      parentBlock.parentNode.insertBefore(newP, parentBlock.nextSibling);
      
      const newRange = document.createRange();
      newRange.setStart(newP.firstChild, 0);
      newRange.collapse(true);
      
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
    return true;
  }
});

// 모든 contentArea에 한 번만 등록
document.addEventListener('keydown', (e) => {
  const contentArea = e.target.closest('[contenteditable="true"]');
  if (contentArea) {
    LiteEditorKeyboardManager.handleKeydown(e, contentArea);
  }
}, true); 