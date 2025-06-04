/**
 * LiteEditor Font Color Plugin (개선된 버전)
 * <span style="color:..."> 방식 + IME 조합 지원
 */

(function() {
  const util = window.PluginUtil || {};
  if (!util.selection) {
    console.error('FontColorPlugin: PluginUtil.selection이 필요합니다.');
  }
  
  // 전역 상태 변수
  let savedRange = null;
  let savedCursorPosition = null;  // ✅ 커서 위치 저장 추가
  let isDropdownOpen = false;
  let isComposing = false;  // ✅ IME 조합 상태 추가
  
  /**
   * ✅ IME 조합 상태 관리 (한글 입력 지원)
   */
  function setupIMEHandling(contentArea) {
    contentArea.addEventListener('compositionstart', () => {
      isComposing = true;
      savedRange = null;
      savedCursorPosition = null;  // ✅ 조합 중에는 커서도 저장 무시
    });
    
    contentArea.addEventListener('compositionend', () => {
      isComposing = false;
    });
  }
  
  /**
   * ✅ 간소화된 Enter 키 처리 (IME 조합 고려)
   */
  function setupEnterKeyHandling(contentArea) {
    contentArea.addEventListener('keydown', (e) => {
      // ✅ IME 조합 중에는 Enter 키 제어하지 않음
      if (isComposing) {
        return;
      }
      
      if (e.key === 'Enter' && !e.shiftKey) {
        // ✅ 순수 Enter만 처리, Shift+Enter는 브라우저 기본 동작(<br>) 유지
        const selection = window.getSelection();
        if (selection.rangeCount) {
          const range = selection.getRangeAt(0);
          let parent = range.startContainer;
          
          // ✅ <span style="color:..."> 요소 찾기
          while (parent && parent !== contentArea) {
            if (parent.nodeType === Node.ELEMENT_NODE && 
                parent.tagName === 'SPAN' && 
                parent.style.color) {
              break;
            }
            parent = parent.parentElement;
          }
          
          // ✅ 색상 span 내부에서 Enter 시에만 색상 블록 탈출
          if (parent && parent.tagName === 'SPAN' && parent.style.color) {
            e.preventDefault();
            
            const newP = util.dom.createElement('p');
            newP.innerHTML = '&nbsp;';
            
            const block = util.dom.findClosestBlock(parent, contentArea);
            if (block && block.parentNode) {
              block.parentNode.insertBefore(newP, block.nextSibling);
              util.selection.moveCursorTo(newP.firstChild, 0);
            }
          }
        }
      }
      // ✅ Shift+Enter는 preventDefault() 없이 브라우저 기본 <br> 삽입
    });
  }
  
  /**
   * ✅ <span style="color:..."> 방식으로 색상 적용 (커서 위치 복원 개선)
   */
  function applyFontColor(color, contentArea, colorIndicator) {
    try {
      if (colorIndicator) {
        colorIndicator.style.backgroundColor = color;
      }
      
      // ✅ 포커스 강제 설정
      if (document.activeElement !== contentArea) {
        contentArea.focus({ preventScroll: true });
      }
      
      // ✅ 저장된 선택 영역 또는 커서 위치 복원
      if (savedRange) {
        // 선택 영역이 있는 경우
        const restored = util.selection.restoreSelection(savedRange);
        if (!restored) {
          console.error('FontColorPlugin: 선택 영역 복원 실패');
          return;
        }
      } else if (savedCursorPosition) {
        // ✅ 커서 위치만 있는 경우 복원
        try {
          const range = document.createRange();
          const selection = window.getSelection();
          
          // 저장된 위치가 여전히 유효한지 확인
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
      
      const selection = window.getSelection();
      if (!selection.rangeCount) return;
      
      const range = selection.getRangeAt(0);
      
      if (range.collapsed) {
        // ✅ 커서 위치에서 색상 설정: 개선된 임시 span 생성
        const span = document.createElement('span');
        span.style.color = color;
        span.appendChild(document.createTextNode('\u00A0')); // 임시 문자
        
        range.insertNode(span);
        
        // ✅ 커서를 span 내부 임시 문자에 정확히 배치
        const newRange = document.createRange();
        newRange.setStart(span.firstChild, 0);
        newRange.setEnd(span.firstChild, 1);
        
        selection.removeAllRanges();
        selection.addRange(newRange);
      } else {
        // ✅ 선택된 텍스트에 span 적용
        const span = document.createElement('span');
        span.style.color = color;
        span.appendChild(range.extractContents());
        range.insertNode(span);
        
        // ✅ 커서를 span 끝으로 이동
        range.setStartAfter(span);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      
      util.editor.dispatchEditorEvent(contentArea);
      
    } catch (e) {
      console.error('FontColorPlugin: 색상 적용 실패', e);
    }
  }
  
  /**
   * ✅ 버튼 상태 업데이트 (<span> 기반)
   */
  function updateFontColorButtonState(container) {
    try {
      const selection = window.getSelection();
      if (!selection.rangeCount) {
        container.classList.remove('active');
        return;
      }
      
      const range = selection.getRangeAt(0);
      const currentElement = range.startContainer.nodeType === Node.TEXT_NODE 
        ? range.startContainer.parentElement 
        : range.startContainer;
      
      // ✅ span[style*="color"] 요소 찾기
      const spanElement = currentElement.closest('span[style*="color"]');
      
      if (spanElement) {
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
    }
  }
  
  // ✅ 색상 데이터 로드 함수들 (기존 유지)
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
  
  // ✅ 플러그인 등록
  LiteEditor.registerPlugin('fontColor', {
    customRender: function(toolbar, contentArea) {
      // ✅ IME 및 Enter 키 처리 설정
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
      
      // ✅ 드롭다운 메뉴 생성 (기존 로직 유지하되 간소화)
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
            
            dropdownMenu.classList.remove('show');
            dropdownMenu.style.display = 'none';
            isDropdownOpen = false;
            
            util.activeModalManager.unregister(dropdownMenu);
            applyFontColor(color, contentArea, colorIndicator);
          });
          
          colorGrid.appendChild(colorCell);
        });
      });
      
      document.body.appendChild(dropdownMenu);
      
      // ✅ 선택 영역/커서 위치 저장 개선 (IME 조합 중에는 저장하지 않음)
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
            // ✅ 선택된 텍스트가 있는 경우
            savedRange = util.selection.saveSelection();
            savedCursorPosition = null;
          } else {
            // ✅ 커서만 있는 경우 - 위치 정보 저장
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
      
      // ✅ 클릭 이벤트 (기존 드롭다운 로직 유지)
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
          dropdownMenu.classList.remove('show');
          dropdownMenu.style.display = 'none';
          colorContainer.classList.remove('active');
          isDropdownOpen = false;
          util.activeModalManager.unregister(dropdownMenu);
        } else {
          dropdownMenu.classList.add('show');
          dropdownMenu.style.display = 'block';
          colorContainer.classList.add('active');
          isDropdownOpen = true;
          
          util.layer.setLayerPosition(dropdownMenu, colorContainer);
          
          dropdownMenu.closeCallback = () => {
            dropdownMenu.classList.remove('show');
            dropdownMenu.style.display = 'none';
            colorContainer.classList.remove('active');
            isDropdownOpen = false;
          };
          
          util.activeModalManager.register(dropdownMenu);
          
          util.setupOutsideClickHandler(dropdownMenu, () => {
            dropdownMenu.classList.remove('show');
            dropdownMenu.style.display = 'none';
            colorContainer.classList.remove('active');
            isDropdownOpen = false;
            util.activeModalManager.unregister(dropdownMenu);
            
            if (document.activeElement !== contentArea) {
              contentArea.focus({ preventScroll: true });
            }
          }, [colorContainer]);
        }
      });
      
      // ✅ 버튼 상태 이벤트 설정
      if (!contentArea.hasAttribute('data-font-color-events-setup')) {
        const debouncedUpdateState = util.events.debounce(() => {
          updateFontColorButtonState(colorContainer);
        }, 150);
        
        contentArea.addEventListener('keyup', debouncedUpdateState);
        contentArea.addEventListener('click', debouncedUpdateState);
        
        setTimeout(() => updateFontColorButtonState(colorContainer), 50);
        contentArea.setAttribute('data-font-color-events-setup', 'true');
      }
      
      return colorContainer;
    }
  });
})();