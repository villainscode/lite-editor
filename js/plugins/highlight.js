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
  function setupEnterKeyHandling(contentArea, container) {  // ✅ container 매개변수 추가
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
            
            // 🔧 추가: 하이라이트 탈출 후 버튼 상태 업데이트
            setTimeout(() => {
              if (container && container.classList) {
                console.log('🚪 하이라이트 탈출 → active 제거');
                updateHighlightButtonState(container);
              }
            }, 10);
          }
        }
        // ✅ 하이라이트 밖에서는 아무것도 하지 않음
      }
    });
  }

  
  /**
   * 🔧 하이라이트 적용 함수 (execCommand 사용 + 커서 위치 수정)
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
        
        // 🔧 핵심 수정: 하이라이트 적용 후 커서를 하이라이트 요소 내부로 이동
        setTimeout(() => {
          const selection = window.getSelection();
          if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            
            // 새로 생성된 하이라이트 요소 찾기
            const allHighlights = contentArea.querySelectorAll('span[style*="background-color"]');
            let targetHighlight = null;
            
            // 가장 최근에 생성된 하이라이트 요소 찾기
            for (let i = allHighlights.length - 1; i >= 0; i--) {
              const highlight = allHighlights[i];
              if (highlight.style.backgroundColor === color) {
                targetHighlight = highlight;
                break;
              }
            }
            
            if (targetHighlight) {
              console.log('🎯 하이라이트 요소 발견, 커서 이동:', targetHighlight);
              
              // 커서를 하이라이트 요소 내부로 이동
              const newRange = document.createRange();
              newRange.selectNodeContents(targetHighlight);
              newRange.collapse(false); // 끝부분으로 이동
              
              selection.removeAllRanges();
              selection.addRange(newRange);
              
              // 줄바꿈 처리
              insertLineBreakIfNeeded(targetHighlight);
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
        
        // 🔧 커서 모드에서도 같은 처리
        setTimeout(() => {
          const selection = window.getSelection();
          if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            let highlightElement = range.startContainer;
            
            if (highlightElement.nodeType === Node.TEXT_NODE) {
              highlightElement = highlightElement.parentElement;
            }
            
            if (isHighlightElement(highlightElement)) {
              console.log('🎯 커서 모드 하이라이트 발견:', highlightElement);
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
   * 🔧 Phase 2: 버튼 상태 업데이트 함수 (fontFamily.js 방식)
   */
  function updateHighlightButtonState(container) {
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
      
      const highlightElement = currentElement.closest('span');
      
      // 🔧 fontFamily.js 방식: 명확한 조건
      const isUserSetHighlight = highlightElement && isHighlightElement(highlightElement);
      
      if (isUserSetHighlight) {
        // 활성 상태 + 스타일 적용
        container.classList.add('active');
        container.style.backgroundColor = '#e9e9e9';
        container.style.color = '#1a73e8';
      } else {
        // 기본 상태 + 스타일 제거
        container.classList.remove('active');
        container.style.backgroundColor = '';
        container.style.color = '';
      }
      
    } catch (e) {
      console.error('HighlightPlugin: 버튼 상태 업데이트 중 오류', e);
      container.classList.remove('active');
    }
  }
  
  /**
   * 🔧 이벤트 리스너 설정 (fontFamily.js 방식으로 단순화)
   */
  function setupButtonStateEvents(container, contentArea) {
    // 🔧 디바운스 적용 (fontFamily.js와 동일)
    const debouncedUpdateState = util.events.debounce(() => {
      updateHighlightButtonState(container);
    }, 150);
    
    // ✅ fontFamily.js와 동일한 이벤트만
    contentArea.addEventListener('keyup', debouncedUpdateState);
    contentArea.addEventListener('click', debouncedUpdateState);
    
    // 초기 상태 업데이트
    setTimeout(() => updateHighlightButtonState(container), 50);
    
    // 정리 함수 반환
    return () => {
      contentArea.removeEventListener('keyup', debouncedUpdateState);
      contentArea.removeEventListener('click', debouncedUpdateState);
    };
  }

  /**
   * 플러그인 등록 - 수정된 버전
   */
  LiteEditor.registerPlugin('highlight', {
    customRender: function(toolbar, contentArea) {
      const container = util.dom.createElement('div', {
        className: 'lite-editor-button',
        title: 'Highlight'
      });
      
      // ✅ 수정: container를 올바르게 전달
      setupEnterKeyHandling(contentArea, container);
      
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
          
          console.log('🎨 색상 선택:', color);
          
          dropdown.classList.remove('show');
          dropdown.style.display = 'none';
          util.activeModalManager?.unregister?.(dropdown);
          
          // 하이라이트 적용
          applyHighlightColor(color, contentArea, colorIndicator);
          
          // ❌ updateHighlightButtonState 호출 제거 (fontFamily.js와 동일)
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