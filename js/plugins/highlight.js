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
  let savedRange = null;          // 임시로 저장된 선택 영역
  let savedCursorPosition = null;  // 커서 위치 저장용
  let isDropdownOpen = false;     // 드롭다운 열림 상태
  
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
  
  function setupEnterKeyHandling(contentArea) {
    contentArea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const selection = util.selection.getSafeSelection();
        if (!selection || !selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        const startContainer = range.startContainer;
        
        let emphasisSpan = null;
        if (startContainer.nodeType === Node.TEXT_NODE) {
          emphasisSpan = startContainer.parentElement;
        } else {
          emphasisSpan = startContainer;
        }
        
        while (emphasisSpan && emphasisSpan !== contentArea) {
          if (emphasisSpan.tagName === 'SPAN' && 
              emphasisSpan.style.backgroundColor) {
            break;
          }
          emphasisSpan = emphasisSpan.parentElement;
        }
        
        if (emphasisSpan && emphasisSpan.tagName === 'SPAN' && emphasisSpan.style.backgroundColor) {
          if (e.shiftKey) {
            // 🔧 Shift + Enter: emphasis 유지 (기본 동작)
            return;  // fontColor.js와 동일하게 단순화
          } else {
            // Enter: emphasis 영역 밖으로 나가기
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
    });
  }
  
  /**
   * 배경색(하이라이트) 적용 함수
   */
  function applyHighlightColor(color, contentArea, colorIndicator) {
    try {
      if (colorIndicator) {
        colorIndicator.style.backgroundColor = color;
        colorIndicator.style.border = 'none';
      }
      
      if (savedRange) {
        const scrollPosition = util.scroll.savePosition();
        
        try {
          contentArea.focus({ preventScroll: true });
        } catch (e) {
          contentArea.focus();
        }
        
        const restored = util.selection.restoreSelection(savedRange);
        if (!restored) {
          console.error('❌ 선택 영역 복원 실패');
          return;
        }
        
        // ✅ execCommand 전 상태 기록
        const beforeSelection = window.getSelection();
        const beforeRange = beforeSelection.getRangeAt(0);
        const beforeFragment = beforeRange.cloneContents();
        const beforeDiv = document.createElement('div');
        beforeDiv.appendChild(beforeFragment);
        
        console.log('\n4️⃣ execCommand 실행 전:');
        console.log('  - 복원된 선택 영역 HTML:', beforeDiv.innerHTML);
        console.log('  - BR 포함 여부:', beforeDiv.innerHTML.includes('<br>'));
        
        // 🔧 BR 포함 시에만 range 조정
        if (beforeDiv.innerHTML.includes('<br>')) {
          console.log('🛠️ BR 감지 - range 조정 실행');
          
          // BR을 선택 영역에서 제외
          const walker = document.createTreeWalker(
            beforeRange.commonAncestorContainer,
            NodeFilter.SHOW_ALL,
            null,
            false
          );
          
          while (walker.nextNode()) {
            const node = walker.currentNode;
            if (beforeRange.intersectsNode(node) && node.nodeName === 'BR') {
              beforeRange.setEndBefore(node);
              beforeSelection.removeAllRanges();
              beforeSelection.addRange(beforeRange);
              console.log('✅ BR 제외하고 range 재설정 완료');
              break;
            }
          }
        }
        
        // 🔧 execCommand 실행 (조정된 range로)
        document.execCommand('hiliteColor', false, color);
        
        // ✅ execCommand 후 결과 확인
        setTimeout(() => {
          console.log('\n5️⃣ execCommand 실행 후:');
          
          // 생성된 span 요소 찾기
          const spans = contentArea.querySelectorAll('span[style*="background-color"]');
          const lastSpan = spans[spans.length - 1]; // 방금 생성된 span
          
          if (lastSpan) {
            console.log('  - 생성된 span HTML:', lastSpan.outerHTML);
            console.log('  - span 내부 BR 여부:', lastSpan.innerHTML.includes('<br>'));
            console.log('  - span 다음 형제:', lastSpan.nextSibling?.nodeName || 'null');
            
            if (lastSpan.innerHTML.includes('<br>')) {
              console.log('🚨 문제 확인: BR이 span 안에 포함됨!');
              console.log('  해결 필요: BR을 span 밖으로 이동');
            } else {
              console.log('✅ 정상: BR이 span 밖에 있음');
            }
          }
          
          console.log('=== 선택 방식별 디버깅 완료 ===\n');
        }, 10);
        
        util.scroll.restorePosition(scrollPosition);
        
      } else {
        // 기존 커서 위치 모드 로직 유지
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
        
        const success = document.execCommand('hiliteColor', false, color);
        console.log('📝 execCommand 결과:', success);
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
            
            // 🔧 디버깅: 색상 셀 클릭
            errorHandler.colorLog('HIGHLIGHT', '🎨 색상 셀 클릭', {
              color: color,
              hasSelection: !!savedRange,
              hasCursorPosition: !!savedCursorPosition
            }, '#9c27b0');
            
            dropdownMenu.classList.remove('show');
            dropdownMenu.style.display = 'none';
            highlightContainer.classList.remove('active');
            isDropdownOpen = false;
            
            util.activeModalManager.unregister(dropdownMenu);
            
            // 🔧 하이라이트 적용 (스크롤 복원 없이)
            applyHighlightColor(color, contentArea, colorIndicator);
          });
          
          colorGrid.appendChild(colorCell);
        });
      });
      
      document.body.appendChild(dropdownMenu);
      
      highlightContainer.addEventListener('mousedown', (e) => {
        // 🔧 디버깅: mousedown 시점 상태
        errorHandler.colorLog('HIGHLIGHT', '🖱️ mousedown 이벤트', {
          activeElement: document.activeElement?.tagName,
          contentAreaFocused: document.activeElement === contentArea,
          hasFocus: document.hasFocus()
        }, '#ff9800');
        
        const selection = util.selection.getSafeSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const selectedText = range.toString().trim();
          
          // ✅ 핵심 디버깅: 선택 영역의 HTML 구조 분석
          const fragment = range.cloneContents();
          const tempDiv = document.createElement('div');
          tempDiv.appendChild(fragment);
          
          console.log('1️⃣ 선택 영역 기본 정보:');
          console.log('  - 선택된 텍스트:', `"${selectedText}"`);
          console.log('  - 선택 영역 HTML:', tempDiv.innerHTML);
          console.log('  - BR 포함 여부:', tempDiv.innerHTML.includes('<br>'));
          
          console.log('2️⃣ Range 상세 정보:');
          console.log('  - startContainer:', range.startContainer);
          console.log('  - startContainer.nodeType:', range.startContainer.nodeType);
          console.log('  - startOffset:', range.startOffset);
          console.log('  - endContainer:', range.endContainer);
          console.log('  - endContainer.nodeType:', range.endContainer.nodeType);
          console.log('  - endOffset:', range.endOffset);
          
          // ✅ 핵심: BR 노드가 선택 영역에 포함되었는지 확인
          if (tempDiv.innerHTML.includes('<br>')) {
            console.log('🚨 BR이 선택 영역에 포함됨!');
          }
          
          if (selectedText) {
            savedRange = util.selection.saveSelection();
            savedCursorPosition = null; // 선택 영역이 있으면 커서 위치는 저장하지 않음
            errorHandler.colorLog('HIGHLIGHT', '✅ 선택 영역 저장됨', { text: selectedText }, '#4caf50');
          } else {
            savedRange = null;
            
            // 🔧 현재 커서 위치 정확히 저장
            savedCursorPosition = {
              startContainer: range.startContainer,
              startOffset: range.startOffset,
              endContainer: range.endContainer,
              endOffset: range.endOffset
            };
            
            errorHandler.colorLog('HIGHLIGHT', '✅ 커서 위치 저장됨', {
              startContainer: range.startContainer?.nodeName,
              startOffset: range.startOffset,
              collapsed: range.collapsed
            }, '#9c27b0');
          }
        } else {
          savedRange = null;
          savedCursorPosition = null;
          errorHandler.colorLog('HIGHLIGHT', '❌ 선택 영역을 가져올 수 없음', null, '#f44336');
        }
      });
      
      highlightContainer.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 🔧 디버깅: click 이벤트 시점 상태
        errorHandler.colorLog('HIGHLIGHT', '🖱️ click 이벤트', {
          hasSelection: !!savedRange,
          hasCursorPosition: !!savedCursorPosition,
          activeElement: document.activeElement?.tagName,
          contentAreaFocused: document.activeElement === contentArea,
          hasFocus: document.hasFocus()
        }, '#ff9800');
        
        // 🔧 선택 영역이 없어도 커서 위치가 있으면 드롭다운 열기
        if (!savedRange && !savedCursorPosition) {
          errorHandler.colorLog('HIGHLIGHT', '❌ 선택 영역 및 커서 위치 없음', null, '#f44336');
          return;
        }
        
        // 🔧 포커스 강제 복원
        if (document.activeElement !== contentArea) {
          try {
            contentArea.focus({ preventScroll: true });
          } catch (e) {
            contentArea.focus();
          }
        }
        
        const isVisible = dropdownMenu.classList.contains('show');
        
        // ✅ 다른 모달 닫기를 조건부로 처리
        if (!isVisible && util.activeModalManager) {
          util.activeModalManager.closeAll();
        }
        
        if (isVisible) {
          // 닫기
          dropdownMenu.classList.remove('show');
          dropdownMenu.style.display = 'none';
          highlightContainer.classList.remove('active');
          isDropdownOpen = false;
          util.activeModalManager.unregister(dropdownMenu);
        } else {
          // ✅ 열기 로직을 setTimeout으로 지연 처리
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
          }, 10); // ✅ 10ms 지연으로 타이밍 이슈 해결
        }
        
        // 🔧 디버깅: click 이벤트 완료 후 상태
        errorHandler.colorLog('HIGHLIGHT', '✅ click 이벤트 완료', {
          dropdownVisible: !isVisible,
          activeElement: document.activeElement?.tagName,
          contentAreaFocused: document.activeElement === contentArea,
          hasFocus: document.hasFocus()
        }, '#4caf50');
      });
      
      return highlightContainer;
    }
  });
})();
