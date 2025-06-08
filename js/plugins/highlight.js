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

  // ✅ 통합 키 핸들러 (Task 11: DOM 변경 후 커서 조정)
  function setupEnterKeyHandling(contentArea) {
    // 🔧 Task 11: DOM 변경 감지로 BR 생성 후 커서 조정
    const contentObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            // 🔧 Task 11: 하이라이트 span 내부에 BR 추가된 경우만 처리
            if (node.nodeName === 'BR' && 
                node.parentElement?.tagName === 'SPAN' && 
                node.parentElement?.style.backgroundColor &&
                node.parentElement?.hasAttribute('data-highlight-doubleclick')) {
              
              console.log('🔧 Task 11: 더블클릭 span 내 BR 생성 감지');
              
              // 🔧 Task 11: BR 뒤에 공백 문자 + 커서 위치 조정
              setTimeout(() => {
                adjustCursorAfterBR(node);
              }, 10);
            }
          });
        }
      });
    });
    
    contentObserver.observe(contentArea, { 
      childList: true, 
      subtree: true
    });
    
    // 기존 키 핸들러는 완전 기본 동작만 허용
    const doubleClickKeyHandler = (e) => {
      if (e.key === 'Enter' && currentCaseType === 'doubleclick') {
        console.log('🔧 Task 11: 더블클릭 Enter - 완전 기본 동작');
        // 아무것도 하지 않음 (기본 동작 허용)
        return;
      }
    };
    
    contentArea.addEventListener('keydown', doubleClickKeyHandler, true);
    
    // 기존 버블링 핸들러 수정
    contentArea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (currentCaseType === 'cursor') {
          handleCursorCaseEnter(e, contentArea);
        } else if (currentCaseType === 'drag') {
          handleDragCaseEnter(e, contentArea);
        } else if (currentCaseType === 'doubleclick') {
          handleDoubleClickCaseEnter(e, contentArea);
        }
      }
    });
  }

  // 🔧 Task 11: BR 생성 후 커서 위치 조정 함수
  function adjustCursorAfterBR(brElement) {
    const span = brElement.parentElement;
    if (!span) return;
    
    console.log('🔧 Task 11: BR 후 커서 조정 시작:', {
      spanHTML: span.innerHTML,
      brNextSibling: brElement.nextSibling?.nodeName
    });
    
    // 🔧 Task 11: BR 뒤에 공백 문자가 없으면 추가
    if (!brElement.nextSibling || 
        brElement.nextSibling.nodeType !== Node.TEXT_NODE ||
        !brElement.nextSibling.textContent.startsWith('\u00A0')) {
      
      const spaceNode = document.createTextNode('\u00A0');
      
      if (brElement.nextSibling) {
        span.insertBefore(spaceNode, brElement.nextSibling);
      } else {
        span.appendChild(spaceNode);
      }
      
      console.log('🔧 Task 11: 공백 문자 추가 완료');
    }
    
    // 🔧 Task 11: plugin-util.js 활용한 정확한 커서 위치 설정
    const spaceNode = brElement.nextSibling;
    if (spaceNode && spaceNode.nodeType === Node.TEXT_NODE) {
      // 공백 문자 시작 위치에 커서 설정 (시각적으로 다음 줄 시작)
      util.selection.moveCursorTo(spaceNode, 0);
      
      console.log('✅ Task 11: 커서 위치 조정 완료 - BR 다음 줄 시작');
      
      // 🔧 Task 11: 결과 확인
      setTimeout(() => {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          console.log('🔍 Task 11: 최종 커서 위치:', {
            container: range.startContainer.nodeName,
            offset: range.startOffset,
            parentElement: range.startContainer.parentElement?.tagName,
            isInSpan: range.startContainer.parentElement === span
          });
        }
      }, 50);
    }
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

  // ✅ 케이스 3: 더블클릭 전용 적용 함수 (Task 4.5: execCommand 전에 BR 제거)
  function applyDoubleClickHighlight(color, contentArea, colorIndicator) {
    const scrollPosition = util.scroll.savePosition();
    
    try {
      contentArea.focus({ preventScroll: true });
    } catch (e) {
      contentArea.focus();
    }
    
    // 🔧 Task 4.5: 선택 영역 복원 전에 BR 제거
    const restored = util.selection.restoreSelection(savedRange);
    if (!restored) return;
    
    // 🔧 Task 4.5: execCommand 전에 BR을 선택 영역에서 제거
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const fragment = range.cloneContents();
      const tempDiv = document.createElement('div');
      tempDiv.appendChild(fragment);
      
      if (tempDiv.innerHTML.includes('<br>')) {
        console.log('🔧 Task 4.5: execCommand 전 BR 제거');
        
        // TreeWalker로 BR 찾아서 선택 영역에서 제외
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
            console.log('✅ Task 4.5: BR 제외하고 range 재설정');
            break;
          }
        }
      }
    }
    
    // execCommand 실행 (BR이 제거된 상태)
    document.execCommand('hiliteColor', false, color);
    
    // 더블클릭 마커만 추가
    setTimeout(() => {
      const spans = contentArea.querySelectorAll('span[style*="background-color"]');
      const lastSpan = spans[spans.length - 1];
      if (lastSpan && !lastSpan.hasAttribute('data-highlight-doubleclick')) {
        lastSpan.setAttribute('data-highlight-doubleclick', 'true');
        console.log('✅ Task 4.5: 더블클릭 마커 추가');
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
        return; // Shift+Enter - span 내부 줄바꿈
      } else {
        e.preventDefault(); // Enter - span 밖으로 나가기
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
