/**
 * LiteEditor Blockquote Plugin
 * 인용구(blockquote) 서식 플러그인
 */

(function() {
  // 인용구 플러그인
  LiteEditor.registerPlugin('blockquote', {
    title: 'Blockquote',
    icon: 'format_quote',
    action: function(contentArea) {
      // 실행 취소/다시 실행을 위한 상태 저장
      if (contentArea.execCommand) {
        contentArea.execCommand('styleWithCSS', false, false);
      }
      
      const selection = window.getSelection();
      if (!selection.rangeCount) return;
      
      const range = selection.getRangeAt(0);
      if (range.collapsed) return; // 선택 영역이 없으면 중단
      
      // blockquote에 대해서는 일반 태그와 처리 로직이 조금 다르기 때문에
      // 개별 처리합니다
      
      // 선택 영역이 blockquote 내부에 있는지 확인하는 함수
      const isWithinBlockquote = function() {
        let node = range.commonAncestorContainer;
        
        // 텍스트 노드인 경우 부모 노드로 이동
        if (node.nodeType === 3) {
          node = node.parentNode;
        }
        
        // 상위로 올라가면서 blockquote 태그 확인
        while (node && node !== contentArea) {
          if (node.nodeName.toLowerCase() === 'blockquote') {
            return node; // blockquote를 찾으면 해당 노드 반환
          }
          node = node.parentNode;
        }
        
        return null; // blockquote가 없으면 null 반환
      };
      
      const blockquote = isWithinBlockquote();
      
      if (blockquote) {
        // blockquote 내부에 있는 경우, 제거 로직 실행
        try {
          // 1. blockquote의 내용을 보존
          const fragment = document.createDocumentFragment();
          while (blockquote.firstChild) {
            fragment.appendChild(blockquote.firstChild);
          }
          
          // 2. blockquote를 fragment로 교체
          blockquote.parentNode.replaceChild(fragment, blockquote);
          
          // 3. 선택 영역 복원 (위치가 변경되었을 수 있음)
          selection.removeAllRanges();
          selection.addRange(range);
          
        } catch (e) {
          console.error('인용구 제거 오류:', e);
          // 기본 동작으로 폴백
          document.execCommand('formatBlock', false, 'div');
        }
      } else {
        // blockquote가 없는 경우, 적용 로직 실행
        try {
          // 1. 선택된 텍스트를 추출
          const fragment = range.extractContents();
          
          // 2. blockquote 요소 생성하고 텍스트 삽입
          const quote = document.createElement('BLOCKQUOTE');
          quote.appendChild(fragment);
          range.insertNode(quote);
          
          // 3. 스타일 적용 (기본 blockquote 스타일)
          quote.style.borderLeft = '3px solid #ccc';
          quote.style.paddingLeft = '10px';
          quote.style.margin = '10px 0';
          
          // 4. 선택 영역 업데이트
          selection.removeAllRanges();
          const newRange = document.createRange();
          newRange.selectNodeContents(quote);
          selection.addRange(newRange);
          
        } catch (e) {
          console.error('인용구 적용 오류:', e);
          // 기본 동작으로 폴백
          document.execCommand('formatBlock', false, 'blockquote');
        }
      }
    }
  });
});
