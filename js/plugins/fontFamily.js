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
          fontItem.addEventListener('click', util.scroll.preservePosition((e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // 즉시 contentArea에 포커스를 주어 selection 컨텍스트 유지
            try {
                if (contentArea && contentArea.isConnected) {
                    contentArea.focus({ preventScroll: true });
                }
            } catch (e) {
                console.warn('contentArea focus 실패:', e);
            }
            
            // UI 업데이트 먼저
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
            
            // 🔧 selection 상태 확인 및 복원
            let hasSelection = false;
            const currentSelection = window.getSelection();
            
            if (savedRange) {
                const restored = restoreSelection();
                errorHandler.logInfo('FontFamilyPlugin', `저장된 selection 복원: ${restored}`);
                
                // 복원 후 다시 확인
                const restoredSelection = window.getSelection();
                if (restoredSelection.rangeCount > 0) {
                    hasSelection = !restoredSelection.isCollapsed;
                    errorHandler.logInfo('FontFamilyPlugin', `복원된 selection: "${restoredSelection.toString()}", collapsed: ${restoredSelection.isCollapsed}`);
            }
            } else if (currentSelection.rangeCount > 0) {
                hasSelection = !currentSelection.isCollapsed;
                errorHandler.logInfo('FontFamilyPlugin', `현재 selection: "${currentSelection.toString()}", collapsed: ${currentSelection.isCollapsed}`);
            }
            
            // 글꼴 적용을 위한 스타일 주입
            injectFontFamilyStyles();
            
            // 🔧 글꼴 적용 - collapsed selection에서도 실행
            errorHandler.logInfo('FontFamilyPlugin', `글꼴 적용 중: ${font.name} 값: ${font.value}, hasSelection: ${hasSelection}`);
            
            try {
                const beforeSelection = window.getSelection();
                const isCollapsed = beforeSelection.isCollapsed;
                
                // scroll position 저장
                const scrollPosition = util.scroll.savePosition();
                
                if (isCollapsed) {
                    errorHandler.logInfo('FontFamilyPlugin', '커서 위치에서 폰트 설정 - 다음 타이핑에 적용됨');
                } else {
                    errorHandler.logInfo('FontFamilyPlugin', `선택된 텍스트에 폰트 적용: "${beforeSelection.toString()}"`);
                }
                
                // execCommand 실행
            document.execCommand('fontName', false, font.value);
                
                // scroll position 복원
                util.scroll.restorePosition(scrollPosition, 50);
                
                // execCommand 후 확인
                const afterSelection = window.getSelection();
                errorHandler.logInfo('FontFamilyPlugin', `execCommand 후 selection: "${afterSelection.toString()}"`);
                
            } catch (error) {
                errorHandler.logError('FontFamilyPlugin', 'execCommand 실행 중 오류:', error);
            }
            
            // UI 업데이트
            fontText.textContent = font.name;
          }));
          
          dropdownMenu.appendChild(fontItem);
        });
      });
      
      // 6. 드롭다운을 document.body에 직접 추가 (정렬 플러그인과 동일)
      document.body.appendChild(dropdownMenu);
      
      // 7. 직접 구현한 드롭다운 토글 로직 - 개선된 버전
      fontContainer.addEventListener('mousedown', (e) => {
        // 🔧 mousedown 시점에 미리 selection 저장 (click 전에)
        const currentSelection = window.getSelection();
        if (currentSelection.rangeCount > 0 && !currentSelection.isCollapsed) {
          savedRange = util.selection.saveSelection();
          errorHandler.logInfo('FontFamilyPlugin', `mousedown에서 selection 저장됨: "${currentSelection.toString()}"`);
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
      
      return fontContainer;
    }
  });
})();
