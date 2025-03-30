/**
 * LiteEditor 서식 초기화 플러그인
 * 선택된 텍스트의 모든 서식(인라인 및 블록 레벨)을 제거합니다.
 */
(function() {
  // 서식 초기화 플러그인 등록
  LiteEditor.registerPlugin('reset', {
    title: 'Clear Formatting',
    icon: 'format_clear',
    action: function(contentArea) {
      resetFormattingInSelection(contentArea);
      return true;
    }
  });
  
  // 제거할 인라인 태그 목록
  const INLINE_TAGS = ['B', 'I', 'U', 'STRONG', 'EM', 'MARK', 'SMALL', 'DEL', 'INS', 'SUB', 'SUP', 
                      'STRIKE', 'CODE', 'FONT', 'A', 'SPAN'];
  
  // 제거할 블록 태그 목록
  const BLOCK_TAGS = ['BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'PRE'];
  
  /**
   * 현재 선택 영역의 상세 정보 가져오기
   */
  function getSelectionInfo(contentArea) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    
    const range = selection.getRangeAt(0);
    if (range.collapsed) return null;
    
    // 포커스 확인
    if (document.activeElement !== contentArea) {
      contentArea.focus();
    }
    
    // 상세 정보 저장
    return {
      selection,
      range,
      plainText: range.toString(),
      startContainer: range.startContainer,
      startOffset: range.startOffset,
      endContainer: range.endContainer,
      endOffset: range.endOffset
    };
  }
  
  /**
   * 기본 서식 제거 명령 실행
   */
  function applyBasicFormatRemoval() {
    // HTML5 execCommand API를 활용한 기본 서식 제거
    document.execCommand('removeFormat');
    document.execCommand('unlink'); // 링크 제거
    
    // 일부 브라우저에서 추가 작업이 필요할 수 있음
    // 결과가 확실한 형태로 반환
    return true;
  }
  
  /**
   * 선택 영역 복원
   */
  function restoreSelection(contentArea, selectionInfo) {
    if (!selectionInfo || !selectionInfo.range) return false;
    
    try {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(selectionInfo.range.cloneRange());
      return true;
    } catch (e) {
      console.error('선택 영역 복원 오류:', e);
      
      // 기본 선택 범위 복원 시도
      try {
        if (contentArea.contains(selectionInfo.startContainer) && 
            contentArea.contains(selectionInfo.endContainer)) {
          
          const fallbackRange = document.createRange();
          fallbackRange.setStart(selectionInfo.startContainer, selectionInfo.startOffset);
          fallbackRange.setEnd(selectionInfo.endContainer, selectionInfo.endOffset);
          
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(fallbackRange);
          return true;
        }
      } catch (fallbackError) {
        console.error('백업 선택 영역 복원 실패:', fallbackError);
      }
      
      return false;
    }
  }
  
  /**
   * 선택 영역의 공통 조상 컨테이너 찾기
   */
  function findCommonAncestor(range) {
    let commonAncestor = range.commonAncestorContainer;
    if (commonAncestor.nodeType === Node.TEXT_NODE) {
      commonAncestor = commonAncestor.parentNode;
    }
    return commonAncestor;
  }
  
  /**
   * 선택 영역의 서식을 초기화하는 함수
   */
  /**
   * 특정 태그 제거를 위한 함수
   */
  function unwrapTags(node, tagsToRemove) {
    if (!node) return;
    
    // 노드 복사본으로 작업 (실시간 변경 피하기 위함)
    const childNodes = Array.from(node.childNodes);
    
    // 자식 노드 먼저 처리 (깊이 우선)
    childNodes.forEach(child => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        unwrapTags(child, tagsToRemove);
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

  /**
   * 완전히 새로운 방식으로 blockquote와 내부 태그(ul, li 등) 처리
   * @returns true - blockquote 요소를 처리한 경우, false - blockquote 요소가 없거나 처리에 실패한 경우
   */
  function handleBlockquote(contentArea, selectionInfo) {
    // 현재 선택 영역 가져오기
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;
    
    const range = selection.getRangeAt(0);
    
    // 순서: 1. contentArea에서 모든 blockquote 찾기
    const blockquotes = contentArea.querySelectorAll('blockquote');
    if (!blockquotes.length) return false;
    
    console.log(`물리적으로 ${blockquotes.length}개의 blockquote 요소 발견`);
    
    try {
      // 2. 순수 텍스트 추출 (서식은 제거)
      const plainText = selectionInfo ? selectionInfo.plainText.trim() : range.toString().trim();
      if (!plainText) {
        console.warn('추출할 텍스트가 없음');
        return false;
      }
      
      console.log('추출된 텍스트:', plainText.substring(0, 30) + (plainText.length > 30 ? '...' : ''));
      
      // 3. 임시 div 사용하여 텍스트만 추출하는 안전한 방법
      const tempDiv = document.createElement('div');
      tempDiv.textContent = plainText; // textContent는 태그를 이스케이프함
      
      // 4. 중요: 현재 선택된 blockquote와 그 내부 구조를 모두 제거
      // 순회하면서 반복해야 하는 이유는 DOM 구조가 변경되기 때문
      for (let i = 0; i < blockquotes.length; i++) {
        const bq = blockquotes[i];
        if (bq.parentNode && contentArea.contains(bq)) {
          // 5. 새 p 요소 생성 및 순수 텍스트 삽입
          const p = document.createElement('p');
          p.textContent = plainText;
          
          // 6. 전체 blockquote 교체
          bq.parentNode.replaceChild(p, bq);
          
          console.log(`blockquote ${i+1} 제거 및 대체 완료`);
          
          // 7. 첫번째 바뀐 요소에 선택 영역 설정 (1번만 실행)
          if (i === 0) {
            selection.removeAllRanges();
            const newRange = document.createRange();
            newRange.selectNodeContents(p);
            selection.addRange(newRange);
          }
        }
      }
      
      console.log('blockquote 및 중첩 태그 처리 성공');
      return true;
    } catch (e) {
      console.error('blockquote 처리 중 오류:', e);
      return false;
    }
  }
  
  /**
   * 선택 영역 내의 모든 blockquote 요소 찾기
   */
  function findBlockquotesInSelection(contentArea) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return [];
    
    const range = selection.getRangeAt(0);
    let node = range.commonAncestorContainer;
    
    // 텍스트 노드인 경우 부모로 이동
    if (node.nodeType === Node.TEXT_NODE) {
      node = node.parentNode;
    }
    
    // 조상 요소를 찾아 올라가면서 blockquote 검색
    const blockquotes = [];
    while (node && node !== contentArea) {
      if (node.nodeName.toLowerCase() === 'blockquote') {
        blockquotes.push(node);
      }
      node = node.parentNode;
    }
    
    return blockquotes;
  }
  
  /**
   * 선택된 텍스트 노드에 직접 가조에서 서식 제거
   */
  function resetTextNodeFormatting(range, plainText) {
    // 텍스트 노드 내부 선택인지 확인
    if (range.startContainer.nodeType === Node.TEXT_NODE && 
        range.startContainer === range.endContainer) {
      
      const textNode = range.startContainer;
      const start = range.startOffset;
      const end = range.endOffset;
      const fullText = textNode.nodeValue;
      
      // 숫자 범위 확인
      if (start < end && start >= 0 && end <= fullText.length) {
        // 선택된 텍스트만 교체
        const newText = fullText.substring(0, start) + plainText + fullText.substring(end);
        textNode.nodeValue = newText;
        
        // 선택 영역 복원
        const selection = window.getSelection();
        selection.removeAllRanges();
        const newRange = document.createRange();
        newRange.setStart(textNode, start);
        newRange.setEnd(textNode, start + plainText.length);
        selection.addRange(newRange);
        
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * 복잡한 태그 구조에서 텍스트 삽입
   */
  function replaceWithPlainText(range, plainText) {
    try {
      // 기존 내용 삭제
      range.deleteContents();
      
      // 새 텍스트 노드 생성 및 삽입
      const textNode = document.createTextNode(plainText);
      range.insertNode(textNode);
      
      // 선택 영역 재설정
      const selection = window.getSelection();
      selection.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNode(textNode);
      selection.addRange(newRange);
      
      return true;
    } catch (e) {
      console.error('텍스트 교체 실패:', e);
      return false;
    }
  }
  
  /**
   * 선택 영역의 서식을 초기화하는 함수 - 무결성 보장을 위한 재거함
   */
  function resetFormattingInSelection(contentArea) {
    // 선택 영역 정보 가져오기
    const selectionInfo = getSelectionInfo(contentArea);
    if (!selectionInfo) {
      console.warn('서식 초기화를 위한 유효한 선택 영역이 없습니다.');
      return;
    }
    
    try {
      // 선택한 텍스트 저장
      const originalText = selectionInfo.plainText;
      console.log('서식 초기화 시작: 선택 내용:', originalText.substring(0, 20) + (originalText.length > 20 ? '...' : ''));
      
      // 중요: 먼저 blockquote 처리를 시도 - DOM 구조 변경 전에 실행
      const blockquoteProcessed = handleBlockquote(contentArea, selectionInfo);
      
      // blockquote가 처리된 경우, 다른 처리 과정을 건너뛰고 초기화 완료
      if (blockquoteProcessed) {
        console.log('blockquote 처리 완료, 추가 서식 처리 건너뛀');
        return;
      }
      
      // 기본 서식 제거 명령 실행 - blockquote가 없는 경우에만 실행
      applyBasicFormatRemoval();
      
      // 선택 영역 복원
      if (!restoreSelection(contentArea, selectionInfo)) {
        console.warn('선택 영역 복원 실패, 기본 복원 시도');
        try {
          const selection = window.getSelection();
          selection.removeAllRanges();
          const range = document.createRange();
          range.setStart(selectionInfo.startContainer, selectionInfo.startOffset);
          range.setEnd(selectionInfo.endContainer, selectionInfo.endOffset);
          selection.addRange(range);
        } catch (restoreError) {
          console.error('복원 재시도 실패:', restoreError);
          return;
        }
      }
      
      // 현재 선택 영역 가져오기
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        console.warn('선택 영역 없음, 처리 중단');
        return;
      }
      
      const currentRange = selection.getRangeAt(0);
      const commonAncestor = findCommonAncestor(currentRange);
      
      // 특수 태그 제거 (인라인 및 블록 태그)
      const tagsToRemove = [...INLINE_TAGS, ...BLOCK_TAGS];
      unwrapTags(commonAncestor, tagsToRemove);
      
      // 현재 텍스트와 원본 비교
      const currentText = currentRange.toString();
      if (currentText !== originalText) {
        console.log('텍스트 불일치: 수정 필요');
        
        // 텍스트 노드 직접 수정 시도
        if (!resetTextNodeFormatting(currentRange, originalText)) {
          // 실패하면 완전 교체
          replaceWithPlainText(currentRange, originalText);
        }
      }
      
      console.log('서식 초기화 성공');
    } catch (error) {
      console.error('서식 초기화 중 오류:', error);
      // 오류 발생 시 텍스트만이라도 보존
      applyFailsafeReset(contentArea, selectionInfo);
    }
  }
  
  /**
   * 오류 발생 시 순수 텍스트만 삽입하는 최종 안전망 처리
   */
  function applyFailsafeReset(contentArea, selectionInfo) {
    try {
      if (!selectionInfo || !selectionInfo.range) {
        console.error('Failsafe 처리를 위한 선택 영역 정보 부족');
        return;
      }
      
      // 순수 텍스트만 삽입
      const plainText = selectionInfo.plainText;
      const range = selectionInfo.range.cloneRange();
      
      // 기존 내용 삭제
      range.deleteContents();
      
      // 새 텍스트 노드 생성 및 삽입
      const textNode = document.createTextNode(plainText);
      range.insertNode(textNode);
      
      // 선택 영역 복원
      const selection = window.getSelection();
      selection.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNode(textNode);
      selection.addRange(newRange);
    } catch (fallbackError) {
      console.error('Failsafe 처리 중 오류:', fallbackError);
    }
  }
})();