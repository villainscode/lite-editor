/**
 * LiteEditor Check List Plugin (리팩토링 버전)
 * 기존 기능 100% 유지, 코드 50% 간소화
 */
(function() {
  let tabKeyCleanup = null;
  let checklistItemCounter = 0;

  // ✅ 단일 체크리스트 아이템 생성 (이벤트 처리 통합)
  function createSingleChecklistItem(text) {
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
      style: 'margin-left: -3px;',
      htmlFor: itemId,
      innerHTML: text.trim() || '<br>'
    });
    
    // ✅ 체크박스 이벤트 (한 곳에서만 처리)
    checkbox.addEventListener('change', function() {
      label.style.textDecoration = this.checked ? 'line-through' : 'none';
      label.style.color = this.checked ? '#666' : '';
    });
    
    container.appendChild(checkbox);
    container.appendChild(label);
    return container;
  }

  // ✅ 체크리스트 생성 (선택 영역 처리 간소화)
  function createChecklistItems(contentArea) {
    const selection = PluginUtil.selection.getSafeSelection();
    if (!selection || !selection.rangeCount) return;
    
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
      resultFragment.appendChild(createSingleChecklistItem(''));
    } else {
      lines.forEach(line => {
        resultFragment.appendChild(createSingleChecklistItem(line.trim()));
      });
    }
    
    range.insertNode(resultFragment);
    
    // ✅ 포커스 관리 간소화
    const items = Array.from(resultFragment.childNodes);
    if (items.length > 0) {
      setTimeout(() => {
        const label = items[items.length - 1].querySelector('label');
        if (label) PluginUtil.selection.moveCursorTo(label, 0);
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

  // ✅ Enter 키 처리
  function handleEnterKey(item) {
    if (!item) return;
    
    const label = item.querySelector('label');
    const isEmpty = !label || !label.textContent.trim();
    
    if (isEmpty) {
      // 빈 항목 → 일반 텍스트 전환
      const textDiv = PluginUtil.dom.createElement('div', { innerHTML: '<br>' });
      item.replaceWith(textDiv);
      PluginUtil.selection.moveCursorTo(textDiv, 0);
    } else {
      // 새 체크리스트 항목 생성
      const newItem = createSingleChecklistItem('');
      item.after(newItem);
      setTimeout(() => {
        const newLabel = newItem.querySelector('label');
        if (newLabel) PluginUtil.selection.moveCursorTo(newLabel, 0);
      }, 0);
    }
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

  // ✅ 키보드 이벤트 핸들러
  const handleChecklistKeys = function(event) {
    // ✅ 1. 체크리스트 컨텍스트 먼저 확인
    const activeItem = findActiveChecklistItem();
    if (!activeItem) return; // 체크리스트가 아니면 다른 핸들러에 위임
    
    // ✅ 2. 키 필터링
    if (event.key !== 'Enter' && event.key !== 'Tab') return;
    
    // ✅ 3. 에디터 영역 확인
    const contentArea = event.target.closest('[contenteditable="true"]');
    if (!contentArea) return;
    
    // ✅ 4. 리사이즈 중이면 무시
    if (document.querySelector('.video-resize-handle:active') || 
        document.querySelector('.image-resize-handle:active') ||
        document.querySelector('[data-resizing="true"]')) {
        return;
    }
    
    // ✅ 5. 이벤트 완전 차단 (fontColor.js 등 다른 핸들러 실행 방지)
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    
    // ✅ 6. 처리 실행
    if (event.key === 'Enter') {
      handleEnterKey(activeItem);
    } else if (event.key === 'Tab') {
      handleTabIndent(activeItem, event.shiftKey);
    }
  };

  // ✅ 체크리스트 토글 (간소화된 선택 영역 처리)
  function toggleCheckList(contentArea) {
    contentArea.focus();
    
    const selection = PluginUtil.selection.getSafeSelection();
    if (!selection || !selection.rangeCount) return;
    
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
        
        allItems.forEach(item => {
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
          label.style.color = this.checked ? '#666' : '';
        });
        
        // 현재 상태 반영
        if (checkbox.checked) {
          label.style.textDecoration = 'line-through';
          label.style.color = '#666';
        }
      }
    });
  }

  // ✅ 단축키 등록
  LiteEditor.registerShortcut('checkList', {
    key: 'k',
    alt: true,
    action: toggleCheckList
  });

  // ✅ 플러그인 등록 (히스토리 기록 추가)
  PluginUtil.registerPlugin('checkList', {
    title: 'Check List',
    icon: 'checklist',
    action: function(contentArea, button, event) {
      if (event) { event.preventDefault(); event.stopPropagation(); }
      contentArea.focus();
      
      // 🔥 히스토리에 적용 전 상태 기록
      if (window.LiteEditorHistory) {
        const editorId = contentArea.getAttribute('data-editor') || 'main-editor';
        const beforeState = contentArea.innerHTML;
        
        window.LiteEditorHistory.recordState(editorId, beforeState, 'CheckList Action');
      }
      
      if (window.liteEditorSelection) {
        window.liteEditorSelection.save();
        window.liteEditorSelection.restore();
      }
      
      toggleCheckList(contentArea);
      setTimeout(initCheckboxHandlers, 0);
    },
    initCheckboxHandlers: initCheckboxHandlers
  });
  
  // ✅ 이벤트 리스너 등록
  document.addEventListener('keydown', handleChecklistKeys, true);
  tabKeyCleanup = () => document.removeEventListener('keydown', handleChecklistKeys, true);
  
  // ✅ 정리 함수
  if (PluginUtil.registerCleanup) {
    PluginUtil.registerCleanup('checkList', tabKeyCleanup);
  }
})();