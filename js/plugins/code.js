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
        
        // 선택 영역이 있는 경우에만 처리
        const selection = util.selection.getSafeSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          if (!range.collapsed) {
            // 선택 영역의 오프셋 저장
            const offsets = util.selection.calculateOffsets(contentArea);
            
            // 선택된 텍스트 가져오기
            const selectedText = range.toString();
            const selectedLength = selectedText.length;
            
            // 각 줄의 공백을 정리하면서 HTML 이스케이프 처리
            const formattedText = selectedText
              .split('\n')
              .map(line => line.trim().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'))
              .join('\n');
            
            // 선택 영역 블록 보존을 위한 마커 추가
            document.execCommand('insertHTML', false, 
              `<code data-selection-marker="true">${formattedText}</code>`);
            
            // 선택 영역 복원 - 마커를 찾아서 복원
            setTimeout(() => {
              // 마커가 있는 code 태그 찾기
              const markerElement = contentArea.querySelector('code[data-selection-marker="true"]');
              
              if (markerElement) {
                // 마커 속성 제거
                markerElement.removeAttribute('data-selection-marker');
                
                // code 태그 내부의 텍스트를 선택
                const range = document.createRange();
                range.selectNodeContents(markerElement);
                
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
                
                contentArea.focus();
              } else {
                // 마커를 찾지 못한 경우 폴백으로 오프셋 기반 복원 사용
                util.selection.restoreFromOffsets(contentArea, offsets);
                contentArea.focus();
              }
            }, 10);
          }
        }
      });

      return button;
    }
  });
})();