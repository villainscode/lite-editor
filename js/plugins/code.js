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
            let selectedText = range.toString();
            
            // 선택된 텍스트의 줄 수 계산 (공백 제거 후)
            const trimmedText = selectedText.replace(/[\s\n\r]+$/, '');
            
            // 선택된 텍스트의 마지막에 있는 불필요한 줄바꿈 제거
            selectedText = trimmedText;
            
            // 각 줄의 공백을 정리하면서 HTML 이스케이프 처리
            const formattedText = selectedText
              .split('\n')
              .map(line => line.trim().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'))
              .join('\n');
            
            // 선택 영역 삭제 후 코드 태그 삽입
            range.deleteContents();
            
            // 코드 요소 생성 및 삽입
            const codeElement = document.createElement('code');
            codeElement.setAttribute('data-selection-marker', 'true');
            codeElement.innerHTML = formattedText;
            range.insertNode(codeElement);
            
            // 선택 영역 복원 - 마커를 찾아서 복원
            setTimeout(() => {
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