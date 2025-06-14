/**
 * LiteEditor 글꼴 플러그인
 * 글꼴 목록 표시를 위한 간소화 버전
 * 수정 버전 - 글꼴 적용 오류 수정
 * 업데이트 - 다국어 지원이 포함된 외부 데이터 파일 사용
 */

(function() {
  // 🔧 성능 최적화: 정규식 캐싱
  const FONT_FAMILY_REGEX = /font-family:\s*([^;]+)/;
  const QUOTE_REGEX = /['"]/g;
  
  // 🔧 성능 최적화: 폰트명 파싱 함수
  function parseFontFamily(styleAttr) {
    if (!styleAttr) return null;
    
    const match = styleAttr.match(FONT_FAMILY_REGEX);
    if (!match) return null;
    
    const fontFamily = match[1].trim();
    // 따옴표 제거 최적화: indexOf로 먼저 체크
    return fontFamily.indexOf('"') !== -1 || fontFamily.indexOf("'") !== -1 
      ? fontFamily.replace(QUOTE_REGEX, '') 
      : fontFamily;
  }
  
  // 🔧 성능 최적화: 첫 번째 폰트명 추출 함수
  function getFirstFontName(fontFamily) {
    if (!fontFamily) return '';
    
    const commaIndex = fontFamily.indexOf(',');
    return commaIndex !== -1 ? fontFamily.substring(0, commaIndex) : fontFamily;
  }

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
      
      // 🔧 핵심 수정: 사용자가 명시적으로 설정한 폰트만 "폰트 영역"으로 인식
      const isUserSetFont = fontElement && currentFontValue && (
        // font 태그는 face 속성이 있을 때만 사용자 설정으로 간주 - 🔧 수정
        (fontElement.tagName === 'FONT' && fontElement.getAttribute('face')) ||
        // span 태그는 currentFontValue와 일치할 때만 사용자 설정으로 간주
        (fontElement.tagName === 'SPAN' && 
         fontElement.style.fontFamily && 
         currentFontValue.includes(getFirstFontName(fontElement.style.fontFamily)))
      );
      
      if (isUserSetFont) {
        // 🔧 3단계 최적화: 폰트 파싱 최적화
        let currentFontFamily = null;
        
        // font 태그의 face 속성에서 폰트 추출
        if (fontElement.tagName === 'FONT' && fontElement.getAttribute('face')) {
          currentFontFamily = fontElement.getAttribute('face');
        } 
        // span 태그의 style 속성에서 폰트 추출
        else {
          const styleAttr = fontElement.getAttribute('style');
          currentFontFamily = parseFontFamily(styleAttr);
        }
        
        if (currentFontFamily) {
          // 🔧 3단계 최적화: 첫 번째 폰트명 추출 최적화
          const firstFontName = getFirstFontName(currentFontFamily);
          
          // 캐시된 데이터 사용
          const fonts = getCachedFontData();
          const matchedFont = fonts.find(f => f.value && f.value.includes(firstFontName));
          
          if (matchedFont) {
            // 폰트명 업데이트
            fontText.textContent = matchedFont.name;
            
            // 🔧 1단계 최적화: DOM 쿼리 캐싱만 적용
            const dropdownMenu = document.getElementById('font-family-dropdown');
            if (dropdownMenu) {
              // 기존 선택 해제
              if (currentSelectedFontItem) {
                currentSelectedFontItem.style.backgroundColor = '';
              }
              
              // 🔧 성능 개선: fontItems 캐싱
              if (!dropdownMenu._cachedFontItems) {
                dropdownMenu._cachedFontItems = dropdownMenu.querySelectorAll('div[style*="font-family"]');
              }
              const fontItems = dropdownMenu._cachedFontItems;
              
              fontItems.forEach(item => {
                const itemFontFamily = item.style.fontFamily;
                // 🔧 3단계 최적화: 문자열 비교 최적화
                if (itemFontFamily && itemFontFamily.includes(firstFontName)) {
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
        fontText.textContent = 'Font Family';
        
        // 드롭다운 선택 해제
        const dropdownMenu = document.getElementById('font-family-dropdown');
        if (dropdownMenu && dropdownMenu._cachedFontItems) {
          dropdownMenu._cachedFontItems.forEach(item => {
            item.style.backgroundColor = '';
          });
        }
        
        // 전역 상태 초기화 (단, 사용자가 설정한 currentFontValue는 유지)
        currentSelectedFontItem = null;
      }
    }
  }

  // ✅ 시스템 폰트 감지 함수 추가 (Line 14 근처에 추가)
  function isSystemFont(fontFamily) {
    // 브라우저 기본 폰트들을 체크
    const systemFonts = ['times', 'arial', 'helvetica', 'courier', 'sans-serif', 'serif', 'monospace'];
    return systemFonts.some(sysFont => fontFamily.toLowerCase().includes(sysFont));
  }

  // ✅ 현재 요소의 실제 계산된 폰트 확인 함수 추가
  function getCurrentComputedFont(element) {
    const computedStyle = window.getComputedStyle(element);
    return computedStyle.fontFamily;
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
            
            // 🔧 스크롤 위치 저장 (가장 먼저 실행)
            const scrollPosition = util.scroll.savePosition();
            
            // 1. UI 업데이트
            if (currentSelectedFontItem) {
                currentSelectedFontItem.style.backgroundColor = '';
            }
            currentSelectedFontItem = fontItem;
            fontItem.style.backgroundColor = '#e9e9e9';
            
            // 드롭다운 닫기
            dropdownMenu.style.display = 'none';
            dropdownMenu.classList.remove('show');
            fontContainer.classList.remove('active');
            isDropdownOpen = false;
            
            // 모달 관리 시스템에서 제거
            util.activeModalManager.unregister(dropdownMenu);
            
            // 2. Focus 설정 (selection 복원 전에) - 🔧 순서 변경
            try {
                contentArea.focus({ preventScroll: true });
            } catch (e) {
                contentArea.focus();
            }
            
            // 3. Selection 복원 (focus 후에) - 🔧 순서 변경
            if (savedRange) {
                const restored = restoreSelection();
                if (!restored) {
                    console.warn('Selection 복원 실패');
                }
            }
            
            // 폰트 값 저장
            currentFontValue = font.value;
            
            // 🔴 중요: execCommand 실행 - 수정 금지
            try {
                document.execCommand('fontName', false, font.value);
            } catch (error) {
                errorHandler.logError('FontFamilyPlugin', 'execCommand 실행 중 오류:', error);
            }
            
            // 4. UI 업데이트
            fontText.textContent = font.name;
            
            // 🔧 강력한 스크롤 위치 복원 (execCommand 후 지연 적용) - 🔧 수정
            requestAnimationFrame(() => {
                setTimeout(() => {
                    util.scroll.restorePosition(scrollPosition);
                }, 50);
            });
          });
          
          dropdownMenu.appendChild(fontItem);

          // 폰트 항목에 키보드 접근성 추가
          fontItem.setAttribute('tabindex', '0');

          // Enter/Space 키로 폰트 선택
          fontItem.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fontItem.click();
            }
          });
        });
        
        // 폰트 목록 생성 완료 후 드롭다운 키보드 네비게이션 추가
        setTimeout(() => {
          const fontItems = dropdownMenu.querySelectorAll('div[style*="font-family"]');
          
          // 드롭다운 메뉴 키보드 네비게이션
          dropdownMenu.addEventListener('keydown', (e) => {
            const currentIndex = Array.from(fontItems).findIndex(item => item === document.activeElement);
            
            switch(e.key) {
              case 'Tab':
                if (e.shiftKey) {
                  // Shift+Tab: 첫 번째 항목에서 fontContainer로 돌아감
                  if (currentIndex <= 0) {
                    e.preventDefault();
                    dropdownMenu.classList.remove('show');
                    dropdownMenu.style.display = 'none';
                    fontContainer.classList.remove('active');
                    isDropdownOpen = false;
                    util.activeModalManager.unregister(dropdownMenu);
                    fontContainer.focus();
                  }
                } else {
                  // Tab: 마지막 항목에서 드롭다운 닫고 다음 툴바 버튼으로
                  if (currentIndex >= fontItems.length - 1) {
                    e.preventDefault();
                    dropdownMenu.classList.remove('show');
                    dropdownMenu.style.display = 'none';
                    fontContainer.classList.remove('active');
                    isDropdownOpen = false;
                    util.activeModalManager.unregister(dropdownMenu);
                    // 브라우저가 자동으로 다음 탭 가능한 요소(heading)로 이동
                  }
                }
                break;
                
              case 'Escape':
                e.preventDefault();
                dropdownMenu.classList.remove('show');
                dropdownMenu.style.display = 'none';
                fontContainer.classList.remove('active');
                isDropdownOpen = false;
                util.activeModalManager.unregister(dropdownMenu);
                fontContainer.focus();
                break;
                
              case 'ArrowDown':
                e.preventDefault();
                const nextItem = fontItems[currentIndex + 1] || fontItems[0];
                nextItem.focus();
                break;
                
              case 'ArrowUp':
                e.preventDefault();
                const prevItem = fontItems[currentIndex - 1] || fontItems[fontItems.length - 1];
                prevItem.focus();
                break;
            }
          });
        }, 0);
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
        
        // 🔧 스크롤 위치 저장 (media.js와 동일한 방식)
        const scrollPosition = util.scroll.savePosition();
        
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
          
          // 🔧 6단계 최적화: 외부 클릭 핸들러 정리
          if (outsideClickCleanup) {
            outsideClickCleanup();
            outsideClickCleanup = null;
          }
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
          
          // ✅ 첫 번째 폰트 항목에 포커스
          setTimeout(() => {
            const firstFontItem = dropdownMenu.querySelector('div[style*="font-family"]');
            if (firstFontItem) {
              firstFontItem.focus();
            }
          }, 0);
          
          // ✅ 수정: 드롭다운을 열 때 activeModalManager에 등록
          util.activeModalManager.register(dropdownMenu);
          
          // 활성 모달 등록
          dropdownMenu.closeCallback = () => {
            dropdownMenu.classList.remove('show');
            dropdownMenu.style.display = 'none';
            fontContainer.classList.remove('active');
            isDropdownOpen = false;
            
            // 🔧 6단계 최적화: 닫힐 때도 정리
            if (outsideClickCleanup) {
              outsideClickCleanup();
              outsideClickCleanup = null;
            }
          };
          
          // 🔧 6단계 최적화: 이전 핸들러가 있으면 완전히 정리 후 새로 등록
          if (outsideClickCleanup) {
            outsideClickCleanup();
            outsideClickCleanup = null;
          }
          
          outsideClickCleanup = util.setupOutsideClickHandler(dropdownMenu, () => {
            dropdownMenu.classList.remove('show');
            dropdownMenu.style.display = 'none';
            fontContainer.classList.remove('active');
            isDropdownOpen = false;
            util.activeModalManager.unregister(dropdownMenu);
            
            // 🔧 6단계 최적화: 자동 정리
            if (outsideClickCleanup) {
              outsideClickCleanup = null;
            }
          }, [fontContainer]);
        }
        
        // 🔧 스크롤 위치 복원 (media.js와 동일한 방식)
        util.scroll.restorePosition(scrollPosition);
      });
      
      // 🔴 중요: 이벤트 리스너를 한 번만 등록하도록 수정
      if (!contentArea.hasAttribute('data-font-events-setup')) {
        setupFontKeyboardEvents(contentArea, fontContainer, fontText, icon);
        
        // 🔧 2단계 최적화: 디바운스 적용
        const debouncedUpdateState = util.events.debounce(() => {
          updateFontButtonState(fontContainer, fontText, icon);
        }, 150); // 150ms 디바운스
        
        // 이벤트 핸들러를 변수에 저장하여 재사용
        const keyupHandler = debouncedUpdateState;
        const clickHandler = (e) => {
          if (isDropdownOpen && !fontContainer.contains(e.target) && !dropdownMenu.contains(e.target)) {
            dropdownMenu.classList.remove('show');
            dropdownMenu.style.display = 'none';
            fontContainer.classList.remove('active');
            isDropdownOpen = false;
            util.activeModalManager.unregister(dropdownMenu);
          }
          debouncedUpdateState();
        };
        
        contentArea.addEventListener('keyup', keyupHandler);
        contentArea.addEventListener('click', clickHandler);
        contentArea.setAttribute('data-font-events-setup', 'true');
      }
      
      // 키보드 접근성: Enter/Space 키로 드롭다운 열기
      fontContainer.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          fontContainer.click(); // 기존 클릭 이벤트 트리거
        }
      });
      
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
              // ✅ 수정된 Shift+Enter 처리 - 시스템 폰트 감지
              e.preventDefault();
              
              // ✅ 현재 위치의 실제 계산된 폰트 확인
              const currentComputedFont = getCurrentComputedFont(currentElement);
              
              // ✅ 시스템 폰트인지 확인
              const isCurrentSystemFont = isSystemFont(currentComputedFont);
              
              // 새 줄과 span 생성
              const br = document.createElement('br');
              const newSpan = document.createElement('span');
              
              // ✅ 핵심 수정: 시스템 폰트가 아닌 경우만 폰트 상속
              if (!isCurrentSystemFont) {
                // 명시적으로 설정된 폰트인 경우만 상속
                let fontFamily = currentFontValue;
                
                if (!fontFamily) {
                  // font 태그의 face 속성 확인
                  if (fontElement.tagName === 'FONT' && fontElement.getAttribute('face')) {
                    fontFamily = fontElement.getAttribute('face');
                  } else {
                    // span 태그의 style 속성에서 폰트 추출
                    const styleAttr = fontElement.getAttribute('style');
                    fontFamily = parseFontFamily(styleAttr) || currentComputedFont;
                  }
                }
                
                // 시스템 폰트가 아닌 경우만 폰트 적용
                if (!isSystemFont(fontFamily)) {
                  newSpan.style.fontFamily = fontFamily;
                }
              }
              
              newSpan.innerHTML = '&#8203;'; // 제로폭 공백
              
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
              // ✅ 수정된 Enter 키 처리 - div 구조 고려
              e.preventDefault();
              
              const currentFontElement = fontElement.tagName === 'FONT' ? fontElement : fontElement.closest('font');
              
              if (currentFontElement) {
                // ✅ 올바른 부모 컨테이너 찾기 (P 또는 DIV)
                const parentContainer = currentFontElement.closest('p, div');
                const contentAreaContainer = contentArea;
                
                if (parentContainer && contentAreaContainer.contains(parentContainer)) {
                  // ✅ font 요소 다음의 모든 형제 노드들 수집
                  const remainingNodes = [];
                  let nextSibling = currentFontElement.nextSibling;
                  while (nextSibling) {
                    remainingNodes.push(nextSibling);
                    nextSibling = nextSibling.nextSibling;
                  }
                  
                  // ✅ 새 문단 생성
                  const newP = document.createElement('p');
                  
                  if (remainingNodes.length > 0) {
                    // 남은 노드들을 새 문단으로 이동
                    remainingNodes.forEach(node => {
                      newP.appendChild(node);
                    });
                  } else {
                    newP.innerHTML = '<br>';
                  }
                  
                  // ✅ 핵심 수정: 부모 컨테이너 다음에 새 문단 삽입
                  if (parentContainer.parentNode) {
                    parentContainer.parentNode.insertBefore(newP, parentContainer.nextSibling);
                  } else {
                    // 부모가 없으면 contentArea에 직접 추가
                    contentAreaContainer.appendChild(newP);
                  }
                  
                  // ✅ 커서를 새 문단으로 이동
                  const newRange = document.createRange();
                  newRange.setStart(newP.firstChild || newP, 0);
                  newRange.collapse(true);
                  selection.removeAllRanges();
                  selection.addRange(newRange);
                }
              } else {
                // ✅ 폴백: 기본 새 문단 생성
                const newP = document.createElement('p');
                newP.innerHTML = '<br>';
                
                // 현재 컨테이너 찾기 (P 또는 DIV)
                const currentContainer = range.startContainer.closest('p, div') || 
                                        range.startContainer.parentElement.closest('p, div');
                
                if (currentContainer && currentContainer.parentNode) {
                  currentContainer.parentNode.insertBefore(newP, currentContainer.nextSibling);
                } else {
                  contentArea.appendChild(newP);
                }
                
                const newRange = document.createRange();
                newRange.setStart(newP, 0);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
              }
              
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