/**
 * LiteEditor Highlight Plugin
 * 완전 분리: 커서/드래그/더블클릭 독립 시스템
 */

(function() {
  const util = window.PluginUtil || {};

  if (!util.selection) {
    console.error('HighlightPlugin: PluginUtil.selection이 필요합니다.');
  }
  
  // 전역 상태 변수
  let savedRange = null;
  let savedCursorPosition = null;
  let isDropdownOpen = false;
  let currentCaseType = null; // 'cursor', 'drag', 'doubleclick'
  
  /**
   * 색상 데이터 스크립트 로드 함수
   */
  function loadColorScript(callback) {
    util.dataLoader.loadExternalScript('js/data/colors.js', 'LiteEditorColorData', callback);
  }
  
  function loadHighlightColorData() {
    const defaultColors = [
      '#ffffcc', '#ffff00', '#ffecb3', '#ffcc00', '#d0f0c0', '#daf2f9', '#b1d6f7',
      '#ffd9cc', '#ffccff', '#e6d3ff', '#ccccff', '#e6ffcc', '#d9d9d9', '#bdbdbd'
    ];
    return util.dataLoader.loadColorData('highlight', defaultColors);
  }

  // 🔥 시스템 1: 커서 전용 완전 독립 시스템
  const CursorSystem = {
    handleEnter(e, contentArea) {
      if (currentCaseType !== 'cursor') return;
      
      const selection = util.selection.getSafeSelection();
      if (!selection || !selection.rangeCount) return;
      
      const range = selection.getRangeAt(0);
      let span = range.startContainer.nodeType === Node.TEXT_NODE 
        ? range.startContainer.parentElement 
        : range.startContainer;
      
      while (span && span !== contentArea) {
        if (span.tagName === 'SPAN' && span.style.backgroundColor) {
          break;
        }
        span = span.parentElement;
      }
      
      if (span && span.tagName === 'SPAN' && span.style.backgroundColor) {
        if (e.shiftKey) {
          // 커서 Shift+Enter: span 내부 줄바꿈
          console.log('🔵 커서 Shift+Enter: span 내부 줄바꿈');
          return; // 기본 동작
        } else {
          // 커서 Enter: span 밖으로 나가기
          console.log('🔵 커서 Enter: span 밖으로 나가기');
          e.preventDefault();
          const newP = util.dom.createElement('p');
          newP.appendChild(document.createTextNode('\u00A0'));
          const parentBlock = util.dom.findClosestBlock(span, contentArea);
          if (parentBlock && parentBlock.parentNode) {
            parentBlock.parentNode.insertBefore(newP, parentBlock.nextSibling);
            util.selection.moveCursorTo(newP.firstChild, 0);
          }
          util.editor.dispatchEditorEvent(contentArea);
        }
      }
    },
    
    applyHighlight(color, contentArea, colorIndicator) {
      console.log('🔵 커서 하이라이트 적용');
      if (document.activeElement !== contentArea) {
        try {
          contentArea.focus({ preventScroll: true });
        } catch (e) {
          contentArea.focus();
        }
      }
      
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
          console.error('❌ 커서 위치 복원 실패:', e.message);
        }
      }
      
      document.execCommand('hiliteColor', false, color);
    }
  };

  // 🔥 시스템 2: 드래그 전용 완전 독립 시스템
  const DragSystem = {
    handleEnter(e, contentArea) {
      if (currentCaseType !== 'drag') return;
      
      const selection = util.selection.getSafeSelection();
      if (!selection || !selection.rangeCount) return;
      
      const range = selection.getRangeAt(0);
      let span = range.startContainer.nodeType === Node.TEXT_NODE 
        ? range.startContainer.parentElement 
        : range.startContainer;
      
      while (span && span !== contentArea) {
        if (span.tagName === 'SPAN' && span.style.backgroundColor) {
          break;
        }
        span = span.parentElement;
      }
      
      if (span && span.tagName === 'SPAN' && span.style.backgroundColor) {
        if (e.shiftKey) {
          // 드래그 Shift+Enter: span 내부 줄바꿈
          console.log('🟢 드래그 Shift+Enter: span 내부 줄바꿈');
          return; // 기본 동작
        } else {
          // 드래그 Enter: span 밖으로 나가기
          console.log('🟢 드래그 Enter: span 밖으로 나가기');
          e.preventDefault();
          const newP = util.dom.createElement('p');
          newP.appendChild(document.createTextNode('\u00A0'));
          const parentBlock = util.dom.findClosestBlock(span, contentArea);
          if (parentBlock && parentBlock.parentNode) {
            parentBlock.parentNode.insertBefore(newP, parentBlock.nextSibling);
            util.selection.moveCursorTo(newP.firstChild, 0);
          }
          util.editor.dispatchEditorEvent(contentArea);
        }
      }
    },
    
    applyHighlight(color, contentArea, colorIndicator) {
      console.log('🟢 드래그 하이라이트 적용');
      const scrollPosition = util.scroll.savePosition();
      
      try {
        contentArea.focus({ preventScroll: true });
      } catch (e) {
        contentArea.focus();
      }
      
      const restored = util.selection.restoreSelection(savedRange);
      if (!restored) return;
      
      document.execCommand('hiliteColor', false, color);
      util.scroll.restorePosition(scrollPosition);
    }
  };

  // 🔥 시스템 3: 더블클릭 전용 완전 독립 시스템
  const DoubleClickSystem = {
    handleEnter(e, contentArea) {
      if (currentCaseType !== 'doubleclick') return;
      
      const selection = util.selection.getSafeSelection();
      if (!selection || !selection.rangeCount) return;
      
      const range = selection.getRangeAt(0);
      let span = range.startContainer.nodeType === Node.TEXT_NODE 
        ? range.startContainer.parentElement 
        : range.startContainer;
      
      while (span && span !== contentArea) {
        if (span.tagName === 'SPAN' && span.style.backgroundColor) {
          break;
        }
        span = span.parentElement;
      }
      
      if (span && span.tagName === 'SPAN' && span.style.backgroundColor) {
        if (e.shiftKey) {
          // 더블클릭 Shift+Enter: BR 삽입 + 공백 + 커서 위치
          console.log('🔴 더블클릭 Shift+Enter: BR 삽입 처리');
          e.preventDefault();
          
          const currentRange = selection.getRangeAt(0);
          const br = document.createElement('br');
          currentRange.deleteContents();
          currentRange.insertNode(br);
          
          // BR 뒤에 공백 문자 추가
          const spaceNode = document.createTextNode('\u00A0');
          br.parentNode.insertBefore(spaceNode, br.nextSibling);
          
          // 커서를 공백 시작 위치로 이동
          const newRange = document.createRange();
          newRange.setStart(spaceNode, 0);
          newRange.collapse(true);
          
          selection.removeAllRanges();
          selection.addRange(newRange);
          
          util.editor.dispatchEditorEvent(contentArea);
        } else {
          // 더블클릭 Enter: span 밖으로 나가기
          console.log('🔴 더블클릭 Enter: span 밖으로 나가기');
          e.preventDefault();
          
          let spaceNode = span.nextSibling;
          if (!spaceNode || spaceNode.nodeType !== Node.TEXT_NODE) {
            spaceNode = document.createTextNode('\u00A0');
            span.parentNode.insertBefore(spaceNode, span.nextSibling);
          }
          
          util.selection.moveCursorTo(spaceNode, 0);
          util.editor.dispatchEditorEvent(contentArea);
        }
      }
    },
    
    applyHighlight(color, contentArea, colorIndicator) {
      console.log('🔴 더블클릭 하이라이트 적용');
      const scrollPosition = util.scroll.savePosition();
      
      try {
        contentArea.focus({ preventScroll: true });
      } catch (e) {
        contentArea.focus();
      }
      
      const restored = util.selection.restoreSelection(savedRange);
      if (!restored) return;
      
      // BR 제거 로직
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const fragment = range.cloneContents();
        const tempDiv = document.createElement('div');
        tempDiv.appendChild(fragment);
        
        if (tempDiv.innerHTML.includes('<br>')) {
          console.log('🔴 더블클릭: execCommand 전 BR 제거');
          
          const walker = document.createTreeWalker(
            range.commonAncestorContainer,
            NodeFilter.SHOW_ALL,
            null,
            false
          );
          
          while (walker.nextNode()) {
            const node = walker.currentNode;
            if (range.intersectsNode(node) && node.nodeName === 'BR') {
              range.setEndBefore(node);
              selection.removeAllRanges();
              selection.addRange(range);
              break;
            }
          }
        }
      }
      
      document.execCommand('hiliteColor', false, color);
      
      // 더블클릭 마커 추가
      setTimeout(() => {
        const spans = contentArea.querySelectorAll('span[style*="background-color"]');
        const lastSpan = spans[spans.length - 1];
        if (lastSpan && !lastSpan.hasAttribute('data-highlight-doubleclick')) {
          lastSpan.setAttribute('data-highlight-doubleclick', 'true');
        }
      }, 10);
      
      util.scroll.restorePosition(scrollPosition);
    }
  };

  // 🔥 완전 분리: 3개 독립 이벤트 핸들러
  function setupCursorEnterKeyHandling(contentArea) {
    const existingHandler = contentArea._cursorHighlightEnterHandler;
    if (existingHandler) {
      contentArea.removeEventListener('keydown', existingHandler);
    }
    
    const cursorHandler = (e) => {
      if (e.key === 'Enter' && currentCaseType === 'cursor') {
        console.log('🔵 커서 Enter 처리');
        CursorSystem.handleEnter(e, contentArea);
      }
    };
    
    contentArea._cursorHighlightEnterHandler = cursorHandler;
    contentArea.addEventListener('keydown', cursorHandler);
  }

  function setupDragEnterKeyHandling(contentArea) {
    const existingHandler = contentArea._dragHighlightEnterHandler;
    if (existingHandler) {
      contentArea.removeEventListener('keydown', existingHandler);
    }
    
    const dragHandler = (e) => {
      if (e.key === 'Enter' && currentCaseType === 'drag') {
        console.log('🟢 드래그 Enter 처리');
        DragSystem.handleEnter(e, contentArea);
      }
    };
    
    contentArea._dragHighlightEnterHandler = dragHandler;
    contentArea.addEventListener('keydown', dragHandler);
  }

  function setupDoubleClickEnterKeyHandling(contentArea) {
    const existingHandler = contentArea._doubleClickHighlightEnterHandler;
    if (existingHandler) {
      contentArea.removeEventListener('keydown', existingHandler);
    }
    
    const doubleClickHandler = (e) => {
      if (e.key === 'Enter' && currentCaseType === 'doubleclick') {
        console.log('🔴 더블클릭 Enter 처리');
        DoubleClickSystem.handleEnter(e, contentArea);
      }
    };
    
    contentArea._doubleClickHighlightEnterHandler = doubleClickHandler;
    contentArea.addEventListener('keydown', doubleClickHandler);
  }

  // 🔥 완전 분리: 3개 독립 적용 함수
  function applyCursorHighlightColor(color, contentArea, colorIndicator) {
    try {
      if (colorIndicator) {
        colorIndicator.style.backgroundColor = color;
        colorIndicator.style.border = 'none';
      }
      
      CursorSystem.applyHighlight(color, contentArea, colorIndicator);
      util.editor.dispatchEditorEvent(contentArea);
      
    } catch (e) {
      console.error('❌ 커서 하이라이트 적용 중 오류:', e);
    }
  }

  function applyDragHighlightColor(color, contentArea, colorIndicator) {
    try {
      if (colorIndicator) {
        colorIndicator.style.backgroundColor = color;
        colorIndicator.style.border = 'none';
      }
      
      DragSystem.applyHighlight(color, contentArea, colorIndicator);
      util.editor.dispatchEditorEvent(contentArea);
      
    } catch (e) {
      console.error('❌ 드래그 하이라이트 적용 중 오류:', e);
    }
  }

  function applyDoubleClickHighlightColor(color, contentArea, colorIndicator) {
    try {
      if (colorIndicator) {
        colorIndicator.style.backgroundColor = color;
        colorIndicator.style.border = 'none';
      }
      
      DoubleClickSystem.applyHighlight(color, contentArea, colorIndicator);
      util.editor.dispatchEditorEvent(contentArea);
      
    } catch (e) {
      console.error('❌ 더블클릭 하이라이트 적용 중 오류:', e);
    }
  }

  LiteEditor.registerPlugin('highlight', {
    customRender: function(toolbar, contentArea) {
      // 세 개 핸들러 모두 등록
      setupCursorEnterKeyHandling(contentArea);
      setupDragEnterKeyHandling(contentArea);
      setupDoubleClickEnterKeyHandling(contentArea);
      
      const highlightContainer = util.dom.createElement('div', {
        className: 'lite-editor-button',
        title: 'Highlight'
      });
      
      const icon = util.dom.createElement('i', {
        className: 'material-icons',
        textContent: 'format_color_fill'
      });
      highlightContainer.appendChild(icon);
      
      const colorIndicator = util.dom.createElement('span', {
        className: 'lite-editor-color-indicator'
      }, {
        backgroundColor: 'transparent',
        border: '1px solid #ccc'
      });
      highlightContainer.appendChild(colorIndicator);
      
      const dropdownMenu = util.dom.createElement('div', {
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
      dropdownMenu.appendChild(colorGrid);
      
      loadColorScript(function() {
        const highlightColors = loadHighlightColorData();
        
        highlightColors.forEach(color => {
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
            highlightContainer.classList.remove('active');
            isDropdownOpen = false;
            
            util.activeModalManager.unregister(dropdownMenu);
            
            // 🔥 세 개 독립 함수로 분기
            if (currentCaseType === 'cursor') {
              applyCursorHighlightColor(color, contentArea, colorIndicator);
            } else if (currentCaseType === 'drag') {
              applyDragHighlightColor(color, contentArea, colorIndicator);
            } else if (currentCaseType === 'doubleclick') {
              applyDoubleClickHighlightColor(color, contentArea, colorIndicator);
            }
          });
          
          colorGrid.appendChild(colorCell);
        });
      });
      
      document.body.appendChild(dropdownMenu);
      
      // 🔧 Task 2.2: 케이스 타입 결정 로직 개선
      highlightContainer.addEventListener('mousedown', (e) => {
        const selection = util.selection.getSafeSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const selectedText = range.toString().trim();
          
          if (selectedText) {
            // 🔧 Task 2.2: 더블클릭 감지 개선
            const fragment = range.cloneContents();
            const tempDiv = document.createElement('div');
            tempDiv.appendChild(fragment);
            
            console.log('🔍 Task 2.2: 선택된 HTML:', tempDiv.innerHTML);
            console.log('🔍 Task 2.2: BR 포함 여부:', tempDiv.innerHTML.includes('<br>'));
            console.log('🔍 Task 2.2: 선택된 텍스트:', selectedText);
            
            if (tempDiv.innerHTML.includes('<br>')) {
              currentCaseType = 'doubleclick';
              console.log('✅ Task 2.2: 더블클릭 케이스 감지');
            } else {
              currentCaseType = 'drag';
              console.log('✅ Task 2.2: 드래그 케이스 감지');
            }
            
            savedRange = util.selection.saveSelection();
            savedCursorPosition = null;
          } else {
            // 선택 영역 없음 - 커서 케이스
            currentCaseType = 'cursor';
            savedRange = null;
            savedCursorPosition = {
              startContainer: range.startContainer,
              startOffset: range.startOffset,
              endContainer: range.endContainer,
              endOffset: range.endOffset
            };
            console.log('✅ Task 2.2: 커서 케이스 감지');
          }
        } else {
          currentCaseType = null;
          savedRange = null;
          savedCursorPosition = null;
          console.log('⚠️ Task 2.2: 선택 영역 없음');
        }
      });
      
      // ✅ 기존 click 로직 완전히 그대로 유지
      highlightContainer.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!savedRange && !savedCursorPosition) {
          return;
        }
        
        if (document.activeElement !== contentArea) {
          try {
            contentArea.focus({ preventScroll: true });
          } catch (e) {
            contentArea.focus();
          }
        }
        
        const isVisible = dropdownMenu.classList.contains('show');
        
        if (!isVisible && util.activeModalManager) {
          util.activeModalManager.closeAll();
        }
        
        if (isVisible) {
          dropdownMenu.classList.remove('show');
          dropdownMenu.style.display = 'none';
          highlightContainer.classList.remove('active');
          isDropdownOpen = false;
          util.activeModalManager.unregister(dropdownMenu);
        } else {
          setTimeout(() => {
            dropdownMenu.classList.add('show');
            dropdownMenu.style.display = 'block';
            highlightContainer.classList.add('active');
            isDropdownOpen = true;
            
            util.layer.setLayerPosition(dropdownMenu, highlightContainer);
            
            dropdownMenu.closeCallback = () => {
              dropdownMenu.classList.remove('show');
              dropdownMenu.style.display = 'none';
              highlightContainer.classList.remove('active');
              isDropdownOpen = false;
            };
            
            util.activeModalManager.register(dropdownMenu);
            
            util.setupOutsideClickHandler(dropdownMenu, () => {
              dropdownMenu.classList.remove('show');
              dropdownMenu.style.display = 'none';
              highlightContainer.classList.remove('active');
              isDropdownOpen = false;
              util.activeModalManager.unregister(dropdownMenu);
              
              if (document.activeElement !== contentArea) {
                contentArea.focus({ preventScroll: true });
              }
            }, [highlightContainer]);
          }, 10);
        }
      });
      
      return highlightContainer;
    }
  });
})();
