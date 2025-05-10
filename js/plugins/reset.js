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

  // reset.js 안에서 ResetUtils 호출 감싸기
  const safeLog = function(message, data) {
    if (typeof ResetUtils !== 'undefined' && ResetUtils.log) {
      ResetUtils.log(message, data);
    } else {
      console.log('[RESET]', message, data);
    }
  };

  // CSS를 head에 추가
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    .reset-marker-style {
      white-space: pre-wrap !important;
    }
  `;
  document.head.appendChild(styleElement);

  /**
   * 선택 영역 관리 모듈 - 선택 영역 관련 기능
   */
  const SelectionManager = {
    /**
     * 선택 영역에 마커 요소 생성
     * @param {Selection} selection - 현재 선택 객체
     * @param {string} text - 마커에 넣을 콘텐츠
     * @returns {HTMLElement} - 생성된 마커 요소
     */
    createMarker: function(selection, text) {
      try {
        // 기존 마커 제거
        const existingMarkers = document.querySelectorAll('[data-reset-marker]');
        existingMarkers.forEach(marker => marker.remove());
        
        // 마커 요소 생성
        const marker = document.createElement('p');
        marker.id = 'reset-selection-' + Date.now();
        marker.setAttribute('data-reset-marker', 'true');
        
        // 스타일 설정 방법 변경
        marker.style.cssText = 'white-space: pre-wrap !important';
        
        // 또는 여러 가지 접근법 동시 적용
        marker.setAttribute('style', 'white-space: pre-wrap !important');
        marker.style.whiteSpace = 'pre-wrap';
        marker.style.setProperty('white-space', 'pre-wrap', 'important');
        
        // 스타일 적용 확인
        console.log('스타일 적용 전:', marker.getAttribute('style'));
        marker.setAttribute('style', 'white-space: pre-wrap !important');
        console.log('스타일 적용 후:', marker.getAttribute('style'));
        
        // 선택 영역 내용 삭제 및 마커 삽입
        const range = selection.getRangeAt(0);
        
        // 줄바꿈 보존을 위한 텍스트 처리
        const fragment = range.cloneContents();
        const tempDiv = document.createElement('div');
        tempDiv.appendChild(fragment);
        
        // 리스트 아이템 처리 (줄바꿈 보존)
        const listItems = tempDiv.querySelectorAll('li');
        if (listItems.length > 0) {
          const listTexts = Array.from(listItems).map(item => item.textContent.trim());
          marker.textContent = listTexts.join('\n');
        } else {
          // 일반 텍스트 처리
          marker.textContent = text || selection.toString();
        }
        
        // DOM 삽입 전후 스타일 확인
        console.log('DOM 삽입 전 스타일:', marker.getAttribute('style'));
        range.deleteContents();
        range.insertNode(marker);
        setTimeout(() => {
          marker.style.whiteSpace = 'pre-wrap';
          marker.style.setProperty('white-space', 'pre-wrap', 'important');
          console.log('DOM 삽입 후 스타일 재적용:', marker.getAttribute('style'));
        }, 0);
        
        // 마커에 클래스 추가
        marker.classList.add('reset-marker-style');
        
        safeLog('마커 요소 생성됨', marker);
        return marker;
      } catch (error) {
        safeLog('마커 생성 실패', error);
        return null;
      }
    },
    
    /**
     * 마커 요소 내용 선택
     * @param {HTMLElement} markerElement - 마커 요소
     * @returns {boolean} - 선택 성공 여부
     */
    selectMarkerContent: function(markerElement) {
      if (!markerElement) return false;
      
      try {
        const range = document.createRange();
        range.selectNodeContents(markerElement);
        
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        
        return true;
      } catch (error) {
        safeLog('마커 요소 선택 실패', error);
        return false;
      }
    },
    
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
    restoreSelectionByReference: function(contentArea, startParent, startNode, startOffset, endParent, endNode, endOffset) {
      try {
        // 부모 요소가 여전히 DOM에 있는지 확인
        if (!contentArea.contains(startParent) || !contentArea.contains(endParent)) {
          safeLog('참조 노드가 DOM에서 제거됨');
          PluginUtil.selection.moveCursorToEnd(contentArea);
          return false;
        }
        
        // 새로운 Range 생성
      const selection = window.getSelection();
        const range = document.createRange();
        
        // 시작 지점 설정
        try {
          let newStartNode = ResetUtils.findNearestTextNode(startParent);
          
          if (newStartNode) {
            range.setStart(newStartNode, 0);
          } else {
            // 텍스트 노드를 찾지 못하면 요소 자체 사용
            range.setStart(startParent, 0);
          }
        } catch (e) {
          safeLog('시작 노드 복원 실패', e);
          range.setStart(contentArea, 0);
        }
        
        // 종료 지점 설정
        try {
          let newEndNode = ResetUtils.findNearestTextNode(endParent);
          
          if (newEndNode) {
            range.setEnd(newEndNode, newEndNode.length);
          } else {
            // 텍스트 노드를 찾지 못하면 요소 자체 사용
            range.setEnd(endParent, endParent.childNodes.length);
          }
        } catch (e) {
          safeLog('종료 노드 복원 실패', e);
          range.setEnd(contentArea, contentArea.childNodes.length);
        }
        
        // 선택 적용
        selection.removeAllRanges();
        selection.addRange(range);
        
        safeLog('선택 영역 복원됨', true);
        return true;
      } catch (error) {
        safeLogError(errorHandler.codes.PLUGINS.RESET.CURSOR, error);
        PluginUtil.selection.moveCursorToEnd(contentArea);
        return false;
      }
    },
    
    /**
     * 텍스트 기반으로 선택 영역 복원
     * @param {HTMLElement} contentArea - 편집 영역
     * @param {string} text - 검색할 텍스트
     * @returns {boolean} - 복원 성공 여부
     */
    restoreSelectionByText: function(contentArea, text) {
      if (!text || !text.trim()) return false;
      
      try {
        contentArea.focus();
        const cleanText = text.replace(/\s+/g, ' ').trim();
        const textNodes = ResetUtils.findTextNodesWithContent(contentArea, cleanText);
        
        if (textNodes.length > 0) {
          const textNode = textNodes[0];
          
          // p 요소 생성 또는 적용
          let p;
          if (textNode.parentNode.nodeName !== 'P') {
            // 텍스트 노드를 p로 감싸기
            p = document.createElement('p');
            p.style.whiteSpace = 'pre-wrap';
            p.textContent = text;
            textNode.parentNode.replaceChild(p, textNode);
          } else {
            // 이미 p라면 스타일만 적용
            p = textNode.parentNode;
            p.style.whiteSpace = 'pre-wrap';
          }
          
          // 새 요소 선택
          const range = document.createRange();
          range.selectNodeContents(p);
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
          
          safeLog('텍스트 기반 선택 영역 복원됨', {
            HTML: p.innerHTML,
            텍스트: p.textContent
          });
          
          return true;
        }
        
        return false;
      } catch (error) {
        safeLog('텍스트 기반 선택 복원 실패', error);
        return false;
      }
    },
    
    /**
     * 선택 영역 정보 수집
     * @param {Range} range - 선택 범위
     * @returns {Object} - 선택 영역 관련 정보
     */
    getSelectionInfo: function(range, selection) {
      const startContainer = range.startContainer;
      const startOffset = range.startOffset;
      const endContainer = range.endContainer;
      const endOffset = range.endOffset;

      // 주변 컨텍스트 포착
      let startNode = startContainer;
      let endNode = endContainer;
      
      // 텍스트 노드가 아닌 경우 처리
      if (startContainer.nodeType !== Node.TEXT_NODE && startContainer.childNodes.length > 0) {
        startNode = ResetUtils.getTextNodeAtPosition(startContainer, startOffset);
      }
      
      if (endContainer.nodeType !== Node.TEXT_NODE && endContainer.childNodes.length > 0) {
        endNode = ResetUtils.getTextNodeAtPosition(endContainer, endOffset);
      }
      
      // 주변 요소의 참조 저장
      const startParent = startNode.parentNode;
      const endParent = endNode.parentNode;
      
      // 줄바꿈을 보존하는 방식으로 텍스트 추출
      const fragment = range.cloneContents();
      const tempDiv = document.createElement('div');
      tempDiv.appendChild(fragment);
      
      // HTML 구조 보존하여 텍스트 추출
      const extractedText = Array.from(tempDiv.childNodes)
        .map(node => node.textContent)
        .join('\n');
      
      return {
        text: extractedText,
        cleanText: extractedText.replace(/\s+/g, ' ').trim(),
        startContainer, startOffset, endContainer, endOffset,
        startNode, endNode, startParent, endParent
      };
    }
  };
        
  /**
   * 서식 처리 모듈 - 각종 서식 제거 관련 기능
   */
  const FormatProcessor = {
    /**
     * 인라인 태그 제거를 위한 함수
     * @param {HTMLElement} container - 서식을 제거할 컨테이너
     * @returns {boolean} - 처리 성공 여부
     */
    removeInlineFormatting: function(container) {
      if (!container) return false;
      
      try {
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
      } catch (error) {
        safeLog('인라인 서식 제거 실패', error);
        return false;
      }
    },

  /**
     * 블록 태그를 처리하는 함수
   * @param {HTMLElement} contentArea - 편집 영역
   * @param {Range} range - 선택 범위
   * @param {Node} startNode - 시작 노드
   * @param {Node} endNode - 종료 노드
   * @returns {boolean} 변경이 있었는지 여부
   */
    processBlockElements: function(contentArea, range, startNode, endNode) {
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
      
        safeLog('선택 영역 내 블록 요소 수', allBlockElements.length);
      if (allBlockElements.length === 0) {
        return false;
      }
        
        // 로깅 정보 추가
        if (allBlockElements.length > 0) {
          safeLog('선택 영역 관련 블록 태그', allBlockElements.map(el => el.nodeName).join(', '));
          
          // 선택된 블록 요소의 태그와 텍스트 자세히 로깅
          safeLog('선택된 블록 요소 상세 정보', allBlockElements.map(el => ({
            태그: el.nodeName,
            텍스트: el.textContent.slice(0, 50) + (el.textContent.length > 50 ? '...' : ''),
            HTML: el.outerHTML.slice(0, 100) + (el.outerHTML.length > 100 ? '...' : '')
          })));
      }
      
      // 각 블록 태그를 p로 변환
      for (const blockElement of allBlockElements) {
          // 요소 유형별 처리
          if (blockElement.nodeName === 'UL' || blockElement.nodeName === 'OL') {
            this.processListElement(blockElement);
          } else if (blockElement.nodeName === 'CODE') {
            this.processCodeElement(blockElement);
          } else {
            const p = PluginUtil.dom.createElement('p', {
              textContent: blockElement.textContent
            });
        blockElement.parentNode.replaceChild(p, blockElement);
          }
      }
      
      return true;
    } catch (error) {
        safeLogError(errorHandler.codes.PLUGINS.RESET.BLOCK, error);
        return false;
      }
    },
    
    /**
     * 리스트 요소 처리
     * @param {HTMLElement} listElement - 처리할 리스트 요소
     * @returns {HTMLElement} - 생성된 p 요소
     */
    processListElement: function(listElement) {
      if (!listElement) return null;
      
      try {
        // 컴퓨티드 스타일에서 색상 추출 (폰트 색상 보존)
        const computedStyle = window.getComputedStyle(listElement);
        const originalColor = computedStyle.color || '';
      
        // 리스트 아이템 내용 추출
        const listItems = Array.from(listElement.querySelectorAll('li'));
        const listText = listItems.map(item => item.textContent.trim()).join('\n');
        
        // p 요소 생성
        const p = document.createElement('p');
        p.setAttribute('style', 'white-space: pre-wrap !important');
        if (originalColor) {
          p.style.color = originalColor;
        }
        p.textContent = listText;
        
        // 줄바꿈 확인 로깅 추가
        console.log('리스트 텍스트 변환:', listText, '줄바꿈 수:', (listText.match(/\n/g) || []).length);
        
        // 리스트를 p로 대체
        listElement.parentNode.replaceChild(p, listElement);
        
        return p;
      } catch (error) {
        safeLog('리스트 요소 처리 실패', error);
        return null;
      }
    },
    
    /**
     * 코드 블록 요소 처리
     * @param {HTMLElement} codeElement - 처리할 코드 요소
     * @returns {HTMLElement} - 생성된 p 요소
     */
    processCodeElement: function(codeElement) {
      if (!codeElement) return null;
      
      try {
        // 컴퓨티드 스타일에서 색상 추출
        const computedStyle = window.getComputedStyle(codeElement);
        const originalColor = computedStyle.color || '';
        
        // 코드 내용 추출
        const codeContent = codeElement.textContent;
        
        // 새 p 요소 생성
        const p = document.createElement('p');
        p.style.whiteSpace = 'pre-wrap';
        if (originalColor) {
          p.style.color = originalColor; // 원본 색상 보존
        }
        p.textContent = codeContent;
        
        // CODE 태그를 p로 완전히 대체
        codeElement.parentNode.replaceChild(p, codeElement);
        
        return p;
      } catch (error) {
        safeLog('코드 요소 처리 실패', error);
        return null;
      }
    },
    
    /**
     * 체크리스트 항목 처리
     * @param {Array} checklistItems - 체크리스트 항목 배열
     * @returns {HTMLElement} - 생성된 p 요소, 실패시 null
     */
    processChecklistItems: function(checklistItems) {
      if (!checklistItems || checklistItems.length === 0) return null;
      
      try {
        // 클린 텍스트 형태로 체크리스트 항목 추출
        const cleanedItems = checklistItems.map(item => item.textContent.replace(/\s+/g, ' ').trim());
        const checklistText = cleanedItems.join('\n');
        
        // 새 p 요소 생성
        const newP = document.createElement('p');
        newP.style.whiteSpace = 'pre-wrap';
        newP.textContent = checklistText;
        
        return newP;
      } catch (error) {
        safeLog('체크리스트 항목 처리 실패', error);
        return null;
      }
    },
    
    /**
     * 컨테이너의 하위 인라인 태그 제거
     * @param {HTMLElement} container - 컨테이너 요소
     * @param {HTMLElement} markerElement - 마커 요소
     * @param {Range} range - 선택 범위
     * @returns {boolean} - 성공 여부
     */
    removeNestedInlineTags: function(container, markerElement, range) {
      try {
        const elementsToRemove = [];
        INLINE_TAGS.forEach(tag => {
          // 대소문자 구분 없이 태그 선택 (case-insensitive)
          const selector = tag.toLowerCase();
          const selectedTags = container.querySelectorAll(selector);
          
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
                safeLog('인라인 태그 제거:', el.nodeName);
              }
            } catch (e) {
              safeLog('태그 제거 중 오류', e);
            }
          });
        
      return true;
    } catch (error) {
        safeLog('중첩된 인라인 태그 제거 실패', error);
      return false;
    }
  }
  };
  
  /**
   * 선택된 요소에 대한 구조 분석 및 처리
   */
  const StructureAnalyzer = {
    /**
     * 컨테이너 노드에서 특정 구조 찾기
     * @param {Node} container - 컨테이너 노드
     * @param {Range} range - 선택된 범위
     * @returns {Object} - 찾은 구조 정보
     */
    detectStructure: function(container, range) {
      // 결과 객체 초기화
      const result = {
        isChecklist: false,
        isList: false,
        isCode: false,
        isSpecialStructure: false,
        checklistItems: [],
        listElement: null,
        codeElement: null
      };
      
      // 1. 노드 이름 확인
      const containerNodeName = ResetUtils.safeNodeName(container);
      
      // 2. 특수 구조 기본 체크 (노드 이름 기반)
      if (containerNodeName === 'UL' || containerNodeName === 'OL') {
        result.isList = true;
        result.listElement = container;
        result.isSpecialStructure = true;
      } else if (containerNodeName === 'CODE') {
        result.isCode = true;
        result.codeElement = container;
        result.isSpecialStructure = true;
      }
      
      // 3. 부모 요소 체크 (텍스트 노드인 경우)
      if (container.nodeType === Node.TEXT_NODE && container.parentNode) {
        const parentNodeName = ResetUtils.safeNodeName(container.parentNode);
        if (['UL', 'OL', 'CODE'].includes(parentNodeName)) {
          result.isSpecialStructure = true;
          
          if (parentNodeName === 'CODE') {
            result.isCode = true;
            result.codeElement = container.parentNode;
          } else {
            result.isList = true;
            result.listElement = container.parentNode;
          }
        }
      }
      
      // 4. closest 사용해서 추가 체크
      if (!result.listElement) {
        const list = ResetUtils.safeClosest(container, 'ul, ol');
        if (list) {
          result.isList = true;
          result.listElement = list;
          result.isSpecialStructure = true;
        }
      }
      
      if (!result.codeElement) {
        const code = ResetUtils.safeClosest(container, 'code');
        if (code) {
          result.isCode = true;
          result.codeElement = code;
          result.isSpecialStructure = true;
        }
      }
      
      // 5. 체크리스트 항목 검색 - 필요한 경우에만 실행
      if (range && !result.isSpecialStructure) {
        const fragment = range.cloneContents();
        const tempDiv = document.createElement('div');
        tempDiv.appendChild(fragment);
        
        const items = Array.from(tempDiv.querySelectorAll('div[class*="checklist"] label'));
        if (items.length > 0) {
          result.isChecklist = true;
          result.checklistItems = items;
          result.isSpecialStructure = true;
      }
    }
    
      return result;
    },

  /**
     * 감지된 구조에 따라 적절한 처리 실행
     * @param {Object} structure - detectStructure로 생성된 구조 정보
     * @param {Range} range - 선택 범위
     * @returns {Object} - 처리 결과 {success: boolean, element: HTMLElement|null}
     */
    processDetectedStructure: function(structure, range) {
      // 결과 객체 초기화
      const result = {
        success: false,
        element: null
      };
      
      // 체크리스트 처리
      if (structure.isChecklist && structure.checklistItems.length > 0) {
        safeLog('체크리스트 항목 감지됨 - 선택 영역 내 항목만 처리');
        const newP = FormatProcessor.processChecklistItems(structure.checklistItems);
        
        if (newP) {
          // 선택 영역 교체 
          range.deleteContents();
          range.insertNode(newP);
          
          // 새 p 요소 선택
          SelectionManager.selectMarkerContent(newP);
          result.success = true;
          result.element = newP;
        }
      }
      // 코드 블록 처리
      else if (structure.isCode && structure.codeElement) {
        safeLog('CODE 태그 직접 처리');
        const newP = FormatProcessor.processCodeElement(structure.codeElement);
        
        if (newP) {
          // 새 p 요소 선택
          SelectionManager.selectMarkerContent(newP);
          result.success = true;
          result.element = newP;
        }
      }
      // 리스트 처리
      else if (structure.isList && structure.listElement) {
        safeLog('리스트 태그 직접 처리');
        const newP = FormatProcessor.processListElement(structure.listElement);
        
        if (newP) {
          // 새 p 요소 선택
          SelectionManager.selectMarkerContent(newP);
          result.success = true;
          result.element = newP;
        }
      }
      
      // 처리 결과 로깅
      if (result.success && result.element) {
        safeLog('▶▶▶ 최종 결과물 ◀◀◀', {
          HTML: result.element.innerHTML,
          텍스트: result.element.textContent
        });
      }
      
      return result;
    }
  };

  /**
   * 서식 초기화 프로세스 - 전체 처리 흐름 관리
   */
  const ResetProcess = {
    /**
     * 서식 초기화 전체 처리
     * @param {HTMLElement} contentArea - 편집 영역
     * @returns {boolean} - 처리 성공 여부
     */
    execute: function(contentArea) {
      try {
        // 1. 선택 영역 검증
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
          throw new Error('선택 영역 없음');
        }

        const selectedText = selection.toString();
        if (!selectedText.trim()) {
          throw new Error('선택된 텍스트 없음');
        }

        // 2. 선택 범위 및 정보 수집
        const range = selection.getRangeAt(0).cloneRange();
        const selectionInfo = SelectionManager.getSelectionInfo(range, selection);
        
        // 3. 구조 분석
        const container = range.commonAncestorContainer;
        const structure = StructureAnalyzer.detectStructure(container, range);

        // 4. 특수 구조 처리 (리스트/코드블록 등)
        if (structure.isSpecialStructure) {
          const result = StructureAnalyzer.processDetectedStructure(structure, range);
          if (result.success) {
            return true;
        }
        }

        // 5. 일반 서식 처리
        if (structure.isSpecialStructure) {
          // 텍스트 기반 복원 시도
          setTimeout(() => {
            const restored = SelectionManager.restoreSelectionByText(contentArea, selectionInfo.text);
            
            // 복원 실패시 기존 방법으로 선택 복원
            if (!restored) {
              SelectionManager.restoreSelectionByReference(
                contentArea, 
                selectionInfo.startParent, 
                selectionInfo.startNode, 
                selectionInfo.startOffset, 
                selectionInfo.endParent, 
                selectionInfo.endNode, 
                selectionInfo.endOffset
              );
      }
          }, 10);
          
          return true;
        }

        // 6. 마커 기반 처리
        const markerElement = SelectionManager.createMarker(selection, selectionInfo.text);
        if (!markerElement) {
          throw new Error('마커 요소 생성 실패');
        }

        // 7. 블록 요소 처리
        FormatProcessor.processBlockElements(
          contentArea, 
          range, 
          selectionInfo.startNode, 
          selectionInfo.endNode
        );
        
        // 8. 인라인 태그 제거
        FormatProcessor.removeNestedInlineTags(contentArea, markerElement, range);
        
        // 9. 기본 서식 제거 명령 실행
        document.execCommand('removeFormat', false, null);
        document.execCommand('unlink', false, null);
        
      return true;
    } catch (error) {
        safeLogError(errorHandler.codes.PLUGINS.RESET.FORMAT, error);
        contentArea.focus();
      return false;
    }
  }
  };

  // 서식 초기화 플러그인 등록
  LiteEditor.registerPlugin('reset', {
    title: 'Clear Formatting',
    icon: 'format_clear',
    action: ResetProcess.execute
  });
})();