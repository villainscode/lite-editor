/**
 * LiteEditor Bullet List Plugin
 * - 불릿 리스트 서식과 깊이별 스타일 적용
 * - BR → P 구조 복원 지원
 * - Tab 키 들여쓰기 + 스타일 순환
 * - 히스토리 통합
 */
(function() {
  const cleanupFunctions = [];
  let tabKeyCleanup = null;
  const BULLET_STYLES = ['disc', 'circle', 'square'];
  
  // ✅ 다른 리스트 타입 감지 함수 (불릿리스트용)
  function detectOtherListTypes() {
    const selection = PluginUtil.selection.getSafeSelection();
    if (!selection || !selection.rangeCount) return null;
    
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const element = container.nodeType === Node.TEXT_NODE ? container.parentNode : container;
    
    // 체크리스트 감지
    const checklistItem = element.closest('.checklist-item') || 
                         element.querySelector('.checklist-item');
    if (checklistItem) {
      return { type: '체크리스트', element: checklistItem };
    }
    
    // 넘버 리스트 감지  
    const numberedList = element.closest('ol[data-lite-editor-number]') ||
                        element.querySelector('ol[data-lite-editor-number]');
    if (numberedList) {
      return { type: '넘버 리스트', element: numberedList };
    }
    
    return null;
  }
  
  // ✅ 플러그인 등록 (히스토리 통합)
  PluginUtil.registerPlugin('unorderedList', {
    title: 'Bullet List',
    icon: 'format_list_bulleted',
    action: function(contentArea, buttonElement, event) {
      if (event) event.preventDefault();
      contentArea.focus();
      
      // ✅ 선택 영역 저장 (모달 표시 전에)
      const savedSelection = PluginUtil.selection.saveSelection();
      
      // ✅ 다른 리스트 타입 체크 (수정된 버전)
      const otherListType = detectOtherListTypes();
      if (otherListType) {
        LiteEditorModal.alert(
          '이미 ' + otherListType.type + '가 적용되었습니다.\n리스트 적용을 해제한 뒤 불릿리스트를 적용해주세요.',
          {
            titleText: '리스트 중복 적용 불가',
            confirmText: '확인',
            onConfirm: function() {
              // ✅ 모달 닫힌 후 선택 영역 및 포커스 복원
              setTimeout(() => {
                try {
                  contentArea.focus();
                  if (savedSelection) {
                    PluginUtil.selection.restoreSelection(savedSelection);
                  }
                  console.log('🔄 [BulletList] 선택 영역 복원 완료');
                } catch (e) {
                  console.warn('[BulletList] 선택 영역 복원 실패:', e);
                  // 폴백: 에디터 끝에 커서 설정
                  contentArea.focus();
                }
              }, 50);
            }
          }
        );
        return;
      }
      
      // ✅ 히스토리에 적용 전 상태 기록
      if (window.LiteEditorHistory) {
        window.LiteEditorHistory.forceRecord(contentArea, 'Before Bullet List Action');
      }
      
      const selection = PluginUtil.selection.getSafeSelection();
      if (!selection?.rangeCount) {
        return;
      }
      
      const range = selection.getRangeAt(0);
      const existingList = findExistingList(range);
      
      try {
        if (existingList) {
          unwrapBulletList(existingList.ul, range);
        } else {
          createBulletList(contentArea, range);
        }
        
        // ✅ 작업 완료 후 상태 기록
        setTimeout(() => {
          if (window.LiteEditorHistory) {
            window.LiteEditorHistory.recordState(contentArea, 'After Bullet List Action');
          }
        }, 100);
        
      } catch (error) {
        errorHandler.logError('PLUGINS', 'P601', error);
      }
    }
  });
  
  // ✅ 기존 리스트 찾기
  function findExistingList(range) {
    const container = range.commonAncestorContainer;
    const element = container.nodeType === Node.TEXT_NODE ? container.parentNode : container;
    
    // 리스트 아이템 또는 UL 확인
    const listItem = element.closest('li');
    if (listItem) {
      const ul = listItem.closest('ul[data-lite-editor-bullet]');
      if (ul) {
        return { listItem, ul };
      }
    }
    
    const ul = element.closest('ul[data-lite-editor-bullet]') || 
               element.querySelector('ul[data-lite-editor-bullet]');
    if (ul) {
      return { ul };
    }
    
    return null;
  }
  
  // ✅ 리스트 생성
  function createBulletList(contentArea, range) {
    // 콜랩스된 범위 처리
    if (range.collapsed) {
      const node = range.startContainer;
      const element = node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
      const block = element.closest('p, div, h1, h2, h3, h4, h5, h6');
      if (block) {
        range.selectNodeContents(block);
      }
    }
    
    // 콘텐츠 추출 및 UL 생성
    const fragment = range.extractContents();
    const tempDiv = PluginUtil.dom.createElement('div');
    tempDiv.appendChild(fragment);
    
    const ul = PluginUtil.dom.createElement('ul', {
      'data-lite-editor-bullet': 'true'
    });
    
    // 원본 구조 정보 저장
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
    
    lines.forEach((line) => {
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
  
  // ✅ 리스트 제거
  function unwrapBulletList(ul, range) {
    if (!ul || ul.nodeName !== 'UL') {
      return;
    }
    
    // 원본 BR → P 구조 복원
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
          
          return;
        }
      } catch (error) {
        errorHandler.logWarning('BulletList', '원본 구조 복원 실패', error);
      }
    }
    
    // 폴백: LI를 P로 변환
    const items = Array.from(ul.children).filter(child => child.nodeName === 'LI');
    const fragment = document.createDocumentFragment();
    
    items.forEach((item) => {
      const p = PluginUtil.dom.createElement('p');
      const nestedUl = item.querySelector('ul');
      p.innerHTML = nestedUl ? 
        item.innerHTML.replace(nestedUl.outerHTML, '') : 
        item.innerHTML;
      fragment.appendChild(p);
    });
    
    ul.parentNode.replaceChild(fragment, ul);
  }
  
  // ✅ Tab 들여쓰기
  function handleTabIndent(li, isShift) {
    // ✅ Tab 들여쓰기 전 상태 기록
    const contentArea = li.closest('[contenteditable="true"]');
    if (contentArea && window.LiteEditorHistory) {
      window.LiteEditorHistory.recordBeforeAction(
        contentArea, 
        `Bullet List ${isShift ? 'Outdent' : 'Indent'}`
      );
    }
    
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
      
      // 스타일 순환 유지
      const styleIndex = newIndent % 3;
      const selectedStyle = BULLET_STYLES[styleIndex];
      li.style.setProperty('list-style-type', selectedStyle, 'important');
      
      // 클래스 업데이트
      li.classList.remove('li-bullet-depth-1', 'li-bullet-depth-2', 'li-bullet-depth-3');
      li.classList.add(`li-bullet-depth-${styleIndex + 1}`);
      li.setAttribute('data-bullet-style', selectedStyle);
    }
    
    // ✅ 들여쓰기 후 상태 기록
    setTimeout(() => {
      if (contentArea && window.LiteEditorHistory) {
        window.LiteEditorHistory.recordState(
          contentArea, 
          `Bullet List ${isShift ? 'Outdent' : 'Indent'} Complete`
        );
      }
      
      // 포커스 유지
      if (contentArea) contentArea.focus();
    }, 100);
  }

  // Tab 키 핸들러
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

  // 활성 LI 찾기
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

  // 기본 스타일 적용
  function applyBasicStyle(ul) {
    ul.style.setProperty('list-style-type', 'disc', 'important');
    ul.style.setProperty('padding-left', '1.5em', 'important');
  }

  // 선택 영역 복원
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

  // CSS 스타일 초기화
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

  // 초기화
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