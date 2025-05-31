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
      label.style.color = this.checked ? '#666' : '';
    });
    
    container.appendChild(checkbox);
    container.appendChild(label);
    
    // 🔥 로그 출력
    console.log('🟢 [CheckList] createSingleChecklistItem 생성:', {
      itemId: itemId,
      text: text,
      inheritIndent: inheritIndent,
      html: container.outerHTML
    });
    
    return container;
  }

  // ✅ 체크리스트 생성 (로그 추가)
  function createChecklistItems(contentArea) {
    console.log('🔵 [CheckList] createChecklistItems 시작');
    
    const selection = PluginUtil.selection.getSafeSelection();
    if (!selection || !selection.rangeCount) {
      console.log('❌ [CheckList] 선택 영역 없음');
      return;
    }
    
    const range = selection.getRangeAt(0);
    console.log('🔍 [CheckList] 선택 범위:', {
      startContainer: range.startContainer,
      startOffset: range.startOffset,
      endContainer: range.endContainer,
      endOffset: range.endOffset,
      collapsed: range.collapsed
    });
    
    const fragment = range.extractContents();
    const tempDiv = document.createElement('div');
    tempDiv.appendChild(fragment);
    
    console.log('📄 [CheckList] 추출된 콘텐츠:', {
      originalHTML: tempDiv.innerHTML,
      textContent: tempDiv.textContent
    });
    
    // BR 태그 기준 분리
    let content = tempDiv.innerHTML
      .replace(/<\/(div|p)>/gi, '<br>')
      .replace(/<(div|p)[^>]*>/gi, '');
    
    console.log('🔄 [CheckList] 정리된 콘텐츠:', content);
    
    const lines = content.split(/<br\s*\/?>/i).filter(line => line.trim());
    console.log('📝 [CheckList] 분리된 라인들:', lines);
    
    const resultFragment = document.createDocumentFragment();
    
    if (lines.length === 0) {
      console.log('⚪ [CheckList] 빈 라인 - 기본 아이템 생성');
      const item = createSingleChecklistItem('', 0);
      resultFragment.appendChild(item);
    } else {
      lines.forEach((line, index) => {
        console.log(`📋 [CheckList] 라인 ${index + 1}/${lines.length} 처리:`, line.trim());
        const item = createSingleChecklistItem(line.trim(), 0);
        resultFragment.appendChild(item);
      });
    }
    
    console.log('🎯 [CheckList] Fragment 생성 완료, 자식 수:', resultFragment.childNodes.length);
    
    // DOM에 삽입
    range.insertNode(resultFragment);
    
    console.log('✅ [CheckList] DOM 삽입 완료');
    
    // ✅ 포커스 관리 간소화
    const items = Array.from(resultFragment.childNodes);
    console.log('🎪 [CheckList] 생성된 아이템들:', items.length);
    
    if (items.length > 0) {
      setTimeout(() => {
        const label = items[items.length - 1].querySelector('label');
        if (label) {
          console.log('👆 [CheckList] 마지막 라벨로 커서 이동:', label);
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
      console.log('⚠️ [CheckList] Enter 키 중복 처리 방지');
      return;
    }
    
    isProcessingEnter = true;
    console.log('⏎ [CheckList] Enter 키 처리 시작:', item);
    
    if (!item) {
      isProcessingEnter = false;
      return;
    }
    
    const label = item.querySelector('label');
    const isEmpty = !label || !label.textContent.trim();
    
    // ✅ 현재 아이템의 depth 확인
    const currentIndent = parseInt(item.getAttribute('data-indent-level') || '0');
    
    console.log('🔍 [CheckList] Enter - 상태 확인:', {
      label: label,
      isEmpty: isEmpty,
      currentIndent: currentIndent,
      labelContent: label?.textContent,
      labelHTML: label?.innerHTML
    });
    
    if (isEmpty) {
      console.log('🔄 [CheckList] Enter - 빈 항목 → 일반 텍스트 변환');
      
      // 빈 항목 → 일반 텍스트 전환
      const textDiv = PluginUtil.dom.createElement('div', { innerHTML: '<br>' });
      item.replaceWith(textDiv);
      PluginUtil.selection.moveCursorTo(textDiv, 0);
      
      console.log('✅ [CheckList] Enter - 일반 텍스트 변환 완료:', textDiv.outerHTML);
    } else {
      console.log('➕ [CheckList] Enter - 새 체크리스트 아이템 생성 (depth 상속)');
      
      // ✅ depth 상속하여 새 아이템 생성
      const newItem = createSingleChecklistItem('', currentIndent);
      item.after(newItem);
      
      console.log('✅ [CheckList] Enter - 새 아이템 삽입 완료 (depth:', currentIndent, '):', newItem.outerHTML);
      
      setTimeout(() => {
        const newLabel = newItem.querySelector('label');
        if (newLabel) {
          console.log('👆 [CheckList] Enter - 새 라벨로 커서 이동:', newLabel);
          PluginUtil.selection.moveCursorTo(newLabel, 0);
        }
      }, 0);
    }
    
    setTimeout(() => {
      isProcessingEnter = false;
      console.log('🏁 [CheckList] Enter 키 처리 완료');
    }, 100);
  }

  // ✅ Tab 들여쓰기 (기존과 동일)
  function handleTabIndent(item, isShift) {
    if (!item) return;
    
    console.log('🔄 [CheckList] Tab 처리:', {
      item: item,
      isShift: isShift,
      currentIndent: item.getAttribute('data-indent-level')
    });
    
    const currentIndent = parseInt(item.getAttribute('data-indent-level') || '0');
    const newIndent = isShift ? Math.max(0, currentIndent - 1) : currentIndent + 1;
    
    console.log('📏 [CheckList] Indent 계산:', {
      currentIndent: currentIndent,
      newIndent: newIndent,
      marginLeft: `${newIndent * 20}px`
    });
    
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
    
    console.log('🔒 [CheckList] 키 이벤트 독점 처리:', {
      key: event.key,
      activeItem: activeItem,
      shiftKey: event.shiftKey,
      timestamp: Date.now()
    });
    
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
    console.log('🚀 [CheckList] toggleCheckList 시작');
    
    contentArea.focus();
    
    const selection = PluginUtil.selection.getSafeSelection();
    if (!selection || !selection.rangeCount) {
      console.log('❌ [CheckList] toggleCheckList - 선택 영역 없음');
      return;
    }
    
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const element = container.nodeType === Node.TEXT_NODE ? container.parentNode : container;
    const checklistItem = element.closest('.checklist-item');
    
    console.log('🔍 [CheckList] 현재 상태 분석:', {
      container: container,
      element: element,
      checklistItem: checklistItem,
      hasChecklistInSelection: container.querySelector?.('.checklist-item')
    });
    
    if (checklistItem || container.querySelector?.('.checklist-item')) {
      console.log('🔄 [CheckList] 체크리스트 → 일반 텍스트 변환');
      
      // 체크리스트 → 일반 텍스트
      const editableRoot = element.closest('[contenteditable="true"]') || document;
      const allItems = Array.from(editableRoot.querySelectorAll('.checklist-item'))
        .filter(item => range.intersectsNode(item));
      
      console.log('📋 [CheckList] 변환할 아이템들:', allItems.length, allItems);
      
      if (allItems.length > 0) {
        const fragment = document.createDocumentFragment();
        
        allItems.forEach((item, index) => {
          const label = item.querySelector('label');
          const div = document.createElement('div');
          div.innerHTML = label ? label.innerHTML : '<br>';
          fragment.appendChild(div);
          
          console.log(`🔄 [CheckList] 아이템 ${index + 1} 변환:`, {
            original: item.outerHTML,
            converted: div.outerHTML
          });
        });
        
        const firstItem = allItems[0];
        firstItem.parentNode.insertBefore(fragment, firstItem);
        allItems.forEach(item => item.remove());
        
        console.log('✅ [CheckList] 일반 텍스트 변환 완료');
      }
    } else {
      console.log('📝 [CheckList] 일반 텍스트 → 체크리스트 변환');
      
      // 일반 텍스트 → 체크리스트
      createChecklistItems(contentArea);
    }
    
    console.log('🏁 [CheckList] toggleCheckList 완료');
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

  // ✅ 단축키 등록
  LiteEditor.registerShortcut('checkList', {
    key: 'k',
    alt: true,
    action: toggleCheckList
  });

  // ✅ 플러그인 등록 (로그 추가)
  PluginUtil.registerPlugin('checkList', {
    title: 'Check List',
    icon: 'checklist',
    action: function(contentArea, button, event) {
      console.log('🎯 [CheckList] 플러그인 액션 시작:', {
        contentArea: contentArea,
        button: button,
        event: event
      });
      
      if (event) { 
        event.preventDefault(); 
        event.stopPropagation(); 
      }
      contentArea.focus();
      
      // ✅ 선택 영역 저장 (모달 표시 전에)
      const savedSelection = PluginUtil.selection.saveSelection();
      
      // ✅ 다른 리스트 타입 체크 (수정된 버전)
      const otherListType = detectOtherListTypes();
      if (otherListType) {
        LiteEditorModal.alert(
          '이미 ' + otherListType.type + '가 적용되었습니다.\n리스트 적용을 해제한 뒤 체크리스트를 적용해주세요.',
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
                  console.log('🔄 [CheckList] 선택 영역 복원 완료');
                } catch (e) {
                  console.warn('[CheckList] 선택 영역 복원 실패:', e);
                  // 폴백: 에디터 끝에 커서 설정
                  contentArea.focus();
                }
              }, 50);
            }
          }
        );
        return;
      }
      
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
      
      setTimeout(() => {
        initCheckboxHandlers();
        
        // 🔥 최종 결과 로그
        console.log('🎉 [CheckList] 최종 결과 HTML:', contentArea.innerHTML);
        
      }, 100);
      
      console.log('✅ [CheckList] 플러그인 액션 완료');
    },
    initCheckboxHandlers: initCheckboxHandlers
  });
  
  // ✅ 이벤트 리스너 등록 (중복 방지)
  function registerEventListener() {
    if (isEventListenerRegistered) {
      console.log('⚠️ [CheckList] 이벤트 리스너 이미 등록됨');
      return;
    }
    
    console.log('🔧 [CheckList] 이벤트 리스너 등록 (capture: true)');
    // ✅ capture: true로 다른 이벤트보다 먼저 실행
    document.addEventListener('keydown', handleChecklistKeys, true);
    isEventListenerRegistered = true;
    
    tabKeyCleanup = () => {
      console.log('🧹 [CheckList] 이벤트 리스너 제거');
      document.removeEventListener('keydown', handleChecklistKeys, true);
      isEventListenerRegistered = false;
    };
  }

  // 초기화 시 한 번만 등록
  registerEventListener();
})();