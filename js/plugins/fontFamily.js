/**
 * LiteEditor 글꼴 플러그인
 * 글꼴 목록 표시를 위한 간소화 버전
 * 수정 버전 - 글꼴 적용 오류 수정
 * 업데이트 - 다국어 지원이 포함된 외부 데이터 파일 사용
 */

(function() {
  // PluginUtil 참조
  const util = window.PluginUtil || {};
  // 전역 상태 변수
  let savedRange = null;          // 임시로 저장된 선택 영역
  let isDropdownOpen = false;
  
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
      console.warn('글꼴 데이터 파일을 찾을 수 없습니다. 기본 글꼴 목록을 사용합니다.');
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
      console.error('글꼴 데이터 파일 로드 실패');
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
      
      // 4. 드롭다운 화살표 추가 - 오른쪽에 표시되도록 수정
      const arrowIcon = util.dom.createElement('i', {
        className: 'material-icons arrow-icon', // 특별한 클래스 추가
        textContent: 'expand_more'
      }, {
        fontSize: '20px',
        fontWeight: 'bold',
        position: 'absolute',
        right: '1px', // 오른쪽에 배치
        top: '50%', 
        transform: 'translateY(-50%)', // 수직 중앙 정렬
        left: 'auto' // 왼쪽 위치 속성 제거
      });
      fontContainer.appendChild(arrowIcon);
      
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
        minWidth: '200px',
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
            fontSize: '13px'  // 글꼴 크기를 12px로 설정
          });
          
          // 호버 이벤트
          fontItem.addEventListener('mouseover', () => {
            fontItem.style.backgroundColor = '#e9e9e9';
          });
          
          fontItem.addEventListener('mouseout', () => {
            fontItem.style.backgroundColor = '';
          });
          
          // 클릭 이벤트 - 글꼴 적용 (수정된 버전)
          fontItem.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('글꼴 선택:', font.name, font.value);
            
            // 현재 스크롤 위치 저장
            const currentScrollY = window.scrollY;
            
            // 드롭다운 닫기
            dropdownMenu.style.display = 'none';
            dropdownMenu.classList.remove('show');
            arrowIcon.textContent = 'expand_more';
            fontContainer.classList.remove('active');
            isDropdownOpen = false;
            
            // 에디터에 포커스 (스크롤 방지 옵션 추가)
            try {
              contentArea.focus({ preventScroll: true });
            } catch (e) {
              contentArea.focus();
            }
            
            // 선택 영역 복원 - 반드시 execCommand 전에 해야 함
            restoreSelection();
            
            // 글꼴 적용을 위한 스타일 주입
            injectFontFamilyStyles();
            
            // 글꼴 적용
            console.log(`글꼴 적용 중: ${font.name} 값: ${font.value}`);
            document.execCommand('fontName', false, font.value);
            console.log(`일반 글꼴 '${font.name}' 적용됨`);
            
            // UI 업데이트
            fontText.textContent = font.name;
            
            // 스크롤 위치 복원
            requestAnimationFrame(() => {
              setTimeout(() => {
                window.scrollTo(window.scrollX, currentScrollY);
              }, 50);
            });
          });
          
          dropdownMenu.appendChild(fontItem);
        });
      });
      
      // 6. 드롭다운을 document.body에 직접 추가 (정렬 플러그인과 동일)
      document.body.appendChild(dropdownMenu);
      
      // 7. 버튼 클릭 이벤트 - 드롭다운 토글
      fontContainer.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 현재 스크롤 위치 저장
        const currentScrollY = window.scrollY;
        
        // 드롭다운 API 사용
        // 참고: setupDropdown은 매번 호출해도 첫 번째 설정 후 동일한 API 객체 반환
        const dropdownAPI = util.dropdown.setupDropdown(fontContainer, dropdownMenu, {
          arrowIcon: arrowIcon,
          buttonActiveClass: 'active',
          toolbar: toolbar,
          onOpen: () => {
            // 선택 영역 저장
            saveSelection();
            // 화살표 아이콘 변경 - expand_more에서 expand_less로 변경
            arrowIcon.textContent = 'expand_less';
          },
          onClose: () => {
            // 드롭다운 상태 업데이트
            isDropdownOpen = false;
            // 화살표 아이콘 변경 - expand_less에서 expand_more로 변경
            arrowIcon.textContent = 'expand_more';
          }
        });
        
        // 토글 수행
        dropdownAPI.toggle(e);
        
        // 상태 업데이트
        isDropdownOpen = dropdownAPI.isOpen();
        
        // 스크롤 위치 복원
        requestAnimationFrame(() => {
          setTimeout(() => {
            window.scrollTo(window.scrollX, currentScrollY);
          }, 50);
        });
      });
      
      return fontContainer;
    }
  });
})();
