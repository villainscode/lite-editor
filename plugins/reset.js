/**
 * LiteEditor 서식 초기화 플러그인
 * 선택된 텍스트의 모든 서식(인라인 및 블록 레벨)을 제거합니다.
 */
(function() {
  // 서식 초기화 플러그인 - 완전히 새로운 방식으로 구현
  LiteEditor.registerPlugin('reset', {
    title: 'Clear Formatting',
    icon: 'format_clear',
    action: function(contentArea) {
      const selection = window.getSelection();
      if (!selection.rangeCount) return;
      
      const range = selection.getRangeAt(0);
      if (range.collapsed) return;
      
      // 선택된 텍스트 추출
      const plainText = range.toString();
      if (!plainText.trim()) return; // 빈 텍스트는 처리하지 않음
      
      // 디버깅 로그 추가
      console.log('선택된 내용:', plainText);
      
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
      
      // 완전히 새로운 방식 - 순수 텍스트만 추출 후 새로운 요소로 대체
      console.log('컨텐츠 바꾸기 방식으로 실행');
      
      // 1. 현재 선택된 순수 텍스트만 추출
      const selectedText = range.toString().trim();
      if (!selectedText) {
        console.log('선택된 텍스트 없음');
        return;
      }
      
      console.log('선택된 텍스트:', selectedText);
      
      // 2. 선택 영역 저장 (기존 영역에 다시 삽입하기 위해)
      const selectionRange = range.cloneRange();
      
      // 3. 선택된 영역의 내용을 완전히 삭제
      selectionRange.deleteContents();
      
      // 4. 새로운 노드 생성 - 순수 텍스트만 포함
      const newTextNode = document.createTextNode(selectedText);
      
      // 5. 새로운 p 태그 생성
      const newParagraph = document.createElement('p');
      newParagraph.appendChild(newTextNode);
      
      // 6. 아무런 스타일 없이 초기화 (원하는 기본 스타일만 설정)
      newParagraph.style.margin = '0';
      newParagraph.style.padding = '0';
      
      // 7. 새로운 노드를 원래 위치에 삽입
      selectionRange.insertNode(newParagraph);
      
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
      
      // 7. 새로 삽입된 요소에 추가 스타일 설정 (필요한 경우)
      try {
        // 새로 생성된 paragraphNode에 추가 스타일 설정을 할 수 있음
        // 예: 기본 가로 정렬을 left로 강제 설정
        if (newParagraph) {
          // 만약 중앙정렬이나 다른 정렬이 유지되지 않도록 안전장치
          newParagraph.style.textAlign = 'left';
          
          // 추가로 모든 스타일 및 클래스 제거 확인
          newParagraph.removeAttribute('class');
          newParagraph.removeAttribute('align');
          
          // 구글 스타일 글자 스타일 초기화
          Object.assign(newParagraph.style, resetStyles);
          
          console.log('새 노드 스타일 초기화 완료');
        }
        
        // 8. 선택 영역 재설정
        const selection = window.getSelection();
        selection.removeAllRanges();
        const newRange = document.createRange();
        newRange.selectNodeContents(newParagraph);
        selection.addRange(newRange);
        
        console.log('선택 영역 재설정 완료');

        // 이제 만약 적용된 요소가 span이나 다른 인라인 요소였다면 p로 변환
        // 이 과정은 document.execCommand('formatBlock', false, 'p')에서 수행
        
        // 추가로 선택된 요소의 하위 요소들 처리는 더 이상 필요 없음
      } catch (e) {
        console.error('태그 정리 중 오류:', e);
      }
      
      // 8. 추가 안정화 조치 - 지연을 통해 추가 점검
      setTimeout(() => {
        try {
          // 현재 선택 확인
          const currentSelection = window.getSelection();
          if (!currentSelection.rangeCount) return;
          
          // 현재 선택된 요소를 찾아서 추가 검사
          const focusNode = currentSelection.focusNode;
          let currentNode = focusNode;
          
          // 텍스트 노드면 부모로 이동
          if (currentNode.nodeType === Node.TEXT_NODE) {
            currentNode = currentNode.parentNode;
          }
          
          console.log('추가 점검 노드 태그:', currentNode.tagName);
          
          // center 정렬이 여전히 남아있는지 확인
          if (currentNode.style && (currentNode.style.textAlign === 'center' || 
              currentNode.getAttribute('align') === 'center')) {
            console.log('center 정렬 발견 - 강제 제거');
            currentNode.style.textAlign = 'left';
            currentNode.removeAttribute('align');
          }
          
          // 중요: 필요한 경우 부모 노드도 확인
          if (currentNode.parentNode && currentNode.parentNode.tagName !== 'BODY') {
            const parentNode = currentNode.parentNode;
            if (parentNode.style && (parentNode.style.textAlign === 'center' || 
                parentNode.getAttribute('align') === 'center')) {
              console.log('부모에서 center 정렬 발견 - 강제 제거');
              parentNode.style.textAlign = 'left';
              parentNode.removeAttribute('align');
            }
          }
          
          // 메모: 더 이상 부모 노드 가져오기/바꾸기 로직이 필요하지 않음
          // 정확한 범위만 처리하기 때문
        } catch (e) {
          console.error('추가 안정화 조치 오류:', e);
        }
      }, 10);
      
      // 9. 최종 아웃풋을 사용자가 확인할 수 있도록 함
      console.log('순수 텍스트만 남기기 방식으로 완전히 서식 초기화 완료');
      
      // 10. 포커스 유지
      contentArea.focus();
    }
  });
})();
