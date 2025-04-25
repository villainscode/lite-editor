/**
 * LiteEditor Check List Plugin
 */
(function() {
  // 체크리스트 항목들을 생성하고 삽입
  function createChecklistItems(contentArea) {
    const selection = PluginUtil.selection.getSafeSelection();
    if (!selection || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const text = range.toString();
    if (!text.trim()) return;

    const lines = text.split(/\r?\n/).filter(l => l.trim());
    range.deleteContents();
    const fragment = document.createDocumentFragment();
    lines.forEach(line => fragment.appendChild(createSingleChecklistItem(line)));
    range.insertNode(fragment);

    const lastLabel = fragment.lastChild?.querySelector('label');
    if (lastLabel) PluginUtil.selection.moveCursorTo(lastLabel, 0);
  }

  // 단일 체크리스트 아이템 생성 유틸
  function createSingleChecklistItem(text) {
    const container = PluginUtil.dom.createElement('div', {
      className: 'flex items-center gap-2 my-1 checklist-item ml-0'
    });
    const checkbox = PluginUtil.dom.createElement('input', {
      type: 'checkbox',
      className: 'form-checkbox h-4 w-4 text-primary peer transition'
    });
    
    // 빈 텍스트일 경우 &nbsp; 추가 (커서 위치 보이게)
    const labelContent = text.trim() ? text : '\u00A0'; // &nbsp; 유니코드
    
    const label = PluginUtil.dom.createElement('label', {
      className: 'ml-1 text-gray-800 peer-checked:line-through peer-checked:text-gray-400',
      textContent: labelContent
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
   */
  function maintainFocus(element) {
    if (!element) return;
    
    try {
      // label 요소 찾기
      const label = element.querySelector('label');
      if (label) {
        // 텍스트 노드 찾기
        const textNode = label.firstChild;
        if (textNode) {
          // 텍스트 노드의 중간에 커서 위치 (더 자연스러운 위치)
          PluginUtil.selection.moveCursorTo(textNode, 0);
          console.log('커서 위치 설정됨:', textNode, '위치:', 0);
        } else {
          PluginUtil.selection.moveCursorTo(label, 0);
          console.log('텍스트 노드 없음, label에 커서 위치');
        }
      }
    } catch (e) {
      console.warn('포커스 유지 중 오류:', e);
    }
  }

  /**
   * Enter 키 처리 - 새 체크리스트 아이템 생성 또는 일반 텍스트로 전환
   */
  function handleEnterKey(item) {
    if (!item) return;
    
    // 현재 항목이 비어있는지 확인 (label 내용 체크)
    const label = item.querySelector('label');
    const isEmpty = !label || !label.textContent.trim() || label.textContent === '\u00A0';
    
    console.log('Enter 키 처리 - 현재 항목 비어있음:', isEmpty);
    
    if (isEmpty) {
      // 빈 체크리스트 항목이면 일반 텍스트 블록으로 전환
      console.log('빈 체크리스트 항목 → 일반 텍스트 블록으로 전환');
      const textDiv = PluginUtil.dom.createElement('div', { 
        className: '',
        innerHTML: '<br>' // 빈 줄 표시를 위한 br 태그
      });
      
      // 현재 항목 대체
      item.replaceWith(textDiv);
      PluginUtil.selection.moveCursorTo(textDiv, 0);
    } else {
      // 내용이 있으면 새 체크리스트 아이템 생성
      console.log('내용 있는 체크리스트 항목 → 새 체크리스트 생성');
      const newItem = createSingleChecklistItem('');
      item.after(newItem);
      maintainFocus(newItem);
    }
  }

  /**
   * Tab 키 처리 - 들여쓰기
   */
  function handleTabKey(item, isShift) {
    if (!item) return;
    
    console.log('Tab 키 처리 - ' + (isShift ? '내어쓰기' : '들여쓰기'));
    const mlClasses = ['ml-0','ml-4','ml-8','ml-12','ml-16','ml-20','ml-24','ml-28','ml-32'];
    const curr = mlClasses.find(c => item.classList.contains(c)) || 'ml-0';
    const i = mlClasses.indexOf(curr);
    
    if (isShift) {
      // 내어쓰기
      if (i > 0) item.classList.replace(curr, mlClasses[i - 1]);
    } else {
      // 들여쓰기
      if (i < mlClasses.length - 1) item.classList.replace(curr, mlClasses[i + 1]);
    }
  }

  /**
   * 키보드 이벤트 핸들러 (전역)
   */
  const handleChecklistKeys = PluginUtil.events.throttle(function(event) {
    // Enter 또는 Tab 키가 아니면 무시
    if (event.key !== 'Enter' && event.key !== 'Tab') return;
    
    console.log('체크리스트 키 이벤트 감지:', event.key);
    
    // 에디터 영역 찾기
    const contentArea = event.target.closest('[contenteditable="true"]');
    if (!contentArea) {
      console.log('contenteditable 영역 없음');
      return;
    }
    
    // 현재 선택된 체크리스트 아이템 찾기
    const activeItem = findActiveChecklistItem();
    if (!activeItem) {
      console.log('체크리스트 아이템 없음');
      return;
    }
    
    // 기본 동작 방지
    event.preventDefault();
    event.stopPropagation();
    
    // 키에 따라 처리
    if (event.key === 'Enter') {
      handleEnterKey(activeItem);
    } else if (event.key === 'Tab') {
      handleTabKey(activeItem, event.shiftKey);
    }
  }, 100); // 100ms 쓰로틀링 적용

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
      createChecklistItems(contentArea);
      if (window.liteEditorSelection) window.liteEditorSelection.save();
    },
    onInit: function(contentArea) {
      console.log('체크리스트 플러그인 초기화');
      // 전역 이벤트 리스너는 onInit에서 등록하지 않음 (이미 아래에서 등록됨)
    }
  });
  
  // 전역 키보드 이벤트 리스너 등록 (캡처링 단계에서 처리)
  document.addEventListener('keydown', handleChecklistKeys, true);
  console.log('체크리스트 키보드 이벤트 리스너 등록 완료');
})();
