/**
 * LiteEditor 서식 초기화 플러그인
 * 선택된 텍스트의 모든 서식(인라인 및 블록 레벨)을 제거합니다.
 */
(function() {
  // 제거할 인라인 태그 목록
  const INLINE_TAGS = ['B', 'I', 'U', 'STRONG', 'EM', 'MARK', 'SMALL', 'DEL', 'INS', 'SUB', 'SUP', 
                      'STRIKE', 'CODE', 'FONT', 'A', 'SPAN'];
  
  // 제거할 블록 태그 목록
  const BLOCK_TAGS = ['BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'PRE', 'UL', 'OL'];

  /**
   * 디버그 로그 출력
   * @param {string} message - 출력할 메시지
   * @param {any} data - 출력할 추가 데이터
   */
  const log = (message, data) => {
    if (window.DebugUtils) {
      window.DebugUtils.debugLog('RESET', message, data);
    }
    // 직접 콘솔에 로그 출력 (테스트용)
    console.log(`[RESET] ${message}`, data || '');
  };

  /**
   * 위치에 해당하는 텍스트 노드 찾기
   * @param {Node} element - 시작 요소
   * @param {number} offset - 오프셋
   * @returns {Node} - 텍스트 노드
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
   * 요소 내에서 첫 번째 텍스트 노드 찾기
   * @param {Node} element - 탐색할 요소
   * @returns {Node} - 텍스트 노드
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
      
      log('선택 영역 내 블록 요소 수', allBlockElements.length);
      if (allBlockElements.length > 0) {
        log('선택 영역 관련 블록 태그', allBlockElements.map(el => el.nodeName).join(', '));
          
          // 선택된 블록 요소의 태그와 텍스트 자세히 로깅
        log('선택된 블록 요소 상세 정보', allBlockElements.map(el => ({
            태그: el.nodeName,
            텍스트: el.textContent.slice(0, 50) + (el.textContent.length > 50 ? '...' : ''),
            HTML: el.outerHTML.slice(0, 100) + (el.outerHTML.length > 100 ? '...' : '')
          })));
      }
      
      if (allBlockElements.length === 0) {
        return false;
      }
      
      // 각 블록 태그를 p로 변환
      for (const blockElement of allBlockElements) {
        // 리스트 태그 특별 처리
          if (blockElement.nodeName === 'UL' || blockElement.nodeName === 'OL') {
          // 리스트 아이템을 개행으로 구분된 텍스트로 변환
          const listItems = Array.from(blockElement.querySelectorAll('li'));
          const listText = listItems.map(item => item.textContent.trim()).join('\n');
          
          const p = document.createElement('p');
          // white-space: pre-wrap 스타일 추가
          p.style.whiteSpace = 'pre-wrap';
          p.textContent = listText;
          blockElement.parentNode.replaceChild(p, blockElement);
          } else if (blockElement.nodeName === 'CODE') {
          // CODE 태그는 특별 처리 - 개행 문자 보존
          const content = blockElement.textContent;
          const p = document.createElement('p');
          // white-space: pre-wrap 스타일 추가
          p.style.whiteSpace = 'pre-wrap';
          p.textContent = content;
          blockElement.parentNode.replaceChild(p, blockElement);
          } else {
            const p = PluginUtil.dom.createElement('p', {
              textContent: blockElement.textContent
            });
        blockElement.parentNode.replaceChild(p, blockElement);
          }
      }
      
      return true;
    } catch (error) {
      errorHandler.logError('ResetPlugin', errorHandler.codes.PLUGINS.RESET.BLOCK, error);
      return false;
    }
  }

  /**
   * 노드 참조를 사용하여 선택 복원 
   * @param {HTMLElement} contentArea - 편집 영역
   * @param {Node} startParent - 시작 노드 부모
   * @param {Node} startNode - 시작 노드
   * @param {number} startOffset - 시작 오프셋
   * @param {Node} endParent - 종료 노드 부모
   * @param {Node} endNode - 종료 노드
   * @param {number} endOffset - 종료 오프셋
   * @returns {boolean} - 복원 성공 여부
   */
  function restoreSelectionByReferenceNodes(contentArea, startParent, startNode, startOffset, endParent, endNode, endOffset) {
    try {
      // 부모 요소가 여전히 DOM에 있는지 확인
      if (!contentArea.contains(startParent) || !contentArea.contains(endParent)) {
        log('참조 노드가 DOM에서 제거됨');
        PluginUtil.selection.moveCursorToEnd(contentArea);
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
        log('시작 노드 복원 실패', e);
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
        log('종료 노드 복원 실패', e);
        range.setEnd(contentArea, contentArea.childNodes.length);
      }
      
      // 선택 적용
      selection.removeAllRanges();
      selection.addRange(range);
      
      log('선택 영역 복원됨', true);
      return true;
    } catch (error) {
      errorHandler.logError('ResetPlugin', errorHandler.codes.PLUGINS.RESET.CURSOR, error);
      PluginUtil.selection.moveCursorToEnd(contentArea);
      return false;
    }
  }
  
  /**
   * 지정된 내용을 포함하는 텍스트 노드 찾기
   * @param {HTMLElement} parent - 탐색할 부모 요소
   * @param {string} searchText - 검색할 텍스트
   * @returns {Array} - 일치하는 텍스트 노드 배열
   */
  function findTextNodesWithContent(parent, searchText) {
    const result = [];
    const walker = document.createTreeWalker(
      parent,
      NodeFilter.SHOW_TEXT,
      { 
        acceptNode: function(node) {
          return node.textContent.includes(searchText) ? 
            NodeFilter.FILTER_ACCEPT : 
            NodeFilter.FILTER_REJECT;
        }
      }
    );

    let node;
    while (node = walker.nextNode()) {
      result.push(node);
    }
    
    return result;
  }

  // 3. 인라인 태그 제거를 위한 별도 함수 추가
  function removeInlineFormatting(container) {
    // 먼저 execCommand 사용
    document.execCommand('removeFormat', false, null);
    document.execCommand('unlink', false, null);
    
    // 그 다음 직접 수동으로 제거
    INLINE_TAGS.forEach(tag => {
      const tags = Array.from(container.querySelectorAll(tag.toLowerCase()));
      tags.forEach(el => {
        if (el.parentNode) {
          const textContent = el.textContent || '';
          const textNode = document.createTextNode(textContent);
          el.parentNode.replaceChild(textNode, el);
        }
      });
    });
    
    // 서식이 포함된 HTML 요소를 일반 텍스트로 변환
    const html = container.innerHTML;
    if (html && html.includes('<') && html.includes('>')) {
      container.textContent = container.textContent;
    }
    
    return true;
  }

  // 인라인 서식 제거 함수 (마커 및 선택 영역 처리 개선)
  function resetInlineFormatting(contentArea, range) {
    // 1. 현재 내용 복제
    const fragment = range.cloneContents();
    const tempDiv = document.createElement('div');
    tempDiv.appendChild(fragment);
    
    // 2. 원본 내용의 텍스트만 추출
    const textContent = tempDiv.textContent;
    
    // 3. 임시 마커 생성
    const markerId = 'reset-marker-' + Date.now();
    const marker = document.createElement('span');
    marker.id = markerId;
    marker.textContent = textContent;
    
    // 4. 선택 영역 대체
    range.deleteContents();
    range.insertNode(marker);
    
    // 5. 마커 선택
    range.selectNode(marker);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    
    // 6. 서식 제거 명령 실행
    document.execCommand('removeFormat', false, null);
    document.execCommand('unlink', false, null);
    
    // 7. 마커 내용을 p 요소로 대체
        const p = document.createElement('p');
    p.textContent = textContent;
    
    if (marker.parentNode) {
      marker.parentNode.replaceChild(p, marker);
    }
    
    // 8. p 요소 선택
    const newRange = document.createRange();
    newRange.selectNodeContents(p);
    selection.removeAllRanges();
    selection.addRange(newRange);
    
    return p;
  }

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
        
        // 초기화 전 선택 영역 정보 저장
        const originalSelection = {
          text: selectedText,
          cleanText: selectedText.replace(/\s+/g, ' ').trim() // 검색용 텍스트 표준화 
        };
        
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
        
        // 서식 제거 수행
        try {
          // 체크리스트 처리 로직 ---- 복원
          // 선택 영역 내 체크리스트 항목만 찾기
          const checklistItems = [];
          const selectionFragment = range.cloneContents();
          const tempDiv = document.createElement('div');
          tempDiv.appendChild(selectionFragment);
          
          // 선택 영역 내 체크리스트 항목만 가져오기
          const selectedChecklistItems = Array.from(tempDiv.querySelectorAll('div[class*="checklist"] label'));
          if (selectedChecklistItems.length > 0) {
            checklistItems.push(...selectedChecklistItems);
          }
          
          // 체크리스트 항목 처리
          if (checklistItems.length > 0) {
            log('체크리스트 항목 감지됨 - 선택 영역 내 항목만 처리');
            
            // 클린 텍스트 형태로 체크리스트 항목 추출
            const cleanedItems = checklistItems.map(item => item.textContent.replace(/\s+/g, ' ').trim());
            const checklistText = cleanedItems.join('\n');
            
            // 새 p 요소 생성 후 기존 선택 영역에 삽입
            const newP = document.createElement('p');
            newP.style.whiteSpace = 'pre-wrap';
            newP.textContent = checklistText;
            
            // 선택 영역 교체
            range.deleteContents();
            range.insertNode(newP);
            
            // 새 p 요소 선택
            const newRange = document.createRange();
            newRange.selectNodeContents(newP);
            selection.removeAllRanges();
            selection.addRange(newRange);
            
            log('▶▶▶ 최종 결과물 ◀◀◀', {
              HTML: newP.innerHTML,
              텍스트: newP.textContent
            });
            
            return true;
          }
          
          // 리스트 구조 감지 로직 ---- 복원
          let isListStructure = false;
          let listStructureElement = null;
          
          // 안전한 nodeName 비교
          const container = range.commonAncestorContainer;
          const containerNodeName = container.nodeName?.toUpperCase?.() || '';
          
          if (containerNodeName === 'UL' || containerNodeName === 'OL') {
            isListStructure = true;
            listStructureElement = container;
          }
          
          // 안전한 closest 호출 방식 (텍스트 노드 방어)
          let listElementDirect = null;
          try {
            if (container.nodeType === Node.ELEMENT_NODE) {
              // data-lite-editor-bullet 속성을 가진 요소도 검색
              listElementDirect = container.closest('ul[data-lite-editor-bullet], ol, ul');
            } else if (container.nodeType === Node.TEXT_NODE && container.parentNode) {
              listElementDirect = container.parentNode.closest('ul[data-lite-editor-bullet], ol, ul');
            }
          } catch (e) {
            log('closest 메소드 호출 오류', e);
          }
          
          // 위에서 감지되지 않은 경우에만 처리
          if (listElementDirect && !isListStructure) {
            log('리스트 태그 직접 처리');
            
            // 컴퓨티드 스타일에서 색상 추출 (폰트 색상 보존)
            const computedStyle = window.getComputedStyle(listElementDirect);
            const originalColor = computedStyle.color || '';
            
            // 리스트 아이템 내용 추출
            const listItems = Array.from(listElementDirect.querySelectorAll('li'));
            const listText = listItems.map(item => item.textContent.trim()).join('\n');
            
            // p 요소 생성
            const newP = document.createElement('p');
            newP.style.whiteSpace = 'pre-wrap';
            if (originalColor) {
              newP.style.color = originalColor;
            }
            newP.textContent = listText;
            
            // 리스트를 p로 대체
            listElementDirect.parentNode.replaceChild(newP, listElementDirect);
            
            // 새 p 요소 선택
            const newRange = document.createRange();
            newRange.selectNodeContents(newP);
            selection.removeAllRanges();
            selection.addRange(newRange);
            
            log('▶▶▶ 최종 결과물 ◀◀◀', {
              HTML: newP.innerHTML,
              텍스트: newP.textContent,
              색상: originalColor
            });
            
            return true;
          }
          
          // 코드 블록 처리 로직 ---- 복원
          let codeElement = null;
          try {
            if (container.nodeType === Node.ELEMENT_NODE) {
              codeElement = container.closest('code');
            } else if (container.nodeType === Node.TEXT_NODE && container.parentNode) {
              codeElement = container.parentNode.closest('code');
            }
          } catch (e) {
            log('closest 메소드 호출 오류', e);
          }
          
          if (codeElement) {
            log('CODE 태그 직접 처리');
            
        // 컴퓨티드 스타일에서 색상 추출
        const computedStyle = window.getComputedStyle(codeElement);
        const originalColor = computedStyle.color || '';
        
        // 코드 내용 추출
        const codeContent = codeElement.textContent;
        
        // 새 p 요소 생성
            const newP = document.createElement('p');
            newP.style.whiteSpace = 'pre-wrap';
        if (originalColor) {
              newP.style.color = originalColor; // 원본 색상 보존
        }
            newP.textContent = codeContent;
        
        // CODE 태그를 p로 완전히 대체
            codeElement.parentNode.replaceChild(newP, codeElement);
            
            // 새 p 요소 선택
            const newRange = document.createRange();
            newRange.selectNodeContents(newP);
            selection.removeAllRanges();
            selection.addRange(newRange);
            
            log('▶▶▶ 최종 결과물 ◀◀◀', {
              HTML: newP.innerHTML,
              텍스트: newP.textContent
            });
            
            return true;
          }
          
          // 리스트 처리 - 독립된 로직 ---- 복원
          let listElement = null;
          try {
            if (container.nodeType === Node.ELEMENT_NODE) {
              listElement = container.closest('ul, ol');
            } else if (container.nodeType === Node.TEXT_NODE && container.parentNode) {
              listElement = container.parentNode.closest('ul, ol');
            }
          } catch (e) {
            log('closest 메소드 호출 오류', e);
          }
          
          if (listElement && listElement !== listElementDirect) {
            log('리스트 구조 감지됨 - 직접 p 태그로 변환');
            
            // 컴퓨티드 스타일에서 색상 추출
            const computedStyle = window.getComputedStyle(listElement);
            const originalColor = computedStyle.color || '';
            
            // 리스트 아이템 텍스트 추출
            const listItems = Array.from(listElement.querySelectorAll('li'));
            const listText = listItems.map(item => item.textContent.trim()).join('\n');
        
        // 새 p 요소 생성
        const newP = document.createElement('p');
        newP.style.whiteSpace = 'pre-wrap';
            if (originalColor) {
              newP.style.color = originalColor; // 원본 색상 보존
            }
            newP.textContent = listText;
            
            // 리스트를 p로 교체
            listElement.parentNode.replaceChild(newP, listElement);
            
            // 새 p 요소 선택
            const newRange = document.createRange();
            newRange.selectNodeContents(newP);
            selection.removeAllRanges();
            selection.addRange(newRange);
            
            log('▶▶▶ 최종 결과물 ◀◀◀', {
              HTML: newP.innerHTML,
              텍스트: newP.textContent
            });
            
            return true;
          }
          
          // 특수 구조 확인 로직 ---- 복원
          const isSpecialStructure = 
            containerNodeName === 'UL' || 
            containerNodeName === 'OL' ||
            containerNodeName === 'CODE' ||
            (container.nodeType === Node.TEXT_NODE && 
             container.parentNode && 
             ['UL', 'OL', 'CODE'].includes(container.parentNode.nodeName.toUpperCase()));
          
          // 텍스트 내용 저장
          const originalTextContent = originalSelection.text;
          
          if (isSpecialStructure) {
            log('특수 구조(리스트/코드) 감지됨 - 직접 처리 적용');
            
            // 시간 지연 증가
            setTimeout(() => {
              // 데이터 속성으로 bulletList 찾기
              const bulletLists = contentArea.querySelectorAll('ul[data-lite-editor-bullet="true"]');
              if (bulletLists.length > 0) {
                log('불릿 리스트 발견 - 직접 변환');
                
                // 선택 영역과 겹치는 리스트 아이템만 추출
                const listText = [];
                bulletLists.forEach(list => {
                  if (range.intersectsNode(list)) {
                    const items = Array.from(list.querySelectorAll('li'));
                    items.forEach(item => {
                      if (range.intersectsNode(item)) {
                        listText.push(item.textContent.trim());
                      }
                    });
                  }
                });
                
                // 새 p 태그 생성 및 텍스트 삽입
                if (listText.length > 0) {
                  const p = document.createElement('p');
                  p.style.whiteSpace = 'pre-wrap';
                  p.textContent = listText.join('\n');
                  
                  // 리스트 제거 후 p 태그 삽입
                  bulletLists.forEach(list => {
                    if (range.intersectsNode(list)) {
                      list.parentNode.replaceChild(p, list);
                    }
                  });
                  
                  // p 태그 선택
                  const newRange = document.createRange();
                  newRange.selectNodeContents(p);
                  selection.removeAllRanges();
                  selection.addRange(newRange);
                  return true;
                }
              }
              
              // 기존 로직 실행 (백업)
              restoreSelectionByReferenceNodes(contentArea, startParent, startNode, startOffset, endParent, endNode, endOffset);
            }, 50); // 시간 증가
          } else {
            // 마커 기반 처리 방식
            
            // 선택 영역 내용을 저장하고 서식 제거만 수행
            const selectedText = originalSelection.text;
            
            // 서식 태그만 제거하고 텍스트를 유지하는 함수
            const removeFormattingOnly = () => {
              // 선택 영역의 내용을 임시 저장
              const temp = document.createElement('div');
              temp.appendChild(range.cloneContents());
              
              // 선택 영역 내용 삭제
              range.deleteContents();
              
              // 서식을 제거한 텍스트만 삽입
              const textNode = document.createTextNode(temp.textContent);
              range.insertNode(textNode);
              
              // 텍스트 노드 선택
              range.selectNode(textNode);
              selection.removeAllRanges();
              selection.addRange(range);
              
              // 인라인 서식 제거 명령 실행
              document.execCommand('removeFormat', false, null);
              document.execCommand('unlink', false, null);
              
              log('인라인 서식만 제거 완료');
              return true;
            };
            
            // 폰트/배경색 태그 또는 일반 인라인 서식 태그만 있는지 확인
            const tempFragment = range.cloneContents();
            const tempDiv = document.createElement('div');
            tempDiv.appendChild(tempFragment);
            
            // 특수 서식 태그 체크
            const hasFontTag = tempDiv.querySelector('font[color]') !== null;
            const hasStyleSpan = tempDiv.querySelector('span[style*="background-color"], span[style*="color"]') !== null;
            
            // 기본 인라인 서식 태그 체크
            const hasBasicFormatTags = 
              tempDiv.querySelector('b, i, u, strong, em, strike, span:not([style]), mark') !== null;
            
            // 블록 태그 체크 (p 태그 감싸기가 필요한 경우)
            const hasBlockTags = Array.from(tempDiv.querySelectorAll('*')).some(
              el => BLOCK_TAGS.includes(el.tagName)
            );
            
            log('태그 분석', { 
              hasFontTag, 
              hasStyleSpan, 
              hasBasicFormatTags, 
              hasBlockTags,
              html: tempDiv.innerHTML
            });
            
            // 블록 태그 없이 인라인 서식 태그만 있는 경우
            if ((hasFontTag || hasStyleSpan || hasBasicFormatTags) && !hasBlockTags) {
              log('인라인 서식 태그만 감지 - 특별 처리');
              return removeFormattingOnly();
            }
            
            // 블록 태그가 포함된 경우 기존 마커 기반 처리 계속 진행
            const markerId = 'reset-selection-' + Date.now();
            const markerElement = document.createElement('p');
            markerElement.id = markerId;
            markerElement.setAttribute('data-reset-marker', 'true');
            markerElement.style.whiteSpace = 'pre-wrap';
            markerElement.textContent = originalSelection.text;

            // 현재 선택 영역에 마커 삽입
            range.deleteContents();
            range.insertNode(markerElement);

            // 마커 요소 로깅
            log('마커 요소 생성됨', markerElement);
            
            if (markerElement) {
              // 1. 블록 태그 처리
              const hadBlockChanges = handleBlockElements(contentArea, range, startNode, endNode);
              
              // 2. 인라인 태그 제거 로직 개선 - execCommand 이전에 직접 제거 로직 적용
        const elementsToRemove = [];
        INLINE_TAGS.forEach(tag => {
          // 대소문자 구분 없이 태그 선택 (case-insensitive)
          const selector = tag.toLowerCase();
                const selectedTags = contentArea.querySelectorAll(selector);
          
          selectedTags.forEach(el => {
            // 마커 내부 또는 선택 영역 내부의 태그만 처리
            if (markerElement.contains(el) || range.intersectsNode(el)) {
              elementsToRemove.push(el);
            }
          });
        });
        
        // 태그 직접 제거 (부모에서 자식으로 먼저 처리)
        elementsToRemove
          .sort((a, b) => b.contains(a) ? -1 : (a.contains(b) ? 1 : 0)) // 깊은 요소부터 처리
          .forEach(el => {
            try {
              if (el.parentNode) {
                const textNode = document.createTextNode(el.textContent);
                el.parentNode.replaceChild(textNode, el);
                      log('인라인 태그 제거:', el.nodeName);
              }
            } catch (e) {
                    log('태그 제거 중 오류', e);
                  }
                });
              
              // 3. 기본 서식 제거 명령 실행 (인라인 태그 제거)
              document.execCommand('removeFormat', false, null);
              document.execCommand('unlink', false, null); // 링크 제거
              
              // 4. 인라인 태그 직접 제거 (추가)
              const targetMarker = document.getElementById(markerId);
              if (targetMarker) {
                log('마커 요소 발견, 서식 제거 중', targetMarker);
                removeInlineFormatting(targetMarker);
                
                // style 직접 설정
                targetMarker.style.whiteSpace = 'pre-wrap';
                
                // 마커 내용 선택
                const range = document.createRange();
                range.selectNodeContents(targetMarker);
                
                // 선택 영역 설정
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
                
                // 서식 초기화 후 결과 로깅
                log('▶▶▶ 최종 결과물 ◀◀◀', {
                  HTML: targetMarker.innerHTML,
                  텍스트: targetMarker.textContent
                });
          } else {
                log('마커 요소를 찾을 수 없음, 대체 방법으로 복원 시도');
                // 마커를 찾지 못한 경우 기존 방법으로 선택 복원 시도
                restoreSelectionByReferenceNodes(contentArea, startParent, startNode, startOffset, endParent, endNode, endOffset);
              }
            } else {
              log('마커 요소를 생성할 수 없음, 기존 방식으로 처리');
              // 마커 생성에 실패한 경우 기존 방식 사용
              // 1. 블록 태그 처리
              const hadBlockChanges = handleBlockElements(contentArea, range, startNode, endNode);
              
              // 2. 기본 서식 제거 명령 실행
              document.execCommand('removeFormat', false, null);
              document.execCommand('unlink', false, null);
              
              // 기존의 선택 복원 코드 호출
              setTimeout(() => {
                contentArea.focus();
                restoreSelectionByReferenceNodes(contentArea, startParent, startNode, startOffset, endParent, endNode, endOffset);
              }, 10);
            }
          }
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
})();