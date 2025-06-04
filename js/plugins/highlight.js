/**
 * LiteEditor Highlight Plugin - highlight-bak.js 방식 적용
 */

(function() {
  const util = window.PluginUtil || {};

  if (!util.selection) {
    console.error('HighlightPlugin: PluginUtil.selection이 필요합니다.');
    return;
  }
  
  // 상태 관리
  const state = {
    savedRange: null,
    savedCursorPosition: null
  };
  
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
   * 🔧 하이라이트 요소 감지 함수 (highlight-bak.js 방식)
   */
  function isHighlightElement(element) {
    return element && element.tagName === 'SPAN' && element.style.backgroundColor;
  }
  
  /**
   * 🔧 줄바꿈 처리 함수 (code.js 방식 적용)
   */
  function insertLineBreakIfNeeded(highlightElement) {
    const nextNode = highlightElement.nextSibling;
    
    if (nextNode && nextNode.nodeType === Node.TEXT_NODE) {
      const nextText = nextNode.textContent;
      
      if (nextText && !nextText.startsWith(' ') && nextText.trim()) {
        const br = document.createElement('br');
        highlightElement.parentNode.insertBefore(br, nextNode);
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * 🔧 Enter/Shift+Enter 키 처리 (highlight-bak.js + demo 방식)
   */
  function setupEnterKeyHandling(contentArea) {
    contentArea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        const startContainer = range.startContainer;
        
        let highlightSpan = null;
        if (startContainer.nodeType === Node.TEXT_NODE) {
          highlightSpan = startContainer.parentElement;
        } else {
          highlightSpan = startContainer;
        }
        
        // 하이라이트 요소 찾기
        while (highlightSpan && highlightSpan !== contentArea) {
          if (isHighlightElement(highlightSpan)) {
            break;
          }
          highlightSpan = highlightSpan.parentElement;
        }
        
        // ✅ 하이라이트 내부에서만 처리 (demo 방식)
        if (highlightSpan && isHighlightElement(highlightSpan)) {
          if (e.shiftKey) {
            // ✅ Shift+Enter: 기본 동작 허용 (highlight-bak.js 방식)
            return; // 브라우저가 <br> 삽입하도록 허용
          } else {
            // ✅ Enter: 하이라이트에서 탈출 (demo 방식)
            e.preventDefault();
            
            const newP = document.createElement('p');
            newP.appendChild(document.createTextNode('\u00A0'));
            
            const parentBlock = highlightSpan.closest('p, div, h1, h2, h3, h4, h5, h6, li') || highlightSpan;
            if (parentBlock && parentBlock.parentNode) {
              parentBlock.parentNode.insertBefore(newP, parentBlock.nextSibling);
              
              const newRange = document.createRange();
              newRange.setStart(newP.firstChild, 0);
              newRange.collapse(true);
              
              selection.removeAllRanges();
              selection.addRange(newRange);
            }
            
            util.editor?.dispatchEditorEvent?.(contentArea);
          }
        }
        // ✅ 하이라이트 밖에서는 아무것도 하지 않음
      }
    });
  }
  
  /**
   * 🔧 하이라이트 적용 함수 (execCommand 사용)
   */
  function applyHighlightColor(color, contentArea, colorIndicator) {
    try {
      if (colorIndicator) {
        colorIndicator.style.backgroundColor = color;
        colorIndicator.style.border = 'none';
      }
      
      if (state.savedRange) {
        // 선택 영역 복원
        const restored = util.selection.restoreSelection(state.savedRange);
        if (!restored) {
          console.warn('하이라이트: 선택 영역 복원 실패');
          return;
        }
        
        // ✅ execCommand 사용 - 구조 자동 보존
        document.execCommand('hiliteColor', false, color);
        
        // 🔧 추가: 하이라이트 후 줄바꿈 처리
        setTimeout(() => {
          const selection = window.getSelection();
          if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            let highlightElement = range.startContainer;
            
            if (highlightElement.nodeType === Node.TEXT_NODE) {
              highlightElement = highlightElement.parentElement;
            }
            
            // 새로 생성된 하이라이트 요소 찾기
            while (highlightElement && highlightElement !== contentArea) {
              if (isHighlightElement(highlightElement)) {
                insertLineBreakIfNeeded(highlightElement);
                break;
              }
              highlightElement = highlightElement.parentElement;
            }
          }
        }, 10);
        
      } else if (state.savedCursorPosition) {
        // 커서 위치 복원
        const range = document.createRange();
        const sel = window.getSelection();
        
        range.setStart(state.savedCursorPosition.startContainer, state.savedCursorPosition.startOffset);
        range.setEnd(state.savedCursorPosition.endContainer, state.savedCursorPosition.endOffset);
        sel.removeAllRanges();
        sel.addRange(range);
        
        // ✅ execCommand 사용 - 커서 위치에서도 정상 작동
        document.execCommand('hiliteColor', false, color);
        
        // 🔧 추가: 커서 모드에서도 줄바꿈 처리
        setTimeout(() => {
          const selection = window.getSelection();
          if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            let highlightElement = range.startContainer;
            
            if (highlightElement.nodeType === Node.TEXT_NODE) {
              highlightElement = highlightElement.parentElement;
            }
            
            if (isHighlightElement(highlightElement)) {
              insertLineBreakIfNeeded(highlightElement);
            }
          }
        }, 10);
      }
      
      util.editor?.dispatchEditorEvent?.(contentArea);
      
    } catch (e) {
      console.error('하이라이트 적용 중 오류:', e);
    }
  }
  
  /**
   * 🔧 Phase 2: 버튼 상태 업데이트 함수
   */
  function updateHighlightButtonState(container) {
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
      
      // 📋 PRD 요구사항: 하이라이트 영역에서 버튼 active 표시
      const highlightElement = currentElement.closest('span');
      
      if (highlightElement && isHighlightElement(highlightElement)) {
        // 활성 상태 적용
        container.classList.add('active');
      } else {
        // 기본 상태 복원
        container.classList.remove('active');
      }
      
    } catch (e) {
      console.error('HighlightPlugin: 버튼 상태 업데이트 중 오류', e);
      container.classList.remove('active');
    }
  }
  
  /**
   * 🔧 Phase 2: 이벤트 리스너 설정 (최소화된 버전)
   */
  function setupButtonStateEvents(container, contentArea) {
    // 즉시 업데이트 함수
    const immediateUpdate = () => updateHighlightButtonState(container);
    
    // ❌ keyup 이벤트 제거 - 한글 입력 방해 방지
    // ❌ selectionchange 이벤트 제거 - 한글 조합 방해 방지
    
    // ✅ 마우스 이벤트만 유지 (demo 방식)
    contentArea.addEventListener('mouseup', immediateUpdate);
    contentArea.addEventListener('click', immediateUpdate);
    
    // 초기 상태 업데이트
    setTimeout(immediateUpdate, 50);
    
    // 정리 함수 반환
    return () => {
      contentArea.removeEventListener('mouseup', immediateUpdate);
      contentArea.removeEventListener('click', immediateUpdate);
    };
  }

  /**
   * 플러그인 등록 - 단순화된 버전
   */
  LiteEditor.registerPlugin('highlight', {
    customRender: function(toolbar, contentArea) {
      // ✅ Enter 키 처리 설정 (highlight-bak.js 방식)
      setupEnterKeyHandling(contentArea);
      
      const container = util.dom.createElement('div', {
        className: 'lite-editor-button',
        title: 'Highlight'
      });
      
      const icon = util.dom.createElement('i', {
        className: 'material-icons',
        textContent: 'format_color_fill'
      });
      container.appendChild(icon);
      
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
        
        // 색상 선택 시 하이라이트 적용
        colorCell.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          dropdown.classList.remove('show');
          dropdown.style.display = 'none';
          container.classList.remove('active');
          util.activeModalManager?.unregister?.(dropdown);
          
          // 하이라이트 적용
          applyHighlightColor(color, contentArea, colorIndicator);
        });
        
        colorGrid.appendChild(colorCell);
      });
      
      document.body.appendChild(dropdown);
      
      // 마우스 다운 시 선택 영역/커서 위치 저장
      container.addEventListener('mousedown', (e) => {
        const selection = util.selection.getSafeSelection();
        if (!selection?.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        const selectedText = range.toString().trim();
        
        if (selectedText) {
          // 선택 영역 모드
          state.savedRange = util.selection.saveSelection();
          state.savedCursorPosition = null;
        } else {
          // 커서 모드
          state.savedRange = null;
          state.savedCursorPosition = {
            startContainer: range.startContainer,
            startOffset: range.startOffset,
            endContainer: range.endContainer,
            endOffset: range.endOffset
          };
        }
      });
      
      // 아이콘 클릭 이벤트
      container.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!state.savedRange && !state.savedCursorPosition) return;
        
        const isVisible = dropdown.classList.contains('show');
        
        if (isVisible) {
          dropdown.classList.remove('show');
          dropdown.style.display = 'none';
          container.classList.remove('active');
          util.activeModalManager?.unregister?.(dropdown);
        } else {
          util.activeModalManager?.closeAll?.();
          
          setTimeout(() => {
            dropdown.classList.add('show');
            dropdown.style.display = 'block';
            container.classList.add('active');
            
            util.layer?.setLayerPosition?.(dropdown, container);
            util.activeModalManager?.register?.(dropdown);
          }, 10);
          
          util.setupOutsideClickHandler?.(dropdown, () => {
            dropdown.classList.remove('show');
            dropdown.style.display = 'none';
            container.classList.remove('active');
            util.activeModalManager?.unregister?.(dropdown);
          }, [container]);
        }
      });
      
      // ✅ 최소화된 이벤트 설정
      if (!contentArea.hasAttribute('data-highlight-events-setup')) {
        setupButtonStateEvents(container, contentArea);
        contentArea.setAttribute('data-highlight-events-setup', 'true');
      }
      
      return container;
    }
  });
})();