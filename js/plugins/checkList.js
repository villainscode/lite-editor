/**
 * LiteEditor Check List Plugin
 * 체크리스트 기능 구현 플러그인
 */
(function() {
  // 들여쓰기 너비 값 (기본값: 6px)
  let indentSize = 6;
  
  // 들여쓰기 레벨에 따른 마진 클래스 생성 함수
  function getMarginClass(level) {
    const marginSize = level * indentSize;
    return `ml-${marginSize}`;
  }
  
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
    const text = range.toString();
    if (!text.trim()) return;

    const lines = text.split(/\r?\n/).filter(l => l.trim());
    range.deleteContents();
    
    const fragment = document.createDocumentFragment();
    lines.forEach(line => fragment.appendChild(createSingleChecklistItem(line)));
    range.insertNode(fragment);

    // 마지막 체크리스트 항목에 포커스 설정
    const lastItem = fragment.lastChild;
    if (lastItem) maintainFocus(lastItem);
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
      className: `flex items-center gap-2 my-1 checklist-item ${getMarginClass(0)}`
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
      errorHandler.logError('CheckListPlugin', errorHandler.codes.COMMON.FOCUS, e);
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

  /**
   * Tab 키 처리 - 들여쓰기/내어쓰기
   */
  function handleTabKey(item, isShift) {
    if (!item) return;
    
    // 현재 커서 위치와 텍스트 노드 저장
    const selection = window.getSelection();
    let cursorPosition = 0;
    let textNode = null;
    
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const node = range.startContainer;
      
      if (node.nodeType === Node.TEXT_NODE) {
        textNode = node;
        cursorPosition = range.startOffset;
      }
    }
    
    // 현재 들여쓰기 레벨 찾기
    let currentLevel = 0;
    
    // ml-* 클래스에서 현재 들여쓰기 레벨 추출
    const mlClass = Array.from(item.classList).find(cls => cls.startsWith('ml-'));
    if (mlClass) {
      const marginSize = parseInt(mlClass.replace('ml-', ''), 10);
      currentLevel = marginSize / indentSize;
    }
    
    // 들여쓰기/내어쓰기 적용
    let didChange = false;
    
    if (isShift && currentLevel > 0) {
      // 내어쓰기
      const newLevel = currentLevel - 1;
      const oldClass = getMarginClass(currentLevel);
      const newClass = getMarginClass(newLevel);
      item.classList.replace(oldClass, newClass);
      didChange = true;
    } else if (!isShift) {
      // 들여쓰기 - 설정된 indentSize 값을 사용
      const newLevel = currentLevel + 1;
      const oldClass = getMarginClass(currentLevel);
      const newClass = getMarginClass(newLevel);
      item.classList.replace(oldClass, newClass);
      didChange = true;
    }
    
    // 변경이 있었고 텍스트 노드가 있는 경우에만 커서 복원
    if (didChange) {
      if (textNode) {
        // 직접 텍스트 노드에 커서 위치 설정
        setTimeout(() => {
          try {
            const range = document.createRange();
            range.setStart(textNode, cursorPosition);
            range.collapse(true);
            
            selection.removeAllRanges();
            selection.addRange(range);
          } catch (e) {
            // 실패하면 maintainFocus 사용
            maintainFocus(item, cursorPosition);
          }
        }, 0);
      } else {
        // 텍스트 노드가 없으면 maintainFocus 사용
        maintainFocus(item, cursorPosition);
      }
    }
  }

  /**
   * 키보드 이벤트 핸들러 (전역)
   */
  const handleChecklistKeys = PluginUtil.events.throttle(function(event) {
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
    
    // 키에 따라 처리
    if (event.key === 'Enter') {
      handleEnterKey(activeItem);
    } else if (event.key === 'Tab') {
      handleTabKey(activeItem, event.shiftKey);
    }
  }, 100); // 100ms 쓰로틀링 적용

  /**
   * 들여쓰기 너비 설정 함수
   * @param {number} size - 픽셀 단위의 들여쓰기 너비
   */
  function setIndentSize(size) {
    if (typeof size === 'number' && size > 0) {
      indentSize = size;
      
      // 기존 체크리스트 아이템의 들여쓰기 업데이트
      updateExistingIndents();
    }
  }
  
  /**
   * 체크박스 이벤트 처리를 적용
   */
  function initCheckboxHandlers() {
    // 기존 체크리스트 아이템에 이벤트 처리 적용
    applyCheckboxEventHandlers();
  }
  
  /**
   * 체크박스와 label 사이의 간격 설정 함수
   * @param {number} gap - 픽셀 단위의 간격
   */
  function setLabelGap(gap) {
    if (typeof gap === 'number' && gap >= 0) {
      labelGap = gap;
      
      // 기존 체크리스트 아이템의 label 간격 업데이트
      updateExistingLabelGaps();
    }
  }
  
  /**
   * 기존 체크리스트 아이템의 label 간격 업데이트
   */
  function updateExistingLabelGaps() {
    const checklistItems = document.querySelectorAll('.checklist-item label');
    
    checklistItems.forEach(label => {
      // 새 간격 스타일 적용
      label.style.marginLeft = `${labelGap}px`;
    });
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
  
  /**
   * 기존 체크리스트 아이템의 들여쓰기 업데이트
   */
  function updateExistingIndents() {
    const checklistItems = document.querySelectorAll('.checklist-item');
    
    checklistItems.forEach(item => {
      // 현재 들여쓰기 레벨 찾기
      const mlClass = Array.from(item.classList).find(cls => cls.startsWith('ml-'));
      if (mlClass) {
        const marginSize = parseInt(mlClass.replace('ml-', ''), 10);
        const currentLevel = Math.round(marginSize / (indentSize || 4)); // 이전 indentSize로 나누기
        
        // 새 들여쓰기 클래스 적용
        item.classList.remove(mlClass);
        item.classList.add(getMarginClass(currentLevel));
      }
    });
  }
  
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
      
      // 체크박스 이벤트 처리 초기화
      setTimeout(initCheckboxHandlers, 0);
    },
    // 설정 함수 노출
    setIndentSize: setIndentSize,
    setLabelGap: setLabelGap,
    initCheckboxHandlers: initCheckboxHandlers
  });
  
  // 전역 키보드 이벤트 리스너 등록 (캡처링 단계에서 처리)
  document.addEventListener('keydown', handleChecklistKeys, true);
})();
