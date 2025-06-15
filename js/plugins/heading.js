/**
 * LiteEditor Heading Plugin
 * 제목 및 정렬 관련 플러그인
 */

(function() {
  // PluginUtil 참조
  const util = window.PluginUtil || {};
  if (!util.selection) {
    console.error('HeadingPlugin: PluginUtil.selection이 필요합니다.');
  }
  
  // 전역 상태 변수
  let savedRange = null;
  let savedCursorPosition = null;
  let isDropdownOpen = false;
  
  /**
   * Enter 키 처리 함수 - heading 블럭에서 나가기
   */
  function setupEnterKeyHandling(contentArea) {
    contentArea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const selection = util.selection.getSafeSelection();
        if (!selection || !selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        const startContainer = range.startContainer;
        
        let headingElement = null;
        if (startContainer.nodeType === Node.TEXT_NODE) {
          headingElement = startContainer.parentElement;
        } else {
          headingElement = startContainer;
        }
        
        // heading 요소 찾기
        while (headingElement && headingElement !== contentArea) {
          if (['H1', 'H2', 'H3'].includes(headingElement.tagName)) {
            break;
          }
          headingElement = headingElement.parentElement;
        }
        
        if (headingElement && ['H1', 'H2', 'H3'].includes(headingElement.tagName)) {
          if (e.shiftKey) {
            // Shift + Enter: heading 유지 (기본 동작)
            return;
          } else {
            // Enter: heading 블럭 밖으로 나가기
            e.preventDefault();
            
            const newP = util.dom.createElement('p');
            newP.appendChild(document.createTextNode('\u00A0'));
            
            const parentBlock = util.dom.findClosestBlock(headingElement, contentArea);
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

  // 제목 플러그인
  LiteEditor.registerPlugin('heading', {
    title: 'Heading',
    icon: 'title',
    customRender: function(toolbar, contentArea) {
      // 🔧 Enter 키 처리 설정
      setupEnterKeyHandling(contentArea);
      
      // 제목 버튼 생성
      const headingButton = util.dom.createElement('button', {
        className: 'lite-editor-button lite-editor-heading-button',
        title: 'Heading (⌘1~4)'

      });
      
      // 아이콘 추가
      const icon = util.dom.createElement('i', {
        className: 'material-icons',
        textContent: 'format_size'
      });
      headingButton.appendChild(icon);
      
      // 드롭다운 생성
      const dropdownMenu = util.dom.createElement('div', {
        className: 'lite-editor-heading-dropdown lite-editor-dropdown-menu'
      }, {
        position: 'absolute',
        zIndex: '2147483647',
        backgroundColor: '#fff',
        border: '1px solid #ccc',
        borderRadius: '4px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        padding: '8px 0',
        display: 'none'
      });
      
      // 제목 레벨 옵션
      const headingLevels = [
        { text: 'Heading 1', tag: 'h1' },
        { text: 'Heading 2', tag: 'h2' },
        { text: 'Heading 3', tag: 'h3' },
        { text: 'Paragraph', tag: 'p' }
      ];
      
      // 각 제목 레벨에 대한 옵션 추가
      headingLevels.forEach(level => {
        const option = util.dom.createElement('div', {
          className: 'lite-editor-heading-option lite-editor-heading-' + level.tag,
          textContent: level.text
        });
        
        // 해당 태그에 맞는 스타일 적용
        switch (level.tag) {
          case 'h1':
            option.style.fontSize = '28px';
            option.style.fontWeight = 'bold';
            break;
          case 'h2':
            option.style.fontSize = '22px';
            option.style.fontWeight = 'bold';
            break;
          case 'h3':
            option.style.fontSize = '16px';
            option.style.fontWeight = 'bold';
            break;
          case 'p':
            option.style.fontSize = '14px';
            option.style.fontWeight = 'normal';
            break;
        }
        
        // 클릭 이벤트 - execCommand 사용
        option.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          try {
            contentArea.focus({ preventScroll: true });
          } catch (e) {
            contentArea.focus();
          }
          
          // 🔧 heading 적용 (execCommand 사용)
          applyHeading(level.tag, contentArea);

          closeDropdown();
        });
        
        dropdownMenu.appendChild(option);
      });
      
      document.body.appendChild(dropdownMenu);
      
      // 🔧 mousedown에서 선택 영역/커서 위치 저장
      headingButton.addEventListener('mousedown', (e) => {
        const selection = util.selection.getSafeSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const selectedText = range.toString().trim();
          
          if (selectedText) {
            savedRange = util.selection.saveSelection();
            savedCursorPosition = null;
          } else {
            savedRange = null;
            // 커서 위치 저장
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
      
      // 버튼 클릭 이벤트
      headingButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 🔧 포커스 강제 복원
        if (document.activeElement !== contentArea) {
          try {
            contentArea.focus({ preventScroll: true });
          } catch (e) {
            contentArea.focus();
          }
        }
        
        const isVisible = dropdownMenu.classList.contains('show');
        
        if (!isVisible) {
          util.activeModalManager.closeAll();
        }
        
        if (isVisible) {
          closeDropdown();
        } else {
          dropdownMenu.classList.add('show');
          dropdownMenu.style.display = 'block';
          headingButton.classList.add('active');
          isDropdownOpen = true;
          
          util.layer.setLayerPosition(dropdownMenu, headingButton);
          
          dropdownMenu.closeCallback = () => {
            dropdownMenu.classList.remove('show');
            dropdownMenu.style.display = 'none';
            headingButton.classList.remove('active');
            isDropdownOpen = false;
          };
          
          util.activeModalManager.register(dropdownMenu);
          util.setupOutsideClickHandler(dropdownMenu, () => {
            closeDropdown();
          }, [headingButton]);
        }
      });

      // 드롭다운 옵션들이 모두 생성된 후에 키보드 이벤트 추가
      const headingOptions = dropdownMenu.querySelectorAll('.lite-editor-heading-option');

      // 각 옵션에 tabindex 추가
      headingOptions.forEach((option, index) => {
        option.setAttribute('tabindex', '0');
        
        // Enter/Space 키로 선택 가능하게
        option.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            option.click();
          }
        });
      });

      // 드롭다운 메뉴 키보드 네비게이션
      dropdownMenu.addEventListener('keydown', (e) => {
        const currentIndex = Array.from(headingOptions).findIndex(option => option === document.activeElement);
        
        switch(e.key) {
          case 'Tab':
            if (e.shiftKey) {
              if (currentIndex <= 0) {
                e.preventDefault();
                closeDropdown();
                headingButton.focus();
              }
            } else {
              if (currentIndex >= headingOptions.length - 1) {
                e.preventDefault();
                closeDropdown();
                // 다음 툴바 버튼으로 포커스 이동은 브라우저가 자동 처리
              }
            }
            break;
            
          case 'Escape':
            e.preventDefault();
            closeDropdown();
            headingButton.focus();
            break;
            
          case 'ArrowDown':
            e.preventDefault();
            const nextOption = headingOptions[currentIndex + 1] || headingOptions[0];
            nextOption.focus();
            break;
            
          case 'ArrowUp':
            e.preventDefault();
            const prevOption = headingOptions[currentIndex - 1] || headingOptions[headingOptions.length - 1];
            prevOption.focus();
            break;
        }
      });

      function closeDropdown() {
        dropdownMenu.classList.remove('show');
        dropdownMenu.style.display = 'none';
        headingButton.classList.remove('active');
        isDropdownOpen = false;
        util.activeModalManager.unregister(dropdownMenu);
      }

      return headingButton;
    }
  });

  // 🔧 새로운 heading 적용 함수 (execCommand 기반)
  function applyHeading(tag, contentArea) {
    try {
      if (savedRange) {
        // 선택 영역이 있는 경우
        const restored = util.selection.restoreSelection(savedRange);
        if (!restored) return;
        
        // formatBlock execCommand 사용
        document.execCommand('formatBlock', false, tag.toLowerCase());
        
      } else {
        // 커서 위치 모드
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
            // 에러 시 에디터 끝으로 이동
            const lastTextNode = getLastTextNode(contentArea);
            if (lastTextNode) {
              const range = document.createRange();
              const sel = window.getSelection();
              range.setStart(lastTextNode, lastTextNode.length);
              range.setEnd(lastTextNode, lastTextNode.length);
              sel.removeAllRanges();
              sel.addRange(range);
            }
          }
  }
  
        // formatBlock execCommand 사용
        document.execCommand('formatBlock', false, tag.toLowerCase());
    }
    
      util.editor.dispatchEditorEvent(contentArea);
      
    } catch (e) {
      console.error('Heading 적용 실패:', e);
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

  // 단축키로 사용할 헤딩 적용 함수
  function applyHeadingByShortcut(tag, contentArea) {
    try {
      contentArea.focus({ preventScroll: true });
    } catch (e) {
      contentArea.focus();
    }
    
    // formatBlock execCommand 사용
    document.execCommand('formatBlock', false, tag.toLowerCase());
    util.editor.dispatchEditorEvent(contentArea);
  }
  
  // ✅ 수정: strike.js처럼 직접 document 레벨에서 capture: true로 처리
  document.addEventListener('keydown', function(e) {
    // 에디터 영역 찾기
    const contentArea = e.target.closest('[contenteditable="true"]');
    if (!contentArea) return;

    const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);

    // ✅ Alt+Cmd+1 (Mac) / Alt+Ctrl+1 (Windows/Linux)
    if (e.altKey && ((isMac && e.metaKey) || (!isMac && e.ctrlKey)) && !e.shiftKey && e.key === '1') {
      e.preventDefault();
      e.stopImmediatePropagation();
      applyHeadingByShortcut('h1', contentArea);
      return;
    }
    
    // ✅ Alt+Cmd+2 (Mac) / Alt+Ctrl+2 (Windows/Linux)
    if (e.altKey && ((isMac && e.metaKey) || (!isMac && e.ctrlKey)) && !e.shiftKey && e.key === '2') {
      e.preventDefault();
      e.stopImmediatePropagation();
      applyHeadingByShortcut('h2', contentArea);
      return;
    }
    
    // ✅ Alt+Cmd+3 (Mac) / Alt+Ctrl+3 (Windows/Linux)
    if (e.altKey && ((isMac && e.metaKey) || (!isMac && e.ctrlKey)) && !e.shiftKey && e.key === '3') {
      e.preventDefault();
      e.stopImmediatePropagation();
      applyHeadingByShortcut('h3', contentArea);
      return;
    }
    
    // ✅ Alt+Cmd+4 (Mac) / Alt+Ctrl+4 (Windows/Linux)
    if (e.altKey && ((isMac && e.metaKey) || (!isMac && e.ctrlKey)) && !e.shiftKey && e.key === '4') {
      e.preventDefault();
      e.stopImmediatePropagation();
      applyHeadingByShortcut('p', contentArea);
      return;
    }
  }, true); // ✅ capture: true로 최우선 처리
})();
