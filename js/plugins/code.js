/**
 * LiteEditor Code Plugin
 * 텍스트 코드 서식 플러그인
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
        
        // 선택 영역이 있는 경우에만 처리
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          if (!range.collapsed) {
            // 선택 영역의 오프셋 저장
            const offsets = util.selection.calculateOffsets(contentArea);
            
            // 선택된 텍스트를 code 태그로 감싸기
            document.execCommand('insertHTML', false, '<code>' + range.toString() + '</code>');
            
            // 선택 영역 복구
            setTimeout(() => {
              util.selection.restoreFromOffsets(contentArea, offsets);
              contentArea.focus();
            }, 10);
          }
        }
      });

      return button;
    }
  });
})();