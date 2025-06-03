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
    // ✅ 중복 등록 방지
    if (contentArea.hasAttribute('data-highlight-events-setup')) {
      return;
    }
    
    contentArea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          
          // ✅ fontFamily.js와 동일한 안전한 currentElement 처리
          let currentElement;
          if (range.startContainer.nodeType === Node.TEXT_NODE) {
            currentElement = range.startContainer.parentElement;
          } else if (range.startContainer.nodeType === Node.ELEMENT_NODE) {
            currentElement = range.startContainer;
          } else {
            return;
          }
          
          if (!currentElement || typeof currentElement.closest !== 'function') {
            return;
          }
          
          // ✅ fontFamily.js와 동일한 방식으로 highlight 요소 찾기
          const highlightElement = currentElement.closest('span[style*="background-color"]');
          
          // ✅ 더 엄격한 highlight 영역 감지 (fontFamily.js 방식)
          let isInHighlightArea = false;
          
          if (highlightElement) {
            if (highlightElement.tagName === 'SPAN' && highlightElement.style.backgroundColor) {
              isInHighlightArea = true;
            }
            
            // 추가 검증: 현재 위치가 실제로 highlight 요소 내부인지 확인
            if (isInHighlightArea) {
              isInHighlightArea = highlightElement.contains(range.startContainer) || 
                                highlightElement === range.startContainer ||
                                (range.startContainer.nodeType === Node.TEXT_NODE && 
                                 highlightElement.contains(range.startContainer.parentElement));
            }
          }
          
          // ✅ highlight 영역이 아닌 경우 기본 동작 허용
          if (!isInHighlightArea) {
            return; // 브라우저 기본 엔터 동작 허용
          }
          
          // highlight 영역에서 엔터키 처리
          if (e.shiftKey) {
            // Shift+Enter: highlight 유지하며 줄바꿈 (br만 삽입)
            e.preventDefault();
            document.execCommand('insertLineBreak');
          } else {
            // Enter: highlight 밖으로 나가기
            e.preventDefault();
            
            // fontFamily.js와 동일한 방식: 상위 블록 요소 찾기
            const blockElement = highlightElement.closest('p, div, h1, h2, h3, h4, h5, h6, article, section, li, blockquote');
            
            if (blockElement) {
              const newP = document.createElement('p');
              newP.innerHTML = '<br>';
              blockElement.parentNode.insertBefore(newP, blockElement.nextSibling);
              
              const newRange = document.createRange();
              newRange.setStart(newP, 0);
              newRange.collapse(true);
              selection.removeAllRanges();
              selection.addRange(newRange);
            } else {
              const newP = document.createElement('p');
              newP.innerHTML = '<br>';
              highlightElement.parentNode.insertBefore(newP, highlightElement.nextSibling);
              
              const newRange = document.createRange();
              newRange.setStart(newP, 0);
              newRange.collapse(true);
              selection.removeAllRanges();
              selection.addRange(newRange);
            }
            
            util.editor.dispatchEditorEvent(contentArea);
          }
        }
      }
    });
    
    // ✅ 중복 방지 플래그 설정
    contentArea.setAttribute('data-highlight-events-setup', 'true');
  }
  
  /**
   * ✅ 완전한 서식 보존 배경색(하이라이트) 적용 함수 (execCommand 제거)
   */
  function applyHighlightColor(color, contentArea, colorIndicator) {
    try {
      if (colorIndicator) {
        colorIndicator.style.backgroundColor = color;
        colorIndicator.style.border = 'none';
      }
      
      if (savedRange) {
        // 선택 영역이 있는 경우
        const scrollPosition = util.scroll.savePosition();
        
        try {
          contentArea.focus({ preventScroll: true });
        } catch (e) {
          contentArea.focus();
        }
        
        const restored = util.selection.restoreSelection(savedRange);
        if (!restored) {
          errorHandler.logError('HighlightPlugin', 'P303', '선택 영역 복원 실패');
          return;
        }
        
        // 🔧 서식 정보 직접 추출 방식 (cloneContents 문제 해결)
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          
          if (!range.collapsed) {
            // ✅ 1단계: 선택된 텍스트만 추출 (안전)
            const selectedText = range.toString();
            
            // ✅ 2단계: 시작 지점의 상위 요소들에서 서식 정보 추출
            let startContainer = range.startContainer;
            if (startContainer.nodeType === Node.TEXT_NODE) {
              startContainer = startContainer.parentElement;
            }
            
            // ✅ 3단계: 적용된 모든 서식 태그들 수집
            const formatTags = [];
            let currentElement = startContainer;
            
            while (currentElement && currentElement !== contentArea) {
              const tagName = currentElement.tagName?.toLowerCase();
              
              // 서식 관련 태그들만 수집
              if (['b', 'strong', 'i', 'em', 'u', 'strike', 's', 'del', 'ins', 'sub', 'sup', 'mark', 'small', 'code'].includes(tagName)) {
                formatTags.unshift({
                  tagName: tagName,
                  element: currentElement.cloneNode(false) // 속성 포함 복사
                });
              }
              
              currentElement = currentElement.parentElement;
            }
            

            // ✅ 4단계: 선택 범위 상세 분석 (디버깅)
            errorHandler.colorLog('HIGHLIGHT', '🔍 선택 범위 분석', {
              selectedText: range.toString(),
              startContainer: range.startContainer.nodeName,
              startOffset: range.startOffset,
              endContainer: range.endContainer.nodeName,
              endOffset: range.endOffset,
              commonAncestor: range.commonAncestorContainer.nodeName,
              // DOM 구조 확인
              beforeDelete: range.startContainer.parentNode.innerHTML.substring(0, 200)
            }, '#ff9800');

            // ✅ 4단계: 선택 영역 제거
            range.deleteContents();

            // ✅ 디버깅: 삭제 후 DOM 상태
            errorHandler.colorLog('HIGHLIGHT', '🔍 삭제 후 DOM 상태', {
              afterDelete: range.startContainer.parentNode.innerHTML.substring(0, 200)
            }, '#ff5722');

            // ✅ 5단계: 서식 태그들을 중첩해서 적용
            let finalElement = document.createTextNode(selectedText);

            
            // 안쪽부터 바깥쪽으로 태그 적용
            formatTags.reverse().forEach(formatInfo => {
              const newElement = formatInfo.element.cloneNode(false);
              newElement.appendChild(finalElement);
              finalElement = newElement;
            });
            
            // ✅ 6단계: 서식 태그 중복 방지를 위한 구조 변경
            const spanElement = document.createElement('span');
            spanElement.style.backgroundColor = color;

            if (formatTags.length > 0) {
              // 서식이 있는 경우: span 안에 서식 적용
              spanElement.appendChild(finalElement);
            } else {
              // 서식이 없는 경우: span 안에 텍스트만
              spanElement.appendChild(document.createTextNode(selectedText));
            }

            // ✅ 7단계: 새 span을 원래 위치에 삽입
            range.insertNode(spanElement);
            
            // ✅ 8단계: contentArea 매개변수 전달
            insertLineBreakIfNeeded(spanElement, contentArea);

            // 그리고 커서 위치 모드에서도:
            // ✅ 커서 위치에도 다음 텍스트와 붙음 방지 적용
            insertLineBreakIfNeeded(spanElement, contentArea);
            
            errorHandler.colorLog('HIGHLIGHT', '✅ 서식 보존 하이라이트 완료', {
              finalHTML: spanElement.outerHTML.substring(0, 200),
              preservedFormats: formatTags.map(f => f.tagName),
              color: color
            }, '#4caf50');
          }
        }
        
        util.scroll.restorePosition(scrollPosition);
        
      } else {
        // 커서 위치 모드 (기존 방식 유지)
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
            errorHandler.colorLog('HIGHLIGHT', '❌ 커서 위치 복원 실패', { error: e.message }, '#f44336');
          }
        }
        
        // 🔧 커서 위치에 하이라이트 span 생성 (수정된 버전)
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          
          // ✅ 수정: span을 먼저 생성하고 직접 삽입 (replaceChild 사용 안 함)
          const spanElement = document.createElement('span');
          spanElement.style.backgroundColor = color;
          spanElement.appendChild(document.createTextNode('\u00A0'));
          
          // ✅ 수정: 직접 range에 삽입
          range.insertNode(spanElement);
          
          // ✅ 커서 위치에도 다음 텍스트와 붙음 방지 적용
          insertLineBreakIfNeeded(spanElement, contentArea);
          
          // 커서를 span 내부로 이동
          const newRange = document.createRange();
          newRange.selectNodeContents(spanElement);
          newRange.collapse(false);
          selection.removeAllRanges();
          selection.addRange(newRange);
          
          errorHandler.colorLog('HIGHLIGHT', '✅ 커서 하이라이트 생성 완료', {
            color: color
          }, '#4caf50');
        }
      }
      
      util.editor.dispatchEditorEvent(contentArea);
      
    } catch (e) {
      errorHandler.logError('HighlightPlugin', 'HIGHLIGHT_APPLY_ERROR', e);
    }
  }
  
  /**
   * ✅ 완전한 텍스트 붙음 방지 함수 (code.js 방식 적용)
   */
  function insertLineBreakIfNeeded(spanElement, contentArea) {  // ✅ contentArea 매개변수 추가
    // 1. 가장 바깥쪽 서식 태그 찾기
    let outerMostElement = spanElement;
    let parentElement = spanElement.parentElement;
    
    // span의 부모가 서식 태그인지 확인하며 가장 바깥쪽까지 찾기
    while (parentElement && parentElement !== contentArea) {
      const tagName = parentElement.tagName?.toLowerCase();
      
      if (['b', 'strong', 'i', 'em', 'u', 'strike', 's', 'del', 'ins', 'sub', 'sup', 'mark', 'small', 'code'].includes(tagName)) {
        outerMostElement = parentElement;
        parentElement = parentElement.parentElement;
      } else {
        break; // 서식 태그가 아니면 중단
      }
    }
    
    // 2. 가장 바깥쪽 요소의 nextSibling 확인
    const nextNode = outerMostElement.nextSibling;
    
    errorHandler.colorLog('HIGHLIGHT', '🔍 붙음 방지 분석', {
      spanElement: spanElement.tagName,
      outerMostElement: outerMostElement.tagName,
      nextNode: nextNode?.nodeType === Node.TEXT_NODE ? 'TEXT_NODE' : nextNode?.tagName || 'null',
      nextText: nextNode?.textContent?.substring(0, 20) || 'null'
    }, '#ff9800');
    
    // 3. 다음이 텍스트 노드이고 공백 없이 시작하는 경우 <br> 삽입
    if (nextNode && nextNode.nodeType === Node.TEXT_NODE) {
      const nextText = nextNode.textContent;
      
      if (nextText && !nextText.startsWith(' ') && nextText.trim()) {
        const br = document.createElement('br');
        outerMostElement.parentNode.insertBefore(br, nextNode);
        
        errorHandler.colorLog('HIGHLIGHT', '✅ 서식 태그 뒤 줄바꿈 삽입', {
          insertedAfter: outerMostElement.tagName,
          nextText: nextText.substring(0, 20) + '...'
        }, '#4caf50');
        
        return true;
      }
    }
    
    // 4. 이미 <br> 태그가 있는 경우
    else if (nextNode && nextNode.nodeType === Node.ELEMENT_NODE && nextNode.tagName === 'BR') {
      errorHandler.colorLog('HIGHLIGHT', '⏭️ 이미 <br> 태그 존재', {}, '#9e9e9e');
      return false;
    }
    
    // 5. 다음 노드가 없는 경우
    else if (!nextNode) {
      errorHandler.colorLog('HIGHLIGHT', '⏭️ 마지막 위치', {}, '#9e9e9e');
      return false;
    }
    
    return false;
  }
  
  
  LiteEditor.registerPlugin('highlight', {
    customRender: function(toolbar, contentArea) {
      // ✅ 수정: fontColor.js와 동일하게 즉시 등록
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