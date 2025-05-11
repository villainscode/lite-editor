/**
 * LiteEditor Numbered List Plugin
 * - 순서 있는 목록 서식과 깊이별 스타일 적용 (선택한 리스트만 적용)
 * - 규칙: 011-numberlist-bulletlist-rule-agent.mdc
 */

(function() {
  // 플러그인 등록 - PluginUtil 활용
  PluginUtil.registerPlugin('orderedList', {
    title: 'Numbered List',
    icon: 'format_list_numbered',
    action: function(contentArea, buttonElement, event) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      
      // 선택 영역 정보 저장
      const selection = PluginUtil.selection.getSafeSelection();
      if (!selection || !selection.rangeCount) return;
      const range = selection.getRangeAt(0);
      
      // 에디터 영역에 포커스
      contentArea.focus();
      
      // 현재 선택된 영역이 이미 OL인지 확인
      const existingOl = findOlBySelection(contentArea);
      
      if (existingOl) {
        // 이미 OL이면 일반 텍스트로 변환 (토글)
        unwrapNumberedList(existingOl, range);
      } else {
        // OL이 아니면 새로 생성
        createNumberedList(contentArea, range);
      }
    }
  });
  
  /**
   * 새로운 순서있는 리스트 생성 (직접 DOM 조작)
   */
  function createNumberedList(contentArea, range) {
    if (!range) {
      const selection = PluginUtil.selection.getSafeSelection();
      if (!selection || !selection.rangeCount) return;
      range = selection.getRangeAt(0);
    }
    
    // 선택 영역의 원본 텍스트 확인 (끝부분 공백 제거를 위해)
    const originalText = range.toString();
    if (originalText.match(/[\s\n\r]+$/)) {
      try {
        // 선택된 텍스트 끝에서 공백과 줄바꿈 수 계산
        const match = originalText.match(/[\s\n\r]+$/);
        const extraLength = match ? match[0].length : 0;
        
        if (extraLength > 0) {
          // 원본 range의 끝점 조정
          const endContainer = range.endContainer;
          const endOffset = range.endOffset;
          
          // 텍스트 노드인 경우만 조정
          if (endContainer.nodeType === Node.TEXT_NODE) {
            range.setEnd(endContainer, Math.max(0, endOffset - extraLength));
          }
        }
      } catch (e) {
        console.log('Range 조정 중 오류:', e);
      }
    }
    
    // 선택 영역의 오프셋 저장 (복원을 위해)
    const offsets = PluginUtil.selection.calculateOffsets(contentArea);
    
    // 선택 영역의 콘텐츠 추출
    const fragment = range.extractContents();
    
    // 새 OL 요소 생성
    const ol = document.createElement('ol');
    ol.className = 'number-depth-1'; // 기본 깊이 클래스
    ol.setAttribute('data-lite-editor-numbered', 'true'); // 고유 식별자 추가
    ol.setAttribute('data-selection-marker', 'true'); // 선택 영역 복원을 위한 마커
    
    // 선택 영역의 텍스트 줄을 LI로 변환
    const tempDiv = document.createElement('div');
    tempDiv.appendChild(fragment);
    
    // 텍스트 줄 분리
    let content = tempDiv.innerHTML;
    
    // div, p 태그를 줄바꿈으로 처리
    content = content.replace(/<\/(div|p)>/gi, '<br>');
    content = content.replace(/<(div|p)[^>]*>/gi, '');
    
    // 마지막 불필요한 줄바꿈 제거
    content = content.replace(/(<br\s*\/?>)+$/, '');
    content = content.replace(/[\s\n\r]+$/, ''); // 추가: 모든 종류의 공백 제거
    
    const lines = content.split(/<br\s*\/?>/i);
    
    // 빈 줄 제거 및 각 줄을 LI로 변환
    const nonEmptyLines = lines.filter(line => line.trim());
    
    if (nonEmptyLines.length === 0) {
      // 선택된 텍스트가 없는 경우 빈 리스트 아이템 생성
      const li = document.createElement('li');
      li.innerHTML = '&nbsp;'; // 빈 리스트 아이템에 공백 추가
      ol.appendChild(li);
    } else {
      nonEmptyLines.forEach(line => {
        const li = document.createElement('li');
        li.innerHTML = line.trim() || '&nbsp;';
        ol.appendChild(li);
      });
    }
    
    // 생성된 OL을 선택 위치에 삽입
    range.insertNode(ol);
    
    // 리스트 스타일 적용
    applyNumberedStyles(ol);
    
    // 선택 영역 복원 - 마커를 찾아서 복원
    setTimeout(() => {
      const markerElement = contentArea.querySelector('ol[data-selection-marker="true"]');
      
      if (markerElement) {
        // 마커 속성 제거
        markerElement.removeAttribute('data-selection-marker');
        
        // ol 태그를 선택하도록 설정 (전체 리스트 선택)
        const range = document.createRange();
        range.selectNode(markerElement);
        
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        
        contentArea.focus({ preventScroll: true }); // 추가: 스크롤 방지 옵션 추가
      } else {
        // 마커를 찾지 못한 경우 오프셋 기반 복원 사용
        PluginUtil.selection.restoreFromOffsets(contentArea, offsets);
        contentArea.focus({ preventScroll: true });
      }
    }, 10);
    
    return ol;
  }
  
  /**
   * 순서있는 리스트 토글 (일반 텍스트로 변환)
   */
  function unwrapNumberedList(ol, range) {
    if (!ol || ol.nodeName !== 'OL') return;
    
    // 선택 영역 정보 저장 (복원을 위한 준비)
    const contentArea = ol.closest('[contenteditable="true"]');
    
    // 선택 영역의 오프셋 저장
    const offsets = contentArea ? PluginUtil.selection.calculateOffsets(contentArea) : null;
    
    // 변환할 위치에 임시 마커 생성
    const marker = document.createElement('span');
    marker.setAttribute('data-unwrap-marker', 'true');
    ol.parentNode.insertBefore(marker, ol);
    
    // 리스트 아이템 가져오기
    const items = Array.from(ol.children);
    const fragment = document.createDocumentFragment();
    
    // 각 LI를 일반 텍스트(p)로 변환
    items.forEach(item => {
      if (item.nodeName === 'LI') {
        const p = document.createElement('p');
        // 리스트 내용 복사 전 불필요한 공백 처리
        p.innerHTML = item.innerHTML.trim() || '&nbsp;';
        fragment.appendChild(p);
      }
    });
    
    // 원래 OL 위치에 삽입
    ol.parentNode.insertBefore(fragment, ol);
    ol.parentNode.removeChild(ol);
    
    // 선택 영역 복원 (마커 기반)
    setTimeout(() => {
      if (!contentArea) return;
      
      const marker = contentArea.querySelector('[data-unwrap-marker="true"]');
      const paragraphs = [];
      
      if (marker) {
        // 마커 다음에 있는 모든 p 태그 수집
        let nextSibling = marker.nextSibling;
        while (nextSibling && nextSibling.nodeName === 'P' && paragraphs.length < items.length) {
          paragraphs.push(nextSibling);
          nextSibling = nextSibling.nextSibling;
        }
        
        // 마커 제거
        marker.parentNode.removeChild(marker);
        
        if (paragraphs.length > 0) {
          // 모든 변환된 단락을 선택
          const range = document.createRange();
          range.setStartBefore(paragraphs[0]);
          range.setEndAfter(paragraphs[paragraphs.length - 1]);
          
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
          
          contentArea.focus({ preventScroll: true }); // 추가: 스크롤 방지 옵션 추가
        } else if (offsets) {
          // 복원 실패 시 오프셋 기반 복원
          PluginUtil.selection.restoreFromOffsets(contentArea, offsets);
          contentArea.focus({ preventScroll: true });
        }
      } else if (offsets) {
        // 마커를 찾지 못한 경우 오프셋 기반 복원
        PluginUtil.selection.restoreFromOffsets(contentArea, offsets);
        contentArea.focus({ preventScroll: true });
      }
    }, 10);
  }
  
  /**
   * 선택된 요소의 깊이를 기반으로 적절한 OL 요소를 찾는 함수
   */
  function findOlBySelection(contentArea) {
    const selection = PluginUtil.selection.getSafeSelection();
    if (!selection || !selection.rangeCount) return null;
    
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    
    // 컨테이너가 직접 OL인 경우
    if (container.nodeName === 'OL') {
      return container;
    }
    
    // 부모 중 OL 찾기
    let parent = container;
    while (parent && parent !== contentArea) {
      if (parent.nodeName === 'OL') {
        return parent;
      }
      if (parent.nodeName === 'LI' && parent.parentNode && parent.parentNode.nodeName === 'OL') {
        return parent.parentNode;
      }
      parent = parent.parentNode;
    }
    
    // 선택된 LI의 부모 OL 찾기
    const closestLi = container.nodeType === Node.TEXT_NODE ? 
                      container.parentNode.closest('li') : 
                      container.closest('li');
    
    if (closestLi) {
      return closestLi.closest('ol');
    }
    
    return null;
  }
  
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
})();