/**
 * LiteEditor Highlight Plugin - highlight-bak.js 기반 구현
 */

(function() {
  const util = window.PluginUtil || {};
  
  // 전역 상태 관리
  let savedRange = null;
  let savedCursorPosition = null;
  let isDropdownOpen = false;
  
  /**
   * 기본 색상 데이터 로드
   */
  function loadHighlightColors() {
    const defaultColors = [
      '#ffffcc', '#ffff00', '#ffecb3', '#ffcc00', '#d0f0c0', '#daf2f9', '#b1d6f7',
      '#ffd9cc', '#ffccff', '#e6d3ff', '#ccccff', '#e6ffcc', '#d9d9d9', '#bdbdbd'
    ];
    return util.dataLoader?.loadColorData ? 
           util.dataLoader.loadColorData('highlight', defaultColors) : 
           defaultColors;
  }
  
  /**
   * 하이라이트 블록 내부인지 확인 (span 태그 사용)
   */
  function isInHighlightBlock(contentArea) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return false;
    
    const range = selection.getRangeAt(0);
    let element = range.startContainer;
    
    if (element.nodeType === Node.TEXT_NODE) {
      element = element.parentElement;
    }
    
    while (element && element !== contentArea) {
      if (element.tagName === 'SPAN' && element.style.backgroundColor) {
        return element;
      }
      element = element.parentElement;
    }
    
    return false;
  }
  
  /**
   * 버튼 active 상태 업데이트
   */
  function updateButtonState(container, contentArea) {
    const highlightElement = isInHighlightBlock(contentArea);
    
    if (highlightElement) {
      container.classList.add('active');
      const colorIndicator = container.querySelector('.lite-editor-color-indicator');
      if (colorIndicator && highlightElement.style.backgroundColor) {
        colorIndicator.style.backgroundColor = highlightElement.style.backgroundColor;
        colorIndicator.style.border = 'none';
      }
    } else {
      container.classList.remove('active');
    }
  }
  
  /**
   * Enter 키 처리 설정 (highlight-bak.js 방식)
   */
  function setupEnterKeyHandling(contentArea) {
    contentArea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const selection = util.selection.getSafeSelection();
        if (!selection || !selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        const startContainer = range.startContainer;
        
        let highlightSpan = null;
        if (startContainer.nodeType === Node.TEXT_NODE) {
          highlightSpan = startContainer.parentElement;
        } else {
          highlightSpan = startContainer;
        }
        
        // 하이라이트 span 찾기
        while (highlightSpan && highlightSpan !== contentArea) {
          if (highlightSpan.tagName === 'SPAN' && 
              highlightSpan.style.backgroundColor) {
            break;
          }
          highlightSpan = highlightSpan.parentElement;
        }
        
        if (highlightSpan && highlightSpan.tagName === 'SPAN' && highlightSpan.style.backgroundColor) {
          if (e.shiftKey) {
            // ✅ Shift + Enter: 하이라이트 유지 (기본 동작)
            return; // fontColor.js와 동일하게 단순화
          } else {
            // Enter: 하이라이트 영역 밖으로 나가기
            e.preventDefault();
            
            const newP = util.dom.createElement('p');
            newP.appendChild(document.createTextNode('\u00A0'));
            
            const parentBlock = util.dom.findClosestBlock(highlightSpan, contentArea);
            if (parentBlock && parentBlock.parentNode) {
              parentBlock.parentNode.insertBefore(newP, parentBlock.nextSibling);
              util.selection.moveCursorTo(newP.firstChild, 0);
            }
            
            util.editor.dispatchEditorEvent(contentArea);
          }
        }
      }
    });
  }
  
  /**
   * 하이라이트 적용 함수 (highlight-bak.js 방식)
   */
  function applyHighlightColor(color, contentArea, colorIndicator) {
    try {
      if (colorIndicator) {
        colorIndicator.style.backgroundColor = color;
        colorIndicator.style.border = 'none';
      }
      
      if (savedRange) {
        // ✅ 선택 영역이 있는 경우
        const scrollPosition = util.scroll.savePosition();
        
        try {
          contentArea.focus({ preventScroll: true });
        } catch (e) {
          contentArea.focus();
        }
        
        const restored = util.selection.restoreSelection(savedRange);
        if (!restored) {
          console.error('하이라이트: 선택 영역 복원 실패');
          return;
        }
        
        // ✅ execCommand 사용 (span 태그 자동 생성)
        document.execCommand('hiliteColor', false, color);
        
        util.scroll.restorePosition(scrollPosition);
        
      } else {
        // ✅ 커서 위치 모드
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
            
            if (savedCursorPosition.startContainer && 
                savedCursorPosition.startContainer.parentNode &&
                contentArea.contains(savedCursorPosition.startContainer)) {
              
              range.setStart(savedCursorPosition.startContainer, savedCursorPosition.startOffset);
              range.setEnd(savedCursorPosition.endContainer, savedCursorPosition.endOffset);
              sel.removeAllRanges();
              sel.addRange(range);
            }
          } catch (e) {
            console.error('커서 위치 복원 실패:', e);
          }
        }
        
        // ✅ execCommand 사용
        const success = document.execCommand('hiliteColor', false, color);
        console.log('하이라이트 적용 결과:', success);
      }
      
      util.editor.dispatchEditorEvent(contentArea);
      
    } catch (e) {
      console.error('하이라이트 적용 중 오류:', e);
    }
  }

  /**
   * 플러그인 등록
   */
  LiteEditor.registerPlugin('highlight', {
    customRender: function(toolbar, contentArea) {
      // Enter 키 처리 설정
      setupEnterKeyHandling(contentArea);
      
      const container = util.dom.createElement('div', {
        className: 'lite-editor-button',
        title: 'Highlight'
      });
      
      // 아이콘
      const icon = util.dom.createElement('i', {
        className: 'material-icons',
        textContent: 'format_color_fill'
      });
      container.appendChild(icon);
      
      // 색상 인디케이터
      const colorIndicator = util.dom.createElement('span', {
        className: 'lite-editor-color-indicator'
      }, {
        backgroundColor: 'transparent',
        border: '1px solid #ccc'
      });
      container.appendChild(colorIndicator);
      
      // 드롭다운 레이어 생성
      const dropdown = util.dom.createElement('div', {
        className: 'lite-editor-dropdown-menu',
        id: 'highlight-dropdown-' + Math.random().toString(36).substr(2, 9)
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
      dropdown.appendChild(colorGrid);
      
      // 색상 셀들 생성
      const colors = loadHighlightColors();
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
          
          dropdown.classList.remove('show');
          dropdown.style.display = 'none';
          container.classList.remove('active');
          isDropdownOpen = false;
          
          util.activeModalManager?.unregister?.(dropdown);
          
          // 하이라이트 적용
          applyHighlightColor(color, contentArea, colorIndicator);
          
          // 버튼 상태 업데이트
          setTimeout(() => {
            updateButtonState(container, contentArea);
          }, 10);
        });
        
        colorGrid.appendChild(colorCell);
      });
      
      document.body.appendChild(dropdown);
      
      // mousedown에서 선택 영역/커서 위치 저장
      container.addEventListener('mousedown', (e) => {
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
      
      // 아이콘 클릭 이벤트
      container.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!savedRange && !savedCursorPosition) {
          console.log('선택 영역이나 커서 위치가 없습니다.');
          return;
        }
        
        if (document.activeElement !== contentArea) {
          try {
            contentArea.focus({ preventScroll: true });
          } catch (e) {
            contentArea.focus();
          }
        }
        
        const isVisible = dropdown.classList.contains('show');
        
        if (!isVisible && util.activeModalManager) {
          util.activeModalManager.closeAll();
        }
        
        if (isVisible) {
          dropdown.classList.remove('show');
          dropdown.style.display = 'none';
          container.classList.remove('active');
          isDropdownOpen = false;
          util.activeModalManager?.unregister?.(dropdown);
        } else {
          setTimeout(() => {
            dropdown.classList.add('show');
            dropdown.style.display = 'block';
            container.classList.add('active');
            isDropdownOpen = true;
            
            util.layer?.setLayerPosition?.(dropdown, container);
            util.activeModalManager?.register?.(dropdown);
            
            util.setupOutsideClickHandler?.(dropdown, () => {
              dropdown.classList.remove('show');
              dropdown.style.display = 'none';
              container.classList.remove('active');
              isDropdownOpen = false;
              util.activeModalManager?.unregister?.(dropdown);
            }, [container]);
          }, 10);
        }
      });
      
      // 버튼 상태 업데이트 이벤트들
      ['keyup', 'mouseup', 'click'].forEach(eventType => {
        contentArea.addEventListener(eventType, () => {
          updateButtonState(container, contentArea);
        });
      });
      
      return container;
    }
  });
})();