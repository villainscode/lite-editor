/**
 * LiteEditor 불릿 리스트 플러그인
 * - 선택 영역에만 불릿 적용/해제
 * - 원본 형식(P, BR) 유지하며 토글
 * - 엔터/탭/시프트탭으로 리스트 조작
 * - depth에 따라 disc→circle→square 스타일 순환
 */
(function() {
  // 스타일 정의
  (function addStyles() {
    if (document.getElementById('lite-bullet-styles')) return;
    const style = document.createElement('style');
    style.id = 'lite-bullet-styles';
    style.textContent = `
      [contenteditable="true"] ul.lite-bullet { padding-left: 1.5em !important; margin: 0 !important; }
      [contenteditable="true"] ul.lite-bullet.depth-1 { list-style-type: disc !important; }
      [contenteditable="true"] ul.lite-bullet.depth-2 { list-style-type: circle !important; }
      [contenteditable="true"] ul.lite-bullet.depth-3 { list-style-type: square !important; }
      [contenteditable="true"] ul.lite-bullet li { list-style-position: inside !important; }
    `;
    document.head.appendChild(style);
  })();

  /**
   * 선택 영역의 정보를 저장
   * @param {Range} range - 현재 선택 범위
   * @returns {Object} 선택 정보 객체
   */
  function saveSelectionInfo(range) {
    const startContainer = range.startContainer;
    const endContainer = range.endContainer;
    
    // 시작과 끝 컨테이너의 부모 요소들 찾기
    const startParents = [];
    let node = startContainer;
    while (node) {
      startParents.push(node);
      node = node.parentNode;
    }
    
    const endParents = [];
    node = endContainer;
    while (node) {
      endParents.push(node);
      node = node.parentNode;
    }
    
    // 공통 조상 찾기
    let commonAncestor = null;
    for (const start of startParents) {
      if (endParents.includes(start)) {
        commonAncestor = start;
        break;
      }
    }
    
    // 선택 영역 내 블록 요소들 수집
    const blocks = [];
    if (commonAncestor && commonAncestor.nodeType === Node.ELEMENT_NODE) {
      // 선택 영역이 하나의 블록 내에 있는 경우
      if (range.collapsed || startContainer === endContainer) {
        const block = findBlockParent(startContainer);
        if (block) blocks.push(block);
      } else {
        // 여러 블록에 걸친 선택의 경우 범위 내 모든 블록 요소 찾기
        const allElements = Array.from(commonAncestor.querySelectorAll('*'));
        const inRange = [];
        
        // 범위 내에 있는 요소 찾기
        for (const el of allElements) {
          if (range.intersectsNode(el)) {
            if (isBlockElement(el) && !inRange.some(b => b.contains(el))) {
              inRange.push(el);
            }
          }
        }
        
        // 중첩된 요소 필터링 (최상위 블록만 사용)
        for (const el of inRange) {
          if (!inRange.some(other => other !== el && other.contains(el))) {
            blocks.push(el);
          }
        }
        
        // 블록이 없는 경우, 범위의 시작 및 끝 컨테이너에서 가장 가까운 블록 요소 찾기
        if (blocks.length === 0) {
          const startBlock = findBlockParent(startContainer);
          const endBlock = findBlockParent(endContainer);
          if (startBlock) blocks.push(startBlock);
          if (endBlock && startBlock !== endBlock) blocks.push(endBlock);
        }
      }
    }
    
    return {
      startContainer,
      endContainer,
      startOffset: range.startOffset,
      endOffset: range.endOffset,
      commonAncestor,
      blocks: blocks.length > 0 ? blocks : [findBlockParent(startContainer)]
    };
  }
  
  /**
   * 가장 가까운 블록 요소 찾기
   * @param {Node} node - 시작 노드
   * @returns {Element|null} 찾은 블록 요소
   */
  function findBlockParent(node) {
    if (!node) return null;
    
    // 텍스트 노드인 경우 부모로 이동
    if (node.nodeType === Node.TEXT_NODE) {
      node = node.parentNode;
    }
    
    // 이미 블록 요소인 경우
    if (node.nodeType === Node.ELEMENT_NODE && isBlockElement(node)) {
      return node;
    }
    
    // 부모 중 블록 요소 찾기
    while (node && node.parentNode) {
      node = node.parentNode;
      if (node.nodeType === Node.ELEMENT_NODE && isBlockElement(node)) {
        return node;
      }
    }
    
    return null;
  }
  
  /**
   * 블록 요소인지 확인
   * @param {Node} node - 확인할 노드
   * @returns {boolean} 블록 요소 여부
   */
  function isBlockElement(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return false;
    
    const blockTags = ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE'];
    if (blockTags.includes(node.nodeName)) return true;
    
    const display = window.getComputedStyle(node).display;
    return display === 'block' || display === 'list-item';
  }
  
  /**
   * 선택 영역의 블록을 리스트로 변환
   * @param {HTMLElement} contentArea - 에디터 영역
   * @param {Array} blocks - 변환할 블록 요소들
   * @returns {HTMLUListElement} 생성된 리스트 요소
   */
  function createBulletList(contentArea, blocks) {
    // 새 UL 요소 생성
    const ul = document.createElement('ul');
    ul.className = 'lite-bullet depth-1';
    
    // 선택한 블록들을 li로 변환
    blocks.forEach(block => {
      const li = document.createElement('li');
      
      // 내용 복사
      if (block.childNodes.length === 0 || (block.childNodes.length === 1 && block.firstChild.nodeType === Node.TEXT_NODE && block.firstChild.textContent.trim() === '')) {
        // 빈 블록인 경우
        li.innerHTML = '<br>';
      } else {
        // 내용이 있는 블록인 경우
        li.innerHTML = block.innerHTML;
      }
      
      ul.appendChild(li);
    });
    
    // 첫 번째 블록 위치에 삽입
    if (blocks.length > 0 && blocks[0].parentNode) {
      blocks[0].parentNode.insertBefore(ul, blocks[0]);
      
      // 기존 블록 제거
      blocks.forEach(block => {
        if (block.parentNode) {
          block.parentNode.removeChild(block);
        }
      });
    }
    
    return ul;
  }
  
  /**
   * 리스트를 원래 블록으로 변환 (P 또는 BR)
   * @param {HTMLUListElement} ul - 변환할 리스트
   * @param {HTMLElement} contentArea - 에디터 영역
   */
  function convertListToBlocks(ul, contentArea) {
    const fragment = document.createDocumentFragment();
    const items = Array.from(ul.querySelectorAll('li'));
    
    items.forEach(li => {
      // 중첩된 리스트가 있는지 확인
      const nestedUl = li.querySelector('ul');
      
      // li 내용으로 p 요소 생성
      const content = li.innerHTML;
      
      // 내용에서 중첩 ul 제거 (재귀적으로 처리될 예정)
      const contentWithoutNestedUl = content.replace(/<ul[\s\S]*?<\/ul>/gi, '');
      
      if (contentWithoutNestedUl.trim() === '' || contentWithoutNestedUl.trim() === '<br>') {
        // 빈 li는 br로 변환
        fragment.appendChild(document.createElement('br'));
      } else {
        // 내용이 있는 li는 p로 변환
        const p = document.createElement('p');
        p.innerHTML = contentWithoutNestedUl;
        fragment.appendChild(p);
      }
      
      // 중첩된 리스트가 있으면 재귀적으로 처리
      if (nestedUl) {
        convertListToBlocks(nestedUl, contentArea);
      }
    });
    
    // 원래 ul 위치에 변환된 블록 삽입
    if (ul.parentNode) {
      ul.parentNode.insertBefore(fragment, ul);
      ul.parentNode.removeChild(ul);
    }
  }
  
  /**
   * 불릿 리스트 깊이에 따른 스타일 적용
   * @param {HTMLElement} ul - 스타일을 적용할 UL 요소
   */
  function applyBulletStyles(ul) {
    if (!ul || ul.nodeName !== 'UL') return;
    
    // 기존 depth 클래스 제거
    ul.classList.remove('depth-1', 'depth-2', 'depth-3');
    ul.classList.add('lite-bullet');
    
    // 깊이 계산
    let depth = 1;
    let parent = ul.parentElement;
    while (parent) {
      if (parent.nodeName === 'LI' && parent.parentElement && parent.parentElement.nodeName === 'UL') {
        depth++;
        parent = parent.parentElement.parentElement;
      } else {
        break;
      }
    }
    
    // depth는 1,2,3을 순환 (4 이상은 1,2,3 반복)
    const depthClass = `depth-${((depth - 1) % 3) + 1}`;
    ul.classList.add(depthClass);
    
    // 중첩된 리스트에도 스타일 적용 (재귀)
    Array.from(ul.querySelectorAll('ul')).forEach(nestedUl => {
      nestedUl.classList.add('lite-bullet');
      applyBulletStyles(nestedUl);
    });
  }
  
  /**
   * 불릿 리스트 토글
   * @param {HTMLElement} contentArea - 에디터 영역
   */
  function toggleBulletList(contentArea) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    
    // 선택 정보 저장
    const selInfo = saveSelectionInfo(range);
    
    // 현재 선택 영역이 리스트 내부인지 확인
    let insideList = false;
    let targetUl = null;
    
    // 시작 컨테이너부터 리스트 확인
    let node = selInfo.startContainer;
    while (node && node !== contentArea) {
      if (node.nodeName === 'UL' && node.classList.contains('lite-bullet')) {
        insideList = true;
        targetUl = node;
        break;
      } else if (node.nodeName === 'LI' && 
                node.parentNode && 
                node.parentNode.nodeName === 'UL' && 
                node.parentNode.classList.contains('lite-bullet')) {
        insideList = true;
        targetUl = node.parentNode;
        break;
      }
      node = node.parentNode;
    }
    
    if (insideList && targetUl) {
      // 리스트 해제: ul → 원래 블록(p, br)으로 변환
      convertListToBlocks(targetUl, contentArea);
    } else {
      // 리스트 적용: 선택 블록을 ul/li로 변환
      const listElement = createBulletList(contentArea, selInfo.blocks);
      applyBulletStyles(listElement);
    }
    
    // 에디터 영역에 포커스
    contentArea.focus();
  }
  
  /**
   * Tab 키로 리스트 들여쓰기/내어쓰기 처리
   * @param {Event} event - 키보드 이벤트
   */
  function handleTab(event) {
    if (event.key !== 'Tab') return;
    
    const contentArea = event.target.closest('[contenteditable="true"]');
    if (!contentArea) return;
    
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    let li = null;
    
    // 현재 LI 요소 찾기
    let node = range.startContainer;
    while (node && node !== contentArea) {
      if (node.nodeName === 'LI') {
        li = node;
        break;
      }
      node = node.parentNode;
    }
    
    if (!li) return;
    
    // 리스트 확인
    const ul = li.parentNode;
    if (!ul || ul.nodeName !== 'UL' || !ul.classList.contains('lite-bullet')) return;
    
    // 기본 동작 중지
    event.preventDefault();
    
    if (event.shiftKey) {
      // 내어쓰기 (Shift+Tab)
      const parentLi = ul.parentNode;
      if (parentLi && parentLi.nodeName === 'LI') {
        const grandUl = parentLi.parentNode;
        grandUl.insertBefore(li, parentLi.nextSibling);
        
        // 빈 ul 제거
        if (ul.children.length === 0) {
          parentLi.removeChild(ul);
        }
        
        // 스타일 업데이트
        applyBulletStyles(grandUl);
      }
    } else {
      // 들여쓰기 (Tab)
      const prevLi = li.previousElementSibling;
      if (prevLi) {
        // 이전 LI에 중첩 UL 찾기 또는 생성
        let subUl = prevLi.querySelector('ul');
        if (!subUl) {
          subUl = document.createElement('ul');
          subUl.className = 'lite-bullet';
          prevLi.appendChild(subUl);
        }
        
        // 현재 LI를 중첩 UL로 이동
        subUl.appendChild(li);
        
        // 스타일 업데이트
        applyBulletStyles(subUl);
      }
    }
    
    // 에디터 포커스 유지
    contentArea.focus();
  }
  
  /**
   * 엔터 키 처리 (빈 li에서 리스트 종료)
   * @param {Event} event - 키보드 이벤트
   */
  function handleEnter(event) {
    if (event.key !== 'Enter') return;
    
    const contentArea = event.target.closest('[contenteditable="true"]');
    if (!contentArea) return;
    
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    let li = null;
    
    // 현재 LI 요소 찾기
    let node = range.startContainer;
    while (node && node !== contentArea) {
      if (node.nodeName === 'LI') {
        li = node;
        break;
      }
      node = node.parentNode;
    }
    
    if (!li) return;
    
    // 리스트 확인
    const ul = li.parentNode;
    if (!ul || ul.nodeName !== 'UL' || !ul.classList.contains('lite-bullet')) return;
    
    // 빈 LI인지 확인 (내용이 없거나 <br>만 있는 경우)
    const isEmpty = li.textContent.trim() === '' || 
                  (li.childNodes.length === 1 && li.firstChild.nodeName === 'BR');
    
    if (isEmpty) {
      // 기본 동작 중지
      event.preventDefault();
      
      // 리스트 종료, P 태그 생성
      const p = document.createElement('p');
      p.innerHTML = '<br>';
      
      // 현재 LI 다음에 P 삽입
      if (li.nextSibling) {
        ul.parentNode.insertBefore(p, ul.nextSibling);
      } else {
        ul.parentNode.appendChild(p);
      }
      
      // 빈 LI 제거
      ul.removeChild(li);
      
      // 빈 UL 제거
      if (ul.children.length === 0 && ul.parentNode) {
        ul.parentNode.removeChild(ul);
      }
      
      // 새 P에 커서 위치
      const newRange = document.createRange();
      newRange.setStart(p, 0);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
      
      // 에디터 포커스
      contentArea.focus();
    }
  }
  
  // 이벤트 리스너 등록
  document.addEventListener('keydown', handleTab, true);
  document.addEventListener('keydown', handleEnter, true);
  
  // 플러그인 등록
  PluginUtil.registerPlugin('unorderedList', {
    title: 'Bullet List',
    icon: 'format_list_bulleted',
    action: function(contentArea, buttonElement, event) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      toggleBulletList(contentArea);
    }
  });
  
  // 전역 함수로 노출 (기존 API 유지)
  window.toggleBulletList = toggleBulletList;
})();