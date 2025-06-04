/**
 * LiteEditor Font Color Plugin
 * PRD 기준 구현: <span style="color:..."> 방식 + IME 조합 지원 + Enter/Shift+Enter 처리
 */

(function() {
  const util = window.PluginUtil || {};
  if (!util.selection) {
    console.error('FontColorPlugin: PluginUtil.selection이 필요합니다.');
    return;
  }
  
  // 1단계: 전역 상태 관리
  let savedRange = null;           // 선택 영역 저장
  let savedCursorPosition = null;  // 커서 위치 저장
  let isDropdownOpen = false;      // 드롭다운 상태
  let isComposing = false;         // IME 조합 상태
  
  /**
   * 2단계: IME 조합 상태 관리 (FR4, FR9)
   * 한글 입력 시 조합 상태를 추적하여 keydown 이벤트 간섭 방지
   */
  function setupIMEHandling(contentArea) {
    contentArea.addEventListener('compositionstart', () => {
      isComposing = true;
      // 조합 중에는 커서 저장을 무시하여 IME 상태 보호
      savedRange = null;
      savedCursorPosition = null;
    });
    
    contentArea.addEventListener('compositionend', () => {
      isComposing = false;
    });
  }
  
  /**
   * 3단계: Enter/Shift+Enter 키 처리 (수정됨)
   * Shift+Enter에서 색상 span 내부 위치 보장
   */
  function setupEnterKeyHandling(contentArea) {
    contentArea.addEventListener('keydown', (e) => {
      if (isComposing) {
        return;
      }
      
      if (e.key === 'Enter') {
        const sel = window.getSelection();
        if (!sel.rangeCount) return;
        
        const range = sel.getRangeAt(0);
        let parent = range.startContainer;
        
        while (parent && parent !== contentArea) {
          if (parent.nodeType === Node.ELEMENT_NODE &&
              parent.tagName === 'SPAN' &&
              parent.style.color) {
            break;
          }
          parent = parent.parentElement;
        }
        
        if (parent && parent.tagName === 'SPAN') {
          e.preventDefault();
          
          if (e.shiftKey) {
            // ✅ Shift+Enter: 색상 span 내부에 <br> + 임시 텍스트 삽입
            const br = document.createElement('br');
            const textNode = document.createTextNode('\u00A0'); // 임시 문자
            
            range.deleteContents();
            range.insertNode(br);
            
            // ✅ <br> 다음에 임시 텍스트 노드 삽입 (span 내부 보장)
            range.setStartAfter(br);
            range.insertNode(textNode);
            
            // ✅ 커서를 임시 텍스트 시작 위치에 배치
            range.setStart(textNode, 0);
            range.setEnd(textNode, 1);
            sel.removeAllRanges();
            sel.addRange(range);
            
          } else {
            // Enter: 색상 블록 탈출
            const newP = util.dom.createElement('p');
            newP.appendChild(document.createTextNode('\u00A0'));
            
            const block = util.dom.findClosestBlock(parent, contentArea);
            if (block && block.parentNode) {
              block.parentNode.insertBefore(newP, block.nextSibling);
              util.selection.moveCursorTo(newP.firstChild, 0);
            }
          }
          
          util.editor.dispatchEditorEvent(contentArea);
          
        } else if (!e.shiftKey) {
          e.preventDefault();
          
          const newP = util.dom.createElement('p');
          newP.appendChild(document.createTextNode('\u00A0'));
          range.deleteContents();
          range.insertNode(newP);
          util.selection.moveCursorTo(newP.firstChild, 0);
          
          util.editor.dispatchEditorEvent(contentArea);
        }
      }
    });
  }
  
  /**
   * 4단계: 색상 적용 로직 (FR1, FR5, FR6)
   * <span style="color:..."> 방식으로 색상 적용
   */
  function applyFontColor(color, contentArea, colorIndicator) {
    try {
      // 색상 인디케이터 업데이트
      if (colorIndicator) {
        colorIndicator.style.backgroundColor = color;
      }
      
      // 포커스 설정
      if (document.activeElement !== contentArea) {
        contentArea.focus({ preventScroll: true });
      }
      
      // 5단계: 저장된 선택 영역 또는 커서 위치 복원
      if (savedRange) {
        const restored = util.selection.restoreSelection(savedRange);
        if (!restored) {
          console.warn('FontColorPlugin: 선택 영역 복원 실패');
          return;
        }
      } else if (savedCursorPosition) {
        try {
          const range = document.createRange();
          const selection = window.getSelection();
          
          // 저장된 위치 유효성 검사
          if (savedCursorPosition.startContainer && 
              savedCursorPosition.startContainer.parentNode &&
              contentArea.contains(savedCursorPosition.startContainer)) {
            
            range.setStart(savedCursorPosition.startContainer, savedCursorPosition.startOffset);
            range.setEnd(savedCursorPosition.endContainer, savedCursorPosition.endOffset);
            selection.removeAllRanges();
            selection.addRange(range);
          } else {
            console.warn('FontColorPlugin: 저장된 커서 위치가 유효하지 않음');
            return;
          }
        } catch (e) {
          console.error('FontColorPlugin: 커서 위치 복원 실패', e);
          return;
        }
      }
      
      // 현재 선택 영역 확인
      const selection = window.getSelection();
      if (!selection.rangeCount) return;
      
      const range = selection.getRangeAt(0);
      
      if (range.collapsed) {
        // 커서 위치에서 색상 설정
        const span = document.createElement('span');
        span.style.color = color;
        span.appendChild(document.createTextNode('\u00A0')); // 임시 문자
        
        range.insertNode(span);
        
        // 커서를 span 내부에 정확히 배치
        const newRange = document.createRange();
        newRange.setStart(span.firstChild, 0);
        newRange.setEnd(span.firstChild, 1);
        
        selection.removeAllRanges();
        selection.addRange(newRange);
      } else {
        // 선택된 텍스트에 span 적용
        const span = document.createElement('span');
        span.style.color = color;
        span.appendChild(range.extractContents());
        range.insertNode(span);
        
        // 커서를 span 끝으로 이동
        range.setStartAfter(span);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      
      // 에디터 이벤트 발생
      util.editor.dispatchEditorEvent(contentArea);
      
    } catch (e) {
      console.error('FontColorPlugin: 색상 적용 실패', e);
    }
  }
  
  /**
   * 6단계: 버튼 활성화 상태 관리 (FR7, FR11) - 개선됨
   * 모든 조건에 따른 .active 상태 관리
   */
  function updateFontColorButtonState(container) {
    try {
      const selection = window.getSelection();
      if (!selection.rangeCount) {
        container.classList.remove('active');
        container.style.backgroundColor = '';
        container.style.color = '';
        return;
      }
      
      const range = selection.getRangeAt(0);
      const currentElement = range.startContainer.nodeType === Node.TEXT_NODE 
        ? range.startContainer.parentElement 
        : range.startContainer;
      
      // 색상 span 요소 찾기 (정확한 검사)
      let element = currentElement;
      let hasFontColor = false;
      
      while (element && element !== document.body) {
        if (element.tagName === 'SPAN' && 
            element.style && 
            element.style.color && 
            element.style.color.trim() !== '') {
          hasFontColor = true;
          break;
        }
        element = element.parentElement;
      }
      
      if (hasFontColor) {
        container.classList.add('active');
        container.style.backgroundColor = '#e9e9e9';
        container.style.color = '#1a73e8';
      } else {
        container.classList.remove('active');
        container.style.backgroundColor = '';
        container.style.color = '';
      }
      
    } catch (e) {
      console.error('FontColorPlugin: 버튼 상태 업데이트 실패', e);
      container.classList.remove('active');
      container.style.backgroundColor = '';
      container.style.color = '';
    }
  }
  
  /**
   * ✅ 다른 툴바 아이콘 클릭 감지 함수 (새로 추가)
   */
  function setupGlobalToolbarClickHandler(colorContainer) {
    document.addEventListener('click', (e) => {
      const clickedButton = e.target.closest('.lite-editor-button');
      
      // 다른 툴바 버튼 클릭 시 font color .active 해제
      if (clickedButton && 
          clickedButton !== colorContainer && 
          !clickedButton.closest('.lite-editor-dropdown-menu')) {
        
        colorContainer.classList.remove('active');
        colorContainer.style.backgroundColor = '';
        colorContainer.style.color = '';
      }
    });
  }
  
  /**
   * 색상 데이터 로드 함수들 (기존 유지)
   */
  function loadColorScript(callback) {
    util.dataLoader.loadExternalScript('js/data/colors.js', 'LiteEditorColorData', callback);
  }
  
  function loadFontColorData() {
    const defaultColors = [
      '#000000', '#666666', '#999999', '#b7b7b7', '#d9d9d9', '#efefef', '#ffffff',
      '#ff0000', '#ff8000', '#ffff00', '#80ff00', '#00ff00', '#00ff80', '#00ffff',
      '#0080ff', '#0000ff', '#8000ff', '#ff00ff', '#ff0080'
    ];
    return util.dataLoader.loadColorData('font', defaultColors);
  }
  
  // 8단계: 플러그인 등록 및 통합 - 수정됨
  LiteEditor.registerPlugin('fontColor', {
    customRender: function(toolbar, contentArea) {
      // IME 및 Enter 키 처리 설정
      setupIMEHandling(contentArea);
      setupEnterKeyHandling(contentArea);
      
      const colorContainer = util.dom.createElement('div', {
        className: 'lite-editor-button',
        title: 'Font Color'
      });
      
      const icon = util.dom.createElement('i', {
        className: 'material-icons',
        textContent: 'palette'
      });
      colorContainer.appendChild(icon);
      
      const colorIndicator = util.dom.createElement('span', {
        className: 'lite-editor-color-indicator'
      }, {
        backgroundColor: '#000000'
      });
      colorContainer.appendChild(colorIndicator);
      
      // ✅ 다른 툴바 버튼 클릭 감지 설정
      setupGlobalToolbarClickHandler(colorContainer);
      
      // 드롭다운 메뉴 생성 (기존과 동일)
      const dropdownMenu = util.dom.createElement('div', {
        className: 'lite-editor-dropdown-menu',
        id: 'font-color-dropdown-' + Math.random().toString(36).substr(2, 9)
      }, {
        position: 'absolute',
        zIndex: '99999',
        display: 'none',
        backgroundColor: '#fff',
        border: '1px solid #ccc',
        borderRadius: '4px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        padding: '8px 0'
      });
      
      const colorGrid = util.dom.createElement('div', {
        className: 'lite-editor-color-grid'
      });
      dropdownMenu.appendChild(colorGrid);
      
      // 색상 셀 생성
      loadColorScript(function() {
        const colors = loadFontColorData();
        
        colors.forEach(color => {
          const colorCell = util.dom.createElement('div', {
            className: 'lite-editor-color-cell',
            'data-color': color
          }, {
            backgroundColor: color
          });
          
          colorCell.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // 드롭다운 닫기
            dropdownMenu.classList.remove('show');
            dropdownMenu.style.display = 'none';
            isDropdownOpen = false;
            
            util.activeModalManager.unregister(dropdownMenu);
            
            // 색상 적용
            applyFontColor(color, contentArea, colorIndicator);
            
            // ✅ 색상 적용 후 즉시 상태 업데이트 (약간의 지연으로 DOM 반영 대기)
            setTimeout(() => {
              updateFontColorButtonState(colorContainer);
            }, 50);
          });
          
          colorGrid.appendChild(colorCell);
        });
      });
      
      document.body.appendChild(dropdownMenu);
      
      // 선택 영역/커서 위치 저장 (기존과 동일)
      colorContainer.addEventListener('mousedown', (e) => {
        if (isComposing) {
          savedRange = null;
          savedCursorPosition = null;
          return;
        }
        
        const selection = util.selection.getSafeSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const selectedText = range.toString().trim();
          
          if (selectedText) {
            savedRange = util.selection.saveSelection();
            savedCursorPosition = null;
          } else {
            savedRange = null;
            savedCursorPosition = {
              startContainer: range.startContainer,
              startOffset: range.startOffset,
              endContainer: range.endContainer,
              endOffset: range.endOffset
            };
          }
        } else {
          savedRange = null;
          savedCursorPosition = null;
        }
      });
      
      // ✅ 클릭 이벤트 - 드롭다운 토글 (개선됨)
      colorContainer.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (document.activeElement !== contentArea) {
          contentArea.focus({ preventScroll: true });
        }
        
        const isVisible = dropdownMenu.classList.contains('show');
        
        if (!isVisible) {
          if (util.activeModalManager) {
            util.activeModalManager.closeAll();
          }
        }
        
        if (isVisible) {
          // 드롭다운 닫기
          dropdownMenu.classList.remove('show');
          dropdownMenu.style.display = 'none';
          isDropdownOpen = false;
          util.activeModalManager.unregister(dropdownMenu);
          
          // ✅ 드롭다운 닫을 때 상태 업데이트 (색상 span 내부인지 확인)
          setTimeout(() => {
            updateFontColorButtonState(colorContainer);
          }, 10);
          
        } else {
          // ✅ 드롭다운 열기 - .active 상태 설정
          dropdownMenu.classList.add('show');
          dropdownMenu.style.display = 'block';
          colorContainer.classList.add('active');
          colorContainer.style.backgroundColor = '#e9e9e9';
          colorContainer.style.color = '#1a73e8';
          isDropdownOpen = true;
          
          util.layer.setLayerPosition(dropdownMenu, colorContainer);
          
          dropdownMenu.closeCallback = () => {
            dropdownMenu.classList.remove('show');
            dropdownMenu.style.display = 'none';
            isDropdownOpen = false;
            
            // ✅ 드롭다운 닫힐 때 상태 업데이트
            setTimeout(() => {
              updateFontColorButtonState(colorContainer);
            }, 10);
          };
          
          util.activeModalManager.register(dropdownMenu);
          
          util.setupOutsideClickHandler(dropdownMenu, () => {
            dropdownMenu.classList.remove('show');
            dropdownMenu.style.display = 'none';
            isDropdownOpen = false;
            util.activeModalManager.unregister(dropdownMenu);
            
            // ✅ 외부 클릭으로 닫힐 때도 상태 업데이트
            setTimeout(() => {
              updateFontColorButtonState(colorContainer);
            }, 10);
            
            if (document.activeElement !== contentArea) {
              contentArea.focus({ preventScroll: true });
            }
          }, [colorContainer]);
        }
      });
      
      // 버튼 상태 이벤트 설정 (기존 + 개선됨)
      if (!contentArea.hasAttribute('data-font-color-events-setup')) {
        const debouncedUpdateState = util.events.debounce(() => {
          updateFontColorButtonState(colorContainer);
        }, 150);
        
        // ✅ 이벤트 리스너 추가
        contentArea.addEventListener('keyup', debouncedUpdateState);
        contentArea.addEventListener('click', debouncedUpdateState);
        contentArea.addEventListener('keydown', (e) => {
          // ✅ Enter로 새 P 생성 시 즉시 상태 업데이트
          if (e.key === 'Enter' && !e.shiftKey) {
            setTimeout(debouncedUpdateState, 10);
          }
        });
        
        // 초기 상태 업데이트
        setTimeout(() => updateFontColorButtonState(colorContainer), 50);
        contentArea.setAttribute('data-font-color-events-setup', 'true');
      }
      
      return colorContainer;
    }
  });
})();