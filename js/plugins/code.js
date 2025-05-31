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
        executeCodeAction(contentArea);
      });

      return button;
    }
  });

  // Code 단축키 (Alt+C)
  LiteEditor.registerShortcut('code', {
    key: 'c',
    alt: true,
    action: executeCodeAction
  });

  /**
   * 코드 삽입 공통 로직
   */
  function executeCodeAction(contentArea) {
    // 레이어 체크 및 포커스 확인
    const canExecute = util.utils.canExecutePlugin(contentArea);
    
    if (!canExecute) {
        return;
    }
    
    contentArea.focus();
    
    // 선택 영역 확인
    const selection = util.selection.getSafeSelection();
    
    if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        if (!range.collapsed) {
            // 선택 영역이 있는 경우: 기존 로직
            const offsets = util.selection.calculateOffsets(contentArea);
            
            let selectedText = range.toString();
            const trimmedText = selectedText.replace(/[\s\n\r]+$/, '');
            selectedText = trimmedText;
            
            const formattedText = selectedText
              .split('\n')
              .map(line => line.trim().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'))
              .join('\n');
            
            range.deleteContents();
            
            const codeElement = document.createElement('code');
            codeElement.setAttribute('data-selection-marker', 'true');
            codeElement.style.display = 'block';
            codeElement.style.width = '100%';
            codeElement.style.padding = '10px';
            codeElement.style.borderRadius = '4px';
            codeElement.style.fontFamily = 'monospace';
            codeElement.innerHTML = formattedText;
            
            range.insertNode(codeElement);
            
            util.selection.restoreSelectionByMarker(contentArea, 'code[data-selection-marker="true"]', 10)
              .then(success => {
                if (!success) {
                  util.selection.restoreFromOffsets(contentArea, offsets);
                  contentArea.focus();
                }
              });
        } else {
            // 선택 영역이 없는 경우: 기본 코드 블록 삽입
            insertDefaultCodeBlock(range);
        }
    } else {
        // 선택 객체가 없는 경우: 맨 끝에 기본 코드 블록 삽입
        insertDefaultCodeBlockAtEnd(contentArea);
    }
  }

  /**
   * 기본 코드 요소 생성 (통일된 스타일)
   */
  function createDefaultCodeElement() {
    const codeElement = document.createElement('code');
    codeElement.textContent = '\u200B'; // Zero-width space
    
    // 멀티라인과 동일한 스타일 적용
    codeElement.style.display = 'block';
    codeElement.style.width = '100%';
    codeElement.style.padding = '10px';
    codeElement.style.borderRadius = '4px';
    codeElement.style.fontFamily = 'monospace';
    codeElement.style.backgroundColor = '#f8f8f8';
    codeElement.style.border = '1px solid #e0e0e0';
    codeElement.contentEditable = 'true';
    
    return codeElement;
  }

  /**
   * 기본 한줄짜리 코드 블록 삽입
   */
  function insertDefaultCodeBlock(range) {
    const codeElement = createDefaultCodeElement();
    range.insertNode(codeElement);
    
    // 포커스 + 커서 끝으로
    setTimeout(() => {
        codeElement.focus();
        const range = document.createRange();
        range.selectNodeContents(codeElement);
        range.collapse(false);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }, 0);
  }
  
  /**
   * 맨 끝에 기본 코드 블록 삽입
   */
  function insertDefaultCodeBlockAtEnd(contentArea) {
    const codeElement = createDefaultCodeElement();
    contentArea.appendChild(codeElement);
    
    setTimeout(() => codeElement.focus(), 0);
  }
})();