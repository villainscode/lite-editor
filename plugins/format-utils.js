/**
 * LiteEditor Format Utilities
 * 서식 관련 공통 유틸리티 함수들을 제공하는 모듈
 */

(function() {
  // 전역 네임스페이스 생성
  window.LiteEditorUtils = window.LiteEditorUtils || {};
  
  
  
  /**
   * 선택 영역이 특정 태그 내에 있는지 확인하는 함수
   * @param {Range} range - 현재 선택 범위
   * @param {Array|String} tagNames - 확인할 태그 이름 또는 이름 배열
   * @return {Element|null} 발견된 태그 요소 또는 null
   */
  LiteEditorUtils.isSelectionWithinTag = function(range, tagNames) {
    if (!Array.isArray(tagNames)) tagNames = [tagNames];
    
    // 1. 시작점과 끝점의 공통 조상 확인
    let startNode = range.startContainer;
    let endNode = range.endContainer;
    
    // 텍스트 노드인 경우 부모 요소로 이동
    if (startNode.nodeType === 3) startNode = startNode.parentNode;
    if (endNode.nodeType === 3) endNode = endNode.parentNode;
    
    // 2. 시작 지점에서 태그 확인
    for (const tagName of tagNames) {
      // 시작 노드가 해당 태그이거나 해당 태그 내에 있는 경우
      const startTagParent = startNode.closest(tagName);
      if (startTagParent) {
        // 끝 노드도 같은 태그 내에 있는지 확인
        const endTagParent = endNode.closest(tagName);
        if (endTagParent && startTagParent === endTagParent) {
          // 선택 영역이 완전히 해당 태그 내에 포함됨
          return startTagParent;
        }
      }
    }
    
    // 3. 선택 범위 내 콘텐츠 확인을 위해 복제
    const rangeClone = range.cloneRange();
    const fragment = rangeClone.cloneContents();
    
    // 임시 컨테이너에 복사하여 검사
    const tempDiv = document.createElement('div');
    tempDiv.appendChild(fragment);
    
    // 직접적으로 감싸진 태그가 있는지 확인
    for (const node of tempDiv.childNodes) {
      if (node.nodeType === 1) { // 요소 노드
        const nodeName = node.nodeName.toLowerCase();
        if (tagNames.includes(nodeName)) {
          // 요소를 확인한 후, 원래 DOM에서 해당하는 요소 찾기
          const originalNodeXPath = getXPathForElement(node, tempDiv);
          const originalNode = getElementByXPath(originalNodeXPath, document.body);
          return originalNode || node; // 원본 노드를 찾지 못하면 임시 노드 반환
        }
      }
    }
    
    return null; // 태그를 찾지 못함
  };
  

  LiteEditorUtils.toggleFormat = function(contentArea, tagNames, applyTagName, commandName, e) {
    // 이벤트 전파 제어
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // 포커스 확인
    if (document.activeElement !== contentArea) {
      contentArea.focus();
    }
    
    // 현재 선택 영역 저장
    if (window.liteEditorSelection) {
      window.liteEditorSelection.save();
    }
    
    // 선택 영역 확인
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      console.log('유효한 선택 영역이 없습니다.');
      return;
    }
    
    // 지연 시간 조정 (100ms -> 10ms)
    setTimeout(() => {
      try {
        // 선택 영역 복원
        if (window.liteEditorSelection) {
          window.liteEditorSelection.restore();
        }
        
        // 팀막처럼 선택 영역이 유지되는지 확인
        // 포커스 유지를 위해 다시 한 번 포커스
        contentArea.focus();
        
        // execCommand 실행
        document.execCommand(commandName, false, null);
        
        // 지연 후 선택 영역 재복원 (중요!)
        setTimeout(() => {
          if (window.liteEditorSelection) {
            window.liteEditorSelection.restore();
            
            // 포커스 유지
            contentArea.focus();
          }
        }, 10);
      } catch (e) {
        console.error('서식 적용 중 오류:', e);
      }
    }, 10);
  };
  // 선택 영역 관리를 위한 문서 레벨 이벤트 수신기
  document.addEventListener('click', function(e) {
    const sel = window.getSelection();
    
    // LiteEditor 에디터 컨텐츠 영역 찾기
    const editorContainers = document.querySelectorAll('.lite-editor-content');
    let isClickInsideEditor = false;
    let activeEditorContainer = null;
    
    // 클릭이 에디터 내부인지 확인
    editorContainers.forEach(container => {
      if (container.contains(e.target)) {
        isClickInsideEditor = true;
        activeEditorContainer = container;
      }
    });
    
    // 에디터 내부 클릭 처리
    if (isClickInsideEditor && activeEditorContainer) {
      if (sel.rangeCount > 0 && !sel.isCollapsed) {
        const range = sel.getRangeAt(0);
        // 현재 선택 영역의 공통 조상 요소 확인
        let commonAncestor = range.commonAncestorContainer;
        if (commonAncestor.nodeType === 3) { // 텍스트 노드인 경우 부모 요소로 전환
          commonAncestor = commonAncestor.parentNode;
        }
        
        // 클릭 요소가 현재 선택 영역과 관련이 없으면 선택 해제
        if (!commonAncestor.contains(e.target) && !e.target.contains(commonAncestor)) {
          // 툴바 버튼이 아니거나 드롭다운 메뉴가 아닌 경우에만 선택 해제
          if (!e.target.closest('.lite-editor-button') && !e.target.closest('.lite-editor-dropdown-menu')) {
            sel.removeAllRanges();
          }
        }
      }
    } else {
      // 에디터 영역 외부 클릭시 예외 지정 (드롭다운 메뉴 등)
      if (!e.target.closest('.lite-editor-dropdown-menu') && !e.target.closest('.lite-editor-button')) {
        sel.removeAllRanges();
      }
    }
  });
})();
