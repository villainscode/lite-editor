/**
 * LiteEditor Alignment Plugin
 * 텍스트 정렬 관련 통합 플러그인
 */

(function() {
  const util = window.PluginUtil || {};
  
  let savedRange = null;
  let isDropdownOpen = false;

  // ✅ 공통 로직을 별도 함수로 추출 (수정)
  function executeAlignAction(alignType, contentArea, triggerSource = 'unknown') {
    if (!contentArea) return;
    if (!util.utils.canExecutePlugin(contentArea)) return;
    
    // ✅ 실제 포커스 재확인
    if (document.activeElement !== contentArea) {
      console.log('[ALIGN] 실행 중단 - content 영역에 포커스 없음');
      return;
    }
    
    contentArea.focus();
    
    // 히스토리 기록
    if (window.LiteEditorHistory) {
      window.LiteEditorHistory.forceRecord(contentArea, `Before Align ${alignType} (${triggerSource})`);
    }
    
    // ✅ 수정: 이전 savedRange 완전 초기화 후 새로 저장
    console.log('[ALIGN] 이전 savedRange 초기화 및 새로운 선택 영역 저장');
    savedRange = null; // 이전 범위 완전 제거
    
    const saved = saveSelectionWithNormalization();
    
    if (!saved) {
      console.log('[ALIGN] 선택 영역 저장 실패 - 정렬 중단');
      return;
    }
    
    // ✅ 정렬 적용 (DOM 변경됨)
    applyAlignment(alignType, contentArea);
    
    // ✅ 수정: 사용 후 즉시 완전 초기화 (커서 위치 강제 설정 제거)
    console.log('[ALIGN] 정렬 적용 완료 - 완전 초기화 시작');
    savedRange = null;
    
    // ✅ 전역 선택 영역 저장소들 완전 초기화 (커서 조작 없이)
    try {
      // 1. media 플러그인 저장소 초기화
      if (window.mediaPluginSavedRange) {
        window.mediaPluginSavedRange = null;
        console.log('[ALIGN] mediaPluginSavedRange 초기화 완료');
      }
      
      // 2. 전역 liteEditorSelection 초기화
      if (window.liteEditorSelection) {
        if (typeof window.liteEditorSelection.clear === 'function') {
          window.liteEditorSelection.clear();
        } else if (typeof window.liteEditorSelection.set === 'function') {
          window.liteEditorSelection.set(null);
        }
        console.log('[ALIGN] liteEditorSelection 초기화 완료');
      }
      
      // 3. layerManager의 lastSavedSelection 초기화
      if (util.layerManager && util.layerManager.lastSavedSelection) {
        util.layerManager.lastSavedSelection = null;
        console.log('[ALIGN] layerManager.lastSavedSelection 초기화 완료');
      }
      
      // ✅ 4. 커서 위치는 applyAlignment에서 자연스럽게 설정된 상태 유지
      console.log('[ALIGN] 정렬 후 자연스러운 커서 위치 유지');
      
    } catch (e) {
      console.warn('[ALIGN] 전역 저장소 초기화 중 오류:', e);
    }
    
    // 히스토리 완료 기록
    setTimeout(() => {
      if (window.LiteEditorHistory) {
        window.LiteEditorHistory.recordState(contentArea, `After Align ${alignType} (${triggerSource})`);
      }
    }, 100);
  }

  // ✅ 플러그인 등록 (간소화)
  PluginUtil.registerPlugin('align', {
    title: 'Text Alignment (⌘⇧L/E/R/J)',
    icon: 'format_align_justify',
    action: function(contentArea, buttonElement, event) {
      if (event) event.preventDefault();
      // 드롭다운은 기존 로직 유지하되, 여기서는 기본 왼쪽 정렬 적용
      executeAlignAction('Left', contentArea, 'Button Click');
    },
    // ✅ 기존 customRender 로직을 유지하되 단순화
    customRender: function(toolbar, contentArea) {
      // 기존 드롭다운 UI 로직 유지 (간소화)
      const alignButton = util.dom.createElement('div', {
        className: 'lite-editor-button',
        title: 'Text Alignment (⌘⇧L/E/R/J)'
      });
      
      const icon = util.dom.createElement('i', {
        className: 'material-icons',
        textContent: 'format_align_justify'
      });
      alignButton.appendChild(icon);
      
      // 드롭다운 메뉴 생성 (기존 로직 유지)
      const dropdownMenu = createAlignmentDropdown(contentArea);
      document.body.appendChild(dropdownMenu);
      
      // 이벤트 리스너 설정
      setupAlignmentEvents(alignButton, dropdownMenu, contentArea);
      
      return alignButton;
    }
  });

  // ✅ 드롭다운 생성 함수 분리
  function createAlignmentDropdown(contentArea) {
    const dropdownMenu = util.dom.createElement('div', {
      className: 'lite-editor-dropdown-menu align-dropdown'
    }, {
      width: 'auto',
      minWidth: '140px',
      padding: '4px',
      boxShadow: '0 1px 5px rgba(0,0,0,0.1)',
      position: 'absolute',
      zIndex: '99999',
      backgroundColor: '#fff',
      border: '1px solid #ccc',
      borderRadius: '4px',
      display: 'none'
    });
    
    const buttonContainer = util.dom.createElement('div', {
      className: 'align-button-container'
    }, {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      width: '100%',
      margin: '0',
      padding: '2px 0'
    });
    
    dropdownMenu.appendChild(buttonContainer);
    
    // 정렬 옵션들
    const alignOptions = [
      { align: 'Left', icon: 'format_align_left', shortcut: '⌘⇧L' },
      { align: 'Center', icon: 'format_align_center', shortcut: '⌘⇧E' },
      { align: 'Right', icon: 'format_align_right', shortcut: '⌘⇧R' },
      { align: 'Full', icon: 'format_align_justify', shortcut: '⌘⇧J' }
    ];
    
    alignOptions.forEach(option => {
      const alignBtn = util.dom.createElement('div', {
        className: 'align-btn',
        'data-align': option.align,
        title: `${option.align} Align (${option.shortcut})` // ✅ 툴크에 단축키 표시
      }, {
        width: '28px',
        height: '28px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'pointer',
        borderRadius: '3px',
        margin: '0 1px',
        transition: 'all 0.2s ease',
        boxSizing: 'border-box'
      });
      
      // 호버 효과
      alignBtn.addEventListener('mouseover', function() {
        this.style.backgroundColor = '#f0f0f0';
      });
      
      alignBtn.addEventListener('mouseout', function() {
        this.style.backgroundColor = 'transparent';
      });
      
      const btnIcon = util.dom.createElement('i', {
        className: 'material-icons',
        textContent: option.icon
      }, {
        fontSize: '18px'
      });
      
      alignBtn.appendChild(btnIcon);
      
      // 클릭 이벤트
      alignBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (savedRange) {
          closeDropdown(dropdownMenu);
          setTimeout(() => {
            executeAlignAction(option.align, contentArea, 'Dropdown Click');
          }, 10);
        }
      });
      
      buttonContainer.appendChild(alignBtn);
    });
    
    return dropdownMenu;
  }

  // ✅ 이벤트 설정 함수 분리 (수정)
  function setupAlignmentEvents(alignButton, dropdownMenu, contentArea) {
    alignButton.addEventListener('mousedown', (e) => {
      // ✅ 수정: 드롭다운 열 때만 선택 영역 저장
      console.log('[ALIGN] 드롭다운 mousedown - 선택 영역 저장');
      saveSelectionWithNormalization();
    });
    
    alignButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const isVisible = dropdownMenu.classList.contains('show');
      
      if (isVisible) {
        closeDropdown(dropdownMenu);
        // ✅ 추가: 드롭다운 닫을 때 savedRange 초기화
        console.log('[ALIGN] 드롭다운 닫기 - savedRange 초기화');
        savedRange = null;
      } else {
        openDropdown(alignButton, dropdownMenu);
      }
    });
  }

  // ✅ 드롭다운 열기/닫기 함수 분리
  function openDropdown(alignButton, dropdownMenu) {
    util.activeModalManager.closeAll();
    
    dropdownMenu.classList.add('show');
    dropdownMenu.style.display = 'block';
    alignButton.classList.add('active');
    isDropdownOpen = true;
    
    const buttonRect = alignButton.getBoundingClientRect();
    dropdownMenu.style.top = (buttonRect.bottom + window.scrollY) + 'px';
    dropdownMenu.style.left = buttonRect.left + 'px';
    
    util.activeModalManager.register(dropdownMenu);
    util.setupOutsideClickHandler(dropdownMenu, () => {
      closeDropdown(dropdownMenu);
    }, [alignButton]);
  }

  function closeDropdown(dropdownMenu) {
    dropdownMenu.classList.remove('show');
    dropdownMenu.style.display = 'none';
    document.querySelector('.lite-editor-button.active')?.classList.remove('active');
    isDropdownOpen = false;
    util.activeModalManager.unregister(dropdownMenu);
  }

  // ✅ 기존 정렬 적용 함수 (수정)
  function applyAlignment(alignType, contentArea) {
    try {
      // ✅ 수정: savedRange가 없거나 유효하지 않으면 현재 선택 영역 사용
      if (!savedRange) {
        console.log('[ALIGN] savedRange 없음 - 현재 선택 영역 사용');
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          savedRange = selection.getRangeAt(0).cloneRange();
        } else {
          console.log('[ALIGN] 현재 선택 영역도 없음 - 정렬 중단');
          return;
        }
      }
      
      const alignStyles = {
        'Left': 'left',
        'Center': 'center', 
        'Right': 'right',
        'Full': 'justify'
      };
      
      const alignValue = alignStyles[alignType];
      if (!alignValue) return;
      
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;
      
      // ✅ 선택 영역 복원
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(savedRange);
      
      const selectedText = savedRange.toString().trim();
      
      if (selectedText.length > 0) {
        // ✅ 케이스 1: 선택된 텍스트가 있는 경우
        const spanElement = document.createElement('span');
        spanElement.style.display = 'block';
        spanElement.style.textAlign = alignValue;
        spanElement.textContent = selectedText;
        
        savedRange.deleteContents();
        savedRange.insertNode(spanElement);
        
        const newRange = document.createRange();
        newRange.selectNodeContents(spanElement);
        selection.removeAllRanges();
        selection.addRange(newRange);
        
      } else {
        // ✅ 케이스 2: 커서만 있는 경우 - 블록 전체에 정렬 적용
        const range = selection.getRangeAt(0);
        const currentBlock = util.dom.findClosestBlock(range.startContainer, contentArea);
        
        if (currentBlock) {
          currentBlock.style.textAlign = alignValue;
          
          // 커서 위치 유지
          const newRange = document.createRange();
          newRange.setStart(range.startContainer, range.startOffset);
          newRange.setEnd(range.endContainer, range.endOffset);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      }
      
      // 스크롤 위치 복원
      if (window.scrollX !== scrollX || window.scrollY !== scrollY) {
        window.scrollTo(scrollX, scrollY);
      }
      
      util.editor.dispatchEditorEvent(contentArea);
      
    } catch (e) {
      if (window.errorHandler) {
        errorHandler.logError('AlignPlugin', 'APPLY_ALIGNMENT', e);
      }
    } finally {
      // ✅ 추가: 함수 완료 후 항상 savedRange 초기화
      console.log('[ALIGN] applyAlignment 완료 - savedRange 초기화');
      savedRange = null;
    }
  }

  // ✅ 선택 영역 저장 함수 (수정된 버전)
  function saveSelectionWithNormalization() {
    const selection = window.getSelection();
    if (!selection.rangeCount) {
      console.log('[ALIGN] 선택 영역 없음 - savedRange를 null로 설정');
      savedRange = null;
      return false;
    }
    
    const range = selection.getRangeAt(0);
    savedRange = range.cloneRange();
    
    const selectedText = savedRange.toString().trim();
    console.log(`[ALIGN] 선택 영역 저장됨: "${selectedText}" (${selectedText.length}자)`);
    
    return true;
  }

  // ✅ 헬퍼 함수 추가
  function getLastTextNode(element) {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    let lastNode = null;
    while (walker.nextNode()) {
      lastNode = walker.currentNode;
    }
    
    return lastNode;
  }

  // ✅ 수정: 단축키 등록 (포커스 기반 체크)
  document.addEventListener('keydown', function(e) {
    // ✅ 1. 실제 포커스된 요소 체크 (e.target 대신 document.activeElement 사용)
    const activeElement = document.activeElement;
    const contentArea = activeElement?.closest('[contenteditable="true"]');
    
    if (!contentArea) {
      // ✅ 실제 포커스가 content 영역이 아니면 아무것도 하지 않음
      console.log('[ALIGN] 키 이벤트 무시 - 포커스가 content 영역 밖');
      return;
    }
    
    const editorContainer = contentArea.closest('.lite-editor, .lite-editor-content');
    if (!editorContainer) {
      console.log('[ALIGN] 키 이벤트 무시 - 에디터 컨테이너 밖');
      return;
    }

    const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);

    // ✅ 2. content 영역에 실제 포커스가 있을 때만 단축키 처리
    
    // Cmd+Shift+L - 왼쪽 정렬
    if (e.shiftKey && ((isMac && e.metaKey) || (!isMac && e.ctrlKey)) && !e.altKey && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      e.stopPropagation();
      console.log('[ALIGN] Cmd+Shift+L - 왼쪽 정렬 (포커스 확인됨)');
      executeAlignAction('Left', contentArea, 'Cmd+Shift+L');
      return;
    }
    
    // Cmd+Shift+E - 중앙 정렬
    if (e.shiftKey && ((isMac && e.metaKey) || (!isMac && e.ctrlKey)) && !e.altKey && e.key.toLowerCase() === 'e') {
      e.preventDefault();
      e.stopPropagation();
      console.log('[ALIGN] Cmd+Shift+E - 중앙 정렬 (포커스 확인됨)');
      executeAlignAction('Center', contentArea, 'Cmd+Shift+E');
      return;
    }
    
    // Cmd+Shift+R - 오른쪽 정렬 (✅ 실제 포커스 확인 후에만)
    if (e.shiftKey && ((isMac && e.metaKey) || (!isMac && e.ctrlKey)) && !e.altKey && e.key.toLowerCase() === 'r') {
      e.preventDefault();
      e.stopPropagation();
      console.log('[ALIGN] Cmd+Shift+R - 오른쪽 정렬 (포커스 확인됨)');
      executeAlignAction('Right', contentArea, 'Cmd+Shift+R');
      return;
    }
    
    // Cmd+Shift+J - 양쪽 정렬
    if (e.shiftKey && ((isMac && e.metaKey) || (!isMac && e.ctrlKey)) && !e.altKey && e.key.toLowerCase() === 'j') {
      e.preventDefault();
      e.stopPropagation();
      console.log('[ALIGN] Cmd+Shift+J - 양쪽 정렬 (포커스 확인됨)');
      executeAlignAction('Full', contentArea, 'Cmd+Shift+J');
      return;
    }
  }, true);
})();