/**
 * LiteEditor 글꼴 플러그인
 * 글꼴 목록 표시를 위한 간소화 버전
 * 수정 버전 - 글꼴 적용 오류 수정
 * 업데이트 - 다국어 지원이 포함된 외부 데이터 파일 사용
 */

(function() {
  // PluginUtil 참조
  const util = window.PluginUtil || {};
  if (!util.selection) {
    console.error('FontFamilyPlugin: PluginUtil.selection이 필요합니다.');
  }
  
  // 🔴 중요: 전역 상태 변수 - 수정 금지
  let savedRange = null;          // 임시로 저장된 선택 영역
  let isDropdownOpen = false;
  let currentSelectedFontItem = null;
  let currentFontValue = null;    // 현재 선택된 폰트 값 저장
  
  // 폰트 데이터 캐싱
  let cachedFontData = null;
  function getCachedFontData() {
    if (!cachedFontData) {
      cachedFontData = loadFontData();
    }
    return cachedFontData;
  }

  // 이벤트 리스너 중복 방지
  let outsideClickCleanup = null;

  // 선택 영역 복원 함수 (util 사용)
  function restoreSelection() {
    if (!savedRange) return false;
    return util.selection.restoreSelection(savedRange);
  }
  
  /**
   * 글꼴 데이터 로드 함수
   * 다국어 지원이 포함된 외부 데이터 파일에서 글꼴 목록 가져오기
   * @returns {Array} 글꼴 목록 배열
   */
  function loadFontData() {
    // 외부 데이터 파일이 로드되었는지 확인
    if (window.LiteEditorFontData && typeof window.LiteEditorFontData.getFonts === 'function') {
      // 외부 데이터 파일에서 글꼴 목록 가져오기
      return window.LiteEditorFontData.getFonts();
    } else {
      // 대체: 데이터 파일이 로드되지 않은 경우 기본 글꼴 목록 반환
      errorHandler.logError('FontFamilyPlugin', errorHandler.codes.PLUGINS.FONT.LOAD, e);
      return [
        { type: 'group_header', name: '기본 글꼴' },
        { type: 'divider' },
        { name: 'Arial', value: 'Arial, sans-serif' },
        { name: 'Times New Roman', value: 'Times New Roman, serif' },
        { name: 'Courier New', value: 'Courier New, monospace' }, 
        { name: 'Gulim', value: 'Gulim, sans-serif' },
      ];
    }
  }
  
  /**
   * 글꼴 데이터 스크립트 로드 함수
   * 외부 글꼴 데이터 파일을 동적으로 로드
   * @param {Function} callback - 로드 후 실행할 콜백 함수
   */
  function loadFontScript(callback) {
    // 이미 로드된 경우 콜백 즉시 실행
    if (window.LiteEditorFontData) {
      if (callback) callback();
      return;
    }
    
    // 스크립트 로드
    const script = document.createElement('script');
    script.src = 'js/data/fontList.js';
    script.onload = function() {
      if (callback) callback();
    };
    script.onerror = function() {
      errorHandler.logError('FontFamilyPlugin', errorHandler.codes.PLUGINS.FONT.LOAD, e);
      if (callback) callback();
    };
    
    document.head.appendChild(script);
  }
  
  // 🔴 중요: UI 상태 업데이트 함수 - 핵심 로직, 수정 시 주의
  function updateFontButtonState(fontContainer, fontText, icon) {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const currentElement = range.startContainer.nodeType === Node.TEXT_NODE 
        ? range.startContainer.parentElement 
        : range.startContainer;
      
      const fontElement = currentElement.closest('span[style*="font-family"], font');
      
      if (fontElement) {
        // 🔴 중요: 폰트 영역 내부 - 활성 상태 설정
        fontContainer.classList.add('active');
        fontContainer.style.backgroundColor = '#e9e9e9';
        fontContainer.style.color = '#1a73e8';
        icon.style.color = '#1a73e8';
        
        // 🔴 중요: 현재 폰트에 해당하는 드롭다운 항목 선택
        let currentFontFamily = null;
        
        // font 태그의 face 속성에서 폰트 추출
        if (fontElement.tagName === 'FONT' && fontElement.getAttribute('face')) {
          currentFontFamily = fontElement.getAttribute('face');
        } 
        // span 태그의 style 속성에서 폰트 추출
        else {
          const styleAttr = fontElement.getAttribute('style');
          const fontFamilyMatch = styleAttr?.match(/font-family:\s*([^;]+)/);
          if (fontFamilyMatch) {
            currentFontFamily = fontFamilyMatch[1].trim().replace(/['"]/g, '');
          }
        }
        
        if (currentFontFamily) {
          // 캐시된 데이터 사용
          const fonts = getCachedFontData();
          const matchedFont = fonts.find(f => f.value && f.value.includes(currentFontFamily.split(',')[0]));
          
          if (matchedFont) {
            // 폰트명 업데이트
            fontText.textContent = matchedFont.name;
            
            // 🔴 중요: 드롭다운에서 해당 폰트 항목 선택 표시
            const dropdownMenu = document.getElementById('font-family-dropdown');
            if (dropdownMenu) {
              // 기존 선택 해제
              if (currentSelectedFontItem) {
                currentSelectedFontItem.style.backgroundColor = '';
              }
              
              // 현재 폰트에 해당하는 드롭다운 항목 찾기
              const fontItems = dropdownMenu.querySelectorAll('div[style*="font-family"]');
              fontItems.forEach(item => {
                const itemFontFamily = item.style.fontFamily;
                if (itemFontFamily && itemFontFamily.includes(currentFontFamily.split(',')[0])) {
                  item.style.backgroundColor = '#e9e9e9';
                  currentSelectedFontItem = item;
                } else {
                  item.style.backgroundColor = '';
                }
              });
            }
            
            // 전역 상태 업데이트
            currentFontValue = matchedFont.value;
          }
        }
      } else {
        // 🔴 중요: 폰트 영역 외부 - 기본 상태로 완전 복원
        fontContainer.classList.remove('active');
        fontContainer.style.backgroundColor = '';  // 인라인 스타일 제거
        fontContainer.style.color = '';             // 인라인 스타일 제거
        icon.style.color = '';                      // 아이콘 색상도 기본으로
        fontText.textContent = 'Font Family';
        
        // 드롭다운 선택 해제
        const dropdownMenu = document.getElementById('font-family-dropdown');
        if (dropdownMenu) {
          const fontItems = dropdownMenu.querySelectorAll('div[style*="font-family"]');
          fontItems.forEach(item => {
            item.style.backgroundColor = '';
          });
        }
        
        // 전역 상태 초기화
        currentFontValue = null;
        currentSelectedFontItem = null;
      }
    }
  }

  // 글꼴 플러그인 등록
  LiteEditor.registerPlugin('fontFamily', {
    customRender: function(toolbar, contentArea) {
      // 1. 글꼴 버튼 컨테이너 생성 (셀렉트 박스 스타일)
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
      
      // 5. 드롭다운 메뉴 생성 - 정렬 플러그인처럼 처리
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
      
      // 외부 글꼴 데이터 파일을 로드하고 드롭다운 메뉴 구성
      loadFontScript(function() {
        // 다국어 지원이 포함된 글꼴 목록 가져오기
        const fonts = loadFontData();
        
        // 드롭다운에 글꼴 목록 추가
        fonts.forEach(font => {
          // 구분선 처리
          if (font.type === 'divider') {
            const divider = util.dom.createElement('hr', {
              className: 'lite-editor-font-divider'
            }, {
              margin: '0'
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
            fontSize: '13px'
          });
          
          // 호버 이벤트
          fontItem.addEventListener('mouseover', () => {
            fontItem.style.backgroundColor = '#e9e9e9';
          });
          
          fontItem.addEventListener('mouseout', () => {
            if (fontItem !== currentSelectedFontItem) {
            fontItem.style.backgroundColor = '';
            }
          });
          
          // 🔴 중요: 클릭 이벤트 - 글꼴 적용 핵심 로직
          fontItem.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // 1. UI 업데이트
            if (currentSelectedFontItem) {
                currentSelectedFontItem.style.backgroundColor = '';
            }
            currentSelectedFontItem = fontItem;
            fontItem.style.backgroundColor = '#e9e9e9';
            
            // CSS 호버 효과 적용
            fontContainer.style.backgroundColor = '#e9e9e9';  
            fontContainer.style.color = '#1a73e8';            
            icon.style.color = '#1a73e8';                     
            
            // 드롭다운 닫기
            dropdownMenu.style.display = 'none';
            dropdownMenu.classList.remove('show');
            fontContainer.classList.remove('active');
            isDropdownOpen = false;
            
            // 모달 관리 시스템에서 제거
            util.activeModalManager.unregister(dropdownMenu);
            
            // 2. Scroll 위치 저장
            const scrollPosition = util.scroll.savePosition();
            
            // 3. Selection 복원 (한 번만)
            if (savedRange) {
                const restored = restoreSelection();
                if (!restored) {
                    console.warn('Selection 복원 실패');
                }
            }
            
            // 4. Focus 설정 (selection 복원 후)
            if (!contentArea.contains(document.activeElement)) {
                contentArea.focus({ preventScroll: true });
            }
            
            // 폰트 값 저장
            currentFontValue = font.value;
            
            // 🔴 중요: execCommand 실행 - 수정 금지
            try {
                document.execCommand('fontName', false, font.value);
            } catch (error) {
                errorHandler.logError('FontFamilyPlugin', 'execCommand 실행 중 오류:', error);
            }
            
            // 6. Scroll 위치 복원
            util.scroll.restorePosition(scrollPosition);
            
            // 7. UI 업데이트
            fontText.textContent = font.name;
          });
          
          dropdownMenu.appendChild(fontItem);
        });
      });
      
      // 6. 드롭다운을 document.body에 직접 추가 (정렬 플러그인과 동일)
      document.body.appendChild(dropdownMenu);
      
      // 🔴 중요: 드롭다운 토글 로직 - 수정 시 주의
      fontContainer.addEventListener('mousedown', (e) => {
        // 드롭다운이 열려있지 않을 때만 selection 저장
        if (!isDropdownOpen) {
          const currentSelection = window.getSelection();
          if (currentSelection.rangeCount > 0) {
            savedRange = util.selection.saveSelection();
          }
        }
      });

      fontContainer.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 현재 드롭다운의 상태 확인
        const isVisible = dropdownMenu.classList.contains('show');
        
        // 다른 모든 드롭다운 닫기 - activeModalManager 사용
        if (!isVisible) {
          util.activeModalManager.closeAll();
        }
        
        if (isVisible) {
          // 닫기
          dropdownMenu.classList.remove('show');
          dropdownMenu.style.display = 'none';
          fontContainer.classList.remove('active');
          isDropdownOpen = false;
          
          // 모달 관리 시스템에서 제거
          util.activeModalManager.unregister(dropdownMenu);
        } else {
          // 열기
          dropdownMenu.classList.add('show');
          dropdownMenu.style.display = 'block';
          fontContainer.classList.add('active');
          isDropdownOpen = true;
          
          // 드롭다운 위치 설정
          const buttonRect = fontContainer.getBoundingClientRect();
          dropdownMenu.style.top = (buttonRect.bottom + window.scrollY) + 'px';
          dropdownMenu.style.left = (buttonRect.left - 3) + 'px';
          
          // 활성 모달 등록
          dropdownMenu.closeCallback = () => {
            dropdownMenu.classList.remove('show');
            dropdownMenu.style.display = 'none';
            fontContainer.classList.remove('active');
            isDropdownOpen = false;
          };
          
          // 드롭다운 열기 시 이전 핸들러 정리
          if (outsideClickCleanup) {
            outsideClickCleanup();
          }
          outsideClickCleanup = util.setupOutsideClickHandler(dropdownMenu, () => {
            dropdownMenu.classList.remove('show');
            dropdownMenu.style.display = 'none';
            fontContainer.classList.remove('active');
            isDropdownOpen = false;
            util.activeModalManager.unregister(dropdownMenu);
          }, [fontContainer]);
        }
      });
      
      // 🔴 중요: 이벤트 리스너를 한 번만 등록하도록 수정
      if (!contentArea.hasAttribute('data-font-events-setup')) {
        setupFontKeyboardEvents(contentArea, fontContainer, fontText, icon);
        
        // 이벤트 핸들러를 변수에 저장하여 재사용
        const keyupHandler = () => updateFontButtonState(fontContainer, fontText, icon);
        const clickHandler = (e) => {
          if (isDropdownOpen && !fontContainer.contains(e.target) && !dropdownMenu.contains(e.target)) {
            dropdownMenu.classList.remove('show');
            dropdownMenu.style.display = 'none';
            fontContainer.classList.remove('active');
            isDropdownOpen = false;
            util.activeModalManager.unregister(dropdownMenu);
          }
          updateFontButtonState(fontContainer, fontText, icon);
        };
        
        contentArea.addEventListener('keyup', keyupHandler);
        contentArea.addEventListener('click', clickHandler);
        contentArea.setAttribute('data-font-events-setup', 'true');
      }
      
      return fontContainer;
    }
  });

  // 🔴 중요: 키보드 이벤트 리스너 - Enter/Shift+Enter 핵심 로직
  function setupFontKeyboardEvents(contentArea, fontContainer, fontText, icon) {
    contentArea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const currentElement = range.startContainer.nodeType === Node.TEXT_NODE 
            ? range.startContainer.parentElement 
            : range.startContainer;
          
          // 폰트 스타일이 적용된 요소 또는 그 내부에 있는지 확인
          const fontElement = currentElement.closest('span[style*="font-family"], font') || 
                             currentElement.querySelector('span[style*="font-family"], font');
          
          // 🔴 중요: 현재 커서 위치가 폰트 영역 내부인지 확인
          const isInFontArea = fontElement && (
            fontElement.contains(range.startContainer) || 
            fontElement === range.startContainer ||
            (range.startContainer.nodeType === Node.TEXT_NODE && 
             fontElement.contains(range.startContainer.parentElement))
          );
          
          if (isInFontArea) {
            if (e.shiftKey) {
              // 🔴 중요: Shift+Enter - 텍스트 분할하지 않고 현재 위치에서만 줄바꿈
              e.preventDefault();
              
              let fontFamily = currentFontValue;
              
              if (!fontFamily) {
                // 폴백: 현재 요소에서 추출
                const styleAttr = fontElement.getAttribute('style');
                const fontFamilyMatch = styleAttr?.match(/font-family:\s*([^;]+)/);
                fontFamily = fontFamilyMatch ? fontFamilyMatch[1].trim() : 'inherit';
              }
              
              // 새 줄과 빈 span 생성 (텍스트 분할 없음)
              const br = document.createElement('br');
              const newSpan = document.createElement('span');
              newSpan.style.fontFamily = fontFamily;
              newSpan.innerHTML = '&#8203;'; // 제로폭 공백만 추가
              
              // 현재 위치에 br과 새 span 삽입
              range.insertNode(br);
              range.setStartAfter(br);
              range.insertNode(newSpan);
              
              // 커서를 새 span으로 이동
              const newRange = document.createRange();
              newRange.setStart(newSpan.firstChild || newSpan, 0);
              newRange.collapse(true);
              selection.removeAllRanges();
              selection.addRange(newRange);
              
            } else {
              // 🔴 중요: Enter 키 처리 - 폰트 요소 바로 다음에 새 문단 생성
              e.preventDefault();
              
              // 현재 폰트 요소 찾기 (font 태그 또는 span 태그)
              const currentFontElement = fontElement.tagName === 'FONT' ? fontElement : fontElement.closest('font');
              
              if (currentFontElement) {
                // 폰트 요소 다음의 모든 콘텐츠 수집
                const parentP = currentFontElement.parentElement;
                const remainingNodes = [];
                
                // 폰트 요소 다음의 모든 형제 노드들 수집
                let nextSibling = currentFontElement.nextSibling;
                while (nextSibling) {
                  remainingNodes.push(nextSibling);
                  nextSibling = nextSibling.nextSibling;
                }
                
                // 새 문단 생성
                const newP = document.createElement('p');
                
                // 수집된 노드들을 새 문단으로 이동
                if (remainingNodes.length > 0) {
                  remainingNodes.forEach(node => {
                    newP.appendChild(node); // 실제로 이동 (복사가 아님)
                  });
                } else {
                  newP.innerHTML = '<br>';
                }
                
                // 현재 문단 다음에 새 문단 삽입
                parentP.parentNode.insertBefore(newP, parentP.nextSibling);
                
                // 커서를 새 문단 시작으로 이동
                const newRange = document.createRange();
                newRange.setStart(newP.firstChild || newP, 0);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
              } else {
                // 폴백: 기본 빈 문단 생성
                const newP = document.createElement('p');
                newP.innerHTML = '<br>';
                
                const currentP = range.startContainer.closest('p') || range.startContainer.parentElement.closest('p');
                currentP.parentNode.insertBefore(newP, currentP.nextSibling);
                
                const newRange = document.createRange();
                newRange.setStart(newP, 0);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
              }
              
              // UI 상태 업데이트
              setTimeout(() => {
                updateFontButtonState(fontContainer, fontText, icon);
              }, 10);
            }
          }
        }
      }
    });
  }
})();
