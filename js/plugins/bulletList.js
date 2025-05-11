/**
 * LiteEditor Bullet List Plugin
 * - 불릿 리스트 서식과 깊이별 스타일 적용 (선택한 리스트만 적용)
 * - 규칙: 011-numberlist-bulletlist-rule-agent.mdc
 */
(function() {
  // 플러그인 등록 - PluginUtil 활용
  PluginUtil.registerPlugin('unorderedList', {
    title: 'Bullet List',
    icon: 'format_list_bulleted',
    action: function(contentArea, buttonElement, event) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      
      // 에디터 영역에 포커스
      contentArea.focus();
      
      // 현재 선택 영역 가져오기
      const selection = PluginUtil.selection.getSafeSelection();
      if (!selection || !selection.rangeCount) return;
      
      const range = selection.getRangeAt(0);
      
      // 선택 영역이 이미 리스트 내부인지 확인
      const container = range.commonAncestorContainer;
      const listItem = container.nodeType === Node.TEXT_NODE ? 
                      container.parentNode.closest('li') : 
                      container.closest('li');
      
      if (listItem && listItem.parentNode.nodeName === 'UL') {
        // 리스트 제거 (토글)
        unwrapBulletList(listItem.closest('ul'), range);
      } else {
        // 새 리스트 생성
        createBulletList(contentArea, range);
      }
    }
  });
  
  /**
   * 새로운 불릿 리스트 생성 (직접 DOM 조작)
   */
  function createBulletList(contentArea, range) {
    if (!range) {
      const selection = PluginUtil.selection.getSafeSelection();
      if (!selection || !selection.rangeCount) return;
      range = selection.getRangeAt(0);
    }
    
    // 선택 영역의 콘텐츠 추출
    const fragment = range.extractContents();
    
    // 새 UL 요소 생성
    const ul = document.createElement('ul');
    ul.className = 'bullet-depth-1'; // 기본 깊이 클래스
    ul.setAttribute('data-lite-editor-bullet', 'true'); // 고유 식별자 추가
    ul.setAttribute('data-selection-marker', 'true'); // 선택 영역 복원을 위한 마커
    
    // 선택 영역의 텍스트 줄을 LI로 변환
    const tempDiv = document.createElement('div');
    tempDiv.appendChild(fragment);
    
    // 줄바꿈으로 분리하여 각 줄을 LI로 변환
    let content = tempDiv.innerHTML;
    
    // div, p 태그를 줄바꿈으로 처리
    content = content.replace(/<\/(div|p)>/gi, '<br>');
    content = content.replace(/<(div|p)[^>]*>/gi, '');
    
    // 마지막 불필요한 줄바꿈 제거
    content = content.replace(/(<br\s*\/?>)+$/, '');
    
    // 줄바꿈으로 분리
    const lines = content.split(/<br\s*\/?>/i);
    
    // 빈 줄 제거 및 각 줄을 LI로 변환
    const nonEmptyLines = lines.filter(line => line.trim());
    
    if (nonEmptyLines.length === 0) {
      // 선택된 텍스트가 없는 경우 빈 리스트 아이템 생성
      const li = document.createElement('li');
      li.innerHTML = '&nbsp;'; // 빈 리스트 아이템에 공백 추가
      ul.appendChild(li);
    } else {
      nonEmptyLines.forEach(line => {
        const li = document.createElement('li');
        li.innerHTML = line.trim() || '&nbsp;';
        ul.appendChild(li);
      });
    }
    
    // 생성된 UL을 선택 위치에 삽입
    range.insertNode(ul);
    
    // 스타일 적용
    applyStyleToSingleUl(ul);
    
    // 새로운 방식으로 선택 영역 복원
    PluginUtil.selection.restoreSelectionByMarker(contentArea, 'ul[data-selection-marker="true"]', 100);
    
    return ul;
  }
  
  /**
   * 불릿 리스트 제거 (토글)
   */
  function unwrapBulletList(ul, range) {
    if (!ul || ul.nodeName !== 'UL') return;
    
    // 선택 영역 정보 저장 (복원을 위한 준비)
    const contentArea = ul.closest('[contenteditable="true"]');
    
    // 리스트 아이템들을 일반 텍스트로 변환
    const fragment = document.createDocumentFragment();
    const items = Array.from(ul.children);
    
    // 변환할 위치에 임시 마커 생성 (위치 참조용)
    const marker = document.createElement('span');
    marker.setAttribute('data-unwrap-marker', 'true');
    ul.parentNode.insertBefore(marker, ul);
    
    items.forEach(item => {
      if (item.nodeName === 'LI') {
        // LI 콘텐츠를 일반 텍스트로 변환
        const p = document.createElement('p');
        p.innerHTML = item.innerHTML;
        fragment.appendChild(p);
      }
    });
    
    // 리스트 대체
    ul.parentNode.insertBefore(fragment, ul);
    ul.parentNode.removeChild(ul);
    
    // 선택 영역 복원 (마커 기반)
    setTimeout(() => {
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
          
          contentArea.focus();
        }
      }
    }, 10);
  }
  
  /**
   * UL 요소의 중첩 깊이를 계산하는 함수
   */
  function getUlDepth(ul) {
    if (!ul || ul.nodeName !== 'UL') return 0;
    
    let depth = 1; // 기본 깊이 1
    let parent = ul.parentElement;
    
    // 부모를 거슬러 올라가면서 중첩 깊이 계산
    while (parent) {
      if (parent.nodeName === 'LI' && 
          parent.parentElement && 
          parent.parentElement.nodeName === 'UL') {
        depth++;
        parent = parent.parentElement.parentElement;
      } else {
        break;
      }
    }
    
    return depth;
  }
  
  /**
   * 불릿 리스트에 깊이별 스타일 적용 - 직접 적용 방식
   */
  function applyBulletStyles(targetUl) {
    if (!targetUl || targetUl.nodeName !== 'UL') return;
    
    try {
      // 스타일 우선 적용 (CSS 클래스 활용)
      ensureBulletListStyles();
      
      // 타겟 UL에 스타일 적용
      applyStyleToSingleUl(targetUl);
      
      // 하위 UL에도 스타일 적용
      const childUls = targetUl.querySelectorAll('li > ul');
      childUls.forEach(childUl => {
        const childDepth = getUlDepth(childUl);
        applyStyleByDepth(childUl, childDepth);
      });
    } catch (e) {
      errorHandler.logError('ListPlugin', errorHandler.codes.PLUGINS.LIST.APPLY, e);
    }
  }
  
  /**
   * 단일 UL에만 스타일 적용
   */
  function applyStyleToSingleUl(ul) {
    if (!ul || ul.nodeName !== 'UL') return;
    
    // 고유 식별자 추가
    ul.setAttribute('data-lite-editor-bullet', 'true');
    
    const depth = getUlDepth(ul);
    applyStyleByDepth(ul, depth);
  }
  
  /**
   * 특정 UL 요소에 깊이에 따른 스타일 적용
   */
  function applyStyleByDepth(ul, depth) {
    if (!ul || ul.nodeName !== 'UL') return;
    
    // 이전 스타일 먼저 제거 (다른 UL에 영향 없도록)
    ul.style.removeProperty('list-style-type');
    ul.style.removeProperty('padding-left');
    
    // 깊이별 스타일 결정 (1→disc, 2→circle, 3→square, 4→disc...)
    const bulletStyles = ['disc', 'circle', 'square'];
    const styleIndex = (depth - 1) % 3; // 0, 1, 2 순환
    
    // 이전 깊이 클래스 제거 및 새 클래스 추가
    ul.classList.remove('bullet-depth-1', 'bullet-depth-2', 'bullet-depth-3');
    ul.classList.add(`bullet-depth-${styleIndex + 1}`);
    
    // 직접 스타일도 적용 (일부 환경에서 클래스가 작동하지 않을 경우 대비)
    // 특이성을 높이기 위해 클래스 선택자 사용
    ul.style.setProperty('list-style-type', bulletStyles[styleIndex], 'important');
    ul.style.setProperty('padding-left', '1.5em', 'important');
    
    // 데이터 속성으로 깊이 정보 저장 (디버깅용)
    ul.setAttribute('data-depth', depth);
    ul.setAttribute('data-bullet-style', bulletStyles[styleIndex]);
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
   * Tab 키를 이용한 리스트 들여쓰기 처리
   */
  function indentListItem(li, contentArea) {
    if (!li || li.nodeName !== 'LI') return;
    
    try {
      // 현재 LI의 부모 UL
      const parentUl = li.parentNode;
      if (parentUl.nodeName !== 'UL') return;
      
      // 이전 형제 LI 찾기 (반드시 있어야 들여쓰기 가능)
      const prevLi = li.previousElementSibling;
      if (!prevLi || prevLi.nodeName !== 'LI') {
        errorHandler.logError('ListPlugin', errorHandler.codes.PLUGINS.LIST.INDENT, e);
        return;
      }
      
      // 이전 LI 내의 UL 찾기 또는 새로 만들기
      let targetUl = Array.from(prevLi.children).find(child => child.nodeName === 'UL');
      
      if (!targetUl) {
        // PluginUtil.dom 활용하여 요소 생성
        targetUl = PluginUtil.dom.createElement('ul');
        prevLi.appendChild(targetUl);
      }
      
      // 현재 LI를 이전 형제의 UL로 이동
      parentUl.removeChild(li);
      targetUl.appendChild(li);
      
      // 대상 UL 스타일 적용
      applyBulletStyles(targetUl);
      
      // 포커스 유지
      maintainFocus(li);
    } catch (e) {
      errorHandler.logError('ListPlugin', errorHandler.codes.PLUGINS.LIST.INDENT, e);
    }
  }
  
  /**
   * Shift+Tab 키를 이용한 리스트 내어쓰기 처리
   */
  function outdentListItem(li, contentArea) {
    if (!li || li.nodeName !== 'LI') return;
    
    try {
      // 현재 LI의 부모 UL
      const parentUl = li.parentNode;
      if (parentUl.nodeName !== 'UL') return;
      
      // 부모 UL의 부모가 LI인지 확인 (중첩 리스트인 경우만 내어쓰기 가능)
      const parentLi = parentUl.parentNode;
      if (!parentLi || parentLi.nodeName !== 'LI') {
        errorHandler.logError('ListPlugin', errorHandler.codes.PLUGINS.LIST.OUTDENT, e);
        return;
      }
      
      // 조부모 UL 찾기
      const grandparentUl = parentLi.parentNode;
      if (!grandparentUl || grandparentUl.nodeName !== 'UL') return;
      
      // 현재 LI를 부모 LI 다음으로 이동
      const nextSibling = parentLi.nextSibling;
      parentUl.removeChild(li);
      
      if (nextSibling) {
        grandparentUl.insertBefore(li, nextSibling);
      } else {
        grandparentUl.appendChild(li);
      }
      
      // 부모 UL이 비었으면 제거 (불필요한 빈 UL 정리)
      if (parentUl.children.length === 0) {
        parentLi.removeChild(parentUl);
      }
      
      // 스타일 재적용
      applyBulletStyles(grandparentUl);
      
      // 포커스 유지
      maintainFocus(li);
    } catch (e) {
      errorHandler.logError('ListPlugin', errorHandler.codes.PLUGINS.LIST.OUTDENT, e);
    }
  }
  
  /**
   * 포커스 유지 로직 (개선)
   */
  function maintainFocus(li) {
    if (!li) return;
    
    try {
      // 지연시간 0으로 설정 - 즉시 실행 (DOM이 이미 준비됨)
      setTimeout(() => {
        // LI 내의 첫 번째 텍스트 노드 찾기
        let textNode = Array.from(li.childNodes).find(node => 
          node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== ''
        );
        
        // 텍스트 노드가 없으면 첫 번째 자식 요소를 찾거나 새 노드 추가
        if (!textNode) {
          // 내부 요소의 첫 번째 텍스트 노드 찾기 시도
          const firstChild = li.firstChild;
          if (firstChild && firstChild.nodeType === Node.ELEMENT_NODE) {
            textNode = findFirstTextNode(firstChild);
          }
          
          // 그래도 없으면 새 텍스트 노드 생성
          if (!textNode) {
            textNode = document.createTextNode('\u200B'); // 제로 너비 공백
            li.insertBefore(textNode, li.firstChild);
          }
        }
        
        // 텍스트 노드 위치에 커서 설정
        const textLength = textNode.length || 0;
        PluginUtil.selection.moveCursorTo(textNode, textLength);
      }, 0);
    } catch (e) {
      errorHandler.logError('ListPlugin', errorHandler.codes.COMMON.FOCUS, e);
    }
  }
  
  /**
   * 요소 내 첫 번째 텍스트 노드 찾기 (재귀)
   */
  function findFirstTextNode(element) {
    if (!element) return null;
    
    if (element.nodeType === Node.TEXT_NODE && element.textContent.trim()) {
      return element;
    }
    
    if (element.childNodes && element.childNodes.length > 0) {
      for (let i = 0; i < element.childNodes.length; i++) {
        const found = findFirstTextNode(element.childNodes[i]);
        if (found) return found;
      }
    }
    
    return null;
  }
  
  /**
   * 불릿 리스트 스타일 적용을 위한 CSS 추가
   */
  function ensureBulletListStyles() {
    // 이미 스타일이 추가되어 있는지 확인
    if (document.getElementById('lite-editor-bullet-list-styles')) return;
    
    // 스타일 요소 생성
    const styleEl = document.createElement('style');
    styleEl.id = 'lite-editor-bullet-list-styles';
    styleEl.textContent = `
      /* 불릿 리스트 깊이별 스타일 - 더 구체적인 선택자 사용 */
      [contenteditable="true"] ul[data-lite-editor-bullet].bullet-depth-1 { list-style-type: disc !important; }
      [contenteditable="true"] ul[data-lite-editor-bullet].bullet-depth-2 { list-style-type: circle !important; }
      [contenteditable="true"] ul[data-lite-editor-bullet].bullet-depth-3 { list-style-type: square !important; }
      
      /* 패딩 값도 일관되게 설정 - 우리 플러그인 UL만 적용 */
      [contenteditable="true"] ul[data-lite-editor-bullet] { padding-left: 1.5em !important; }
    `;
    
    // 문서에 추가
    document.head.appendChild(styleEl);
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
    
    // 현재 LI가 불릿 리스트(UL)의 일부인지 확인
    const parentUl = activeLi.closest('ul');
    if (!parentUl) return;
    
    // 우리 플러그인에서 생성한 UL인지 확인 (고유 식별자 확인)
    if (!parentUl.hasAttribute('data-lite-editor-bullet')) return;
    
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