/**
 * LiteEditor Font Family Plugin
 * 완전 분리: 커서/드래그/더블클릭 독립 시스템
 */

(function() {
  const util = window.PluginUtil || {};

  if (!util.selection) {
    console.error('FontFamilyPlugin: PluginUtil.selection이 필요합니다.');
  }

  // 전역 상태 변수
  let savedRange = null;
  let savedCursorPosition = null;
  let isDropdownOpen = false;
  let currentCaseType = null; // 'cursor', 'drag', 'doubleclick'
  
  /**
   * 글꼴 데이터 로드 함수
   */
  function loadFontData() {
    if (window.LiteEditorFontData && typeof window.LiteEditorFontData.getFonts === 'function') {
      return window.LiteEditorFontData.getFonts();
    } else {
      return [
        { type: 'group_header', name: '기본 글꼴' },
        { type: 'divider' },
        { name: 'Arial', value: 'Arial, sans-serif' },
        { name: 'Times New Roman', value: 'Times New Roman, serif' },
        { name: 'Courier New', value: 'Courier New, monospace' }, 
        { name: 'Gulim', value: 'Gulim, sans-serif' },
        { name: 'Dotum', value: 'Dotum, sans-serif' },
        { name: 'Batang', value: 'Batang, serif' },
        { name: 'Do Hyeon', value: 'Do Hyeon, sans-serif' },
        { name: 'Noto Sans KR', value: 'Noto Sans KR, sans-serif' },
      ];
    }
  }
  
  /**
   * 글꼴 데이터 스크립트 로드 함수
   */
  function loadFontScript(callback) {
    if (window.LiteEditorFontData) {
      if (callback) callback();
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'js/data/fontList.js';
    script.onload = function() {
      if (callback) callback();
    };
    script.onerror = function() {
      if (callback) callback();
    };
    
    document.head.appendChild(script);
  }

  // 🔧 공통 유틸리티 함수들
  function findFontElement(contentArea) {
    const selection = util.selection.getSafeSelection();
    if (!selection || !selection.rangeCount) return null;
    
    const range = selection.getRangeAt(0);
    let element = range.startContainer.nodeType === Node.TEXT_NODE 
      ? range.startContainer.parentElement 
      : range.startContainer;
    
    // 더블클릭 폰트 태그 우선 검색 (상호 간섭 방지)
    while (element && element !== contentArea) {
      if (element.hasAttribute && element.hasAttribute('data-font-doubleclick')) {
        return { element, selection, range, isDoubleClickElement: true };
      }
      element = element.parentElement;
    }
    
    // 일반 폰트 요소 검색
    element = range.startContainer.nodeType === Node.TEXT_NODE 
      ? range.startContainer.parentElement 
      : range.startContainer;
    
    while (element && element !== contentArea) {
      if ((element.tagName === 'FONT') || 
          (element.tagName === 'SPAN' && element.style.fontFamily)) {
        return { element, selection, range, isDoubleClickElement: false };
      }
      element = element.parentElement;
    }
    
    return null;
  }

  // 🔥 실시간 케이스 감지 함수 (핵심 수정)
  function detectCurrentCaseType(contentArea) {
    const selection = util.selection.getSafeSelection();
    if (!selection || !selection.rangeCount) return null;
    
    const range = selection.getRangeAt(0);
    const selectedText = range.toString().trim();
    
    if (selectedText) {
      const fragment = range.cloneContents();
      const tempDiv = document.createElement('div');
      tempDiv.appendChild(fragment);
      
      if (tempDiv.innerHTML.includes('<br>')) {
        return 'doubleclick';
      } else {
        return 'drag';
      }
    } else {
      return 'cursor';
    }
  }

  function handleShiftEnterInFont(selection, fontElement) {
    console.log('🔧 폰트 태그 내 Shift+Enter 처리');
    
    const currentRange = selection.getRangeAt(0);
    
    // 현재 커서가 폰트 태그 내부에 있는지 확인
    const cursorNode = currentRange.startContainer;
    const isInsideFont = fontElement.contains(cursorNode) || fontElement === cursorNode;
    
    if (!isInsideFont) {
      console.warn('⚠️ 커서가 폰트 태그 외부에 있음');
      return;
    }
    
    // 기존 선택 내용 삭제
    if (!currentRange.collapsed) {
      currentRange.deleteContents();
    }
    
    // BR 요소 생성 및 삽입
    const br = document.createElement('br');
    currentRange.insertNode(br);
    
    // BR 다음에 공백 문자 추가 (커서 위치 확보)
    const spaceNode = document.createTextNode('\u00A0');
    br.parentNode.insertBefore(spaceNode, br.nextSibling);
    
    // 커서를 공백 문자 시작 위치로 이동 (폰트 태그 내부 유지)
    const newRange = document.createRange();
    newRange.setStart(spaceNode, 0);
    newRange.collapse(true);
    
    selection.removeAllRanges();
    selection.addRange(newRange);
    
    console.log('✅ 폰트 태그 내 BR 생성 완료');
  }

  function handleEnterExitFont(fontElement, contentArea) {
    console.log('🔧 폰트 태그 탈출 Enter 처리');
    
    // 새로운 P 태그 생성
    const newP = util.dom.createElement('p');
    newP.appendChild(document.createTextNode('\u00A0'));
    
    // 폰트 요소가 속한 부모 블록 찾기
    const parentBlock = util.dom.findClosestBlock(fontElement, contentArea);
    
    if (parentBlock && parentBlock.parentNode) {
      parentBlock.parentNode.insertBefore(newP, parentBlock.nextSibling);
      console.log('✅ 부모 블록 다음에 새 P 생성:', parentBlock.tagName);
    } else {
      // fallback: 폰트 요소 다음에 직접 삽입
      if (fontElement.parentNode) {
        fontElement.parentNode.insertBefore(newP, fontElement.nextSibling);
        console.log('✅ 폰트 요소 다음에 직접 P 생성');
      } else {
        // 최종 fallback: contentArea 끝에 추가
        contentArea.appendChild(newP);
        console.log('✅ contentArea 끝에 P 생성 (fallback)');
      }
    }
    
    // 커서를 새 P 태그로 이동
    util.selection.moveCursorTo(newP.firstChild, 0);
    console.log('✅ 커서를 새 P로 이동 완료');
  }

  function removeDuplicateBR(element) {
    setTimeout(() => {
      const allBRs = element.querySelectorAll('br');
      for (let i = allBRs.length - 1; i > 0; i--) {
        const currentBR = allBRs[i];
        const prevBR = allBRs[i - 1];
        
        // 현재 BR과 이전 BR 사이에 의미있는 텍스트가 있는지 확인
        let prevNode = currentBR.previousSibling;
        while (prevNode && prevNode.nodeType === Node.TEXT_NODE && prevNode.textContent.trim() === '') {
          prevNode = prevNode.previousSibling;
        }
        
        // 연속된 BR이면 중복 제거
        if (prevNode === prevBR) {
          currentBR.remove();
        }
      }
    }, 10);
  }

  function safeFocus(contentArea) {
    try {
      if (document.activeElement !== contentArea) {
        contentArea.focus({ preventScroll: true });
      }
    } catch (e) {
      try {
        contentArea.focus();
      } catch (e2) {
        console.warn('FontFamily: 포커스 설정 실패:', e2);
      }
    }
  }

  function updateFontButtonText(fontText, fontName) {
    if (fontText && fontName) {
      fontText.textContent = fontName;
      fontText.title = fontName; // 툴팁으로도 표시
    }
  }

  // 🔥 **통합 키보드 이벤트 핸들러** (핵심 수정)
  function setupUnifiedFontKeyHandling(contentArea) {
    const existingHandler = contentArea._unifiedFontKeyHandler;
    if (existingHandler) {
      contentArea.removeEventListener('keydown', existingHandler);
    }
    
    const unifiedHandler = (e) => {
      if (e.key !== 'Enter') return;
      
      // 실시간으로 폰트 요소 감지
      const fontResult = findFontElement(contentArea);
      if (!fontResult) return;
      
      const { element, selection, isDoubleClickElement } = fontResult;
      
      // 실시간으로 케이스 타입 감지
      const realTimeCaseType = detectCurrentCaseType(contentArea);
      if (!realTimeCaseType) return;
      
      console.log(`🎯 실시간 감지: ${realTimeCaseType} 케이스, 폰트 요소:`, element.tagName);
      
      if (element && ((element.tagName === 'FONT') || 
                     (element.tagName === 'SPAN' && element.style.fontFamily))) {
        
        if (e.shiftKey) {
          console.log(`🔧 ${realTimeCaseType} Shift+Enter 처리`);
          e.preventDefault();
          
          try {
            handleShiftEnterInFont(selection, element);
            util.editor.dispatchEditorEvent(contentArea);
            removeDuplicateBR(element);
          } catch (err) {
            console.error(`❌ ${realTimeCaseType} Shift+Enter 처리 중 오류:`, err);
          }
          
        } else {
          console.log(`🔧 ${realTimeCaseType} Enter 처리`);
          e.preventDefault();
          
          try {
            handleEnterExitFont(element, contentArea);
            util.editor.dispatchEditorEvent(contentArea);
          } catch (err) {
            console.error(`❌ ${realTimeCaseType} Enter 처리 중 오류:`, err);
          }
        }
      }
    };
    
    contentArea._unifiedFontKeyHandler = unifiedHandler;
    contentArea.addEventListener('keydown', unifiedHandler);
    console.log('✅ 통합 폰트 키보드 핸들러 등록 완료');
  }

  // 🔥 시스템 1: 커서 전용 완전 독립 시스템
  const CursorSystem = {
    applyFont(fontValue, contentArea, fontText) {
      console.log('🔵 CursorSystem.applyFont 실행:', fontValue);
      
      try {
        safeFocus(contentArea);
        
        // 저장된 커서 위치 복원
        if (savedCursorPosition) {
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
        }
        
        // execCommand로 폰트 적용
        const success = document.execCommand('fontName', false, fontValue);
        
        if (!success) {
          console.warn('🔵 execCommand fontName 실패, 수동 적용 시도');
          
          // execCommand 실패시 수동 적용
          const sel = window.getSelection();
          if (sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            const fontElement = document.createElement('font');
            fontElement.face = fontValue;
            
            try {
              range.surroundContents(fontElement);
            } catch (e) {
              // surroundContents 실패시 내용을 감싸기
              const contents = range.extractContents();
              fontElement.appendChild(contents);
              range.insertNode(fontElement);
            }
          }
        }
        
      } catch (err) {
        console.error('🔵 CursorSystem.applyFont 오류:', err);
      }
    }
  };

  // 🔥 시스템 2: 드래그 전용 완전 독립 시스템
  const DragSystem = {
    applyFont(fontValue, contentArea, fontText) {
      console.log('🟢 DragSystem.applyFont 실행:', fontValue);
      
      try {
        const scrollPosition = util.scroll.savePosition();
        
        safeFocus(contentArea);
        
        // 저장된 선택 영역 복원
        const restored = util.selection.restoreSelection(savedRange);
        if (!restored) {
          console.warn('🟢 드래그 선택 영역 복원 실패');
          util.scroll.restorePosition(scrollPosition);
          return;
        }
        
        // execCommand로 폰트 적용
        const success = document.execCommand('fontName', false, fontValue);
        
        if (!success) {
          console.warn('🟢 execCommand fontName 실패, 수동 적용 시도');
          
          // execCommand 실패시 수동 적용
          const sel = window.getSelection();
          if (sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            const fontElement = document.createElement('font');
            fontElement.face = fontValue;
            
            try {
              const contents = range.extractContents();
              fontElement.appendChild(contents);
              range.insertNode(fontElement);
              
              // 선택 영역을 새로 생성된 font 요소로 설정
              range.selectNode(fontElement);
              sel.removeAllRanges();
              sel.addRange(range);
            } catch (e) {
              console.error('🟢 수동 폰트 적용 실패:', e);
            }
          }
        }
        
        util.scroll.restorePosition(scrollPosition);
        
      } catch (err) {
        console.error('🟢 DragSystem.applyFont 오류:', err);
      }
    }
  };

  // 🔥 시스템 3: 더블클릭 전용 완전 독립 시스템
  const DoubleClickSystem = {
    applyFont(fontValue, contentArea, fontText) {
      console.log('🔴 DoubleClickSystem.applyFont 실행:', fontValue);
      
      try {
        const scrollPosition = util.scroll.savePosition();
        
        safeFocus(contentArea);
        
        // 저장된 선택 영역 복원
        const restored = util.selection.restoreSelection(savedRange);
        if (!restored) {
          console.warn('🔴 더블클릭 선택 영역 복원 실패');
          util.scroll.restorePosition(scrollPosition);
          return;
        }
        
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const fragment = range.cloneContents();
          const tempDiv = document.createElement('div');
          tempDiv.appendChild(fragment);
          
          // 더블클릭시 줄바꿈 유지를 위한 BR 처리
          if (tempDiv.innerHTML.includes('<br>')) {
            console.log('🔴 더블클릭: execCommand 전 BR 처리');
            
            // BR이 포함된 선택 영역에서 BR 앞까지만 선택하도록 조정
            const walker = document.createTreeWalker(
              range.commonAncestorContainer,
              NodeFilter.SHOW_ALL,
              null,
              false
            );
            
            const nodes = [];
            while (walker.nextNode()) {
              if (range.intersectsNode(walker.currentNode)) {
                nodes.push(walker.currentNode);
              }
            }
            
            // BR 노드를 찾아서 그 앞까지만 선택
            for (let i = 0; i < nodes.length; i++) {
              const node = nodes[i];
              if (node.nodeName === 'BR' && range.intersectsNode(node)) {
                try {
                  range.setEndBefore(node);
                  selection.removeAllRanges();
                  selection.addRange(range);
                  break;
                } catch (e) {
                  console.warn('🔴 BR 처리 중 범위 조정 실패:', e);
                }
              }
            }
          }
        }
        
        // execCommand로 폰트 적용
        const success = document.execCommand('fontName', false, fontValue);
        
        if (!success) {
          console.warn('🔴 execCommand fontName 실패, 수동 적용 시도');
          
          // execCommand 실패시 수동 적용
          const sel = window.getSelection();
          if (sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            const fontElement = document.createElement('font');
            fontElement.face = fontValue;
            
            try {
              const contents = range.extractContents();
              fontElement.appendChild(contents);
              range.insertNode(fontElement);
              
              // 더블클릭 마커 추가
              fontElement.setAttribute('data-font-doubleclick', 'true');
              
              // 선택 영역을 새로 생성된 font 요소로 설정
              range.selectNode(fontElement);
              sel.removeAllRanges();
              sel.addRange(range);
            } catch (e) {
              console.error('🔴 수동 폰트 적용 실패:', e);
            }
          }
        } else {
          // execCommand 성공 후 더블클릭 마커 추가
          setTimeout(() => {
            const fontElements = contentArea.querySelectorAll('font[face]');
            const lastFont = fontElements[fontElements.length - 1];
            if (lastFont && !lastFont.hasAttribute('data-font-doubleclick')) {
              lastFont.setAttribute('data-font-doubleclick', 'true');
            }
          }, 10);
        }
        
        util.scroll.restorePosition(scrollPosition);
        
      } catch (err) {
        console.error('🔴 DoubleClickSystem.applyFont 오류:', err);
      }
    }
  };

  // 🔥 완전 분리: 3개 독립 적용 함수 (상태 초기화 제거)
  function applyCursorFont(fontValue, fontName, contentArea, fontText) {
    updateFontButtonText(fontText, fontName);
    CursorSystem.applyFont(fontValue, contentArea, fontText);
    util.editor.dispatchEditorEvent(contentArea);
    
    // ✅ 상태 초기화 제거 - 키보드 이벤트 처리를 위해 유지
    console.log('✅ 커서 폰트 적용 완료, 상태 유지');
  }

  function applyDragFont(fontValue, fontName, contentArea, fontText) {
    updateFontButtonText(fontText, fontName);
    DragSystem.applyFont(fontValue, contentArea, fontText);
    util.editor.dispatchEditorEvent(contentArea);
    
    // ✅ 상태 초기화 제거 - 키보드 이벤트 처리를 위해 유지
    console.log('✅ 드래그 폰트 적용 완료, 상태 유지');
  }

  function applyDoubleClickFont(fontValue, fontName, contentArea, fontText) {
    updateFontButtonText(fontText, fontName);
    DoubleClickSystem.applyFont(fontValue, contentArea, fontText);
    util.editor.dispatchEditorEvent(contentArea);
    
    // ✅ 상태 초기화 제거 - 키보드 이벤트 처리를 위해 유지
    console.log('✅ 더블클릭 폰트 적용 완료, 상태 유지');
  }

  LiteEditor.registerPlugin('fontFamily', {
    customRender: function(toolbar, contentArea) {
      // ✅ 통합 키보드 핸들러 등록 (3개 분리 핸들러 대신)
      setupUnifiedFontKeyHandling(contentArea);
      
      // 1. 글꼴 버튼 컨테이너 생성
      const fontContainer = util.dom.createElement('div', {
        className: 'lite-editor-font-button',
        title: 'Font Family'
      }, {
        position: 'relative'
      });
      
      // 2. 버튼 아이콘 추가
      const icon = util.dom.createElement('i', {
        className: 'material-icons',
        textContent: 'font_download'
      }, {
        fontSize: '18px',
        marginRight: '5px'
      });
      fontContainer.appendChild(icon);
      
      // 3. 글꼴 텍스트 추가
      const fontText = util.dom.createElement('span', {
        textContent: 'Font Family'
      }, {
        fontSize: '14px'
      });
      fontContainer.appendChild(fontText);
      
      // 4. 드롭다운 메뉴 생성
      const dropdownMenu = util.dom.createElement('div', {
        id: 'font-family-dropdown',
        className: 'lite-editor-font-dropdown lite-editor-dropdown-menu'
      }, {
        position: 'absolute',
        zIndex: '2147483647',
        backgroundColor: '#fff',
        border: '1px solid #ccc',
        borderRadius: '4px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        maxHeight: '300px',
        minWidth: '180px',
        overflowY: 'auto',
        padding: '8px 0',
        display: 'none'
      });
      
      // 5. 외부 글꼴 데이터 파일을 로드하고 드롭다운 메뉴 구성
      loadFontScript(function() {
        const fonts = loadFontData();
        
        fonts.forEach(font => {
          // 구분선 처리
          if (font.type === 'divider') {
            const divider = util.dom.createElement('hr', {
              className: 'lite-editor-font-divider'
            }, {
              margin: '0',
              border: 'none',
              borderTop: '1px solid #eee',
              height: '1px'
            });
            dropdownMenu.appendChild(divider);
            return;
          }
          
          // 그룹 헤더 처리
          if (font.type === 'group_header') {
            const header = util.dom.createElement('div', {
              textContent: font.name
            }, {
              fontWeight: 'bold',
              padding: '5px 10px',
              color: '#2f67ff',
              fontSize: '11px',
              backgroundColor: '#f5f5f5'
            });
            dropdownMenu.appendChild(header);
            return;
          }
          
          // 글꼴 항목 추가
          const fontItem = util.dom.createElement('div', {
            textContent: font.name
          }, {
            padding: '5px 10px',
            cursor: 'pointer',
            fontFamily: font.value,
            fontSize: '13px',
            transition: 'background-color 0.2s'
          });
          
          // 호버 이벤트
          fontItem.addEventListener('mouseover', () => {
            fontItem.style.backgroundColor = '#e9e9e9';
          });
          
          fontItem.addEventListener('mouseout', () => {
            fontItem.style.backgroundColor = '';
          });
          
          // 클릭 이벤트 - 3개 시스템별 처리
          fontItem.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // 드롭다운 닫기
            dropdownMenu.style.display = 'none';
            dropdownMenu.classList.remove('show');
            fontContainer.classList.remove('active');
            isDropdownOpen = false;
            
            util.activeModalManager.unregister(dropdownMenu);
            
            // 케이스별 폰트 적용
            try {
              if (currentCaseType === 'cursor') {
                console.log('✅ 커서 케이스로 폰트 적용:', font.name);
                applyCursorFont(font.value, font.name, contentArea, fontText);
              } else if (currentCaseType === 'drag') {
                console.log('✅ 드래그 케이스로 폰트 적용:', font.name);
                applyDragFont(font.value, font.name, contentArea, fontText);
              } else if (currentCaseType === 'doubleclick') {
                console.log('✅ 더블클릭 케이스로 폰트 적용:', font.name);
                applyDoubleClickFont(font.value, font.name, contentArea, fontText);
              } else {
                console.warn('⚠️ 케이스 타입이 설정되지 않음:', currentCaseType);
              }
            } catch (err) {
              console.error('❌ 폰트 적용 중 오류:', err);
            }
          });
          
          dropdownMenu.appendChild(fontItem);
        });
      });
      
      // 6. 드롭다운을 document.body에 추가
      document.body.appendChild(dropdownMenu);
      
      // 7. 케이스 감지 로직 (정밀화)
      fontContainer.addEventListener('mousedown', (e) => {
        const selection = util.selection.getSafeSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const selectedText = range.toString().trim();
          
          if (selectedText) {
            const fragment = range.cloneContents();
            const tempDiv = document.createElement('div');
            tempDiv.appendChild(fragment);
            
            // BR 포함 여부로 더블클릭/드래그 구분
            if (tempDiv.innerHTML.includes('<br>')) {
              currentCaseType = 'doubleclick';
              console.log('✅ 더블클릭 케이스 감지 (BR 포함)');
            } else {
              currentCaseType = 'drag';
              console.log('✅ 드래그 케이스 감지 (BR 미포함)');
            }
            
            // 선택 영역 저장
            savedRange = util.selection.saveSelection();
            savedCursorPosition = null;
            
          } else {
            currentCaseType = 'cursor';
            console.log('✅ 커서 케이스 감지 (선택 텍스트 없음)');
            
            // 커서 위치 저장
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
          console.warn('⚠️ 선택 영역을 가져올 수 없음');
        }
      });

      // 8. 드롭다운 토글 로직
      fontContainer.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const isVisible = dropdownMenu.classList.contains('show');
        
        if (!isVisible && util.activeModalManager) {
          util.activeModalManager.closeAll();
        }
        
        if (isVisible) {
          // 닫기
          dropdownMenu.classList.remove('show');
          dropdownMenu.style.display = 'none';
          fontContainer.classList.remove('active');
          isDropdownOpen = false;
          util.activeModalManager.unregister(dropdownMenu);
        } else {
          // 열기
          dropdownMenu.classList.add('show');
          dropdownMenu.style.display = 'block';
          fontContainer.classList.add('active');
          isDropdownOpen = true;
          
          // 위치 설정
          util.layer.setLayerPosition(dropdownMenu, fontContainer);
          
          // 닫기 콜백
          dropdownMenu.closeCallback = () => {
            dropdownMenu.classList.remove('show');
            dropdownMenu.style.display = 'none';
            fontContainer.classList.remove('active');
            isDropdownOpen = false;
          };
          
          util.activeModalManager.register(dropdownMenu);
          
          // 외부 클릭 핸들러
          util.setupOutsideClickHandler(dropdownMenu, () => {
            dropdownMenu.classList.remove('show');
            dropdownMenu.style.display = 'none';
            fontContainer.classList.remove('active');
            isDropdownOpen = false;
            util.activeModalManager.unregister(dropdownMenu);
            
            // 포커스 복원
            if (document.activeElement !== contentArea) {
              contentArea.focus({ preventScroll: true });
            }
          }, [fontContainer]);
        }
      });
      
      return fontContainer;
    }
  });
})();

