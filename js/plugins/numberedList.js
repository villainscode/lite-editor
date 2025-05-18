/**
 * LiteEditor Numbered List Plugin
 * - 순서 있는 목록 서식과 깊이별 스타일 적용 (선택한 리스트만 적용)
 * - 규칙: 011-numberlist-bulletlist-rule-agent.mdc
 */

(function() {
  // 플러그인 등록 - 선택 영역 유지 및 토글 기능 개선
  PluginUtil.registerPlugin('orderedList', {
    title: 'Numbered List',
    icon: 'format_list_numbered',
    action: function(contentArea, buttonElement, event) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      
      // 에디터에 포커스 설정
      contentArea.focus();
      
      // 선택 영역의 시작/끝 지점 표시
      const selection = PluginUtil.selection.getSafeSelection();
      if (!selection || !selection.rangeCount) return;
      
      const range = selection.getRangeAt(0);
      
      // 선택 영역의 시작/끝 지점 표시
      const startMarker = document.createElement('span');
      startMarker.setAttribute('data-selection-start', 'true');
      startMarker.style.display = 'inline';
      startMarker.innerHTML = '\u200B'; // 제로 너비 공백
      
      const endMarker = document.createElement('span');
      endMarker.setAttribute('data-selection-end', 'true');
      endMarker.style.display = 'inline';
      endMarker.innerHTML = '\u200B'; // 제로 너비 공백
      
      // 범위 복제하여 마커 삽입
      const clonedRange = range.cloneRange();
      
      // 끝 마커 먼저 삽입
      clonedRange.collapse(false); // 끝으로 이동
      clonedRange.insertNode(endMarker);
      
      // 시작 마커 삽입
      clonedRange.setStart(range.startContainer, range.startOffset);
      clonedRange.collapse(true); // 시작으로 이동
      clonedRange.insertNode(startMarker);
      
      // 브라우저 내장 명령어로 순서있는 리스트 토글
      document.execCommand('insertOrderedList', false, null);
      
      // 생성된 OL에 스타일 적용하고 선택 영역 복원
      setTimeout(() => {
        try {
          // 모든 OL 요소에 스타일 적용
          contentArea.querySelectorAll('ol').forEach(ol => {
            ol.setAttribute('data-lite-editor-numbered', 'true');
            applyStyleByDepth(ol, getOlDepth(ol));
          });
          
          // 마커 찾기
          const start = contentArea.querySelector('[data-selection-start]');
          const end = contentArea.querySelector('[data-selection-end]');
          
          if (start && end) {
            // 원래 선택 영역 복원
            const newRange = document.createRange();
            
            // startMarker의 바로 뒤에서 시작
            newRange.setStartAfter(start);
            
            // endMarker의 바로 앞에서 끝
            newRange.setEndBefore(end);
            
            // 선택 영역 적용
            selection.removeAllRanges();
            selection.addRange(newRange);
            
            // 마커 제거
            start.parentNode.removeChild(start);
            end.parentNode.removeChild(end);
          }
        } catch(e) {
          console.error('Error during list selection restore:', e);
          // 오류 발생 시 모든 마커 제거
          contentArea.querySelectorAll('[data-selection-start], [data-selection-end]').forEach(el => {
            el.parentNode.removeChild(el);
          });
        }
        
        // 에디터에 다시 포커스
        contentArea.focus();
      }, 50);
    }
  });
  
  /**
   * OL 요소의 중첩 깊이를 계산하는 함수
   */
  function getOlDepth(ol) {
    if (!ol || ol.nodeName !== 'OL') return 0;
    
    let depth = 1; // 기본 깊이 1
    let parent = ol.parentElement;
    
    // 부모를 거슬러 올라가면서 중첩 깊이 계산
    while (parent) {
      if (parent.nodeName === 'LI' && 
          parent.parentElement && 
          parent.parentElement.nodeName === 'OL') {
        depth++;
        parent = parent.parentElement.parentElement;
      } else {
        break;
      }
    }
    
    return depth;
  }
  
  /**
   * 순서 있는 리스트에 깊이별 스타일 적용
   */
  function applyNumberedStyles(targetOl) {
    if (!targetOl || targetOl.nodeName !== 'OL') return;
    
    try {
      // 스타일 우선 적용 (CSS 클래스 활용)
      ensureNumberedListStyles();
      
      // 고유 식별자 추가
      targetOl.setAttribute('data-lite-editor-numbered', 'true');
      
      // 대상 OL의 깊이 계산 및 스타일 적용
      const depth = getOlDepth(targetOl);
      applyStyleByDepth(targetOl, depth);
      
      // 하위 OL 요소들 찾기 (표준 중첩 구조: li > ol)
      const childOls = targetOl.querySelectorAll('li > ol');
      
      // 각 하위 OL에 깊이 계산 및 스타일 적용
      childOls.forEach(childOl => {
        // 고유 식별자 추가
        childOl.setAttribute('data-lite-editor-numbered', 'true');
        const childDepth = getOlDepth(childOl);
        applyStyleByDepth(childOl, childDepth);
      });
    } catch (e) {
      // 오류 발생 시 로그 출력
      errorHandler.logError('NumberedListPlugin', errorHandler.codes.PLUGINS.LIST.APPLY, e);
    }
  }
  
  /**
   * 특정 OL 요소에 깊이에 따른 스타일 적용
   */
  function applyStyleByDepth(ol, depth) {
    if (!ol || ol.nodeName !== 'OL') return;
    
    // 고유 식별자 추가
    ol.setAttribute('data-lite-editor-numbered', 'true');
    
    // 깊이별 스타일 결정 (1→decimal, 2→lower-alpha, 3→lower-roman, 4→decimal...)
    const numberStyles = ['decimal', 'lower-alpha', 'lower-roman'];
    const styleIndex = (depth - 1) % 3; // 0, 1, 2 순환
    
    // 이전 깊이 클래스 제거 및 새 클래스 추가
    ol.classList.remove('number-depth-1', 'number-depth-2', 'number-depth-3');
    ol.classList.add(`number-depth-${styleIndex + 1}`);
    
    // 직접 스타일도 적용 (일부 환경에서 클래스가 작동하지 않을 경우 대비)
    ol.style.setProperty('list-style-type', numberStyles[styleIndex], 'important');
    ol.style.setProperty('padding-left', '1.5em', 'important');
    
    // 데이터 속성으로 깊이 정보 저장 (디버깅용)
    ol.setAttribute('data-depth', depth);
  }
  
  /**
   * Tab 키를 이용한 리스트 들여쓰기 처리
   */
  function indentListItem(li, contentArea) {
    if (!li || li.nodeName !== 'LI') return;
    
    try {
      // 현재 LI의 부모 OL
      const parentOl = li.parentNode;
      if (parentOl.nodeName !== 'OL') return;
      
      // 이전 형제 LI 찾기 (반드시 있어야 들여쓰기 가능)
      const prevLi = li.previousElementSibling;
      if (!prevLi || prevLi.nodeName !== 'LI') {
        errorHandler.logError('NumberedListPlugin', errorHandler.codes.PLUGINS.LIST.INDENT, e);
        return;
      }
      
      // 이전 LI 내의 OL 찾기 또는 새로 만들기
      let targetOl = Array.from(prevLi.children).find(child => child.nodeName === 'OL');
      
      if (!targetOl) {
        // PluginUtil.dom 활용하여 요소 생성
        targetOl = PluginUtil.dom.createElement('ol');
        prevLi.appendChild(targetOl);
      }
      
      // 현재 LI를 이전 형제의 OL로 이동
      parentOl.removeChild(li);
      targetOl.appendChild(li);
      
      // 대상 OL 스타일 적용
      applyNumberedStyles(targetOl);
      
      // 포커스 유지
      maintainFocus(li);
    } catch (e) {
      errorHandler.logError('NumberedListPlugin', errorHandler.codes.PLUGINS.LIST.INDENT, e);
    }
  }
  
  /**
   * Shift+Tab 키를 이용한 리스트 내어쓰기 처리
   */
  function outdentListItem(li, contentArea) {
    if (!li || li.nodeName !== 'LI') return;
    
    try {
      // 현재 LI의 부모 OL
      const parentOl = li.parentNode;
      if (parentOl.nodeName !== 'OL') return;
      
      // 부모 OL의 부모가 LI인지 확인 (중첩 리스트인 경우만 내어쓰기 가능)
      const parentLi = parentOl.parentNode;
      if (!parentLi || parentLi.nodeName !== 'LI') {
        errorHandler.logError('NumberedListPlugin', errorHandler.codes.PLUGINS.LIST.OUTDENT, e);
        return;
      }
      
      // 조부모 OL 찾기
      const grandparentOl = parentLi.parentNode;
      if (!grandparentOl || grandparentOl.nodeName !== 'OL') return;
      
      // 현재 LI를 부모 LI 다음으로 이동
      const nextSibling = parentLi.nextSibling;
      parentOl.removeChild(li);
      
      if (nextSibling) {
        grandparentOl.insertBefore(li, nextSibling);
      } else {
        grandparentOl.appendChild(li);
      }
      
      // 부모 OL이 비었으면 제거 (불필요한 빈 OL 정리)
      if (parentOl.children.length === 0) {
        parentLi.removeChild(parentOl);
      }
      
      // 스타일 재적용
      applyNumberedStyles(grandparentOl);
      
      // 포커스 유지
      maintainFocus(li);
    } catch (e) {
      errorHandler.logError('NumberedListPlugin', errorHandler.codes.PLUGINS.LIST.OUTDENT, e);
    }
  }
  
  /**
   * 포커스 유지 로직 (PluginUtil.selection 활용)
   */
  function maintainFocus(li) {
    if (!li) return;
    
    try {
      // LI 내의 첫 번째 텍스트 노드 찾기
      let textNode = Array.from(li.childNodes).find(node => 
        node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== ''
      );
      
      // 텍스트 노드가 없으면 새로운 텍스트 노드 추가
      if (!textNode) {
        textNode = document.createTextNode('\u200B'); // 제로 너비 공백
        li.insertBefore(textNode, li.firstChild);
      }
      
      // PluginUtil.selection으로 포커스 설정
      PluginUtil.selection.moveCursorTo(textNode, textNode.length);
    } catch (e) {
      errorHandler.logError('NumberedListPlugin', errorHandler.codes.COMMON.FOCUS, e);
    }
  }
  
  /**
   * 순서있는 리스트 스타일 적용을 위한 CSS 추가
   */
  function ensureNumberedListStyles() {
    // 이미 스타일이 추가되어 있는지 확인
    if (document.getElementById('lite-editor-numbered-list-styles')) return;
    
    // 스타일 요소 생성
    const styleEl = document.createElement('style');
    styleEl.id = 'lite-editor-numbered-list-styles';
    styleEl.textContent = `
      /* 순서있는 리스트 깊이별 스타일 - 더 구체적인 선택자 사용 */
      [contenteditable="true"] ol[data-lite-editor-numbered].number-depth-1 { list-style-type: decimal !important; }
      [contenteditable="true"] ol[data-lite-editor-numbered].number-depth-2 { list-style-type: lower-alpha !important; }
      [contenteditable="true"] ol[data-lite-editor-numbered].number-depth-3 { list-style-type: lower-roman !important; }
      
      /* 패딩 값도 일관되게 설정 - 우리 플러그인 OL만 적용 */
      [contenteditable="true"] ol[data-lite-editor-numbered] { padding-left: 1.5em !important; }
      [contenteditable="true"] li > ol[data-lite-editor-numbered] { margin-top: 0 !important; }
    `;
    
    // 문서에 추가
    document.head.appendChild(styleEl);
  }
  
  /**
   * 현재 선택된 리스트 아이템 찾기
   */
  function findActiveLi(contentArea) {
    // PluginUtil.selection 활용
    const selection = PluginUtil.selection.getSafeSelection();
    if (!selection || selection.rangeCount === 0) return null;
    
    const range = selection.getRangeAt(0);
    const node = range.commonAncestorContainer;
    
    // closest 메서드 활용해 코드 간소화
    const element = node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
    return element.closest('li');
  }
  
  /**
   * Tab 키 이벤트 핸들러 (PluginUtil.events 활용)
   */
  const handleTabKey = PluginUtil.events.throttle(function(event) {
    // Tab 키가 아니면 무시
    if (event.key !== 'Tab') return;
    
    // 에디터 영역 찾기
    const contentArea = event.target.closest('[contenteditable="true"]');
    if (!contentArea) return;
    
    // 현재 선택된 리스트 아이템 찾기
    const activeLi = findActiveLi(contentArea);
    if (!activeLi) return;
    
    // 현재 LI가 순서있는 리스트(OL)의 일부인지 확인
    const parentOl = activeLi.closest('ol');
    if (!parentOl) return;
    
    // 우리 플러그인에서 생성한 OL인지 확인 (고유 식별자 확인)
    if (!parentOl.hasAttribute('data-lite-editor-numbered')) return;
    
    // 기본 동작 방지
    event.preventDefault();
    event.stopPropagation();
    
    // 이벤트 전파 완전 차단
    event.stopImmediatePropagation();
    
    // Shift 키 여부에 따라 들여쓰기 또는 내어쓰기 실행
    if (event.shiftKey) {
      outdentListItem(activeLi, contentArea);
    } else {
      indentListItem(activeLi, contentArea);
    }
  }, 100); // 100ms 쓰로틀링 적용
  
  // Tab 키 이벤트 리스너 등록 (캡처링 단계에서 처리)
  document.addEventListener('keydown', handleTabKey, true);

  // Numbered List 단축키 (Alt+O)
  LiteEditor.registerShortcut('orderedList', {
    key: 'o',
    alt: true,
    action: function(contentArea) {
      // 에디터에 포커스 설정
      contentArea.focus();
      
      // 브라우저 내장 명령어로 순서있는 리스트 토글
      document.execCommand('insertOrderedList', false, null);
      
      // 생성된 OL에 스타일 적용
      setTimeout(() => {
        // 모든 OL 요소에 스타일 적용
        contentArea.querySelectorAll('ol').forEach(ol => {
          ol.setAttribute('data-lite-editor-numbered', 'true');
          applyStyleByDepth(ol, getOlDepth(ol));
        });
      }, 0);
    }
  });
})();