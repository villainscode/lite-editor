/**
 * ResetUtils - 서식 초기화 플러그인 유틸리티 모듈
 * 자주 사용되는 기능 모음
 */
const ResetUtils = {
  /**
   * 디버그 로그 출력
   * @param {string} message - 출력할 메시지
   * @param {any} data - 출력할 추가 데이터
   */
  log: function(message, data) {
    if (window.DebugUtils) {
      window.DebugUtils.debugLog('RESET', message, data);
    }
  },

  /**
   * 위치에 해당하는 텍스트 노드 찾기
   * @param {Node} element - 시작 요소
   * @param {number} offset - 오프셋
   * @returns {Node} - 텍스트 노드
   */
  getTextNodeAtPosition: function(element, offset) {
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
      return this.getTextNodeAtPosition(lastChild, lastChild.childNodes.length);
    }
    
    // offset 위치의 자식이 텍스트 노드인지 확인
    const child = childNodes[offset];
    if (child.nodeType === Node.TEXT_NODE) {
      return child;
    }
    
    // 텍스트 노드가 아니면 첫 번째 자식의 텍스트 노드 찾기
    return this.getTextNodeAtPosition(child, 0);
  },
  
  /**
   * 요소 내에서 첫 번째 텍스트 노드 찾기
   * @param {Node} element - 탐색할 요소
   * @returns {Node} - 텍스트 노드
   */
  findNearestTextNode: function(element) {
    if (!element) return null;
    
    if (element.nodeType === Node.TEXT_NODE) {
      return element;
    }
    
    if (element.hasChildNodes()) {
      for (let i = 0; i < element.childNodes.length; i++) {
        const found = this.findNearestTextNode(element.childNodes[i]);
        if (found) return found;
      }
    }
    
    return null;
  },

  /**
   * 지정된 내용을 포함하는 텍스트 노드 찾기
   * @param {HTMLElement} parent - 탐색할 부모 요소
   * @param {string} searchText - 검색할 텍스트
   * @returns {Array} - 일치하는 텍스트 노드 배열
   */
  findTextNodesWithContent: function(parent, searchText) {
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
  },
  
  /**
   * 원본 스타일 (특히 색상) 보존
   * @param {HTMLElement} sourceElement - 원본 요소
   * @param {HTMLElement} targetElement - 대상 요소
   */
  preserveStyles: function(sourceElement, targetElement) {
    if (!sourceElement || !targetElement) return;
    
    try {
      const computedStyle = window.getComputedStyle(sourceElement);
      const originalColor = computedStyle.color || '';
      
      if (originalColor) {
        targetElement.style.color = originalColor;
      }
    } catch (e) {
      this.log('스타일 복사 중 오류', e);
    }
  },
  
  /**
   * 노드 타입과 관계없이 안전하게 closest 호출
   * @param {Node} node - 검색 시작 노드
   * @param {string} selector - CSS 선택자
   * @returns {Element} - 찾은 요소 또는 null
   */
  safeClosest: function(node, selector) {
    if (!node) return null;
    
    try {
      if (node.nodeType === Node.ELEMENT_NODE) {
        return node.closest(selector);
      } else if (node.nodeType === Node.TEXT_NODE && node.parentNode) {
        return node.parentNode.closest(selector);
      }
    } catch (e) {
      this.log(`closest('${selector}') 호출 오류`, e);
    }
    
    return null;
  },
  
  /**
   * 노드 이름 안전하게 가져오기
   * @param {Node} node - 검사할 노드
   * @returns {string} - 대문자 노드 이름 또는 빈 문자열
   */
  safeNodeName: function(node) {
    if (!node) return '';
    return node.nodeName?.toUpperCase?.() || '';
  },
  
  /**
   * 오류 로깅 및 보고
   * @param {string} code - 오류 코드
   * @param {Error} error - 오류 객체
   */
  logError: function(code, error) {
    errorHandler.logError('ResetPlugin', code, error);
  }
};

// 모듈 내보내기
export default ResetUtils;
