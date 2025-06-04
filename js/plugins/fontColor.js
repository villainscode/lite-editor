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
   * Enter 키 처리 함수 - font color 블럭에서 나가기
   */
  function setupEnterKeyHandling(contentArea, container) {
    contentArea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const selection = util.selection.getSafeSelection();
        if (!selection || !selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        const startContainer = range.startContainer;
        
        let fontElement = null;
        if (startContainer.nodeType === Node.TEXT_NODE) {
          fontElement = startContainer.parentElement;
        } else {
          fontElement = startContainer;
        }
        
        while (fontElement && fontElement !== contentArea) {
          if (fontElement.tagName === 'FONT' && fontElement.color) {
            break;
          }
          fontElement = fontElement.parentElement;
        }
        
        if (fontElement && fontElement.tagName === 'FONT' && fontElement.color) {
          if (e.shiftKey) {
            // Shift + Enter: font color 유지 (기본 동작)
            return;
          } else {
            // Enter: font color 블럭 밖으로 나가기
            e.preventDefault();
            
            const newP = util.dom.createElement('p');
            newP.appendChild(document.createTextNode('\u00A0'));
            
            const parentBlock = util.dom.findClosestBlock(fontElement, contentArea);
            if (parentBlock && parentBlock.parentNode) {
              parentBlock.parentNode.insertBefore(newP, parentBlock.nextSibling);
              util.selection.moveCursorTo(newP.firstChild, 0);
              
              // 🔧 추가: 폰트 컬러 탈출 후 버튼 상태 업데이트
              setTimeout(() => {
                if (container && container.classList) {
                  updateFontColorButtonState(container);
                }
              }, 10);
            }
          }
        }
      }
    });
  }
  
  /**
   * 색상 적용 함수
   */
  function applyFontColor(color, contentArea, colorIndicator) {
    try {
      // 🔧 디버깅: 함수 시작 시점의 상태 확인
      errorHandler.colorLog('FONT_COLOR', '=== 폰트 컬러 적용 시작 ===', {
        color: color,
        hasSelection: !!savedRange,
        activeElement: document.activeElement,
        hasFocus: document.hasFocus()
      }, '#e91e63');
      
      // 🔧 디버깅: 현재 선택 영역 상태 로그
      errorHandler.selectionLog.start(contentArea);
      
      if (colorIndicator) {
        colorIndicator.style.backgroundColor = color;
      }
      
      if (savedRange) {
        // 케이스 1: 선택 영역이 있는 경우
        errorHandler.colorLog('FONT_COLOR', '📝 선택 영역 모드', null, '#2196f3');
        
        const scrollPosition = util.scroll.savePosition();
        
        // 🔧 디버깅: 포커스 설정 전 상태
        errorHandler.colorLog('FONT_COLOR', '포커스 설정 전', {
          activeElement: document.activeElement?.tagName,
          hasFocus: document.hasFocus(),
          selection: errorHandler.getSelectionInfo(contentArea)
        }, '#ff9800');
        
      try {
        contentArea.focus({ preventScroll: true });
      } catch (e) {
        contentArea.focus();
      }
      
        // 🔧 디버깅: 포커스 설정 후 상태
        errorHandler.colorLog('FONT_COLOR', '포커스 설정 후', {
          activeElement: document.activeElement?.tagName,
          hasFocus: document.hasFocus(),
          selection: errorHandler.getSelectionInfo(contentArea)
        }, '#ff9800');
        
        const restored = util.selection.restoreSelection(savedRange);
        if (!restored) {
          errorHandler.logError('FontColorPlugin', errorHandler.codes.PLUGINS.FONT.APPLY, '선택 영역 복원 실패');
          return;
        }
        
        // 🔧 디버깅: 선택 영역 복원 후 상태
        errorHandler.selectionLog.restore(contentArea);
        
        // 선택된 텍스트에 폰트 컬러 적용
        document.execCommand('foreColor', false, color);
        
        // 🔧 디버깅: execCommand 후 상태
        errorHandler.colorLog('FONT_COLOR', 'execCommand 실행 후', {
          activeElement: document.activeElement?.tagName,
          selection: errorHandler.getSelectionInfo(contentArea)
        }, '#4caf50');
        
        util.scroll.restorePosition(scrollPosition);
        
      } else {
        // 🔧 케이스 2: 커서 위치 모드
        errorHandler.colorLog('FONT_COLOR', '🎯 커서 위치 모드', null, '#9c27b0');
        
        // 🔧 포커스 강제 설정 (execCommand 전에 반드시 필요)
        if (document.activeElement !== contentArea) {
          errorHandler.colorLog('FONT_COLOR', '🔧 포커스 강제 설정', {
            from: document.activeElement?.tagName,
            to: 'DIV'
          }, '#ff5722');
          
          try {
            contentArea.focus({ preventScroll: true });
          } catch (e) {
            contentArea.focus();
          }
        }
        
        // 🔧 저장된 커서 위치로 복원
        if (savedCursorPosition) {
          errorHandler.colorLog('FONT_COLOR', '🔧 저장된 커서 위치 복원', {
            startContainer: savedCursorPosition.startContainer?.nodeName,
            startOffset: savedCursorPosition.startOffset
          }, '#ff5722');
          
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
              
              errorHandler.colorLog('FONT_COLOR', '✅ 커서 위치 복원 성공', {
                startContainer: range.startContainer?.nodeName,
                startOffset: range.startOffset
              }, '#4caf50');
            } else {
              // 저장된 위치가 유효하지 않으면 에디터 끝으로 이동
              const lastTextNode = getLastTextNode(contentArea);
              if (lastTextNode) {
                range.setStart(lastTextNode, lastTextNode.length);
                range.setEnd(lastTextNode, lastTextNode.length);
                sel.removeAllRanges();
                sel.addRange(range);
                
                errorHandler.colorLog('FONT_COLOR', '⚠️ 저장된 위치 무효 - 에디터 끝으로 이동', null, '#ff9800');
              }
            }
          } catch (e) {
            errorHandler.colorLog('FONT_COLOR', '❌ 커서 위치 복원 실패', { error: e.message }, '#f44336');
          }
        }
        
        // 🔧 현재 커서 위치 재확인
        const currentSelection = window.getSelection();
        if (currentSelection && currentSelection.rangeCount > 0) {
          const range = currentSelection.getRangeAt(0);
          errorHandler.colorLog('FONT_COLOR', '현재 커서 위치 상세', {
            startContainer: range.startContainer?.nodeName,
            startOffset: range.startOffset,
            collapsed: range.collapsed,
            activeElement: document.activeElement?.tagName,
            contentAreaFocused: document.activeElement === contentArea
          }, '#673ab7');
        } else {
          errorHandler.colorLog('FONT_COLOR', '❌ 커서 위치 확인 실패', null, '#f44336');
        }
        
        // 🔧 execCommand 실행
        const success = document.execCommand('foreColor', false, color);
        
        errorHandler.colorLog('FONT_COLOR', 'execCommand 실행 결과', {
          success: success,
          activeElement: document.activeElement?.tagName,
          contentAreaFocused: document.activeElement === contentArea
        }, success ? '#4caf50' : '#f44336');
      }
      
      // 🔧 디버깅: 최종 상태 확인
      errorHandler.selectionLog.final(contentArea);
      
        util.editor.dispatchEditorEvent(contentArea);
      
      // 🔧 디버깅: 함수 완료 시점 상태
      errorHandler.colorLog('FONT_COLOR', '=== 폰트 컬러 적용 완료 ===', {
        activeElement: document.activeElement?.tagName,
        contentAreaFocused: document.activeElement === contentArea,
        hasFocus: document.hasFocus()
      }, '#e91e63');
      
    } catch (e) {
      errorHandler.logError('FontColorPlugin', errorHandler.codes.PLUGINS.FONT.APPLY, e);
      
      // 🔧 디버깅: 에러 발생 시 상태
      errorHandler.colorLog('FONT_COLOR', '❌ 에러 발생', {
        error: e.message,
        activeElement: document.activeElement?.tagName,
        hasFocus: document.hasFocus()
      }, '#f44336');
    }
  }
  
  /**
   * 🔧 폰트 컬러 버튼 상태 업데이트 함수 (fontFamily.js 방식)
   */
  function updateFontColorButtonState(container) {
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
      
      // font 태그로 색상이 설정된 요소 찾기
      const fontElement = currentElement.closest('font[color]');
      
      if (fontElement) {
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
      console.error('FontColorPlugin: 버튼 상태 업데이트 중 오류', e);
      container.classList.remove('active');
    }
  }
  
  /**
   * 🔧 이벤트 리스너 설정 (fontFamily.js 방식으로 단순화)
   */
  function setupFontColorButtonStateEvents(container, contentArea) {
    // 🔧 디바운스 적용 (fontFamily.js와 동일)
    const debouncedUpdateState = util.events.debounce(() => {
      updateFontColorButtonState(container);
    }, 150);
    
    // ✅ fontFamily.js와 동일한 이벤트만
    contentArea.addEventListener('keyup', debouncedUpdateState);
    contentArea.addEventListener('click', debouncedUpdateState);
    
    // 초기 상태 업데이트
    setTimeout(() => updateFontColorButtonState(container), 50);
    
    // 정리 함수 반환
    return () => {
      contentArea.removeEventListener('keyup', debouncedUpdateState);
      contentArea.removeEventListener('click', debouncedUpdateState);
    };
  }
  
  // 글자 색상 플러그인 등록
  LiteEditor.registerPlugin('fontColor', {
    customRender: function(toolbar, contentArea) {
      const colorContainer = util.dom.createElement('div', {
        className: 'lite-editor-button',
        title: 'Font Color'
      });
      
      setupEnterKeyHandling(contentArea, colorContainer);
      
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
            
            // 폰트 컬러 적용
            applyFontColor(color, contentArea, colorIndicator);
          });
          
          colorGrid.appendChild(colorCell);
        });
      });
      
      document.body.appendChild(dropdownMenu);
      
      // 🔧 mousedown에서 선택 영역 저장 (선택이 없어도 처리)
      colorContainer.addEventListener('mousedown', (e) => {
        // 🔧 디버깅: mousedown 시점 상태
        errorHandler.colorLog('FONT_COLOR', '🖱️ mousedown 이벤트', {
          activeElement: document.activeElement?.tagName,
          contentAreaFocused: document.activeElement === contentArea,
          hasFocus: document.hasFocus()
        }, '#ff9800');
        
        const selection = util.selection.getSafeSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const selectedText = range.toString().trim();
          
          if (selectedText) {
            savedRange = util.selection.saveSelection();
            savedCursorPosition = null; // 선택 영역이 있으면 커서 위치는 저장하지 않음
            errorHandler.selectionLog.save(contentArea);
            errorHandler.colorLog('FONT_COLOR', '✅ 선택 영역 저장됨', { text: selectedText }, '#4caf50');
          } else {
            savedRange = null;
            
            // 🔧 현재 커서 위치 정확히 저장
            savedCursorPosition = {
              startContainer: range.startContainer,
              startOffset: range.startOffset,
              endContainer: range.endContainer,
              endOffset: range.endOffset
            };
            
            errorHandler.colorLog('FONT_COLOR', '✅ 커서 위치 저장됨', {
              startContainer: range.startContainer?.nodeName,
              startOffset: range.startOffset,
              collapsed: range.collapsed
            }, '#9c27b0');
          }
        } else {
          savedRange = null;
          savedCursorPosition = null;
          errorHandler.colorLog('FONT_COLOR', '❌ 선택 영역을 가져올 수 없음', null, '#f44336');
        }
      });
      
      colorContainer.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 🔧 디버깅: click 이벤트 시점 상태
        errorHandler.colorLog('FONT_COLOR', '🖱️ click 이벤트', {
          hasSelection: !!savedRange,
          activeElement: document.activeElement?.tagName,
          contentAreaFocused: document.activeElement === contentArea,
          hasFocus: document.hasFocus()
        }, '#ff9800');
        
        // 🔧 포커스 강제 복원 (스크롤 처리 전에)
        if (document.activeElement !== contentArea) {
          errorHandler.colorLog('FONT_COLOR', '🔧 포커스 강제 복원', {
            from: document.activeElement?.tagName,
            to: 'DIV'
          }, '#ff5722');
          
          try {
            contentArea.focus({ preventScroll: true });
          } catch (e) {
            contentArea.focus();
          }
        }
        
        // 🔧 디버깅: 포커스 복원 후 상태
        errorHandler.colorLog('FONT_COLOR', '포커스 복원 후', {
          activeElement: document.activeElement?.tagName,
          contentAreaFocused: document.activeElement === contentArea,
          hasFocus: document.hasFocus()
        }, '#4caf50');
        
        const isVisible = dropdownMenu.classList.contains('show');
        
        if (!isVisible) {
          // 🔧 activeModalManager.closeAll() 추가
          if (util.activeModalManager) {
            util.activeModalManager.closeAll();
          }
          
          // 기존 코드는 그대로 유지 (호환성)
          const otherModals = document.querySelectorAll('.lite-editor-dropdown-menu.show');
          otherModals.forEach(modal => {
            if (modal !== dropdownMenu) {
              modal.classList.remove('show');
              modal.style.display = 'none';
            }
          });
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
            
            // 🔧 드롭다운 닫힐 때도 포커스 유지
            if (document.activeElement !== contentArea) {
              contentArea.focus({ preventScroll: true });
            }
          }, [colorContainer]);
        }
        
        // 🔧 디버깅: click 이벤트 완료 후 상태
        errorHandler.colorLog('FONT_COLOR', '✅ click 이벤트 완료', {
          dropdownVisible: !isVisible,
          activeElement: document.activeElement?.tagName,
          contentAreaFocused: document.activeElement === contentArea,
          hasFocus: document.hasFocus()
        }, '#4caf50');
      });
      
      // 🔧 이벤트 설정 추가 (한 번만 실행되도록)
      if (!contentArea.hasAttribute('data-font-color-events-setup')) {
        setupFontColorButtonStateEvents(colorContainer, contentArea);
        contentArea.setAttribute('data-font-color-events-setup', 'true');
      }
      
      return colorContainer;
    }
  });
})();

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