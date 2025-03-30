/**
 * LiteEditor 서식 초기화 플러그인
 * 선택된 텍스트의 모든 서식(인라인 및 블록 레벨)을 제거합니다.
 */
(function() {
  // 서식 초기화 플러그인
  LiteEditor.registerPlugin('reset', {
    title: 'Clear Formatting',
    icon: 'format_clear',
    action: function(contentArea) {
      const selection = window.getSelection();
      if (!selection.rangeCount) return;
      
      const range = selection.getRangeAt(0);
      if (range.collapsed) return;
      
      // 원시적인 방법: 순수 텍스트만 추출
      const plainText = range.toString();
      if (!plainText.trim()) return; // 빈 텍스트는 처리하지 않음
      
      // 선택 영역을 포함하는 가장 가까운 역성 요소 찾기
      // (이것은 다양한 중첩 레벨의 태그를 생략하기 위한 것임)
      let container = range.commonAncestorContainer;
      
      // 텍스트 노드인 경우 부모로 이동
      if (container.nodeType === Node.TEXT_NODE) {
        container = container.parentNode;
      }
      
      // 에디터 콘텐트 영역(최상위 컨테이너) 찾기
      let editorContent = container;
      while (editorContent && !editorContent.classList.contains('lite-editor-content')) {
        editorContent = editorContent.parentNode;
      }
      
      if (!editorContent) {
        editorContent = contentArea; // 찾을 수 없으면 기본 contentArea 사용
      }
      
      // **핵심** 새 접근방식: 선택 영역을 새로운 임시 레이어로 복사
      // 하위 태그 구조를 모두 생략하고 완전히 새로운 P 태그를 생성
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '-9999px';
      document.body.appendChild(tempDiv);
      
      // 순수 텍스트만 삽입
      tempDiv.textContent = plainText;
      
      // 1. 기존 선택 영역 삭제
      range.deleteContents();
      
      // 2. 순수 텍스트만 포함하는 새 P 태그 생성 (완전히 깨끔한 상태)
      const newP = document.createElement('p');
      
      // 3. 모든 스타일 압도적으로 초기화
      const resetStyles = {
        margin: '0', 
        padding: '0',
        textIndent: '0',
        border: 'none',
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none',
        textAlign: 'left',
        backgroundColor: 'transparent',
        color: 'inherit',
        display: 'block',
        lineHeight: 'normal',
        fontSize: 'inherit',
        fontFamily: 'inherit',
        boxShadow: 'none',
        position: 'static',
        float: 'none',
        clear: 'none',
        listStyle: 'none',
        borderSpacing: '0',
        verticalAlign: 'baseline'
      };
      
      // 스타일 적용
      Object.assign(newP.style, resetStyles);
      
      // 4. 순수 텍스트 노드 생성
      const textNode = document.createTextNode(plainText);
      newP.appendChild(textNode);
      
      // 5. 새 P 태그 삽입
      range.insertNode(newP);
      
      // 6. 임시 레이어 제거
      document.body.removeChild(tempDiv);
      
      // 7. 완전히 새로운 방식: 모든 중첩된 블록 태그 제거
      try {
        // 중첩된 태그 제거를 위한 재귀적 함수
        const unwrapNestedTags = (element) => {
          let currentElement = element;
          let replaced = false;
          
          // 상위 태그 검색 (editorContent까지)
          while (currentElement && currentElement.parentNode && currentElement.parentNode !== editorContent) {
            const parent = currentElement.parentNode;
            
            // 태그 이름 검사 - 모든 특수 공백 요소 제거
            if (parent.nodeName === 'BLOCKQUOTE' || 
                parent.nodeName === 'DIV' || 
                parent.nodeName === 'PRE' || 
                parent.nodeName === 'LI' ||
                parent.nodeName === 'UL' ||
                parent.nodeName === 'OL' ||
                parent.nodeName === 'H1' ||
                parent.nodeName === 'H2' ||
                parent.nodeName === 'H3' ||
                parent.nodeName === 'H4' ||
                parent.nodeName === 'H5' ||
                parent.nodeName === 'H6') {
                
              // 현재 태그를 복사하고 부모를 대체
              if (parent.parentNode) {
                console.log('제거: ' + parent.nodeName);
                const clone = currentElement.cloneNode(true);
                parent.parentNode.replaceChild(clone, parent);
                currentElement = clone;
                replaced = true;
                continue; // 새로운 태그로 다시 검사 반복
              }
            }
            
            // 다음 부모로 이동
            currentElement = parent;
          }
          
          return { finalElement: currentElement, wasReplaced: replaced };
        };

        // 재귀적으로 모든 중첩 태그 제거
        let processResult = unwrapNestedTags(newP);
        
        // 만약 중첩 태그가 제거되었다면 참조 업데이트
        if (processResult.wasReplaced) {
          newP = processResult.finalElement;
        }
        
        // 여전히 남은 문제가 있는지 한번 더 확인
        processResult = unwrapNestedTags(newP);
        if (processResult.wasReplaced) {
          newP = processResult.finalElement;
        }
      } catch (e) {
        console.error('태그 정리 중 오류:', e);
      }
      
      // 8. 브라우저 렌더링 순서 문제 대응 및 추가 보호
      setTimeout(() => {
        try {
          // 스타일 다시 적용 - 오래된 스타일을 강제로 덕어쓰기
          Object.assign(newP.style, resetStyles);
          
          // 끝까지 강제 조치: 남아있을 수 있는 코드 제거
          // 중첩된 태그가 여전히 있다면 강제로 innerHTML 재설정
          if (newP.innerHTML !== plainText) {
            // 이것은 마지막 수단 - 완전히 초기화
            newP.innerHTML = '';
            newP.appendChild(document.createTextNode(plainText));
          }
          
          // 추가 조치: 부모 노드가 p가 아닌경우 document.execCommand을 통한 우회 시도
          if (newP.parentNode && newP.parentNode.nodeName !== 'P') {
            const selection = window.getSelection();
            selection.removeAllRanges();
            const tempRange = document.createRange();
            tempRange.selectNodeContents(newP);
            selection.addRange(tempRange);
            
            try {
              // formatBlock을 사용해 P 태그로 강제 변환 시도
              document.execCommand('formatBlock', false, 'p');
            } catch(formatError) {
              console.error('태그 강제 변환 오류:', formatError);
            }
          }
        } catch (e) {
          console.error('스타일 적용 오류:', e);
        }
      }, 10);
      
      // 9. 선택 영역 재설정
      selection.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNodeContents(newP);
      selection.addRange(newRange);
      
      // 10. 포커스 유지
      contentArea.focus();
    }
  });
})();
