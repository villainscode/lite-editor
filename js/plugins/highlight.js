/**
 * LiteEditor Highlight Plugin - 키보드 이벤트 수정 버전
 */

(function() {
  const util = window.PluginUtil || {};

  if (!util.selection) {
    console.error('HighlightPlugin: PluginUtil.selection이 필요합니다.');
    return;
  }
  
  // 인스턴스별 상태 관리
  const createState = () => ({
    savedRange: null,
    savedCursorPosition: null
  });
  
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
   * 안전한 포커스 처리
   */
  function ensureFocus(contentArea) {
    if (document.activeElement !== contentArea) {
      contentArea.focus({ preventScroll: true });
    }
  }
  
  /**
   * HTML 구조 보존 처리
   */
  function preserveHtmlStructure(htmlContent) {
    if (!htmlContent) return htmlContent;
    return htmlContent.replace(/<br\s*\/?>/gi, '<br>');
  }
  
  /**
   * 자동 줄바꿈 삽입 - 중복 방지
   */
  function insertLineBreakIfNeeded(spanElement) {
    const nextSibling = spanElement.nextSibling;
    
    if (nextSibling?.nodeType === Node.ELEMENT_NODE && nextSibling.tagName === 'BR') {
      return false;
    }
    
    if (nextSibling?.nodeType === Node.TEXT_NODE) {
      const nextText = nextSibling.textContent;
      if (nextText && !nextText.startsWith(' ') && nextText.trim()) {
        const br = document.createElement('br');
        spanElement.parentNode.insertBefore(br, nextSibling);
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * 정확한 하이라이트 감지
   */
  function isHighlightElement(element) {
    if (!element || element.tagName !== 'SPAN') return false;
    
    const bgColor = element.style.backgroundColor;
    if (!bgColor) return false;
    
    const highlightColors = loadHighlightColors();
    const rgb = window.getComputedStyle(element).backgroundColor;
    
    return bgColor && (
      highlightColors.some(color => 
        bgColor.includes(color.replace('#', '')) ||
        rgb === `rgb(${parseInt(color.slice(1,3),16)}, ${parseInt(color.slice(3,5),16)}, ${parseInt(color.slice(5,7),16)})`
      )
    );
  }
  
  /**
   * 🔧 수정: highlight 내에서 줄바꿈 - code.js 방식 적용
   */
  function insertLineBreakInHighlight(highlightSpan) {
    const selection = util.selection.getSafeSelection();
    if (!selection || !selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    
    // 현재 위치에 <br> 직접 삽입
    const br = document.createElement('br');
    range.deleteContents();
    range.insertNode(br);
    
    // 커서를 <br> 다음으로 이동
    range.setStartAfter(br);
    range.collapse(true);
    
    selection.removeAllRanges();
    selection.addRange(range);
  }
  
  /**
   * 🔧 수정: highlight 블록에서 탈출 - fontColor.js 방식 참고
   */
  function exitHighlightBlock(highlightSpan, selection, contentArea) {
    try {
      // fontColor.js 방식: 상위 블록 찾기
      const parentBlock = util.dom?.findClosestBlock ? 
                         util.dom.findClosestBlock(highlightSpan, contentArea) :
                         highlightSpan.closest('p, div, h1, h2, h3, h4, h5, h6, li');
      
      const newP = document.createElement('p');
      newP.appendChild(document.createTextNode('\u00A0'));
      
      if (parentBlock && parentBlock.parentNode) {
        parentBlock.parentNode.insertBefore(newP, parentBlock.nextSibling);
        
        // fontColor.js 방식: util.selection.moveCursorTo 사용
        if (util.selection?.moveCursorTo) {
          util.selection.moveCursorTo(newP.firstChild, 0);
        } else {
          // fallback: 직접 커서 이동
          const newRange = document.createRange();
          newRange.setStart(newP.firstChild, 0);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      } else {
        // fallback: 기존 방식
        highlightSpan.parentNode.insertBefore(newP, highlightSpan.nextSibling);
        
        const newRange = document.createRange();
        newRange.setStart(newP.firstChild, 0);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    } catch (e) {
      console.error('HighlightPlugin: exitHighlightBlock 오류', e);
    }
  }
  
  /**
   * 하이라이트 적용 함수들 (기존과 동일)
   */
  function applyHighlight(color, contentArea, colorIndicator, state) {
    try {
      if (colorIndicator) {
        colorIndicator.style.backgroundColor = color;
        colorIndicator.style.border = 'none';
      }
      
      ensureFocus(contentArea);
      
      if (state.savedRange) {
        return applyHighlightToSelection(color, contentArea, state);
      } else if (state.savedCursorPosition) {
        return applyHighlightAtCursor(color, contentArea, state);
      }
      
      return false;
      
    } catch (e) {
      errorHandler.logError('HighlightPlugin', 'APPLY_ERROR', e);
      return false;
    }
  }
  
  function applyHighlightToSelection(color, contentArea, state) {
    const restored = util.selection.restoreSelection(state.savedRange);
    if (!restored) {
      console.warn('HighlightPlugin: 선택 영역 복원 실패');
      return false;
    }
    
    const selection = window.getSelection();
    if (!selection?.rangeCount) {
      console.warn('HighlightPlugin: 선택 영역이 없습니다');
      return false;
    }
    
    const range = selection.getRangeAt(0);
    if (range.collapsed) {
      console.warn('HighlightPlugin: 선택된 텍스트가 없습니다');
      return false;
    }
    
    try {
      const fragment = range.extractContents();
      const tempDiv = document.createElement('div');
      tempDiv.appendChild(fragment);
      
      const preservedContent = preserveHtmlStructure(tempDiv.innerHTML);
      
      const spanElement = document.createElement('span');
      spanElement.style.backgroundColor = color;
      spanElement.innerHTML = preservedContent;
      
      range.insertNode(spanElement);
      insertLineBreakIfNeeded(spanElement);
      
      const newRange = document.createRange();
      newRange.setStartAfter(spanElement);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
      
      util.editor?.dispatchEditorEvent?.(contentArea);
      return true;
      
    } catch (e) {
      console.error('HighlightPlugin: 선택 영역 처리 중 오류', e);
      return false;
    }
  }
  
  function applyHighlightAtCursor(color, contentArea, state) {
    try {
      let range;
      const selection = window.getSelection();
      
      if (state.savedCursorPosition && 
          state.savedCursorPosition.startContainer &&
          contentArea.contains(state.savedCursorPosition.startContainer)) {
        
        range = document.createRange();
        range.setStart(state.savedCursorPosition.startContainer, state.savedCursorPosition.startOffset);
        range.setEnd(state.savedCursorPosition.endContainer, state.savedCursorPosition.endOffset);
        selection.removeAllRanges();
        selection.addRange(range);
      } else if (selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
      } else {
        console.warn('HighlightPlugin: 유효한 커서 위치를 찾을 수 없습니다');
        return false;
      }
      
      // 빈 하이라이트 span 생성
      const spanElement = document.createElement('span');
      spanElement.style.backgroundColor = color;
      
      range.insertNode(spanElement);
      
      // 커서를 span 안쪽으로 이동
      const newRange = document.createRange();
      newRange.setStart(spanElement, 0);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
      
      util.editor?.dispatchEditorEvent?.(contentArea);
      return true;
      
    } catch (e) {
      console.error('HighlightPlugin: 커서 위치 처리 중 오류', e);
      return false;
    }
  }
  
  /**
   * 플러그인 등록 (UI 생성 부분은 기존과 동일)
   */
  LiteEditor.registerPlugin('highlight', {
    customRender: function(toolbar, contentArea) {
      const state = createState();
      
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
          util.activeModalManager?.unregister?.(dropdown);
          
          const success = applyHighlight(color, contentArea, colorIndicator, state);
          if (!success) {
            console.warn('HighlightPlugin: 하이라이트 적용 실패');
          }
        });
        
        colorGrid.appendChild(colorCell);
      });
      
      document.body.appendChild(dropdown);
      
      // 이벤트 리스너 (기존과 동일)
      container.addEventListener('mousedown', (e) => {
        const selection = util.selection.getSafeSelection();
        if (!selection?.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        const selectedText = range.toString().trim();
        
        if (selectedText) {
          state.savedRange = util.selection.saveSelection();
          state.savedCursorPosition = null;
        } else {
          state.savedRange = null;
          state.savedCursorPosition = {
            startContainer: range.startContainer,
            startOffset: range.startOffset,
            endContainer: range.endContainer,
            endOffset: range.endOffset
          };
        }
      });
      
      container.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!state.savedRange && !state.savedCursorPosition) return;
        
        ensureFocus(contentArea);
        
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
            ensureFocus(contentArea);
          }, [container]);
        }
      });
      
      // 버튼 상태 업데이트 함수 (간소화 버전)
      function updateHighlightButtonState() {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const currentElement = range.startContainer.nodeType === Node.TEXT_NODE 
            ? range.startContainer.parentElement 
            : range.startContainer;
          
          // 하이라이트 span 태그 감지
          const highlightElement = currentElement.closest('span');
          
          if (highlightElement && isHighlightElement(highlightElement)) {
            // 활성 상태 적용
            container.classList.add('active');
          } else {
            // 기본 상태 복원
            container.classList.remove('active');
          }
        }
      }

      // 이벤트 리스너 등록 (한 번만)
      if (!contentArea.hasAttribute('data-highlight-events-setup')) {
        // 즉시 업데이트 함수
        const immediateUpdate = () => updateHighlightButtonState();
        
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
        
        contentArea.setAttribute('data-highlight-events-setup', 'true');
        
        // 정리 함수
        contentArea._highlightEventCleanup = () => {
          document.removeEventListener('selectionchange', selectionChangeHandler);
        };
      }
      
      return container;
    }
  });
})();