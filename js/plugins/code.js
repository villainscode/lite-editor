/**
 * LiteEditor Code Plugin
 * 텍스트 코드 서식 플러그인
 * 여러 줄에 걸친 코드 적용 시에도 줄바꿈이 유지되도록 개선
 */

(function() {
  const util = window.PluginUtil;
  
  LiteEditor.registerPlugin('code', {
    title: 'Code',
    icon: 'code',
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

  // Code 단축키 (Alt+C)
  LiteEditor.registerShortcut('code', {
    key: 'c',
    alt: true,
    action: function(contentArea) {
      applyCodeFormat(contentArea);
    }
  });

  /**
   * 코드 서식 적용 - blockquote와 동일한 UX
   */
  function applyCodeFormat(contentArea) {
    const selection = util.selection.getSafeSelection();
    if (!selection || !selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    
    if (!range.collapsed) {
      // 선택 영역이 있는 경우: 인라인 code 적용
      applyInlineCode(range);
    } else {
      // ✅ execCommand와 동일한 방식으로 블록 찾기
      applyBlockCodeUsingExecCommand(contentArea);
    }
  }

  /**
   * 선택된 영역을 code 태그로 감싸기
   */
  function applyInlineCode(range) {
    const selectedText = range.toString();
    range.deleteContents();
    
    // ✅ 앞뒤 불필요한 공백만 제거, 중간 구조는 보존
    const cleanedText = selectedText.trim();
    
    const codeElement = createStyledCodeElement(cleanedText);
    
    range.insertNode(codeElement);
    
    // ✅ 공통 함수 사용
    focusCodeElementEnd(codeElement);
  }

  /**
   * ✅ execCommand('formatBlock')과 동일한 방식으로 블록 code 적용
   */
  function applyBlockCodeUsingExecCommand(contentArea) {
    // 1. 임시로 pre 태그로 변환 (execCommand가 정확한 블록 찾기)
    document.execCommand('formatBlock', false, 'pre');
    
    // 2. 생성된 pre 태그를 code 태그로 변환
    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return;
      
      const range = selection.getRangeAt(0);
      let preElement = null;
      
      // 현재 선택 영역에서 pre 태그 찾기
      let current = range.startContainer;
      if (current.nodeType === Node.TEXT_NODE) {
        current = current.parentElement;
      }
      
      while (current && current !== contentArea) {
        if (current.tagName === 'PRE') {
          preElement = current;
          break;
        }
        current = current.parentElement;
      }
      
      if (preElement) {
        const codeElement = createStyledCodeElement(preElement.textContent);
        
        // pre를 code로 교체
        preElement.parentNode.replaceChild(codeElement, preElement);
        
        // ✅ 공통 함수 사용
        focusCodeElementEnd(codeElement);
      }
    }, 0);
  }
  /**
   * 스타일이 적용된 code 요소 생성 (공통 함수)
   */
  function createStyledCodeElement(textContent) {
    const codeElement = document.createElement('code');
    codeElement.textContent = textContent || '\u200B';
    
    // ✅ 공통 블록 레벨 스타일
    codeElement.style.display = 'block';
    codeElement.style.fontFamily = 'monospace';
    codeElement.style.backgroundColor = '#f8f8f8';
    codeElement.style.padding = '10px';
    codeElement.style.borderRadius = '4px';
    codeElement.style.border = '1px solid #e0e0e0';
    codeElement.style.whiteSpace = 'pre-wrap';
    codeElement.style.margin = '8px 0';
    codeElement.contentEditable = 'true';
    
    return codeElement;
  }

  /**
   * code 요소 내부 끝으로 커서 이동 및 포커스 (공통 함수)
   */
  function focusCodeElementEnd(codeElement) {
    setTimeout(() => {
      const newRange = document.createRange();
      newRange.selectNodeContents(codeElement);
      newRange.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(newRange);
      codeElement.focus();
    }, 0);
  }
})();