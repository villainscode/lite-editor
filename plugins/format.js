/**
 * LiteEditor Format Plugins
 * 텍스트 서식 관련 플러그인 (굵게, 기울임, 밑줄, 취소선)
 */

(function() {
  // 굵게 플러그인
  LiteEditor.registerPlugin('bold', {
    title: 'Bold',
    icon: 'format_bold',
    action: function(contentArea) {
      // Range API를 사용한 DOM 조작
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        // 현재 선택범위가 이미 b 태그 안에 있는지 확인
        const range = selection.getRangeAt(0);
        let container = range.commonAncestorContainer;
        
        // 텍스트 노드인 경우 부모 노드 확인
        if (container.nodeType === 3) { // Text node
          container = container.parentNode;
        }
        
        // 이미 굵게 태그가 적용된 경우 해제
        if (container.nodeName === 'B' || container.nodeName === 'STRONG' || 
            container.closest('b') || container.closest('strong')) {
          // 기존 태그 제거를 위해 execCommand 사용
          document.execCommand('removeFormat', false, null);
        } else {
          // 새 B 태그 생성 및 적용
          const strong = document.createElement('STRONG');
          strong.appendChild(range.extractContents());
          range.insertNode(strong);
          
          // 선택 영역 정리
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    }
  });
  
  // 기울임 플러그인
  LiteEditor.registerPlugin('italic', {
    title: 'Italic',
    icon: 'format_italic',
    action: function(contentArea) {
      // Range API를 사용한 DOM 조작
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let container = range.commonAncestorContainer;
        
        // 텍스트 노드인 경우 부모 노드 확인
        if (container.nodeType === 3) {
          container = container.parentNode;
        }
        
        // 이미 기울임 태그가 적용된 경우 해제
        if (container.nodeName === 'I' || container.nodeName === 'EM' || 
            container.closest('i') || container.closest('em')) {
          document.execCommand('removeFormat', false, null);
        } else {
          // 새 I 태그 생성 및 적용
          const italic = document.createElement('EM');
          italic.appendChild(range.extractContents());
          range.insertNode(italic);
          
          // 선택 영역 정리
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    }
  });
  
  // 밑줄 플러그인
  LiteEditor.registerPlugin('underline', {
    title: 'Underline',
    icon: 'format_underlined',
    action: function(contentArea) {
      // Range API를 사용한 DOM 조작
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let container = range.commonAncestorContainer;
        
        // 텍스트 노드인 경우 부모 노드 확인
        if (container.nodeType === 3) {
          container = container.parentNode;
        }
        
        // 이미 밑줄 태그가 적용된 경우 해제
        if (container.nodeName === 'U' || container.closest('u')) {
          document.execCommand('removeFormat', false, null);
        } else {
          // 새 U 태그 생성 및 적용
          const underline = document.createElement('U');
          underline.appendChild(range.extractContents());
          range.insertNode(underline);
          
          // 선택 영역 정리
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    }
  });
  
  // 취소선 플러그인
  LiteEditor.registerPlugin('strike', {
    title: 'Strikethrough',
    icon: 'strikethrough_s',
    action: function(contentArea) {
      // Range API를 사용한 DOM 조작
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let container = range.commonAncestorContainer;
        
        // 텍스트 노드인 경우 부모 노드 확인
        if (container.nodeType === 3) {
          container = container.parentNode;
        }
        
        // 이미 취소선 태그가 적용된 경우 해제
        if (container.nodeName === 'STRIKE' || container.nodeName === 'S' || 
            container.closest('strike') || container.closest('s')) {
          document.execCommand('removeFormat', false, null);
        } else {
          // 새 S 태그 생성 및 적용
          const strike = document.createElement('S');
          strike.appendChild(range.extractContents());
          range.insertNode(strike);
          
          // 선택 영역 정리
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    }
  });
  
  // 코드 플러그인
  LiteEditor.registerPlugin('code', {
    title: 'Code',
    icon: 'code',
    action: function(contentArea) {
      // Range API를 사용한 DOM 조작
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let container = range.commonAncestorContainer;
        
        // 텍스트 노드인 경우 부모 노드 확인
        if (container.nodeType === 3) {
          container = container.parentNode;
        }
        
        // 이미 코드 태그가 적용된 경우 제거
        if (container.nodeName === 'CODE' || container.closest('code')) {
          document.execCommand('removeFormat', false, null);
        } else {
          // 새 CODE 태그 생성 및 적용
          const code = document.createElement('CODE');
          code.appendChild(range.extractContents());
          range.insertNode(code);
          
          // 선택 영역 정리
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    }
  });
  
  // 인용구 플러그인
  LiteEditor.registerPlugin('blockquote', {
    title: 'Blockquote',
    icon: 'format_quote',
    action: function(contentArea) {
      // Range API를 사용한 DOM 조작
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let container = range.commonAncestorContainer;
        
        // 텍스트 노드인 경우 부모 노드 확인
        if (container.nodeType === 3) {
          container = container.parentNode;
        }
        
        // 이미 인용구 태그가 적용된 경우 해제
        if (container.nodeName === 'BLOCKQUOTE' || container.closest('blockquote')) {
          document.execCommand('formatBlock', false, 'P');
        } else {
          // 새 BLOCKQUOTE 태그 생성 및 적용
          const blockquote = document.createElement('BLOCKQUOTE');
          blockquote.appendChild(range.extractContents());
          range.insertNode(blockquote);
          
          // 선택 영역 정리
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    }
  });
  
  // 서식 초기화 플러그인
  LiteEditor.registerPlugin('reset', {
    title: 'Clear Formatting',
    icon: 'format_clear',
    action: function(contentArea) {
      document.execCommand('removeFormat', false, null);
    }
  });
})();
