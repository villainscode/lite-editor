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
      // 서식 초기화 함수 호출
      resetFormattingInSelection(contentArea);
      return true;
    }
  });
  
  /**
   * 선택 영역의 서식을 초기화하는 함수
   */
  function resetFormattingInSelection(contentArea) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    if (range.collapsed) return;
    
    // 포커스 확인
    if (document.activeElement !== contentArea) {
      contentArea.focus();
    }
    
    try {
      // 시작 전 범위의 정보를 저장
      const startContainer = range.startContainer;
      const startOffset = range.startOffset;
      const endContainer = range.endContainer;
      const endOffset = range.endOffset;
      
      // 텍스트 콘텐츠만 추출 (나중에 사용할 수 있음)
      const plainText = range.toString();
      
      // 1. 먼저 브라우저 내장 removeFormat 명령 실행
      document.execCommand('removeFormat');
      
      // 2. removeFormat으로 처리되지 않는 특수 인라인 태그 제거
      const tagsToRemove = ['SUB', 'SUP', 'STRIKE', 'CODE', 'FONT', 'A', 'SPAN', 'BLOCKQUOTE', "H1", "H2", "H3"];
      
      // 현재 선택 영역 확인 (removeFormat 후 선택 영역이 변경되었을 수 있음)
      if (selection.rangeCount === 0) {
        console.log('선택 영역이 사라졌습니다. 복원 시도...');
        
        // 원래 선택 영역 복원 시도
        const newRange = document.createRange();
        try {
          newRange.setStart(startContainer, startOffset);
          newRange.setEnd(endContainer, endOffset);
          selection.removeAllRanges();
          selection.addRange(newRange);
        } catch (e) {
          console.error('선택 영역 복원 실패:', e);
          // 복원에 실패하면 선택 영역이 없는 상태로 함수 종료
          return;
        }
      }
      
      // 새로운 선택 영역 범위
      const currentRange = selection.getRangeAt(0);
      
      // 3. 선택 영역의 공통 조상 컨테이너 찾기
      let commonAncestor = currentRange.commonAncestorContainer;
      if (commonAncestor.nodeType === Node.TEXT_NODE) {
        commonAncestor = commonAncestor.parentNode;
      }
      
      // 4. 지정된 인라인 태그 제거 함수
      function unwrapTags(node) {
        if (!node) return;
        
        // 노드 복사본으로 작업 (실시간 변경 피하기 위함)
        const childNodes = Array.from(node.childNodes);
        
        // 자식 노드 먼저 처리 (깊이 우선)
        childNodes.forEach(child => {
          if (child.nodeType === Node.ELEMENT_NODE) {
            unwrapTags(child);
          }
        });
        
        // 현재 노드가 제거 대상 태그인지 확인
        if (node.nodeType === Node.ELEMENT_NODE && 
            tagsToRemove.includes(node.tagName) &&
            node.parentNode) {
          
          // 태그 언래핑 (내용물만 보존)
          const parent = node.parentNode;
          while (node.firstChild) {
            parent.insertBefore(node.firstChild, node);
          }
          parent.removeChild(node);
        }
      }
      
      // 5. 선택 영역 내 태그 제거 실행
      unwrapTags(commonAncestor);
      
      // 6. 텍스트 기반 직접 교체 방식으로 모든 서식 제거
      // 이 방법은 모든 서식을 제거하면서 불필요한 라인이 추가되는 문제를 방지
      const currentText = currentRange.toString();
      
      // 서식 제거 이후 내용이 많이 변경되었거나, blockquote/리스트 등이 포함된 경우만 처리
      if (currentText !== plainText || 
          (commonAncestor.nodeType === Node.ELEMENT_NODE && 
           (commonAncestor.querySelector('blockquote, ul, ol, li, h1, h2, h3, h4, h5, h6') ||
            commonAncestor.tagName.match(/^(BLOCKQUOTE|UL|OL|LI|H[1-6])$/i)))) {
        
        console.log('복잡한 서식 감지, 텍스트 기반 교체 실행');
        
        // 1단계: 현재 선택 영역 내용 완전히 삭제
        currentRange.deleteContents();
        
        // 2단계: 단순 텍스트 노드 생성
        const textNode = document.createTextNode(plainText);
        
        // 3단계: 노드 삽입
        currentRange.insertNode(textNode);
        
        // 4단계: 노드 재선택
        selection.removeAllRanges();
        const textRange = document.createRange();
        textRange.selectNode(textNode);
        selection.addRange(textRange);
        
        // 5단계: 텍스트 노드의 부모가 인라인 요소일 경우에만 조정
        // (불필요한 추가 p 태그 방지)
        const parent = textNode.parentNode;
        if (parent && parent.tagName !== 'P' && parent.tagName !== 'DIV') {
          // 부모 요소가 p나 div가 아닌 경우만 포맷 블록 실행
          document.execCommand('formatBlock', false, 'p');
        }
      }
      
      // 7. 선택 영역 복원 확인
      const restoredSelection = window.getSelection();
      const isSelectionRestored = restoredSelection && 
                                restoredSelection.rangeCount > 0 && 
                                !restoredSelection.getRangeAt(0).collapsed;
      
      console.log('선택 영역 복원됨:', isSelectionRestored);
      
      // 8. 선택 영역이 복원되지 않았다면 다시 시도
      if (!isSelectionRestored && contentArea.contains(startContainer) && contentArea.contains(endContainer)) {
        try {
          const finalRange = document.createRange();
          finalRange.setStart(startContainer, startOffset);
          finalRange.setEnd(endContainer, endOffset);
          selection.removeAllRanges();
          selection.addRange(finalRange);
          console.log('선택 영역 복원 재시도 성공');
        } catch (e) {
          console.error('선택 영역 최종 복원 실패:', e);
        }
      }
    } catch (error) {
      // 오류 발생 시 fallback 처리: 텍스트만 보존
      console.error('서식 초기화 중 오류 발생:', error);
      try {
        // 순수 텍스트만 삽입
        const plainText = range.toString();
        range.deleteContents();
        const textNode = document.createTextNode(plainText);
        range.insertNode(textNode);
        
        // 선택 영역 복원
        selection.removeAllRanges();
        const newRange = document.createRange();
        newRange.selectNode(textNode);
        selection.addRange(newRange);
      } catch (fallbackError) {
        console.error('fallback 처리 중 오류:', fallbackError);
      }
    }
    
    console.log('서식 초기화 완료');
  }
})();