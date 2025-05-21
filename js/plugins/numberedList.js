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
      // 이벤트 중복 실행 방지
      if (event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation(); // 중복 실행 완전 차단
      }
      
      // 에디터 영역에 포커스
      contentArea.focus();
      
      // 현재 선택 영역 가져오기
      const selection = PluginUtil.selection.getSafeSelection();
      if (!selection || !selection.rangeCount) return;
      
      const range = selection.getRangeAt(0);
      
      // 범위가 이미 리스트 내부인지 확인
      const isInsideList = isSelectionInsideList(range);
      
      if (isInsideList) {
        // 리스트 제거 (토글)
        unwrapNumberedList(isInsideList.ol, range);
      } else {
        // 새 리스트 생성
        createNumberedList(contentArea, range);
      }
    }
  });
  
  /**
   * 선택 영역이 숫자 리스트 내부인지 확인
   */
  function isSelectionInsideList(range) {
    if (!range) return false;
    
    // 조상 컨테이너 확인
    const container = range.commonAncestorContainer;
    
    // 텍스트 노드인 경우 부모로 이동
    const element = container.nodeType === Node.TEXT_NODE ? container.parentNode : container;
    
    // 1. 선택 영역이 리스트 아이템 내부인지 확인
    const listItem = element.closest('li');
    if (listItem) {
      const ol = listItem.closest('ol[data-lite-editor-number]');
      if (ol) {
        return { listItem, ol };
      }
    }
    
    // 2. 선택 영역이 OL 전체를 감싸는지 확인
    if (element.nodeName === 'OL' && element.hasAttribute('data-lite-editor-number')) {
      return { ol: element };
    }
    
    // 3. 여러 리스트 아이템이 선택된 경우 (공통 조상이 OL)
    if (element.nodeName === 'OL' || element.querySelector('ol[data-lite-editor-number]')) {
      const ol = element.nodeName === 'OL' ? 
                 (element.hasAttribute('data-lite-editor-number') ? element : null) : 
                 element.querySelector('ol[data-lite-editor-number]');
      if (ol) {
        return { ol };
      }
    }
    
    return false;
  }
  
  /**
   * 새로운 숫자 리스트 생성 (직접 DOM 조작)
   */
  function createNumberedList(contentArea, range) {
    if (!range) {
      const selection = PluginUtil.selection.getSafeSelection();
      if (!selection || !selection.rangeCount) return;
      range = selection.getRangeAt(0);
    }
    
    // 콜랩스된 범위인 경우 현재 라인 전체를 선택
    if (range.collapsed) {
      const node = range.startContainer;
      const element = node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
      const block = element.closest('p, div, h1, h2, h3, h4, h5, h6');
      
      if (block) {
        range.selectNodeContents(block);
      }
    }
    
    // 선택 영역의 콘텐츠 추출
    const fragment = range.extractContents();
    
    // 새 OL 요소 생성
    const ol = document.createElement('ol');
    ol.className = 'number-depth-1'; // 기본 깊이 클래스
    ol.setAttribute('data-lite-editor-number', 'true'); // 고유 식별자 추가
    ol.setAttribute('data-selection-marker', 'true'); // 선택 영역 복원을 위한 마커
    
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
    
    // 스타일 적용
    applyStyleToSingleOl(ol);
    
    // 선택 영역 복원
    selectCreatedList(ol);
    
    return ol;
  }
  
  // 스타일 적용
  ensureNumberedListStyles();
  
  /**
   * 생성된 리스트 선택
   */
  function selectCreatedList(ol) {
    if (!ol) return;
    
    setTimeout(() => {
      const range = document.createRange();
      range.selectNodeContents(ol);
      
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }, 10);
  }
  
  /**
   * 숫자 리스트 제거 (토글)
   */
  function unwrapNumberedList(ol, range) {
    if (!ol || ol.nodeName !== 'OL') return;
    
    // 선택 영역 정보 저장 (복원을 위한 준비)
    const contentArea = ol.closest('[contenteditable="true"]');
    
    // 리스트 아이템들 수집
    const items = Array.from(ol.children).filter(child => child.nodeName === 'LI');
    if (items.length === 0) return;
    
    // 변환할 위치에 임시 마커 생성 (위치 참조용)
    const marker = document.createElement('span');
    marker.setAttribute('data-unwrap-marker', 'true');
    ol.parentNode.insertBefore(marker, ol);
    
    // 리스트 아이템들을 일반 텍스트로 변환
    const fragment = document.createDocumentFragment();
    
    items.forEach(item => {
      // LI 콘텐츠를 일반 텍스트로 변환
      const p = document.createElement('p');
      
      // 중첩 OL이 있는 경우 처리
      const nestedOl = item.querySelector('ol');
      if (nestedOl) {
        // 중첩 OL 제거 전 내용 저장
        const itemContent = item.innerHTML.replace(nestedOl.outerHTML, '');
        p.innerHTML = itemContent;
      } else {
        // 내용 복사 (innerHTML 사용)
        p.innerHTML = item.innerHTML;
      }
      
      fragment.appendChild(p);
    });
    
    // 리스트 대체
    ol.parentNode.insertBefore(fragment, ol);
    ol.parentNode.removeChild(ol);
    
    // 선택 영역 복원 (마커 기반) - 약간 지연시켜 DOM 업데이트 완료 보장
    setTimeout(() => {
      const marker = contentArea.querySelector('[data-unwrap-marker="true"]');
      if (!marker) return;
      
      // 변환된 모든 단락 수집
      const paragraphs = [];
      let nextSibling = marker.nextSibling;
      
      // 정확히 items 길이만큼의 단락만 찾음
      while (nextSibling && paragraphs.length < items.length) {
        if (nextSibling.nodeName === 'P') {
          paragraphs.push(nextSibling);
        }
        nextSibling = nextSibling.nextSibling;
      }
      
      // 마커 제거
      marker.parentNode.removeChild(marker);
      
      if (paragraphs.length > 0) {
        // 모든 변환된 단락을 선택 (첫 번째부터 마지막까지)
        const range = document.createRange();
        range.setStartBefore(paragraphs[0]);
        range.setEndAfter(paragraphs[paragraphs.length - 1]);
        
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        
        // 에디터에 포커스
        contentArea.focus();
      }
    }, 10);
  }
  
  /**
   * 현재 선택된 리스트 아이템 찾기 (개선된 버전)
   */
  function findActiveLi(contentArea) {
    // PluginUtil.selection 활용
    const selection = PluginUtil.selection.getSafeSelection();
    if (!selection || selection.rangeCount === 0) return null;
    
    const range = selection.getRangeAt(0);
    const node = range.commonAncestorContainer;
    
    // closest 메서드 활용해 코드 간소화
    const element = node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
    const listItem = element.closest('li');
    
    if (listItem && listItem.closest('ol[data-lite-editor-number]')) {
      return listItem;
    }
    
    return null;
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
      console.error('포커스 유지 오류:', e);
    }
  }
  
  /**
   * 숫자 리스트에 깊이별 스타일 적용
   */
  function applyNumberStyles(targetOl) {
    if (!targetOl || targetOl.nodeName !== 'OL') return;
    
    try {
      // 타겟 OL에 스타일 적용
      applyStyleToSingleOl(targetOl);
      
      // 하위 OL에도 스타일 적용
      const childOls = targetOl.querySelectorAll('li > ol');
      childOls.forEach(childOl => {
        const childDepth = getOlDepth(childOl);
        applyStyleByDepth(childOl, childDepth);
      });
    } catch (e) {
      console.error('리스트 스타일 적용 오류:', e);
    }
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
   * 단일 OL에만 스타일 적용
   */
  function applyStyleToSingleOl(ol) {
    if (!ol || ol.nodeName !== 'OL') return;
    
    // 고유 식별자 추가
    ol.setAttribute('data-lite-editor-number', 'true');
    
    const depth = getOlDepth(ol);
    applyStyleByDepth(ol, depth);
  }
  
  /**
   * 특정 OL 요소에 깊이에 따른 스타일 적용
   */
  function applyStyleByDepth(ol, depth) {
    if (!ol || ol.nodeName !== 'OL') return;
    
    // 이전 스타일 먼저 제거 (다른 OL에 영향 없도록)
    ol.style.removeProperty('list-style-type');
    ol.style.removeProperty('padding-left');
    
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
    ol.setAttribute('data-number-style', numberStyles[styleIndex]);
  }
  
  /**
   * Tab 키를 이용한 리스트 들여쓰기 처리 (개선)
   */
  function indentListItem(li, contentArea) {
    if (!li || li.nodeName !== 'LI') return;
    
    try {
      // 현재 LI의 부모 OL
      const parentOl = li.parentNode;
      if (parentOl.nodeName !== 'OL') return;
      
      // 이전 형제 LI 찾기 (반드시 있어야 들여쓰기 가능)
      const prevLi = li.previousElementSibling;
      if (!prevLi || prevLi.nodeName !== 'LI') return;
      
      // 이전 LI 내의 OL 찾기 또는 새로 만들기
      let targetOl = Array.from(prevLi.children).find(child => child.nodeName === 'OL');
      
      if (!targetOl) {
        // 새로운 OL 생성
        targetOl = document.createElement('ol');
        prevLi.appendChild(targetOl);
      }
      
      // 현재 LI를 이전 형제의 OL로 이동
      parentOl.removeChild(li);
      targetOl.appendChild(li);
      
      // 대상 OL 스타일 적용
      applyNumberStyles(targetOl);
      
      // 포커스 유지
      maintainFocus(li);
    } catch (e) {
      console.error('리스트 들여쓰기 오류:', e);
    }
  }
  
  /**
   * Shift+Tab 키를 이용한 리스트 내어쓰기 처리 (개선)
   */
  function outdentListItem(li, contentArea) {
    if (!li || li.nodeName !== 'LI') return;
    
    try {
      // 현재 LI의 부모 OL
      const parentOl = li.parentNode;
      if (parentOl.nodeName !== 'OL') return;
      
      // 부모 OL의 부모가 LI인지 확인 (중첩 리스트인 경우만 내어쓰기 가능)
      const parentLi = parentOl.parentNode;
      if (!parentLi || parentLi.nodeName !== 'LI') return;
      
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
      applyNumberStyles(grandparentOl);
      
      // 포커스 유지
      maintainFocus(li);
    } catch (e) {
      console.error('리스트 내어쓰기 오류:', e);
    }
  }
  
  /**
   * 숫자 리스트 스타일 적용을 위한 CSS 추가
   */
  function ensureNumberedListStyles() {
    // 이미 스타일이 추가되어 있는지 확인
    if (document.getElementById('lite-editor-numbered-list-styles')) return;
    
    // 스타일 요소 생성
    const styleEl = document.createElement('style');
    styleEl.id = 'lite-editor-numbered-list-styles';
    styleEl.textContent = `
      /* 숫자 리스트 깊이별 스타일 - 더 구체적인 선택자 사용 */
      [contenteditable="true"] ol[data-lite-editor-number].number-depth-1 { list-style-type: decimal !important; }
      [contenteditable="true"] ol[data-lite-editor-number].number-depth-2 { list-style-type: lower-alpha !important; }
      [contenteditable="true"] ol[data-lite-editor-number].number-depth-3 { list-style-type: lower-roman !important; }
      
      /* 패딩 값도 일관되게 설정 - 우리 플러그인 OL만 적용 */
      [contenteditable="true"] ol[data-lite-editor-number] { padding-left: 1.5em !important; }
      
      /* 선택 영역 표시 마커 (일시적) */
      .lite-editor-temp-marker {
        display: inline;
        user-select: none;
      }
    `;
    
    // 문서에 추가
    document.head.appendChild(styleEl);
  }
  
  /**
   * Tab 키 이벤트 핸들러 (PluginUtil.events 활용, 쓰로틀링 적용)
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
    
    // 현재 LI가 숫자 리스트(OL)의 일부인지 확인
    const parentOl = activeLi.closest('ol');
    if (!parentOl || !parentOl.hasAttribute('data-lite-editor-number')) return;
    
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
  
  // Alt+O 단축키 등록
  LiteEditor.registerShortcut('orderedList', {
    key: 'o',
    alt: true,
    action: function(contentArea) {
      // 에디터에 포커스 설정
      contentArea.focus();
      
      // 선택 영역 정보 가져오기
      const selection = PluginUtil.selection.getSafeSelection();
      if (!selection || !selection.rangeCount) return;
      
      const range = selection.getRangeAt(0);
      
      // 범위가 이미 리스트 내부인지 확인
      const isInsideList = isSelectionInsideList(range);
      
      if (isInsideList) {
        // 리스트 제거 (토글)
        unwrapNumberedList(isInsideList.ol, range);
      } else {
        // 새 리스트 생성
        createNumberedList(contentArea, range);
      }
    }
  });
})();