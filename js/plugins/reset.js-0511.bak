/**
 * LiteEditor 서식 초기화 플러그인
 * 선택된 텍스트의 모든 서식(인라인 및 블록 레벨)을 제거합니다.
 */
(function() {
  // 제거할 인라인 태그 목록
  const INLINE_TAGS = ['B', 'I', 'U', 'STRONG', 'EM', 'MARK', 'SMALL', 'DEL', 'INS', 'SUB', 'SUP', 
                      'STRIKE', 'CODE', 'FONT', 'A', 'SPAN'];
  
  // 제거할 블록 태그 목록
  const BLOCK_TAGS = ['BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'PRE'];

  // 서식 초기화 플러그인 등록
  LiteEditor.registerPlugin('reset', {
    title: 'Clear Formatting',
    icon: 'format_clear',
    action: function(contentArea) {
      try {
      // 현재 선택 상태 저장
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
          errorHandler.logError('ResetPlugin', errorHandler.codes.PLUGINS.RESET.NO_SELECTION, new Error('선택 영역 없음'));
        return false;
      }

      const selectedText = selection.toString();
      if (!selectedText.trim()) {
          errorHandler.logError('ResetPlugin', errorHandler.codes.PLUGINS.RESET.NO_TEXT, new Error('선택된 텍스트 없음'));
        return false;
      }

      // 선택 범위 복제
      const range = selection.getRangeAt(0).cloneRange();
      const startContainer = range.startContainer;
      const startOffset = range.startOffset;
      const endContainer = range.endContainer;
      const endOffset = range.endOffset;

      // 주변 컨텍스트 포착
      let startNode = startContainer;
      let endNode = endContainer;
      
      // 텍스트 노드가 아닌 경우 처리
      if (startContainer.nodeType !== Node.TEXT_NODE && startContainer.childNodes.length > 0) {
        startNode = getTextNodeAtPosition(startContainer, startOffset);
      }
      
      if (endContainer.nodeType !== Node.TEXT_NODE && endContainer.childNodes.length > 0) {
        endNode = getTextNodeAtPosition(endContainer, endOffset);
      }
      
      // 주변 요소의 참조 저장
      const startParent = startNode.parentNode;
      const endParent = endNode.parentNode;
      const commonAncestor = range.commonAncestorContainer;
      
      // 서식 제거 수행
      try {
        // 1. 블록 태그 처리 - 개선된 방식으로 처리
        const hadBlockChanges = handleBlockElements(contentArea, range, startNode, endNode);
        
        // 2. 기본 서식 제거 명령 실행 (인라인 태그 제거)
        document.execCommand('removeFormat', false, null);
        document.execCommand('unlink', false, null); // 링크 제거
        
        // 포커스 및 선택 복원 - 타이밍 문제 해결을 위해 지연 실행
        setTimeout(() => {
          try {
            // 먼저 편집 영역에 포커스
            contentArea.focus();
            
            // 선택 복원 시도
            restoreSelectionByReferenceNodes(contentArea, startParent, startNode, startOffset, endParent, endNode, endOffset);
          } catch (e) {
              errorHandler.logError('ResetPlugin', errorHandler.codes.PLUGINS.RESET.CURSOR, e);
            setCursorToEnd(contentArea);
          }
        }, 10);
        } catch (error) {
          errorHandler.logError('ResetPlugin', errorHandler.codes.PLUGINS.RESET.FORMAT, error);
          contentArea.focus();
          return false;
        }
        
        return true;
      } catch (error) {
        errorHandler.logError('ResetPlugin', errorHandler.codes.PLUGINS.RESET.FORMAT, error);
        contentArea.focus();
        return false;
      }
    }
  });

  /**
   * 위치에 해당하는 텍스트 노드 찾기
   */
  function getTextNodeAtPosition(element, offset) {
    if (element.nodeType === Node.TEXT_NODE) {
      return element;
    }
    
    if (!element.hasChildNodes()) {
      return element;
    }
    
    const childNodes = element.childNodes;
    if (offset >= childNodes.length) {
      // 마지막 자식의 텍스트 노드 반환
      const lastChild = childNodes[childNodes.length - 1];
      if (lastChild.nodeType === Node.TEXT_NODE) {
        return lastChild;
      }
      // 텍스트 노드가 아니면 재귀적으로 탐색
      return getTextNodeAtPosition(lastChild, lastChild.childNodes.length);
    }
    
    // offset 위치의 자식이 텍스트 노드인지 확인
    const child = childNodes[offset];
    if (child.nodeType === Node.TEXT_NODE) {
      return child;
    }
    
    // 텍스트 노드가 아니면 첫 번째 자식의 텍스트 노드 찾기
    return getTextNodeAtPosition(child, 0);
  }
  
  /**
   * 선택 영역이 있는 블록 태그를 처리하는 함수
   * @param {HTMLElement} contentArea - 편집 영역
   * @param {Range} range - 선택 범위
   * @param {Node} startNode - 시작 노드
   * @param {Node} endNode - 종료 노드
   * @returns {boolean} 변경이 있었는지 여부
   */
  function handleBlockElements(contentArea, range, startNode, endNode) {
    try {
      // 1. 직접 선택된 블록 요소 처리
      const directBlockElements = Array.from(contentArea.querySelectorAll(BLOCK_TAGS.join(',')))
        .filter(node => range.intersectsNode(node));
      
      // 2. 부모 요소 중 블록 태그 확인 (시작 노드부터 검사)
      let parentBlockElements = [];
      let current = startNode;
      
      // 시작 노드의 부모 중 블록 태그 찾기
      while (current && current !== contentArea) {
        if (BLOCK_TAGS.includes(current.nodeName)) {
          parentBlockElements.push(current);
        }
        current = current.parentNode;
      }
      
      // 종료 노드의 부모 중 블록 태그 찾기 (시작과 다른 경우)
      if (startNode !== endNode) {
        current = endNode;
        while (current && current !== contentArea) {
          if (BLOCK_TAGS.includes(current.nodeName) && 
              !parentBlockElements.includes(current)) {
            parentBlockElements.push(current);
          }
          current = current.parentNode;
        }
      }
      
      // 공통 조상의 부모 중 블록 태그 찾기
      current = range.commonAncestorContainer;
      if (current.nodeType === Node.TEXT_NODE) {
        current = current.parentNode;
      }
      
      while (current && current !== contentArea) {
        if (BLOCK_TAGS.includes(current.nodeName) && 
            !parentBlockElements.includes(current) &&
            !directBlockElements.includes(current)) {
          parentBlockElements.push(current);
        }
        current = current.parentNode;
      }
      
      // 모든 블록 요소 합치기 및 중복 제거
      const allBlockElements = [...new Set([...directBlockElements, ...parentBlockElements])];
      
      console.log(`선택 영역 내 블록 요소 수: ${allBlockElements.length}`);
      if (allBlockElements.length > 0) {
        console.log('선택 영역 관련 블록 태그:', allBlockElements.map(el => el.nodeName).join(', '));
      }
      
      if (allBlockElements.length === 0) {
        return false;
      }
      
      // 각 블록 태그를 p로 변환
      for (const blockElement of allBlockElements) {
        const p = document.createElement('p');
        p.textContent = blockElement.textContent;
        blockElement.parentNode.replaceChild(p, blockElement);
      }
      
      return true;
    } catch (error) {
      errorHandler.logError('ResetPlugin', errorHandler.codes.PLUGINS.RESET.BLOCK, error);
      return false;
    }
  }

  /**
   * 노드 참조를 사용하여 선택 복원 
   */
  function restoreSelectionByReferenceNodes(contentArea, startParent, startNode, startOffset, endParent, endNode, endOffset) {
    try {
      // 부모 요소가 여전히 DOM에 있는지 확인
      if (!contentArea.contains(startParent) || !contentArea.contains(endParent)) {
        console.warn('참조 노드가 DOM에서 제거됨');
        setCursorToEnd(contentArea);
        return false;
      }
      
      // 새로운 Range 생성
      const selection = window.getSelection();
      const range = document.createRange();
      
      // 시작 지점 설정
      try {
        let newStartNode = findNearestTextNode(startParent);
        
        if (newStartNode) {
          range.setStart(newStartNode, 0);
        } else {
          // 텍스트 노드를 찾지 못하면 요소 자체 사용
          range.setStart(startParent, 0);
        }
      } catch (e) {
        console.warn('시작 노드 복원 실패:', e);
        range.setStart(contentArea, 0);
      }
      
      // 종료 지점 설정
      try {
        let newEndNode = findNearestTextNode(endParent);
        
        if (newEndNode) {
          range.setEnd(newEndNode, newEndNode.length);
        } else {
          // 텍스트 노드를 찾지 못하면 요소 자체 사용
          range.setEnd(endParent, endParent.childNodes.length);
        }
      } catch (e) {
        console.warn('종료 노드 복원 실패:', e);
        range.setEnd(contentArea, contentArea.childNodes.length);
      }
      
      // 선택 적용
      selection.removeAllRanges();
      selection.addRange(range);
      
      console.log('선택 영역 복원됨: true');
      return true;
    } catch (error) {
      errorHandler.logError('ResetPlugin', errorHandler.codes.PLUGINS.RESET.CURSOR, error);
      setCursorToEnd(contentArea);
      return false;
    }
  }
  
  /**
   * 요소 내에서 첫 번째 텍스트 노드 찾기
   */
  function findNearestTextNode(element) {
    if (!element) return null;
    
    if (element.nodeType === Node.TEXT_NODE) {
      return element;
    }
    
    if (element.hasChildNodes()) {
      for (let i = 0; i < element.childNodes.length; i++) {
        const found = findNearestTextNode(element.childNodes[i]);
        if (found) return found;
      }
    }
    
    return null;
  }

  /**
   * 커서를 컨텐츠 끝으로 이동하는 헬퍼 함수
   */
  function setCursorToEnd(editableDiv) {
    try {
      if (!editableDiv) return false;
      
      const selection = window.getSelection();
      const range = document.createRange();
      
      // editableDiv의 마지막 자식 노드 확인
      if (editableDiv.childNodes.length > 0) {
        const lastChild = editableDiv.lastChild;
        
        // 텍스트 노드인 경우
        if (lastChild.nodeType === Node.TEXT_NODE) {
          range.setStart(lastChild, lastChild.length);
          range.setEnd(lastChild, lastChild.length);
        } 
        // 요소 노드인 경우
        else {
          range.selectNodeContents(lastChild);
          range.collapse(false); // 끝으로 접기
        }
      } else {
        // 자식 노드가 없는 경우
        range.selectNodeContents(editableDiv);
        range.collapse(false);
      }
      
      selection.removeAllRanges();
      selection.addRange(range);
      console.log('커서를 컨텐츠 끝으로 이동함');
      return true;
    } catch (error) {
      errorHandler.logError('ResetPlugin', errorHandler.codes.PLUGINS.RESET.CURSOR, error);
      return false;
    }
  }
})();