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
      
      // 1. 실행 전 선택 영역 정보 저장 - PluginUtil.selection 활용
      const savedRange = PluginUtil.selection.saveSelection();
      
      // 실행 전 존재하는 UL 요소들 스냅샷 저장
      const ulsBefore = Array.from(contentArea.querySelectorAll('ul'));
      
      // 에디터 영역에 포커스
      contentArea.focus();
      
      // 2. 불릿 목록 생성/삭제 명령 실행
      document.execCommand('insertUnorderedList', false, null);
      
      // 3. 명령 실행 후 선택된 영역의 UL 찾기 - PluginUtil.events 활용
      PluginUtil.events.debounce(() => {
        const targetUl = findTargetUl(contentArea, savedRange, ulsBefore);
        
        if (targetUl) {
          console.log('✅ 타겟 UL 찾음:', targetUl);
          // 찾은 UL에 깊이별 스타일 적용
          applyBulletStyles(targetUl);
        } else {
          console.warn('❌ 타겟 UL을 찾을 수 없음');
        }
      }, 10)();
    }
  });
  
  /**
   * 선택한 영역에 해당하는 UL 요소를 찾는 함수
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
        return container;
      }
      
      // 부모 중 UL 찾기
      let parent = container;
      while (parent && parent !== contentArea) {
        if (parent.nodeName === 'UL') {
          return parent;
        }
        if (parent.nodeName === 'LI' && parent.parentNode && parent.parentNode.nodeName === 'UL') {
          return parent.parentNode;
        }
        parent = parent.parentNode;
      }
    }
    
    // 3. 현재 선택 영역으로 확인 - PluginUtil.selection 활용
    const selection = PluginUtil.selection.getSafeSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;
      
      if (container.nodeName === 'UL') {
        return container;
      }
      
      const closestLi = container.nodeType === Node.TEXT_NODE ? 
                        container.parentNode.closest('li') : 
                        container.closest('li');
      
      if (closestLi) {
        return closestLi.closest('ul');
      }
    }
    
    return null;
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
   * 불릿 리스트에 깊이별 스타일 적용
   */
  function applyBulletStyles(targetUl) {
    if (!targetUl || targetUl.nodeName !== 'UL') return;
    
    try {
      console.log('🎨 불릿 스타일 적용 시작:', targetUl);
      
      // 스타일 우선 적용 (CSS 클래스 활용)
      ensureBulletListStyles();
      
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
   */
  function applyStyleByDepth(ul, depth) {
    if (!ul || ul.nodeName !== 'UL') return;
    
    // 깊이별 스타일 결정 (1→disc, 2→circle, 3→square, 4→disc...)
    const bulletStyles = ['disc', 'circle', 'square'];
    const styleIndex = (depth - 1) % 3; // 0, 1, 2 순환
    
    // 이전 깊이 클래스 제거 및 새 클래스 추가
    ul.classList.remove('bullet-depth-1', 'bullet-depth-2', 'bullet-depth-3');
    ul.classList.add(`bullet-depth-${styleIndex + 1}`);
    
    // 직접 스타일도 적용 (일부 환경에서 클래스가 작동하지 않을 경우 대비)
    ul.style.setProperty('list-style-type', bulletStyles[styleIndex], 'important');
    ul.style.setProperty('padding-left', '1.5em', 'important');
    
    // 데이터 속성으로 깊이 정보 저장 (디버깅용)
    ul.setAttribute('data-depth', depth);
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
        console.log('⚠️ 들여쓰기 불가: 이전 LI 없음');
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
      console.error('❌ 들여쓰기 중 오류:', e);
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
        console.log('⚠️ 내어쓰기 불가: 이미 최상위 수준');
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
      console.error('❌ 내어쓰기 중 오류:', e);
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
      console.warn('포커스 유지 중 오류:', e);
    }
  }
  
  /**
   * 필요한 스타일 추가 (PluginUtil.styles 활용)
   */
  function ensureBulletListStyles() {
    PluginUtil.styles.addInlineStyle('bullet-list-styles', `
      .bullet-depth-1 { list-style-type: disc !important; }
      .bullet-depth-2 { list-style-type: circle !important; }
      .bullet-depth-3 { list-style-type: square !important; }
      [contenteditable="true"] ul { padding-left: 1.5em !important; }
      [contenteditable="true"] li > ul { margin-top: 0 !important; }
    `);
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
    
    // 기본 동작 방지
    event.preventDefault();
    event.stopPropagation();
    
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