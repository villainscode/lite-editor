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
    let ancestor = range.commonAncestorContainer;
    
    // 텍스트 노드인 경우 부모 요소로 이동
    if (ancestor.nodeType === Node.TEXT_NODE) {
      ancestor = ancestor.parentNode;
    }
    
    return ancestor;
  }
  
  /**
   * 인라인 태그를 완전히 새로운 방식으로 제거하는 함수
   * - 임시 요소를 사용하여 서식만 제거하고 텍스트는 보존
   */
  function removeInlineFormatting(contentArea, selectionInfo) {
    const originalText = selectionInfo.plainText;
    
    try {
      // 기본 서식 제거 명령 먼저 실행 (기본적인 서식 제거)
      document.execCommand('removeFormat', false, null);
      
      // 현재 선택 영역 확인
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return false;
      
      // 이미 서식이 제거되었는지 확인
      const currentRange = selection.getRangeAt(0);
      const currentText = currentRange.toString();
      
      // 내용이 같고 중복이 없으면 성공한 것으로 간주
      if (currentText === originalText) {
        return true;
      }
      
      // 여전히 문제가 있다면 더 직접적인 방법 사용
      // 완전히 새로운 방식: 선택 영역을 지우고 직접 텍스트 삽입
      
      // 1. 현재 선택 영역의 범위 저장
      const startContainer = currentRange.startContainer;
      const startOffset = currentRange.startOffset;
      const endContainer = currentRange.endContainer;
      const endOffset = currentRange.endOffset;
      
      // 2. 임시 span 요소를 생성하여 순수 텍스트 래핑
      const tempSpan = document.createElement('span');
      tempSpan.setAttribute('data-temp-reset', 'true');
      tempSpan.textContent = originalText;
      
      // 3. 기존 선택 영역 삭제
      currentRange.deleteContents();
      
      // 4. 임시 span 삽입
      currentRange.insertNode(tempSpan);
      
      // 5. 새 span 선택
      selection.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNodeContents(tempSpan);
      selection.addRange(newRange);
      
      // 6. span의 내용만 추출하여 부모에 직접 삽입
      const parent = tempSpan.parentNode;
      const textNode = document.createTextNode(originalText);
      parent.replaceChild(textNode, tempSpan);
      
      // 7. 새 텍스트 노드 선택
      selection.removeAllRanges();
      const finalRange = document.createRange();
      finalRange.setStart(textNode, 0);
      finalRange.setEnd(textNode, originalText.length);
      selection.addRange(finalRange);
      
      return true;
    } catch (error) {
      console.error('서식 제거 중 오류 발생:', error);
      
      // 최후의 방법: execCommand 직접 사용
      try {
        // 다시 선택하여 기본 명령 실행
        if (restoreSelection(contentArea, selectionInfo)) {
          document.execCommand('removeFormat', false, null);
          document.execCommand('insertText', false, originalText);
          return true;
        }
      } catch (failsafeError) {
        console.error('최종 안전망 처리 실패:', failsafeError);
      }
      
      return false;
    }
  }

  /**
   * 선택 영역의 서식을 초기화하는 함수 - 모듈화된 접근 방식
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
      if (!originalText.trim()) {
        console.warn('선택된 텍스트가 없습니다.');
        return;
      }
      
      console.log('서식 초기화 시작: 선택 내용:', originalText.substring(0, 20) + (originalText.length > 20 ? '...' : ''));
      
      // 각 핸들러 순서대로 적용 (중요: 처리 순서가 결과에 영향을 미침)
      
      // 1. 먼저 blockquote 처리 - 다른 DOM 구조 변경 전에 실행
      const blockquoteProcessed = handleBlockquote(contentArea, selectionInfo);
      
      // blockquote가 처리된 경우, 추가 처리 수행하지 않음
      if (blockquoteProcessed) {
        console.log('blockquote 처리 완료, 추가 서식 처리 건너뛸');
        return;
      }
      
      // 2. 블록 태그 처리
      const blockTagsProcessed = handleBlockTags(contentArea, selectionInfo);
      
      // 3. 선택 영역 복원 (블록 태그 처리 후)
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
      
      // 4. 인라인 태그 제거 (새로운 안전한 방식)
      const inlineProcessed = removeInlineFormatting(contentArea, selectionInfo);
      
      console.log('서식 초기화 성공');
    } catch (error) {
      console.error('서식 초기화 중 오류:', error);
      
      // 오류 발생 시 텍스트만이라도 보존 (failsafe)
      try {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          replaceWithPlainText(range, selectionInfo.plainText);
        }
      } catch (failsafeError) {
        console.error('최종 안전망 처리 실패:', failsafeError);
      }
    }
  }
  
  /**
   * 완전히 새로운 방식으로 blockquote와 내부 태그(ul, li 등) 처리
   * @returns true - blockquote 요소를 처리한 경우, false - blockquote 요소가 없거나 처리에 실패한 경우
   */
  function handleBlockquote(contentArea, selectionInfo) {
    try {
      // 컨텐츠 영역 내의 모든 blockquote 요소 찾기
      const blockquotes = contentArea.querySelectorAll('blockquote');
      if (blockquotes.length === 0) {
        return false; // blockquote 요소가 없으면 처리 불필요
      }
      
      // 각 blockquote에 대해 처리
      for (let i = 0; i < blockquotes.length; i++) {
        const blockquote = blockquotes[i];
        
        // 블록인용구의 텍스트 내용 추출 (모든 HTML 태그 제거)
        const plainText = blockquote.textContent;
        
        // 새로운 p 요소 생성
        const p = document.createElement('p');
        p.textContent = plainText;
        
        // 블록인용구를 p 요소로 교체
        blockquote.parentNode.replaceChild(p, blockquote);
      }
      
      return true;
    } catch (error) {
      console.error('blockquote 처리 중 오류:', error);
      return false;
    }
  }
  
  /**
   * 블록 태그 처리 함수
   * - 헤딩, PRE 등의 블록 태그를 안전하게 p 태그로 변환
   */
  function handleBlockTags(contentArea, selectionInfo) {
    try {
      const blockSelector = BLOCK_TAGS.filter(tag => tag !== 'BLOCKQUOTE').join(',');
      
      if (!blockSelector) {
        return false;
      }
      
      // 공통 조상 요소 내에서 블록 태그 검색
      const commonAncestor = findCommonAncestor(selectionInfo.range);
      const blockElements = commonAncestor.querySelectorAll(blockSelector);
      
      if (blockElements.length === 0) {
        return false;
      }
      
      // 각 블록 태그 처리
      for (let i = 0; i < blockElements.length; i++) {
        const blockElement = blockElements[i];
        
        // 블록 태그의 텍스트 내용 추출
        const plainText = blockElement.textContent;
        
        // 새로운 p 요소 생성
        const p = document.createElement('p');
        p.textContent = plainText;
        
        // 블록 태그를 p 요소로 교체
        blockElement.parentNode.replaceChild(p, blockElement);
      }
      
      return true;
    } catch (error) {
      console.error('블록 태그 처리 중 오류:', error);
      return false;
    }
  }
  
  /**
   * 복잡한 태그 구조에서 텍스트 삽입
   */
  function replaceWithPlainText(range, plainText) {
    try {
      // 현재 선택 영역 내용 삭제
      range.deleteContents();
      
      // 순수 텍스트 노드 생성
      const textNode = document.createTextNode(plainText);
      
      // 텍스트 노드 삽입
      range.insertNode(textNode);
      
      // 삽입한 텍스트 노드로 선택 영역 설정
      range.selectNodeContents(textNode);
      
      return true;
    } catch (error) {
      console.error('텍스트 대체 중 오류:', error);
      return false;
    }
  }
})();