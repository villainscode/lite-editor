/**
 * LiteEditor Bullet List Plugin
 * - 불릿 리스트 서식과 깊이별 스타일 적용
 * - BR → P 구조 복원 지원
 * - Tab 키 들여쓰기 + 스타일 순환
 */
(function() {
  const cleanupFunctions = [];
  let tabKeyCleanup = null;
  const BULLET_STYLES = ['disc', 'circle', 'square']; // ✅ 전역 상수로 정의
  
  // ✅ 플러그인 등록 (간소화)
  PluginUtil.registerPlugin('unorderedList', {
    title: 'Bullet List',
    icon: 'format_list_bulleted',
    action: function(contentArea, buttonElement, event) {
      if (event) event.preventDefault();
      contentArea.focus();
      
      const selection = PluginUtil.selection.getSafeSelection();
      if (!selection?.rangeCount) return;
      
      const range = selection.getRangeAt(0);
      const existingList = findExistingList(range);
      
      if (existingList) {
        unwrapBulletList(existingList.ul, range);
      } else {
        createBulletList(contentArea, range);
      }
    }
  });
  
  // ✅ 기존 리스트 찾기 (통합 간소화)
  function findExistingList(range) {
    const container = range.commonAncestorContainer;
    const element = container.nodeType === Node.TEXT_NODE ? container.parentNode : container;
    
    // 리스트 아이템 또는 UL 확인
    const listItem = element.closest('li');
    if (listItem) {
      const ul = listItem.closest('ul[data-lite-editor-bullet]');
      if (ul) return { listItem, ul };
    }
    
    const ul = element.closest('ul[data-lite-editor-bullet]') || 
               element.querySelector('ul[data-lite-editor-bullet]');
    if (ul) return { ul };
    
    return null;
  }
  
  // ✅ 리스트 생성 (BR → P 구조 저장 유지)
  function createBulletList(contentArea, range) {
    // 콜랩스된 범위 처리
    if (range.collapsed) {
      const node = range.startContainer;
      const element = node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
      const block = element.closest('p, div, h1, h2, h3, h4, h5, h6');
      if (block) range.selectNodeContents(block);
    }
    
    // 콘텐츠 추출 및 UL 생성
    const fragment = range.extractContents();
    const tempDiv = PluginUtil.dom.createElement('div');
    tempDiv.appendChild(fragment);
    
    const ul = PluginUtil.dom.createElement('ul', {
      'data-lite-editor-bullet': 'true'
    });
    
    // ✅ 핵심: BR → P 구조 정보 저장
    const originalStructure = {
      type: 'single-p-with-br',
      content: tempDiv.innerHTML,
      timestamp: Date.now()
    };
    ul.setAttribute('data-original-structure', JSON.stringify(originalStructure));
    
    // 텍스트를 LI로 변환
    let content = tempDiv.innerHTML
      .replace(/<\/(div|p)>/gi, '<br>')
      .replace(/<(div|p)[^>]*>/gi, '')
      .replace(/(<br\s*\/?>)+$/, '');
    
    const lines = content.split(/<br\s*\/?>/i).filter(line => line.trim());
    
    if (lines.length === 0) lines.push('&nbsp;');
    
    lines.forEach(line => {
      const li = PluginUtil.dom.createElement('li', { 
        innerHTML: line.trim() || '&nbsp;' 
      });
      ul.appendChild(li);
    });
    
    range.insertNode(ul);
    applyBasicStyle(ul);
    restoreSelection(ul);
    
    return ul;
  }
  
  // ✅ 리스트 제거 (BR → P 구조 복원 유지)
  function unwrapBulletList(ul, range) {
    if (!ul || ul.nodeName !== 'UL') return;
    
    // ✅ 핵심: 원본 BR → P 구조 복원
    const originalStructureData = ul.getAttribute('data-original-structure');
    
    if (originalStructureData) {
      try {
        const originalStructure = JSON.parse(originalStructureData);
        
        if (originalStructure.type === 'single-p-with-br') {
          const p = PluginUtil.dom.createElement('p');
          const items = Array.from(ul.children).filter(child => child.nodeName === 'LI');
          const restoredContent = items.map(item => item.innerHTML).join('<br>');
          p.innerHTML = restoredContent;
          
          ul.parentNode.replaceChild(p, ul);
          restoreSelection(p);
          return; // ✅ BR 구조로 복원 후 종료
        }
      } catch (error) {
        // 원본 구조 복원 실패 시 폴백
      }
    }
    
    // 폴백: LI를 P로 변환
    const items = Array.from(ul.children).filter(child => child.nodeName === 'LI');
    const fragment = document.createDocumentFragment();
    
    items.forEach(item => {
      const p = PluginUtil.dom.createElement('p');
      const nestedUl = item.querySelector('ul');
      p.innerHTML = nestedUl ? 
        item.innerHTML.replace(nestedUl.outerHTML, '') : 
        item.innerHTML;
      fragment.appendChild(p);
    });
    
    ul.parentNode.replaceChild(fragment, ul);
  }
  
  // ✅ 기본 스타일 적용
  function applyBasicStyle(ul) {
    ul.style.setProperty('list-style-type', 'disc', 'important');
    ul.style.setProperty('padding-left', '1.5em', 'important');
  }
  
  // ✅ Tab 들여쓰기 (numberedList.js와 동일한 방식)
  function handleTabIndent(li, isShift) {
    const currentIndent = parseInt(li.getAttribute('data-indent-level') || '0');
    const newIndent = isShift ? Math.max(0, currentIndent - 1) : currentIndent + 1;
    
    // 들여쓰기 적용
    if (newIndent === 0) {
      li.removeAttribute('data-indent-level');
      li.style.removeProperty('margin-left');
      li.style.removeProperty('list-style-type');
      li.classList.remove('li-bullet-depth-1', 'li-bullet-depth-2', 'li-bullet-depth-3');
    } else {
      li.setAttribute('data-indent-level', newIndent);
      li.style.marginLeft = `${newIndent * 20}px`;
      
      // ✅ 핵심: 스타일 순환 유지 (disc → circle → square)
      const styleIndex = newIndent % 3;
      const selectedStyle = BULLET_STYLES[styleIndex];
      li.style.setProperty('list-style-type', selectedStyle, 'important');
      
      // 클래스 업데이트
      li.classList.remove('li-bullet-depth-1', 'li-bullet-depth-2', 'li-bullet-depth-3');
      li.classList.add(`li-bullet-depth-${styleIndex + 1}`);
      li.setAttribute('data-bullet-style', selectedStyle);
    }
    
    // 포커스 유지
    setTimeout(() => {
      const contentArea = li.closest('[contenteditable="true"]');
      if (contentArea) contentArea.focus();
    }, 0);
  }

  // ✅ Tab 키 핸들러 (간소화)
  const handleTabKey = function(event) {
    if (event.key !== 'Tab') return;
    
    const contentArea = event.target.closest('[contenteditable="true"]');
    if (!contentArea) return;
    
    const li = findActiveLi();
    if (!li) return;
    
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    
    handleTabIndent(li, event.shiftKey);
  };

  // ✅ 활성 LI 찾기 (간소화)
  function findActiveLi() {
    const selection = PluginUtil.selection.getSafeSelection();
    if (!selection?.rangeCount) return null;
    
    const range = selection.getRangeAt(0);
    const element = range.commonAncestorContainer.nodeType === Node.TEXT_NODE 
      ? range.commonAncestorContainer.parentNode 
      : range.commonAncestorContainer;
    
    const li = element.closest('li');
    return li?.closest('ul[data-lite-editor-bullet]') ? li : null;
  }

  // ✅ 선택 영역 복원 (간소화)
  function restoreSelection(element) {
    const timerId = setTimeout(() => {
      try {
        const range = document.createRange();
        range.selectNodeContents(element);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      } catch (e) {
        // 무시
      }
    }, 10);
    
    cleanupFunctions.push(() => clearTimeout(timerId));
  }

  // ✅ CSS 스타일 (개별 LI 스타일)
  function initStyles() {
    if (document.getElementById('lite-editor-bullet-list-styles')) return;
    
    const style = PluginUtil.dom.createElement('style', {
      id: 'lite-editor-bullet-list-styles'
    });
    
    style.textContent = `
      [contenteditable="true"] ul[data-lite-editor-bullet] { 
        list-style-type: disc !important;
        padding-left: 1.5em !important; 
      }
      
      /* ✅ 개별 LI 스타일 (들여쓰기별) */
      [contenteditable="true"] ul[data-lite-editor-bullet] li.li-bullet-depth-1 { 
        list-style-type: disc !important; 
      }
      [contenteditable="true"] ul[data-lite-editor-bullet] li.li-bullet-depth-2 { 
        list-style-type: circle !important; 
      }
      [contenteditable="true"] ul[data-lite-editor-bullet] li.li-bullet-depth-3 { 
        list-style-type: square !important; 
      }
    `;
    
    document.head.appendChild(style);
  }

  // ✅ 초기화
  initStyles();
  document.addEventListener('keydown', handleTabKey, true);
  tabKeyCleanup = () => document.removeEventListener('keydown', handleTabKey, true);

  // 정리 함수
  if (PluginUtil.registerCleanup) {
    PluginUtil.registerCleanup('bulletList', function() {
      cleanupFunctions.forEach(cleanup => cleanup());
      cleanupFunctions.length = 0;
      
      if (tabKeyCleanup) tabKeyCleanup();
      document.getElementById('lite-editor-bullet-list-styles')?.remove();
    });
  }
})();