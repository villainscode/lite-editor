/**
 * LiteEditor Alignment Plugin
 * 텍스트 정렬 관련 통합 플러그인
 */

(function() {
  const util = window.PluginUtil || {};
  
  let savedRange = null;
  let isDropdownOpen = false;

  // ✅ 공통 로직을 별도 함수로 추출
  function executeAlignAction(alignType, contentArea, triggerSource = 'unknown') {
    if (!contentArea) return;
    if (!util.utils.canExecutePlugin(contentArea)) return;
    
    contentArea.focus();
    
    // 히스토리 기록
    if (window.LiteEditorHistory) {
      window.LiteEditorHistory.forceRecord(contentArea, `Before Align ${alignType} (${triggerSource})`);
    }
    
    // 단축키 사용 시 현재 선택 영역 저장
    if (triggerSource.includes('Cmd+Shift')) {
      saveSelectionWithNormalization();
    }
    
    applyAlignment(alignType, contentArea);
    
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
        title: `${option.align} Align (${option.shortcut})` // ✅ 툴팁에 단축키 표시
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

  // ✅ 이벤트 설정 함수 분리
  function setupAlignmentEvents(alignButton, dropdownMenu, contentArea) {
    alignButton.addEventListener('mousedown', (e) => {
      saveSelectionWithNormalization();
    });
    
    alignButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const isVisible = dropdownMenu.classList.contains('show');
      
      if (isVisible) {
        closeDropdown(dropdownMenu);
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

  // ✅ 기존 정렬 적용 함수 (수정 없음)
  function applyAlignment(alignType, contentArea) {
    try {
      if (!savedRange) {
        throw new Error('No selection to restore');
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
    }
  }

  // ✅ 선택 영역 저장 함수 (수정 없음)
  function saveSelectionWithNormalization() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return false;
    
    const range = selection.getRangeAt(0);
    savedRange = range.cloneRange();
    return true;
  }

  // ✅ 단축키 등록
  document.addEventListener('keydown', function(e) {
    const contentArea = e.target.closest('[contenteditable="true"]');
    if (!contentArea) return;
    
    const editorContainer = contentArea.closest('.lite-editor, .lite-editor-content');
    if (!editorContainer) return;

    const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);

    // Cmd+Shift+L - 왼쪽 정렬
    if (e.shiftKey && ((isMac && e.metaKey) || (!isMac && e.ctrlKey)) && !e.altKey && e.key.toLowerCase() === 'l') {
      try {
        e.preventDefault();
        e.stopPropagation();
        executeAlignAction('Left', contentArea, 'Cmd+Shift+L');
      } catch (error) {
        if (window.errorHandler) {
          errorHandler.logWarning('AlignPlugin', 'Cmd+Shift+L 처리 중 확장 프로그램 충돌', error);
        }
      }
    }
    
    // Cmd+Shift+E - 중앙 정렬
    if (e.shiftKey && ((isMac && e.metaKey) || (!isMac && e.ctrlKey)) && !e.altKey && e.key.toLowerCase() === 'e') {
      try {
        e.preventDefault();
        e.stopPropagation();
        executeAlignAction('Center', contentArea, 'Cmd+Shift+E');
      } catch (error) {
        if (window.errorHandler) {
          errorHandler.logWarning('AlignPlugin', 'Cmd+Shift+E 처리 중 확장 프로그램 충돌', error);
        }
      }
    }
    
    // Cmd+Shift+R - 오른쪽 정렬
    if (e.shiftKey && ((isMac && e.metaKey) || (!isMac && e.ctrlKey)) && !e.altKey && e.key.toLowerCase() === 'r') {
      try {
        e.preventDefault();
        e.stopPropagation();
        executeAlignAction('Right', contentArea, 'Cmd+Shift+R');
      } catch (error) {
        if (window.errorHandler) {
          errorHandler.logWarning('AlignPlugin', 'Cmd+Shift+R 처리 중 확장 프로그램 충돌', error);
        }
      }
    }
    
    // Cmd+Shift+J - 양쪽 정렬
    if (e.shiftKey && ((isMac && e.metaKey) || (!isMac && e.ctrlKey)) && !e.altKey && e.key.toLowerCase() === 'j') {
      try {
        e.preventDefault();
        e.stopPropagation();
        executeAlignAction('Full', contentArea, 'Cmd+Shift+J');
      } catch (error) {
        if (window.errorHandler) {
          errorHandler.logWarning('AlignPlugin', 'Cmd+Shift+J 처리 중 확장 프로그램 충돌', error);
        }
      }
    }
  }, true);
})();