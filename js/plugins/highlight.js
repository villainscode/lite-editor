/**
 * LiteEditor Highlight Plugin
 * 텍스트 배경색(하이라이트) 플러그인
 * 수정: 선택 블록 유지 기능 추가 + Enter/Shift+Enter 처리
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
  
  // ✅ 케이스 1: 커서 전용 키 핸들러 (기존 정상 동작 보존)
  function handleCursorCaseEnter(e, contentArea) {
    const selection = util.selection.getSafeSelection();
    if (!selection || !selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    let emphasisSpan = range.startContainer.nodeType === Node.TEXT_NODE 
      ? range.startContainer.parentElement 
      : range.startContainer;
    
    while (emphasisSpan && emphasisSpan !== contentArea) {
      if (emphasisSpan.tagName === 'SPAN' && emphasisSpan.style.backgroundColor) {
        break;
      }
      emphasisSpan = emphasisSpan.parentElement;
    }
    
    if (emphasisSpan && emphasisSpan.tagName === 'SPAN' && emphasisSpan.style.backgroundColor) {
      if (e.shiftKey) {
        return; // 기본 동작 (정상 작동)
      } else {
        e.preventDefault();
        const newP = util.dom.createElement('p');
        newP.appendChild(document.createTextNode('\u00A0'));
        const parentBlock = util.dom.findClosestBlock(emphasisSpan, contentArea);
        if (parentBlock && parentBlock.parentNode) {
          parentBlock.parentNode.insertBefore(newP, parentBlock.nextSibling);
          util.selection.moveCursorTo(newP.firstChild, 0);
        }
        util.editor.dispatchEditorEvent(contentArea);
      }
    }
  }

  // ✅ 케이스 2: 드래그 전용 키 핸들러 (기존 정상 동작 보존)
  function handleDragCaseEnter(e, contentArea) {
    const selection = util.selection.getSafeSelection();
    if (!selection || !selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    let emphasisSpan = range.startContainer.nodeType === Node.TEXT_NODE 
      ? range.startContainer.parentElement 
      : range.startContainer;
    
    while (emphasisSpan && emphasisSpan !== contentArea) {
      if (emphasisSpan.tagName === 'SPAN' && emphasisSpan.style.backgroundColor) {
        break;
      }
      emphasisSpan = emphasisSpan.parentElement;
    }
    
    if (emphasisSpan && emphasisSpan.tagName === 'SPAN' && emphasisSpan.style.backgroundColor) {
      if (e.shiftKey) {
        return; // 기본 동작 (정상 작동)
      } else {
        e.preventDefault();
        const newP = util.dom.createElement('p');
        newP.appendChild(document.createTextNode('\u00A0'));
        const parentBlock = util.dom.findClosestBlock(emphasisSpan, contentArea);
        if (parentBlock && parentBlock.parentNode) {
          parentBlock.parentNode.insertBefore(newP, parentBlock.nextSibling);
          util.selection.moveCursorTo(newP.firstChild, 0);
        }
        util.editor.dispatchEditorEvent(contentArea);
      }
    }
  }

  // ✅ 케이스 3: 더블클릭 전용 키 핸들러 (code.js 방식 적용)
  function handleDoubleClickCaseEnter(e, contentArea) {
    const selection = util.selection.getSafeSelection();
    if (!selection || !selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    let emphasisSpan = range.startContainer.nodeType === Node.TEXT_NODE 
      ? range.startContainer.parentElement 
      : range.startContainer;
    
    while (emphasisSpan && emphasisSpan !== contentArea) {
      if (emphasisSpan.tagName === 'SPAN' && emphasisSpan.style.backgroundColor) {
        break;
      }
      emphasisSpan = emphasisSpan.parentElement;
    }
    
    if (emphasisSpan && emphasisSpan.tagName === 'SPAN' && emphasisSpan.style.backgroundColor) {
      if (e.shiftKey) {
        // 🔍 더블클릭 케이스 Shift+Enter 커서 위치 디버깅 로그 (간소화)
        console.log('🟡 [더블클릭 케이스] Shift+Enter - code.js 방식 적용');
        
        // ✅ code.js 방식: preventDefault + 직접 BR 삽입
        e.preventDefault();
        e.stopImmediatePropagation();
        
        // 현재 커서 위치에 <br> 태그 삽입
        const br = document.createElement('br');
        range.deleteContents();
        range.insertNode(br);
        
        // 커서를 <br> 다음으로 이동
        range.setStartAfter(br);
        range.collapse(true);
        
        selection.removeAllRanges();
        selection.addRange(range);
        
        console.log('✅ span 내부에 BR 직접 삽입 완료');
        
        return;
      } else {
        e.preventDefault();
        const newP = util.dom.createElement('p');
        newP.appendChild(document.createTextNode('\u00A0'));
        const parentBlock = util.dom.findClosestBlock(emphasisSpan, contentArea);
        if (parentBlock && parentBlock.parentNode) {
          parentBlock.parentNode.insertBefore(newP, parentBlock.nextSibling);
          util.selection.moveCursorTo(newP.firstChild, 0);
        }
        util.editor.dispatchEditorEvent(contentArea);
      }
    } else {
      // 하이라이트 span 밖에 있는 경우 (간소화)
      if (e.shiftKey) {
        console.log('🔴 [더블클릭 케이스] span 밖에 있음 - 기본 동작');
      }
    }
  }

  // ✅ 통합 키 핸들러 (케이스별 완전 분리)
  function setupEnterKeyHandling(contentArea) {
    contentArea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        // 케이스별 완전 분리 실행
        if (currentCaseType === 'cursor') {
          handleCursorCaseEnter(e, contentArea);
        } else if (currentCaseType === 'drag') {
          handleDragCaseEnter(e, contentArea);
        } else if (currentCaseType === 'doubleclick') {
          handleDoubleClickCaseEnter(e, contentArea);
        }
        // currentCaseType이 null이면 기본 동작
      }
    });
  }

  // ✅ 케이스 1: 커서 전용 적용 함수 (기존 보존)
  function applyCursorHighlight(color, contentArea, colorIndicator) {
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

  // ✅ 케이스 2: 드래그 전용 적용 함수 (기존 보존)
  function applyDragHighlight(color, contentArea, colorIndicator) {
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

  // ✅ 케이스 3: 더블클릭 전용 적용 함수 (새로 구현)
  function applyDoubleClickHighlight(color, contentArea, colorIndicator) {
    const scrollPosition = util.scroll.savePosition();
    
    try {
      contentArea.focus({ preventScroll: true });
    } catch (e) {
      contentArea.focus();
    }
    
    const restored = util.selection.restoreSelection(savedRange);
    if (!restored) return;
    
    // BR 분리 로직 (더블클릭 케이스만)
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    const fragment = range.cloneContents();
    const tempDiv = document.createElement('div');
    tempDiv.appendChild(fragment);
    
    if (tempDiv.innerHTML.endsWith('<br>') || tempDiv.innerHTML.endsWith('<br/>')) {
      const walker = document.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_ALL);
      while (walker.nextNode()) {
        if (walker.currentNode.nodeName === 'BR' && range.intersectsNode(walker.currentNode)) {
          range.setEndBefore(walker.currentNode);
          selection.removeAllRanges();
          selection.addRange(range);
          break;
        }
      }
    }
    
    document.execCommand('hiliteColor', false, color);
    
    // 더블클릭 마커 추가
    setTimeout(() => {
      const spans = contentArea.querySelectorAll('span[style*="background-color"]');
      const lastSpan = spans[spans.length - 1];
      if (lastSpan) {
        lastSpan.setAttribute('data-highlight-doubleclick', 'true');
      }
    }, 10);
    
    util.scroll.restorePosition(scrollPosition);
  }

  // ✅ 통합 적용 함수 (케이스별 완전 분리)
  function applyHighlightColor(color, contentArea, colorIndicator) {
    try {
      if (colorIndicator) {
        colorIndicator.style.backgroundColor = color;
        colorIndicator.style.border = 'none';
      }
      
      // 케이스별 완전 분리 실행
      if (currentCaseType === 'cursor') {
        applyCursorHighlight(color, contentArea, colorIndicator);
      } else if (currentCaseType === 'drag') {
        applyDragHighlight(color, contentArea, colorIndicator);
      } else if (currentCaseType === 'doubleclick') {
        applyDoubleClickHighlight(color, contentArea, colorIndicator);
      }
      
      util.editor.dispatchEditorEvent(contentArea);
      
    } catch (e) {
      console.error('❌ 하이라이트 적용 중 오류:', e);
    }
  }
  
  // 🔧 헬퍼 함수: 마지막 텍스트 노드 찾기
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
  
  LiteEditor.registerPlugin('highlight', {
    customRender: function(toolbar, contentArea) {
      setupEnterKeyHandling(contentArea);
      
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
            
            applyHighlightColor(color, contentArea, colorIndicator);
          });
          
          colorGrid.appendChild(colorCell);
        });
      });
      
      document.body.appendChild(dropdownMenu);
      
      // ✅ 케이스 타입 결정 로직 (mousedown에서)
      highlightContainer.addEventListener('mousedown', (e) => {
        const selection = util.selection.getSafeSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const selectedText = range.toString().trim();
          
          if (selectedText) {
            // 선택 영역 있음 - BR 확인해서 케이스 결정
            const fragment = range.cloneContents();
            const tempDiv = document.createElement('div');
            tempDiv.appendChild(fragment);
            
            if (tempDiv.innerHTML.endsWith('<br>') || tempDiv.innerHTML.endsWith('<br/>')) {
              currentCaseType = 'doubleclick';
            } else {
              currentCaseType = 'drag';
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
          }
        } else {
          currentCaseType = null;
          savedRange = null;
          savedCursorPosition = null;
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
