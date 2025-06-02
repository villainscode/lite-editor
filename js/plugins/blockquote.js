/**
 * LiteEditor Blockquote Plugin
 * 인용구(blockquote) 서식 플러그인 - 단순화 버전
 */

(function() {
  // PluginUtil 참조 추가
  const util = window.PluginUtil;

  // ✅ 함수들을 IIFE 최상단에 정의
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

  // 전역 이벤트 리스너가 등록되었는지 확인하는 플래그
  if (!document.querySelector('[data-blockquote-enter-handler]')) {
    // 문서 레벨에서 한 번만 이벤트 핸들러 등록
    document.addEventListener('keydown', function(e) {
      // Enter 키가 아니면 무시
      if (e.key !== 'Enter') return;
      
      // contenteditable 요소 찾기
      const contentArea = e.target.closest('[contenteditable="true"]');
      if (!contentArea) return;
      
      // selection 객체 가져오기 (PluginUtil 활용)
      const selection = PluginUtil.selection.getSafeSelection();
      if (!selection || !selection.rangeCount) return;
      
      const range = selection.getRangeAt(0);
      
      // 부모 blockquote 찾기
      let node = range.startContainer;
      let blockquote = null;
      
      while (node && node !== contentArea) {
        if (node.nodeName.toLowerCase() === 'blockquote') {
          blockquote = node;
          break;
        }
        node = node.parentNode;
      }
      
      // blockquote 내부에서 Enter 키 눌렀을 때
      if (blockquote && !e.shiftKey) {
        e.preventDefault();
        
        // p 태그 생성 및 삽입
        const newP = document.createElement('p');
        newP.innerHTML = '<br>';
        
        if (blockquote.nextSibling) {
          blockquote.parentNode.insertBefore(newP, blockquote.nextSibling);
        } else {
          blockquote.parentNode.appendChild(newP);
        }
        
        // 커서 이동
        const newRange = document.createRange();
        newRange.setStart(newP, 0);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    });
    
    // 중복 등록 방지를 위한 마커 추가
    const marker = document.createElement('span');
    marker.style.display = 'none';
    marker.setAttribute('data-blockquote-enter-handler', 'true');
    document.body.appendChild(marker);
  }
  
  // code block 내부인지 확인하는 함수 추가
  function isInsideCodeBlock(range, contentArea) {
    let currentElement = range.startContainer;
    
    if (currentElement.nodeType === Node.TEXT_NODE) {
      currentElement = currentElement.parentElement;
    }
    
    while (currentElement && currentElement !== contentArea) {
      if (currentElement.classList && currentElement.classList.contains('lite-editor-code-block')) {
        return currentElement;
      }
      currentElement = currentElement.parentElement;
    }
    
    return null;
  }

  // 플러그인 등록 - 기본 동작만 사용
  LiteEditor.registerPlugin('blockquote', {
    title: 'Blockquote',
    icon: 'format_quote',
    
    // ✅ 추가: 단축키용 action 함수 수정
    action: function(contentArea, buttonElement, event) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      
      if (!util.utils.canExecutePlugin(contentArea)) {
        return;
      }
      
      const selection = util.selection.getSafeSelection();
      if (selection && selection.rangeCount) {
        const range = selection.getRangeAt(0);
        
        // code block 내부인지 체크 추가
        const insideCodeBlock = isInsideCodeBlock(range, contentArea);
        if (insideCodeBlock) {
          errorHandler.showToast('Code Block 내부에서는 Blockquote를 사용할 수 없습니다.', 'warning');
          return;
        }
        
        // code 내부인지 체크 추가
        const insideCode = isInsideCodeElement(range, contentArea);
        if (insideCode) {
          errorHandler.showToast('Code 블록 내부에서는 Blockquote를 사용할 수 없습니다.', 'warning');
          return;
        }
      }
      
      contentArea.focus();
      document.execCommand('formatBlock', false, 'blockquote');
    },
    
    customRender: function(toolbar, contentArea) {
      const button = util.dom.createElement('button', {
        className: 'lite-editor-button',
        title: 'Blockquote'
      });

      const icon = util.dom.createElement('i', {
        className: 'material-icons',
        textContent: 'format_quote'
      });
      button.appendChild(icon);

      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!util.utils.canExecutePlugin(contentArea)) {
            return;
        }
        
        const selection = util.selection.getSafeSelection();
        if (selection && selection.rangeCount) {
          const range = selection.getRangeAt(0);
          
          // code block 내부인지 체크 추가
          const insideCodeBlock = isInsideCodeBlock(range, contentArea);
          if (insideCodeBlock) {
            errorHandler.showToast('Code Block 내부에서는 Blockquote를 사용할 수 없습니다.', 'warning');
            return;
          }
          
          // code 내부인지 체크 추가
          const insideCode = isInsideCodeElement(range, contentArea);
          if (insideCode) {
            errorHandler.showToast('Code 블록 내부에서는 Blockquote를 사용할 수 없습니다.', 'warning');
            return;
          }
        }
        
        contentArea.focus();
        document.execCommand('formatBlock', false, 'blockquote');
        
        // ✅ 커서를 텍스트 마지막으로 이동 (code와 일관성)
        setTimeout(() => {
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.collapse(false); // false = 끝으로 이동
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }, 0);
      });

      return button;
    }
  });
})();
