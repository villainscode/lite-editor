/**
 * LiteEditor Font Color Plugin
 * 글자 색상 플러그인
 * 수정: 선택 블록 유지 기능 추가 + Enter/Shift+Enter 처리 + 커서 위치 컬러 설정
 */

(function() {
  // PluginUtil 참조
  const util = window.PluginUtil || {};
  if (!util.selection) {
    console.error('FontColorPlugin: PluginUtil.selection이 필요합니다.');
  }
  
  // 전역 상태 변수
  let savedRange = null;          // 임시로 저장된 선택 영역
  let isDropdownOpen = false;     // 드롭다운 열림 상태
  let savedCursorPosition = null;  // 커서 위치 저장용
  
  /**
   * 색상 데이터 스크립트 로드 함수
   */
  function loadColorScript(callback) {
    util.dataLoader.loadExternalScript('js/data/colors.js', 'LiteEditorColorData', callback);
  }
  
  /**
   * 글자 색상 데이터 로드 함수
   */
  function loadFontColorData() {
    const defaultColors = [
      '#000000', '#666666', '#999999', '#b7b7b7', '#d9d9d9', '#efefef', '#ffffff',
      '#ff0000', '#ff8000', '#ffff00', '#80ff00', '#00ff00', '#00ff80', '#00ffff',
      '#0080ff', '#0000ff', '#8000ff', '#ff00ff', '#ff0080'
    ];
    return util.dataLoader.loadColorData('font', defaultColors);
  }
  
  /**
   * 색상 적용 함수
   */
  function applyFontColor(color, contentArea, colorIndicator) {
    try {
      if (colorIndicator) {
        colorIndicator.style.backgroundColor = color;
      }
      
      if (savedRange) {
        // 케이스 1: 선택 영역이 있는 경우
        const scrollPosition = util.scroll.savePosition();
        
        try {
          contentArea.focus({ preventScroll: true });
        } catch (e) {
          contentArea.focus();
        }
        
        const restored = util.selection.restoreSelection(savedRange);
        if (!restored) {
          errorHandler.logError('FontColorPlugin', errorHandler.codes.PLUGINS.FONT.APPLY, '선택 영역 복원 실패');
          return;
        }
        
        // 선택된 텍스트에 폰트 컬러 적용
        document.execCommand('foreColor', false, color);
        
        util.scroll.restorePosition(scrollPosition);
        
      } else {
        // 케이스 2: 커서 위치 모드
        if (document.activeElement !== contentArea) {
          try {
            contentArea.focus({ preventScroll: true });
          } catch (e) {
            contentArea.focus();
          }
        }
        
        // 저장된 커서 위치로 복원
        if (savedCursorPosition) {
          try {
            const range = document.createRange();
            const sel = window.getSelection();
            
            // 저장된 위치가 여전히 유효한지 확인
            if (savedCursorPosition.startContainer && 
                savedCursorPosition.startContainer.parentNode &&
                contentArea.contains(savedCursorPosition.startContainer)) {
              
              range.setStart(savedCursorPosition.startContainer, savedCursorPosition.startOffset);
              range.setEnd(savedCursorPosition.endContainer, savedCursorPosition.endOffset);
              sel.removeAllRanges();
              sel.addRange(range);
            } else {
              // 저장된 위치가 유효하지 않으면 에디터 끝으로 이동
              const lastTextNode = getLastTextNode(contentArea);
              if (lastTextNode) {
                range.setStart(lastTextNode, lastTextNode.length);
                range.setEnd(lastTextNode, lastTextNode.length);
                sel.removeAllRanges();
                sel.addRange(range);
              }
            }
          } catch (e) {
            console.error('FontColorPlugin: 커서 위치 복원 실패', e);
          }
        }
        
        // execCommand 실행
        const success = document.execCommand('foreColor', false, color);
      }
      
      util.editor.dispatchEditorEvent(contentArea);
      
    } catch (e) {
      errorHandler.logError('FontColorPlugin', errorHandler.codes.PLUGINS.FONT.APPLY, e);
    }
  }
  
  // 글자 색상 플러그인 등록
  LiteEditor.registerPlugin('fontColor', {
    customRender: function(toolbar, contentArea) {
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
      
      // 버튼 상태 업데이트 함수 (모든 브라우저 지원)
      function updateFontColorButtonState() {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const currentElement = range.startContainer.nodeType === Node.TEXT_NODE 
            ? range.startContainer.parentElement 
            : range.startContainer;
          
          // 모든 브라우저 지원: font[color]와 span[style*="color:"] 모두 감지
          const fontElement = currentElement.closest('font[color], span[style*="color:"]');
          
          if (fontElement) {
            let hasColor = false;
            
            // font 태그인 경우
            if (fontElement.tagName === 'FONT' && fontElement.color) {
              hasColor = true;
            }
            // span 태그인 경우  
            else if (fontElement.tagName === 'SPAN' && fontElement.style.color) {
              hasColor = true;
            }
            
            if (hasColor) {
              colorContainer.classList.add('active');
            } else {
              colorContainer.classList.remove('active');
            }
          } else {
            colorContainer.classList.remove('active');
          }
        }
      }
      
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
            
            // 1. 드롭다운 닫기
            dropdownMenu.classList.remove('show');
            dropdownMenu.style.display = 'none';
            isDropdownOpen = false;
            util.activeModalManager.unregister(dropdownMenu);
            
            // 2. 폰트 컬러 적용
            applyFontColor(color, contentArea, colorIndicator);
            
            // 3. ✅ 가장 마지막에 버튼 활성화 (다른 로직들이 제거하지 못하도록)
            setTimeout(() => {
              colorContainer.classList.add('active');
            }, 50); // 약간의 딜레이로 다른 이벤트들이 끝난 후 실행
          });
          
          colorGrid.appendChild(colorCell);
        });
      });
      
      document.body.appendChild(dropdownMenu);
      
      // mousedown에서 선택 영역 저장
      colorContainer.addEventListener('mousedown', (e) => {
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
      
      colorContainer.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 포커스 강제 복원
        if (document.activeElement !== contentArea) {
          try {
            contentArea.focus({ preventScroll: true });
          } catch (e) {
            contentArea.focus();
          }
        }
        
        const isVisible = dropdownMenu.classList.contains('show');
        
        if (!isVisible) {
          if (util.activeModalManager) {
            util.activeModalManager.closeAll();
          }
          
          const otherModals = document.querySelectorAll('.lite-editor-dropdown-menu.show');
          otherModals.forEach(modal => {
            if (modal !== dropdownMenu) {
              modal.classList.remove('show');
              modal.style.display = 'none';
            }
          });
        }
        
        if (isVisible) {
          // 🔧 수정: 드롭다운 닫기 - active 제거하지 않음
          dropdownMenu.classList.remove('show');
          dropdownMenu.style.display = 'none';
          isDropdownOpen = false;
          util.activeModalManager.unregister(dropdownMenu);
          
          // ✅ 현재 상태에 맞게 업데이트
          setTimeout(() => updateFontColorButtonState(), 10);
        } else {
          // 드롭다운 열기
          dropdownMenu.classList.add('show');
          dropdownMenu.style.display = 'block';
          colorContainer.classList.add('active'); // 드롭다운 열 때는 active 설정
          isDropdownOpen = true;
          
          util.layer.setLayerPosition(dropdownMenu, colorContainer);
          
          dropdownMenu.closeCallback = () => {
            dropdownMenu.classList.remove('show');
            dropdownMenu.style.display = 'none';
            isDropdownOpen = false;
            
            // ✅ 현재 상태에 맞게 업데이트
            setTimeout(() => updateFontColorButtonState(), 10);
          };
          
          util.activeModalManager.register(dropdownMenu);
          
          util.setupOutsideClickHandler(dropdownMenu, () => {
            dropdownMenu.classList.remove('show');
            dropdownMenu.style.display = 'none';
            isDropdownOpen = false;
            util.activeModalManager.unregister(dropdownMenu);
            
            // 드롭다운 닫힐 때도 포커스 유지
            if (document.activeElement !== contentArea) {
              contentArea.focus({ preventScroll: true });
            }
            
            // ✅ 현재 상태에 맞게 업데이트
            setTimeout(() => updateFontColorButtonState(), 10);
          }, [colorContainer]);
        }
      });
      
      // 이벤트 리스너 등록 (한 번만)
      if (!contentArea.hasAttribute('data-font-color-events-setup')) {
        // 즉시 업데이트 함수
        const immediateUpdate = () => updateFontColorButtonState();
        
        // 디바운스 함수
        const debouncedUpdate = util.events?.debounce ? 
          util.events.debounce(immediateUpdate, 100) : immediateUpdate;
        
        // 이벤트 리스너 등록
        contentArea.addEventListener('mouseup', immediateUpdate);
        contentArea.addEventListener('click', immediateUpdate);
        contentArea.addEventListener('keyup', debouncedUpdate);
        contentArea.addEventListener('keydown', (e) => {
          if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
            setTimeout(immediateUpdate, 10);
          }
        });
        
        // 선택 변경 감지
        const selectionChangeHandler = () => {
          const selection = window.getSelection();
          if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const container = range.commonAncestorContainer;
            const element = container.nodeType === Node.TEXT_NODE 
              ? container.parentElement : container;
            
            if (contentArea.contains(element)) {
              immediateUpdate();
            }
          }
        };
        
        document.addEventListener('selectionchange', selectionChangeHandler);
        
        // 초기 상태 업데이트
        setTimeout(immediateUpdate, 50);
        
        contentArea.setAttribute('data-font-color-events-setup', 'true');
        
        // 정리 함수
        contentArea._fontColorEventCleanup = () => {
          document.removeEventListener('selectionchange', selectionChangeHandler);
        };
      }
      
      return colorContainer;
    }
  });
})();

// 헬퍼 함수: 마지막 텍스트 노드 찾기
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
