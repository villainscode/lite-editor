/**
 * LiteEditor Check List Plugin
 * 체크리스트 기능 구현 플러그인
 */
(function() {
  const cleanupFunctions = [];
  let tabKeyCleanup = null;
  
  // label 간격 스타일 문자열 생성 함수
  function getLabelGapStyle() {
    return `margin-left: -3px;`;
  }
  
  const NBSP_CHAR = '\u00A0'; // &nbsp; 유니코드

  /**
   * 체크리스트 항목들을 생성하고 삽입
   */
  function createChecklistItems(contentArea) {
    const selection = PluginUtil.selection.getSafeSelection();
    if (!selection || !selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    
    // 선택 영역 내용 추출
    const fragment = range.extractContents();
    const tempDiv = document.createElement('div');
    tempDiv.appendChild(fragment);
    
    // HTML에서 줄바꿈 정보 보존
    let content = tempDiv.innerHTML;
    // p, div 태그를 <br>로 변환
    content = content.replace(/<\/(div|p)>/gi, '<br>');
    content = content.replace(/<(div|p)[^>]*>/gi, '');
    
    // 줄바꿈으로 분리
    const lines = content.split(/<br\s*\/?>/i).filter(line => line.trim());
    
    // 결과 프래그먼트
    const resultFragment = document.createDocumentFragment();
    
    if (lines.length === 0) {
      // 선택된 텍스트가 없으면 빈 체크리스트 항목 생성
      resultFragment.appendChild(createSingleChecklistItem(''));
    } else {
      // 각 줄마다 체크리스트 항목 생성
      lines.forEach(line => {
        resultFragment.appendChild(createSingleChecklistItem(line.trim()));
      });
    }
    
    // 생성된 항목들을 삽입
    range.insertNode(resultFragment);
    
    // 마지막 체크리스트 항목에 포커스
    const items = Array.from(resultFragment.childNodes);
    if (items.length > 0) {
      maintainFocus(items[items.length - 1]);
    }
  }

  // 유니크 ID 생성을 위한 카운터
  let checklistItemCounter = 0;
  
  /**
   * 단일 체크리스트 아이템 생성
   */
  function createSingleChecklistItem(text) {
    // 체크박스와 label을 연결할 유니크 ID 생성
    const itemId = `checklist-item-${Date.now()}-${checklistItemCounter++}`;
    
    const container = PluginUtil.dom.createElement('div', {
      className: 'flex items-center gap-2 my-1 checklist-item'
    });
    
    const checkbox = PluginUtil.dom.createElement('input', {
      type: 'checkbox',
      id: itemId,
      className: 'form-checkbox h-4 w-4 text-primary transition',
      style: 'margin-top: 2px;'
    });
    
    const label = PluginUtil.dom.createElement('label', {
      className: 'text-gray-800',
      style: getLabelGapStyle(),
      htmlFor: itemId
    });
    
    // 빈 텍스트일 경우 브라우저가 표시할 수 있는 빈 컨텐츠로 설정
    if (text.trim()) {
      label.textContent = text;
    } else {
      // 빈 라벨에는 <br> 태그 사용 (textContent 대신 innerHTML)
      label.innerHTML = '<br>';
    }
    
    // 체크박스 상태 변경 이벤트 처리
    checkbox.addEventListener('change', function() {
      if (this.checked) {
        label.style.textDecoration = 'line-through';
        label.style.color = '#666';
      } else {
        label.style.textDecoration = 'none';
        label.style.color = '';
      }
    });
    
    container.appendChild(checkbox);
    container.appendChild(label);
    return container;
  }

  /**
   * 현재 선택된 체크리스트 아이템 찾기
   */
  function findActiveChecklistItem() {
    const selection = PluginUtil.selection.getSafeSelection();
    if (!selection || selection.rangeCount === 0) return null;
    
    const range = selection.getRangeAt(0);
    const node = range.commonAncestorContainer;
    
    // 텍스트 노드면 부모 요소, 아니면 그대로 사용
    const element = node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
    return element.closest('.checklist-item');
  }

  /**
   * 포커스 유지 로직
   * @param {HTMLElement} element - 포커스를 유지할 체크리스트 아이템
   * @param {number} [position] - 커서 위치 (undefined면 텍스트 끝으로 설정)
   */
  function maintainFocus(element, position) {
    if (!element) return;
    
    try {
      // 지연시키기 - DOM 업데이트 후 커서 설정
      setTimeout(() => {
        const label = element.querySelector('label');
        if (!label) return;
        
        // 텍스트 노드에 커서 위치
        const textNode = label.firstChild;
        if (textNode && textNode.nodeType === Node.TEXT_NODE) {
          // position이 지정되지 않으면 텍스트 끝으로 설정
          const textLength = textNode.length || 0;
          const offset = position !== undefined ? 
                        Math.min(position, textLength) : 
                        textLength;
          
          PluginUtil.selection.moveCursorTo(textNode, offset);
        } else {
          PluginUtil.selection.moveCursorTo(label, 0);
        }
      }, 0);
    } catch (e) {
      if (window.errorHandler) {
        errorHandler.logError('CheckListPlugin', errorHandler.codes.COMMON.FOCUS, e);
      }
    }
  }

  /**
   * 체크리스트 항목이 비어있는지 확인
   */
  function isEmptyChecklistItem(item) {
    if (!item) return true;
    
    const label = item.querySelector('label');
    if (!label) return true;
    
    // 내용이 없거나, <br> 태그만 있는 경우 빈 것으로 간주
    const content = label.textContent || '';
    if (content.trim()) return false;
    
    // innerHTML도 확인 - <br> 태그만 있는 경우도 빈 것으로 간주
    const html = label.innerHTML.trim();
    return !html || html === '<br>' || html === '<br/>' || html === NBSP_CHAR;
  }

  /**
   * Enter 키 처리 - 새 체크리스트 아이템 생성 또는 일반 텍스트로 전환
   */
  function handleEnterKey(item) {
    if (!item) return;
    
    // 현재 항목이 비어있는지 확인
    const isEmpty = isEmptyChecklistItem(item);
    
    if (isEmpty) {
      // 빈 체크리스트 항목이면 일반 텍스트 블록으로 전환
      const textDiv = PluginUtil.dom.createElement('div', { 
        className: '',
        innerHTML: '<br>' // 빈 줄 표시를 위한 br 태그
      });
      
      item.replaceWith(textDiv);
      PluginUtil.selection.moveCursorTo(textDiv, 0);
    } else {
      // 내용이 있으면 새 체크리스트 아이템 생성
      const newItem = createSingleChecklistItem('');
      item.after(newItem);
      maintainFocus(newItem);
    }
  }

  // ✅ Tab 들여쓰기 (bulletList.js, numberedList.js와 동일한 방식)
  function handleTabIndent(item, isShift) {
    if (!item) return;
    
    const currentIndent = parseInt(item.getAttribute('data-indent-level') || '0');
    const newIndent = isShift ? Math.max(0, currentIndent - 1) : currentIndent + 1;
    
    // 들여쓰기 적용
    if (newIndent === 0) {
      item.removeAttribute('data-indent-level');
      item.style.removeProperty('margin-left');
    } else {
      item.setAttribute('data-indent-level', newIndent);
      item.style.marginLeft = `${newIndent * 20}px`;
    }
    
    // 포커스 유지
    setTimeout(() => {
      const contentArea = item.closest('[contenteditable="true"]');
      if (contentArea) contentArea.focus();
    }, 0);
  }

  /**
   * 키보드 이벤트 핸들러 (전역)
   */
  const handleChecklistKeys = function(event) {
    // ✅ 리사이즈 중일 때는 키보드 이벤트 무시
    if (document.querySelector('.video-resize-handle:active') || 
        document.querySelector('.image-resize-handle:active') ||
        document.querySelector('[data-resizing="true"]')) {
        return;
    }
    
    // Enter 또는 Tab 키가 아니면 무시
    if (event.key !== 'Enter' && event.key !== 'Tab') return;
    
    // 에디터 영역 찾기
    const contentArea = event.target.closest('[contenteditable="true"]');
    if (!contentArea) return;
    
    // 현재 선택된 체크리스트 아이템 찾기
    const activeItem = findActiveChecklistItem();
    if (!activeItem) return;
    
    // 기본 동작 방지
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    
    // 키에 따라 처리
    if (event.key === 'Enter') {
      handleEnterKey(activeItem);
    } else if (event.key === 'Tab') {
      handleTabIndent(activeItem, event.shiftKey);
    }
  };

  /**
   * 체크박스 이벤트 처리를 적용
   */
  function initCheckboxHandlers() {
    // 기존 체크리스트 아이템에 이벤트 처리 적용
    applyCheckboxEventHandlers();
  }
  
  /**
   * 기존 체크리스트 아이템에 체크박스 이벤트 처리를 적용
   */
  function applyCheckboxEventHandlers() {
    const checklistItems = document.querySelectorAll('.checklist-item');
    
    checklistItems.forEach(item => {
      const checkbox = item.querySelector('input[type="checkbox"]');
      const label = item.querySelector('label');
      
      if (checkbox && label) {
        // 이미 ID가 있는지 확인
        if (!checkbox.id) {
          const itemId = `checklist-item-${Date.now()}-${checklistItemCounter++}`;
          checkbox.id = itemId;
          label.htmlFor = itemId;
        }
        
        // 기존 이벤트 리스너 제거 (중복 방지)
        const oldListener = checkbox._changeListener;
        if (oldListener) {
          checkbox.removeEventListener('change', oldListener);
        }
        
        // 새 이벤트 리스너 추가
        const changeListener = function() {
          if (this.checked) {
            label.style.textDecoration = 'line-through';
            label.style.color = '#666';
          } else {
            label.style.textDecoration = 'none';
            label.style.color = '';
          }
        };
        
        checkbox.addEventListener('change', changeListener);
        checkbox._changeListener = changeListener;
        
        // 현재 상태에 따라 스타일 적용
        if (checkbox.checked) {
          label.style.textDecoration = 'line-through';
          label.style.color = '#666';
        } else {
          label.style.textDecoration = 'none';
          label.style.color = '';
        }
      }
    });
  }
  
  // 체크리스트 토글 함수 (단축키용)
  function toggleCheckList(contentArea) {
    // 에디터에 포커스 설정
    contentArea.focus();
    
    // 현재 선택 영역 가져오기
    const selection = PluginUtil.selection.getSafeSelection();
    if (!selection || !selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    
    // 현재 선택 영역이 체크리스트인지 확인
    const container = range.commonAncestorContainer;
    const element = container.nodeType === Node.TEXT_NODE ? container.parentNode : container;
    const checklistItem = element.closest('.checklist-item');
    
    if (checklistItem || container.querySelector?.('.checklist-item')) {
      // 이미 체크리스트면 일반 텍스트로 변환
      const checklistItems = getSelectedChecklistItems(range);
      
      if (checklistItems.length > 0) {
        // 체크리스트 아이템들을 원래 형식으로 변환
        const fragment = document.createDocumentFragment();
        
        checklistItems.forEach(item => {
          const label = item.querySelector('label');
          // innerHTML 사용하여 BR 태그 유지
          const content = label ? label.innerHTML : '';
          
          // div 사용하여 형식 유지
          const div = document.createElement('div');
          div.innerHTML = content || '<br>';
          fragment.appendChild(div);
        });
        
        // 첫 번째 체크리스트 아이템 위치에 삽입
        const firstItem = checklistItems[0];
        firstItem.parentNode.insertBefore(fragment, firstItem);
        
        // 체크리스트 아이템들 제거
        checklistItems.forEach(item => item.remove());
        
        // 생성된 요소들 선택
        const newElements = Array.from(fragment.childNodes);
        if (newElements.length > 0) {
          const newRange = document.createRange();
          newRange.setStartBefore(newElements[0]);
          newRange.setEndAfter(newElements[newElements.length - 1]);
          
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      }
    } else {
      // 일반 텍스트면 체크리스트로 변환
      createChecklistItems(contentArea);
    }
  }

  // 선택 영역에 포함된 모든 체크리스트 항목 가져오기
  function getSelectedChecklistItems(range) {
    if (!range) return [];
    
    // 공통 조상 요소 찾기
    let container = range.commonAncestorContainer;
    if (container.nodeType === Node.TEXT_NODE) {
      container = container.parentNode;
    }
    
    // 편집 가능한 영역 찾기
    const editableRoot = container.closest('[contenteditable="true"]') || document;
    
    // 선택 영역에 있는 모든 체크리스트 항목 찾기
    const allItems = Array.from(editableRoot.querySelectorAll('.checklist-item'));
    
    return allItems.filter(item => {
      const itemRange = document.createRange();
      itemRange.selectNode(item);
      return range.intersectsNode(item);
    });
  }

  // Check List 단축키 (Alt+K)
  LiteEditor.registerShortcut('checkList', {
    key: 'k',
    alt: true,
    action: function(contentArea) {
      toggleCheckList(contentArea);
    }
  });

  // 플러그인 등록
  PluginUtil.registerPlugin('checkList', {
    title: 'Check List',
    icon: 'checklist',
    action: function(contentArea, button, event) {
      if (event) { event.preventDefault(); event.stopPropagation(); }
      contentArea.focus();
      if (window.liteEditorSelection) {
        window.liteEditorSelection.save();
        window.liteEditorSelection.restore();
      }
      
      // createChecklistItems 대신 toggleCheckList 함수 사용
      toggleCheckList(contentArea);
      
      // 체크박스 이벤트 처리 초기화
      setTimeout(initCheckboxHandlers, 0);
    },
    // 설정 함수 노출
    initCheckboxHandlers: initCheckboxHandlers
  });
  
  // ✅ 이벤트 리스너 등록 (다른 플러그인과 동일한 방식)
  document.addEventListener('keydown', handleChecklistKeys, true);
  tabKeyCleanup = () => document.removeEventListener('keydown', handleChecklistKeys, true);
  
  // 정리 함수
  if (PluginUtil.registerCleanup) {
    PluginUtil.registerCleanup('checkList', function() {
      cleanupFunctions.forEach(cleanup => cleanup());
      cleanupFunctions.length = 0;
      
      if (tabKeyCleanup) tabKeyCleanup();
    });
  }
})();