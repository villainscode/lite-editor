/**
 * LiteEditor Blockquote Plugin
 * 인용구(blockquote) 서식 플러그인 - 단순화 버전
 */

(function() {
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

  // ✅ 공통 로직을 별도 함수로 추출
  function executeBlockquoteAction(contentArea, triggerSource = 'unknown') {
    if (!contentArea) return;
    if (!PluginUtil.utils.canExecutePlugin(contentArea)) return;
    
    contentArea.focus();
    
    // 히스토리 기록
    if (window.LiteEditorHistory) {
      window.LiteEditorHistory.forceRecord(contentArea, `Before Blockquote (${triggerSource})`);
    }
    
    document.execCommand('formatBlock', false, 'blockquote');
    
    // ✅ 커서를 텍스트 마지막으로 이동
    setTimeout(() => {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.collapse(false); // false = 끝으로 이동
        selection.removeAllRanges();
        selection.addRange(range);
      }
      
      // 히스토리 완료 기록
      if (window.LiteEditorHistory) {
        window.LiteEditorHistory.recordState(contentArea, `After Blockquote (${triggerSource})`);
      }
    }, 100);
  }

  // ✅ 플러그인 등록 (간소화)
  PluginUtil.registerPlugin('blockquote', {
    title: 'Blockquote',
    icon: 'format_quote',
    action: function(contentArea, buttonElement, event) {
      if (event) event.preventDefault();
      executeBlockquoteAction(contentArea, 'Button Click');
    }
  });

  // ✅ 단축키 등록 (Alt+Shift+B)
  document.addEventListener('keydown', function(e) {
    const contentArea = e.target.closest('[contenteditable="true"]');
    if (!contentArea) return;
    
    const editorContainer = contentArea.closest('.lite-editor, .lite-editor-content');
    if (!editorContainer) return;

    const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);

    // ✅ Alt+Shift+B (Mac/Windows 공통)
    if (e.altKey && e.shiftKey && !e.metaKey && !e.ctrlKey && e.key.toLowerCase() === 'b') {
      try {
        e.preventDefault();
        e.stopPropagation();
        executeBlockquoteAction(contentArea, 'Alt+Shift+B');
      } catch (error) {
        if (window.errorHandler) {
          errorHandler.logWarning('BlockquotePlugin', 'Alt+Shift+B 처리 중 확장 프로그램 충돌', error);
        }
      }
    }
  }, true);
})();
