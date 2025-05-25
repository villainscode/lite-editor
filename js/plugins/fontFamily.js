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
  
  // 전역 상태 변수
  let savedRange = null;          // 임시로 저장된 선택 영역
  let isDropdownOpen = false;
  let currentSelectedFontItem = null;
  let currentFontValue = null; // ✅ 추가: 현재 선택된 폰트 값 저장
  
  // 선택 영역 저장 함수 (util 사용)
  function saveSelection() {
    savedRange = util.selection.saveSelection();
  }

  // 선택 영역 복원 함수 (util 사용)
  function restoreSelection() {
    if (!savedRange) return false;
    return util.selection.restoreSelection(savedRange);
  }
  
  // 글꼴 스타일 추가 
  function injectFontFamilyStyles() {
    // CSS 파일 로드 (아직 추가되지 않은 경우)
    if (util.styles && util.styles.loadCssFile) {
      util.styles.loadCssFile('lite-editor-font-styles', 'css/plugins/fontFamily.css');
    }
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
              backgroundColor: '#f5f5f5'  // 옅은 회색 배경색 추가
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
          
          // 클릭 이벤트 - 글꼴 적용 (커서 상태에서도 작동하도록 수정)
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
            
            // ✅ 추가: 드롭다운 닫기
            dropdownMenu.style.display = 'none';
            dropdownMenu.classList.remove('show');
            fontContainer.classList.remove('active');
            isDropdownOpen = false;
            
            // ✅ 추가: 모달 관리 시스템에서 제거
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
            
            // ✅ 폰트 값 저장
            currentFontValue = font.value;
            
            // 5. execCommand 실행
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
      
      // 7. 직접 구현한 드롭다운 토글 로직 - 개선된 버전
      fontContainer.addEventListener('mousedown', (e) => {
        // 🔧 mousedown 시점에 미리 selection 저장 (click 전에)
        const currentSelection = window.getSelection();
        if (currentSelection.rangeCount > 0) {
          savedRange = util.selection.saveSelection();
          errorHandler.logInfo('FontFamilyPlugin', `mousedown에서 selection 저장됨: collapsed=${currentSelection.isCollapsed}`);
        }
      });

      fontContainer.addEventListener('click', util.scroll.preservePosition((e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 🔧 클릭 시에도 다시 한번 확인하여 저장
        const currentSelection = window.getSelection();
        if (currentSelection.rangeCount > 0 && !currentSelection.isCollapsed && !savedRange) {
          savedRange = util.selection.saveSelection();
          errorHandler.logInfo('FontFamilyPlugin', `click에서 추가 selection 저장됨: "${currentSelection.toString()}"`);
        }
        
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
          
          util.activeModalManager.register(dropdownMenu);
          
          // 외부 클릭 시 닫기 설정
          util.setupOutsideClickHandler(dropdownMenu, () => {
            dropdownMenu.classList.remove('show');
            dropdownMenu.style.display = 'none';
            fontContainer.classList.remove('active');
            isDropdownOpen = false;
            util.activeModalManager.unregister(dropdownMenu);
          }, [fontContainer]);
        }
      }));
      
      // 키보드 이벤트 설정 (한 번만 실행)
      if (!contentArea.hasAttribute('data-font-events-setup')) {
        setupFontKeyboardEvents(contentArea);
        contentArea.setAttribute('data-font-events-setup', 'true');
      }
      
      return fontContainer;
    }
  });

  // 전역 키보드 이벤트 리스너 추가 (플러그인 등록 후)
  function setupFontKeyboardEvents(contentArea) {
    contentArea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const currentElement = range.startContainer.nodeType === Node.TEXT_NODE 
            ? range.startContainer.parentElement 
            : range.startContainer;
          
          // 폰트 스타일이 적용된 요소 찾기
          const fontElement = currentElement.closest('span[style*="font-family"], font');
          
          if (fontElement) {
            if (e.shiftKey) {
              // Shift+Enter: 폰트 유지하면서 줄바꿈
              e.preventDefault();
              
              // ✅ 가장 안전한 방법: DOM 요소 직접 생성
              let fontFamily = currentFontValue;
              
              if (!fontFamily) {
                // 폴백: 현재 요소에서 추출
                const styleAttr = fontElement.getAttribute('style');
                const fontFamilyMatch = styleAttr?.match(/font-family:\s*([^;]+)/);
                fontFamily = fontFamilyMatch ? fontFamilyMatch[1].trim() : 'inherit';
              }
              
              // DOM 요소 직접 생성
              const br = document.createElement('br');
              const newSpan = document.createElement('span');
              newSpan.style.fontFamily = fontFamily; // 안전한 속성 설정
              newSpan.innerHTML = '&#8203;'; // 제로폭 공백
              
              // 현재 위치에 삽입
              range.deleteContents();
              range.insertNode(br);
              range.setStartAfter(br);
              range.insertNode(newSpan);
              
              // 커서를 새 span 내부로 이동
              range.setStart(newSpan, 1);
              range.collapse(true);
              selection.removeAllRanges();
              selection.addRange(range);
              
              errorHandler.logInfo('FontFamilyPlugin', `Shift+Enter: 폰트 유지 줄바꿈 (${fontFamily})`);
            } else {
              // Enter: 폰트 영역 벗어나서 새 문단
              e.preventDefault();
              
              // 새 문단 생성
              const newP = document.createElement('p');
              newP.innerHTML = '<br>';
              
              // 현재 문단 다음에 삽입
              const currentP = fontElement.closest('p') || fontElement.parentElement;
              currentP.parentNode.insertBefore(newP, currentP.nextSibling);
              
              // 커서를 새 문단으로 이동
              const newRange = document.createRange();
              newRange.setStart(newP, 0);
              newRange.collapse(true);
              selection.removeAllRanges();
              selection.addRange(newRange);
              
              errorHandler.logInfo('FontFamilyPlugin', 'Enter: 폰트 영역 벗어남');
            }
          }
        }
      }
    });
  }
})();
