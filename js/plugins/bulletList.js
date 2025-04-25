/**
 * LiteEditor Bullet List Plugin
 * - 불릿 리스트 서식과 깊이별 스타일 적용 (선택한 리스트만 적용)
 * - 규칙: 011-numberlist-bulletlist-rule-agent.mdc
 */
(function() {
  // 플러그인 등록
  PluginUtil.registerPlugin('unorderedList', {
    title: 'Bullet List',
    icon: 'format_list_bulleted',
    action: function(contentArea, buttonElement, event) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      
      // 1. 실행 전 선택 영역 정보 저장
      const selection = window.getSelection();
      const savedRange = selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
      
      // 실행 전 존재하는 UL 요소들 스냅샷 저장 (비교를 위해)
      const ulsBefore = Array.from(contentArea.querySelectorAll('ul'));
      
      // 에디터 영역에 포커스
      contentArea.focus();
      
      // 2. 불릿 목록 생성/삭제 명령 실행
      document.execCommand('insertUnorderedList', false, null);
      
      // 3. 명령 실행 후 선택된 영역의 UL 찾기
      setTimeout(() => {
        const targetUl = findTargetUl(contentArea, savedRange, ulsBefore);
        
        if (targetUl) {
          console.log('✅ 타겟 UL 찾음:', targetUl);
          // 찾은 UL에 깊이별 스타일 적용
          applyBulletStyles(targetUl);
        } else {
          console.warn('❌ 타겟 UL을 찾을 수 없음');
        }
      }, 10);
    }
  });
  
  /**
   * 선택한 영역에 해당하는 UL 요소를 찾는 함수
   * @param {HTMLElement} contentArea - 에디터 영역
   * @param {Range} savedRange - 저장된 선택 영역
   * @param {Array} ulsBefore - 명령 실행 전 존재하던 UL 요소들
   * @return {HTMLElement|null} 찾은 UL 요소 또는 null
   */
  function findTargetUl(contentArea, savedRange, ulsBefore) {
    // 1. 새로 생성된 UL 찾기 (가장 정확한 방법)
    const ulsAfter = Array.from(contentArea.querySelectorAll('ul'));
    const newUls = ulsAfter.filter(ul => !ulsBefore.includes(ul));
    
    if (newUls.length > 0) {
      console.log('🔍 새로 생성된 UL 발견');
      return newUls[0];
    }
    
    // 2. 선택 영역 주변에서 UL 찾기 (새 UL이 없는 경우)
    if (savedRange) {
      const container = savedRange.commonAncestorContainer;
      
      // 컨테이너가 직접 UL인 경우
      if (container.nodeName === 'UL') {
        console.log('🔍 선택 영역이 직접 UL');
        return container;
      }
      
      // 부모 중 UL 찾기
      let parent = container;
      while (parent && parent !== contentArea) {
        if (parent.nodeName === 'UL') {
          console.log('🔍 부모에서 UL 발견');
          return parent;
        }
        if (parent.nodeName === 'LI' && parent.parentNode && parent.parentNode.nodeName === 'UL') {
          console.log('🔍 부모 LI의 상위에서 UL 발견');
          return parent.parentNode;
        }
        parent = parent.parentNode;
      }
      
      // 자식 중 UL 찾기 (부모에서 못 찾은 경우)
      if (container.nodeType === Node.ELEMENT_NODE) {
        const childUl = container.querySelector('ul');
        if (childUl) {
          console.log('🔍 자식에서 UL 발견');
          return childUl;
        }
      }
    }
    
    // 3. 현재 선택 영역 기준으로 재확인
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;
      
      if (container.nodeName === 'UL') {
        console.log('🔍 현재 선택 영역이 UL');
        return container;
      }
      
      let parent = container;
      while (parent && parent !== contentArea) {
        if (parent.nodeName === 'UL') {
          console.log('🔍 현재 부모에서 UL 발견');
          return parent;
        }
        if (parent.nodeName === 'LI' && parent.parentNode && parent.parentNode.nodeName === 'UL') {
          console.log('🔍 현재 부모 LI의 상위에서 UL 발견');
          return parent.parentNode;
        }
        parent = parent.parentNode;
      }
    }
    
    // 현재 선택된 텍스트 노드의 부모 노드의 가장 가까운 UL 찾기
    try {
      const currentNode = window.getSelection().getRangeAt(0).startContainer;
      const closestLi = currentNode.nodeType === Node.TEXT_NODE ? 
                        currentNode.parentNode.closest('li') : 
                        currentNode.closest('li');
      
      if (closestLi) {
        const parentUl = closestLi.closest('ul');
        if (parentUl) {
          console.log('🔍 현재 텍스트 노드 주변에서 UL 발견');
          return parentUl;
        }
      }
    } catch (e) {
      console.warn('선택 영역 분석 중 오류:', e);
    }
    
    return null; // 찾지 못한 경우
  }
  
  /**
   * UL 요소의 중첩 깊이를 계산하는 함수
   * @param {HTMLElement} ul - 깊이를 계산할 UL 요소
   * @return {number} 계산된 깊이 (1부터 시작)
   */
  function getUlDepth(ul) {
    if (!ul || ul.nodeName !== 'UL') return 0;
    
    let depth = 1; // 기본 깊이 1
    let parent = ul.parentElement;
    
    // 부모를 거슬러 올라가면서 중첩 깊이 계산
    while (parent) {
      // 부모가 LI이고 그 부모가 다시 UL인 경우 (표준 중첩 구조)
      if (parent.nodeName === 'LI' && 
          parent.parentElement && 
          parent.parentElement.nodeName === 'UL') {
        depth++;
        parent = parent.parentElement.parentElement; // UL의 상위 요소로 이동
      } else {
        break; // 더 이상 중첩된 구조가 아니면 중단
      }
    }
    
    console.log(`🔢 UL 깊이 계산: ${depth}`, ul);
    return depth;
  }
  
  /**
   * 불릿 리스트에 깊이별 스타일 적용
   * @param {HTMLElement} targetUl - 스타일을 적용할 대상 UL 요소
   */
  function applyBulletStyles(targetUl) {
    if (!targetUl || targetUl.nodeName !== 'UL') return;
    
    try {
      console.log('🎨 불릿 스타일 적용 시작:', targetUl);
      
      // 대상 UL의 깊이 계산 및 스타일 적용
      const depth = getUlDepth(targetUl);
      applyStyleByDepth(targetUl, depth);
      
      // 하위 UL 요소들 찾기 (표준 중첩 구조: li > ul)
      const childUls = targetUl.querySelectorAll('li > ul');
      
      // 각 하위 UL에 깊이 계산 및 스타일 적용
      childUls.forEach(childUl => {
        const childDepth = getUlDepth(childUl);
        applyStyleByDepth(childUl, childDepth);
      });
      
      console.log('✅ 불릿 스타일 적용 완료');
    } catch (e) {
      console.error('❌ 불릿 스타일 적용 중 오류:', e);
    }
  }
  
  /**
   * 특정 UL 요소에 깊이에 따른 스타일 적용
   * @param {HTMLElement} ul - 스타일을 적용할 UL 요소
   * @param {number} depth - UL의 중첩 깊이 (1부터 시작)
   */
  function applyStyleByDepth(ul, depth) {
    if (!ul || ul.nodeName !== 'UL') return;
    
    // 깊이별 스타일 결정 (1→disc, 2→circle, 3→square, 4→disc...)
    const bulletStyles = ['disc', 'circle', 'square'];
    const styleIndex = (depth - 1) % 3; // 0, 1, 2 순환
    const bulletStyle = bulletStyles[styleIndex];
    
    console.log(`🔄 깊이 ${depth}에 '${bulletStyle}' 스타일 적용`);
    
    // 스타일 직접 적용 (important 속성으로 강제 적용)
    ul.style.setProperty('list-style-type', bulletStyle, 'important');
    ul.style.setProperty('padding-left', '1.5em', 'important'); // 좌측 여백도 설정
    
    // 데이터 속성으로 깊이 정보 저장 (디버깅 및 분석용)
    ul.setAttribute('data-depth', depth);
  }
  
  /**
   * 현재 선택된 위치의 가장 가까운 리스트 아이템(LI) 찾기
   * @param {HTMLElement} contentArea - 에디터 영역
   * @return {HTMLElement|null} 찾은 LI 요소 또는 null
   */
  function findActiveLi(contentArea) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    
    const range = selection.getRangeAt(0);
    const node = range.commonAncestorContainer;
    
    // 노드 자체가 LI인 경우
    if (node.nodeName === 'LI') {
      return node;
    }
    
    // 부모 중 LI 찾기
    let current = node;
    while (current && current !== contentArea) {
      if (current.nodeName === 'LI') {
        return current;
      }
      current = current.parentNode;
    }
    
    // 텍스트 노드의 경우 부모 요소의 LI 찾기
    if (node.nodeType === Node.TEXT_NODE && node.parentNode) {
      const parent = node.parentNode;
      if (parent.nodeName === 'LI') {
        return parent;
      }
      return parent.closest('li');
    }
    
    return null;
  }
  
  /**
   * Tab 키를 이용한 리스트 들여쓰기 처리
   * @param {HTMLElement} li - 들여쓰기할 리스트 아이템
   * @param {HTMLElement} contentArea - 에디터 영역
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
        console.log('⚠️ 들여쓰기 불가: 이전 LI 없음');
        return;
      }
      
      console.log('🔽 들여쓰기 실행:', li, '→', prevLi);
      
      // 이전 LI 내의 UL 찾기 또는 새로 만들기
      let targetUl = Array.from(prevLi.children).find(child => child.nodeName === 'UL');
      
      if (!targetUl) {
        // 이전 LI 아래에 UL이 없으면 새로 생성
        targetUl = document.createElement('ul');
        prevLi.appendChild(targetUl);
        console.log('➕ 새 UL 생성됨');
      }
      
      // 현재 LI 위치 저장 (다음 형제가 있을 경우)
      const nextLi = li.nextElementSibling;
      
      // 현재 LI를 이전 형제의 UL로 이동
      parentUl.removeChild(li);
      targetUl.appendChild(li);
      
      // 대상 UL 스타일 적용
      applyBulletStyles(targetUl);
      
      // 포커스 유지
      maintainFocus(li);
      
      console.log('✅ 들여쓰기 완료');
    } catch (e) {
      console.error('❌ 들여쓰기 중 오류:', e);
    }
  }
  
  /**
   * Shift+Tab 키를 이용한 리스트 내어쓰기 처리
   * @param {HTMLElement} li - 내어쓰기할 리스트 아이템
   * @param {HTMLElement} contentArea - 에디터 영역
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
        console.log('⚠️ 내어쓰기 불가: 이미 최상위 수준');
        return;
      }
      
      // 조부모 UL 찾기
      const grandparentUl = parentLi.parentNode;
      if (!grandparentUl || grandparentUl.nodeName !== 'UL') return;
      
      console.log('🔼 내어쓰기 실행:', li, '→', grandparentUl);
      
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
      
      // 최상위 UL 스타일 재적용
      applyBulletStyles(findRootUl(grandparentUl));
      
      // 포커스 유지
      maintainFocus(li);
      
      console.log('✅ 내어쓰기 완료');
    } catch (e) {
      console.error('❌ 내어쓰기 중 오류:', e);
    }
  }
  
  /**
   * LI 요소에 대한 포커스 유지
   * @param {HTMLElement} li - 포커스를 유지할 LI 요소
   */
  function maintainFocus(li) {
    if (!li) return;
    
    try {
      // LI 내의 첫 번째 텍스트 노드 찾기
      let textNode = null;
      
      for (let i = 0; i < li.childNodes.length; i++) {
        if (li.childNodes[i].nodeType === Node.TEXT_NODE) {
          textNode = li.childNodes[i];
          break;
        }
      }
      
      // 텍스트 노드가 없으면 새로운 텍스트 노드 추가
      if (!textNode || textNode.textContent.trim() === '') {
        if (!textNode) {
          textNode = document.createTextNode('\u200B'); // 제로 너비 공백
          li.insertBefore(textNode, li.firstChild);
        }
      }
      
      // 텍스트 노드에 포커스 설정
      const range = document.createRange();
      const selection = window.getSelection();
      
      // 텍스트의 끝으로 커서 이동
      range.setStart(textNode, textNode.length);
      range.setEnd(textNode, textNode.length);
      
      selection.removeAllRanges();
      selection.addRange(range);
    } catch (e) {
      console.warn('포커스 유지 중 오류:', e);
    }
  }
  
  /**
   * 주어진 UL 요소의 최상위 UL 찾기
   * @param {HTMLElement} ul - 시작 UL 요소
   * @return {HTMLElement} 최상위 UL 요소
   */
  function findRootUl(ul) {
    if (!ul || ul.nodeName !== 'UL') return ul;
    
    let rootUl = ul;
    let parent = ul.parentNode;
    
    while (parent) {
      if (parent.nodeName === 'LI' && 
          parent.parentNode && 
          parent.parentNode.nodeName === 'UL') {
        rootUl = parent.parentNode;
        parent = rootUl.parentNode;
      } else {
        break;
      }
    }
    
    return rootUl;
  }
  
  /**
   * Tab 키 이벤트 핸들러 (들여쓰기/내어쓰기)
   * @param {Event} event - 키보드 이벤트
   */
  function handleTabKey(event) {
    // Tab 키가 아니면 무시
    if (event.key !== 'Tab') return;
    
    // 에디터 영역 찾기
    const contentArea = event.target.closest('[contenteditable="true"]');
    if (!contentArea) return;
    
    // 현재 선택된 리스트 아이템 찾기
    const activeLi = findActiveLi(contentArea);
    if (!activeLi) return;
    
    // 기본 동작 방지
    event.preventDefault();
    event.stopPropagation();
    
    console.log(`⌨️ Tab 키 감지: ${event.shiftKey ? '내어쓰기' : '들여쓰기'}`);
    
    // Shift 키 여부에 따라 들여쓰기 또는 내어쓰기 실행
    if (event.shiftKey) {
      outdentListItem(activeLi, contentArea);
    } else {
      indentListItem(activeLi, contentArea);
    }
  }
  
  // Tab 키 이벤트 리스너 등록 (캡처링 단계에서 처리)
  document.addEventListener('keydown', handleTabKey, true);
})();