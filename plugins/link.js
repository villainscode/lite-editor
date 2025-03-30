/**
 * LiteEditor Link Plugin
 * 링크 삽입 및 편집 플러그인
 */

(function() {
  LiteEditor.registerPlugin('link', {
    title: 'Link',
    icon: 'link',
    action: function(contentArea, buttonElement, event) {
      // 이벤트 전파 제어 (하이라이트 플러그인과 동일하게)
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      
      // 현재 선택 영역 저장
      if (window.liteEditorSelection) {
        window.liteEditorSelection.save();
      }
      
      // 포커스 확인
      contentArea.focus();
      
      // 선택 영역 가져오기
      const selection = window.getSelection();
      const selectedText = selection.toString();
      
      // 초기 링크 URL
      let initialUrl = '';
      
      // 선택한 텍스트가 이미 링크인지 확인
      let existingLink = null;
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let node = range.commonAncestorContainer;
        
        // 텍스트 노드인 경우 부모 노드 확인
        if (node.nodeType === 3) {
          node = node.parentNode;
        }
        
        // 부모 노드중에 A 태그가 있는지 확인
        existingLink = node.closest('a');
        if (existingLink) {
          initialUrl = existingLink.href;
        }
      }
      
      // 링크 URL 입력 받기
      let url = window.prompt('링크 URL을 입력해주세요:', initialUrl);
      
      // 취소 버튼 클릭 또는 빈 문자열인 경우 종료
      if (url === null) return;
      
      // URL 유효성 검사
      if (url) {
        // 프로토콜이 없는 경우 http:// 추가
        if (!/^https?:\/\//i.test(url)) {
          url = 'http://' + url;
        }
        
        // 이미 링크가 있는 경우 링크 갱신
        if (existingLink) {
          existingLink.href = url;
        } else {
          // 선택된 텍스트가 있는 경우
          if (selectedText) {
            // 표준 명령 사용 시도
            if (document.queryCommandSupported('createLink')) {
              // 링크 생성 시 선택 영역 복원 및 명령 실행
              if (window.liteEditorSelection) {
                window.liteEditorSelection.restore();
              }
              
              // 하이라이트와 동일하게 지연 후 명령 실행
              setTimeout(() => {
                document.execCommand('createLink', false, url);
                
                // 선택 영역 재복원
                setTimeout(() => {
                  if (window.liteEditorSelection) {
                    window.liteEditorSelection.restore();
                  }
                }, 10);
              }, 50);
            } else {
              // 수동 링크 생성 (fallback)
              const linkHtml = '<a href="' + url + '" target="_blank">' + selectedText + '</a>';
              document.execCommand('insertHTML', false, linkHtml);
            }
          } else {
            // 선택된 텍스트가 없는 경우
            const linkText = window.prompt('링크 텍스트를 입력해주세요:', url);
            if (linkText) {
              const linkHtml = '<a href="' + url + '" target="_blank">' + linkText + '</a>';
              document.execCommand('insertHTML', false, linkHtml);
            }
          }
        }
      } else if (existingLink) {
        // URL이 비어있고 기존 링크가 있는 경우, 링크 제거
        // 링크 내용을 보존하면서 링크 태그만 제거
        const textContent = existingLink.textContent;
        const range = document.createRange();
        range.selectNodeContents(existingLink);
        selection.removeAllRanges();
        selection.addRange(range);
        document.execCommand('unlink', false, null);
      }
      
      // 선택 영역 복원 유지
      setTimeout(() => {
        if (window.liteEditorSelection) {
          window.liteEditorSelection.restore();
        }
      }, 10);
    }
  });
})();
