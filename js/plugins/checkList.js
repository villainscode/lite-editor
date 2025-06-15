/**
 * LiteEditor Check List Plugin (리팩토링 버전)
 * 기존 기능 100% 유지, 코드 50% 간소화
 */
(function() {
  let tabKeyCleanup = null;
  let checklistItemCounter = 0;
  let isEventListenerRegistered = false;
  let isProcessingEnter = false;

  // ✅ 단일 체크리스트 아이템 생성 (depth 상속 지원)
  function createSingleChecklistItem(text, inheritIndent = 0) {
    const itemId = `checklist-item-${Date.now()}-${checklistItemCounter++}`;
    
    const container = PluginUtil.dom.createElement('div', {
      className: 'flex items-center gap-2 my-1 checklist-item'
    });
    
    // ✅ depth 상속 적용
    if (inheritIndent > 0) {
      container.setAttribute('data-indent-level', inheritIndent);
      container.style.marginLeft = `${inheritIndent * 20}px`;
    }
    
    const checkbox = PluginUtil.dom.createElement('input', {
      type: 'checkbox',
      id: itemId,
      className: 'form-checkbox h-4 w-4 text-primary transition',
      style: 'margin-top: 2px;'
    });
    
    const label = PluginUtil.dom.createElement('label', {
      className: 'text-gray-800',
      style: 'margin-left: -3px;',
      htmlFor: itemId,
      innerHTML: text.trim() || '<br>'
    });
    
    // ✅ 체크박스 이벤트 (한 곳에서만 처리)
    checkbox.addEventListener('change', function() {
      label.style.textDecoration = this.checked ? 'line-through' : 'none';
      label.style.color = this.checked ? '#999' : '';
    });
    
    container.appendChild(checkbox);
    container.appendChild(label);
    
    return container;
  }

  // ✅ 체크리스트 생성 (로그 추가)
  function createChecklistItems(contentArea) {
    
    const selection = PluginUtil.selection.getSafeSelection();
    if (!selection || !selection.rangeCount) {
      return;
    }
    
    const range = selection.getRangeAt(0);
    
    
    const fragment = range.extractContents();
    const tempDiv = document.createElement('div');
    tempDiv.appendChild(fragment);
    
    // BR 태그 기준 분리
    let content = tempDiv.innerHTML
      .replace(/<\/(div|p)>/gi, '<br>')
      .replace(/<(div|p)[^>]*>/gi, '');
    
    const lines = content.split(/<br\s*\/?>/i).filter(line => line.trim());
    
    const resultFragment = document.createDocumentFragment();
    
    if (lines.length === 0) {
      const item = createSingleChecklistItem('', 0);
      resultFragment.appendChild(item);
    } else {
      lines.forEach((line, index) => {  
        const item = createSingleChecklistItem(line.trim(), 0);
        resultFragment.appendChild(item);
      });
    }

    // DOM에 삽입
    range.insertNode(resultFragment);
    
    // ✅ 포커스 관리 간소화
    const items = Array.from(resultFragment.childNodes);

    if (items.length > 0) {
      setTimeout(() => {
        const label = items[items.length - 1].querySelector('label');
        if (label) {
          PluginUtil.selection.moveCursorTo(label, 0);
        }
      }, 0);
    }
  }

  // ✅ 현재 체크리스트 아이템 찾기
  function findActiveChecklistItem() {
    const selection = PluginUtil.selection.getSafeSelection();
    if (!selection || selection.rangeCount === 0) return null;
    
    const range = selection.getRangeAt(0);
    const node = range.commonAncestorContainer;
    const element = node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
    return element.closest('.checklist-item');
  }

  // ✅ Enter 키 처리 (depth 상속 추가)
  function handleEnterKey(item) {
    if (isProcessingEnter) {
      return;
    }
    
    isProcessingEnter = true;
    
    if (!item) {
      isProcessingEnter = false;
      return;
    }
    
    const label = item.querySelector('label');
    const isEmpty = !label || !label.textContent.trim();
    
    // ✅ 현재 아이템의 depth 확인
    const currentIndent = parseInt(item.getAttribute('data-indent-level') || '0');
    
    if (isEmpty) {
      // 빈 항목 → 일반 텍스트 전환
      const textDiv = PluginUtil.dom.createElement('div', { innerHTML: '<br>' });
      item.replaceWith(textDiv);
      PluginUtil.selection.moveCursorTo(textDiv, 0);  
    } else {
      // ✅ depth 상속하여 새 아이템 생성
      const newItem = createSingleChecklistItem('', currentIndent);
      item.after(newItem);
      setTimeout(() => {
        const newLabel = newItem.querySelector('label');
        if (newLabel) {
          PluginUtil.selection.moveCursorTo(newLabel, 0);
        }
      }, 0);
    }
    
    setTimeout(() => {
      isProcessingEnter = false;
    }, 100);
  }

  // ✅ Tab 들여쓰기 (기존과 동일)
  function handleTabIndent(item, isShift) {
    if (!item) return;
    
    const currentIndent = parseInt(item.getAttribute('data-indent-level') || '0');
    const newIndent = isShift ? Math.max(0, currentIndent - 1) : currentIndent + 1;
    
    if (newIndent === 0) {
      item.removeAttribute('data-indent-level');
      item.style.removeProperty('margin-left');
    } else {
      item.setAttribute('data-indent-level', newIndent);
      item.style.marginLeft = `${newIndent * 20}px`;
    }
    
    setTimeout(() => {
      const contentArea = item.closest('[contenteditable="true"]');
      if (contentArea) contentArea.focus();
    }, 0);
  }

  // ✅ 키보드 이벤트 핸들러 (완전 차단 방식)
  const handleChecklistKeys = function(event) {
    // ✅ 1. 키 필터링을 먼저 (성능 최적화)
    if (event.key !== 'Enter' && event.key !== 'Tab') return;
    
    // ✅ 2. 에디터 영역 확인
    const contentArea = event.target.closest('[contenteditable="true"]');
    if (!contentArea) return;
    
    // ✅ 3. 체크리스트 컨텍스트 확인
    const activeItem = findActiveChecklistItem();
    if (!activeItem) return;
    
    // ✅ 4. 체크리스트 컨텍스트에서는 다른 이벤트 완전 차단
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    
    // ✅ 5. 리사이즈 중이면 무시
    if (document.querySelector('.video-resize-handle:active') || 
        document.querySelector('.image-resize-handle:active') ||
        document.querySelector('[data-resizing="true"]')) {
        return;
    }
    
    // ✅ 6. 처리 실행 (브라우저 기본 동작이 차단된 상태에서)
    if (event.key === 'Enter') {
      handleEnterKey(activeItem);
    } else if (event.key === 'Tab') {
      handleTabIndent(activeItem, event.shiftKey);
    }
  };

  // ✅ 체크리스트 토글 (로그 추가)
  function toggleCheckList(contentArea) {
    
    contentArea.focus();
    
    const selection = PluginUtil.selection.getSafeSelection();
    if (!selection || !selection.rangeCount) {
      return;
    }
    
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const element = container.nodeType === Node.TEXT_NODE ? container.parentNode : container;
    const checklistItem = element.closest('.checklist-item');
    
    
    
    if (checklistItem || container.querySelector?.('.checklist-item')) {
      
      // 체크리스트 → 일반 텍스트
      const editableRoot = element.closest('[contenteditable="true"]') || document;
      const allItems = Array.from(editableRoot.querySelectorAll('.checklist-item'))
        .filter(item => range.intersectsNode(item));
      
      
      if (allItems.length > 0) {
        const fragment = document.createDocumentFragment();
        
        allItems.forEach((item, index) => {
          const label = item.querySelector('label');
          const div = document.createElement('div');
          div.innerHTML = label ? label.innerHTML : '<br>';
          fragment.appendChild(div);
          
        });
        
        const firstItem = allItems[0];
        firstItem.parentNode.insertBefore(fragment, firstItem);
        allItems.forEach(item => item.remove());
      }
    } else {
      // 일반 텍스트 → 체크리스트
      createChecklistItems(contentArea);
    }
  }

  // ✅ 체크박스 초기화 (기존 항목용)
  function initCheckboxHandlers() {
    document.querySelectorAll('.checklist-item').forEach(item => {
      const checkbox = item.querySelector('input[type="checkbox"]');
      const label = item.querySelector('label');
      
      if (checkbox && label && !checkbox.id) {
        const itemId = `checklist-item-${Date.now()}-${checklistItemCounter++}`;
        checkbox.id = itemId;
        label.htmlFor = itemId;
        
        checkbox.addEventListener('change', function() {
          label.style.textDecoration = this.checked ? 'line-through' : 'none';
          label.style.color = this.checked ? '#999' : '';
        });
        
        // 현재 상태 반영
        if (checkbox.checked) {
          label.style.textDecoration = 'line-through';
          label.style.color = '#999';
        }
      }
    });
  }

  // ✅ 다른 리스트 타입 감지 함수 (체크리스트용)
  function detectOtherListTypes() {
    const selection = PluginUtil.selection.getSafeSelection();
    if (!selection || !selection.rangeCount) return null;
    
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const element = container.nodeType === Node.TEXT_NODE ? container.parentNode : container;
    
    // 불릿 리스트 감지
    const bulletList = element.closest('ul[data-lite-editor-bullet]') || 
                       element.querySelector('ul[data-lite-editor-bullet]');
    if (bulletList) {
      return { type: '불릿 리스트', element: bulletList };
    }
    
    // 넘버 리스트 감지  
    const numberedList = element.closest('ol[data-lite-editor-number]') ||
                        element.querySelector('ol[data-lite-editor-number]');
    if (numberedList) {
      return { type: '넘버 리스트', element: numberedList };
    }
    
    return null;
  }

  // ✅ 공통 로직을 별도 함수로 추출
  function executeCheckListAction(contentArea, triggerSource = 'unknown') {
    if (!contentArea) return;
    
    // 선택 영역 저장
    const savedSelection = PluginUtil.selection.saveSelection();
    
    // 다른 리스트 타입 체크
    const otherListType = detectOtherListTypes();
    if (otherListType) {
      LiteEditorModal.alert(
        '이미 ' + otherListType.type + '가 적용되었습니다.\n리스트 적용을 해제한 뒤 체크리스트를 적용해주세요.',
        {
          titleText: '리스트 중복 적용 불가',
          confirmText: '확인',
          onConfirm: function() {
            setTimeout(() => {
              try {
                contentArea.focus();
                if (savedSelection) {
                  PluginUtil.selection.restoreSelection(savedSelection);
                }
              } catch (e) {
                contentArea.focus();
              }
            }, 50);
          }
        }
      );
      return;
    }
    
    // 히스토리 기록
    if (window.LiteEditorHistory) {
      const editorId = contentArea.getAttribute('data-editor') || 'main-editor';
      const beforeState = contentArea.innerHTML;
      window.LiteEditorHistory.recordState(editorId, beforeState, `CheckList (${triggerSource})`);
    }
    
    if (window.liteEditorSelection) {
      window.liteEditorSelection.save();
      window.liteEditorSelection.restore();
    }
    
    toggleCheckList(contentArea);
    
    setTimeout(() => {
      initCheckboxHandlers();
    }, 100);
    
  }
  
  // ✅ 플러그인 등록 (간소화)
  PluginUtil.registerPlugin('checkList', {
    title: 'Check List',
    icon: 'checklist',
    action: function(contentArea, button, event) {
      if (event) { 
        event.preventDefault(); 
        event.stopPropagation(); 
      }
      contentArea.focus();
      executeCheckListAction(contentArea, 'Button Click');
    },
    initCheckboxHandlers: initCheckboxHandlers
  });

  // ✅ 이벤트 리스너 등록 (중복 방지)
  function registerEventListener() {
    if (isEventListenerRegistered) {
      return;
    }
    
    // ✅ capture: true로 다른 이벤트보다 먼저 실행
    document.addEventListener('keydown', handleChecklistKeys, true);
    isEventListenerRegistered = true;
    
    tabKeyCleanup = () => {
      document.removeEventListener('keydown', handleChecklistKeys, true);
      isEventListenerRegistered = false;
    };
  }

  // 초기화 시 한 번만 등록
  registerEventListener();

  // ✅ 단축키 등록 (Cmd+Shift+9) - document.addEventListener 방식만 유지
  document.addEventListener('keydown', function(e) {
    const contentArea = e.target.closest('[contenteditable="true"]');
    if (!contentArea) return;
    
    const editorContainer = contentArea.closest('.lite-editor, .lite-editor-content');
    if (!editorContainer) return;

    const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);

    // ✅ Cmd+Shift+9 (Mac) / Ctrl+Shift+9 (Windows/Linux)
    if (e.shiftKey && ((isMac && e.metaKey) || (!isMac && e.ctrlKey)) && !e.altKey && e.key === '9') {
      try {
        e.preventDefault();
        e.stopPropagation();
        executeCheckListAction(contentArea, 'Cmd+Shift+9');
      } catch (error) {
        if (window.errorHandler) {
          errorHandler.logWarning('CheckListPlugin', 'Cmd+Shift+9 처리 중 확장 프로그램 충돌', error);
        }
      }
    }
  }, true);
})();