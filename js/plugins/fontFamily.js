/**
 * LiteEditor Font Family Plugin
 * 폰트 목록만 표시하는 간략한 버전
 * 수정된 버전 - 폰트 적용 오류 수정
 * 업데이트 - 외부 데이터 파일 사용
 */

(function() {
  // PluginUtil 참조 추가
  const util = window.PluginUtil || {};
  
  // 전역 상태 변수 추가
  let savedRange = null;          // 임시로 저장된 선택 영역
  
  // 선택 영역 저장 함수 (util 사용)
  function saveSelection() {
    savedRange = util.selection.saveSelection();
  }

  // 선택 영역 복원 함수 (util 사용)
  function restoreSelection() {
    if (!savedRange) return false;
    return util.selection.restoreSelection(savedRange);
  }
  
  // 폰트 적용을 위한 스타일 추가
  function injectFontFamilyStyles() {
    // CSS 파일 로드 (없으면 추가)
    if (util.styles && util.styles.loadCssFile) {
      util.styles.loadCssFile('lite-editor-font-styles', 'css/plugins/fontFamily.css');
    }
  }
  
  /**
   * 폰트 데이터 로드 함수
   * 외부 데이터 파일에서 폰트 목록을 가져옵니다.
   * @returns {Array} 폰트 목록 배열
   */
  function loadFontData() {
    // 외부 데이터 파일이 로드되었는지 확인
    if (window.LiteEditorFontData && typeof window.LiteEditorFontData.getFonts === 'function') {
      // 외부 데이터 파일에서 폰트 목록 가져오기
      return window.LiteEditorFontData.getFonts();
    } else {
      // 폴백: 데이터 파일이 로드되지 않은 경우 기본 폰트 목록 반환
      console.warn('폰트 데이터 파일을 찾을 수 없습니다. 기본 폰트 목록을 사용합니다.');
      return [
        { type: 'group_header', name: '기본 폰트' },
        { type: 'divider' },
        { name: 'Arial', value: 'Arial, sans-serif' },
        { name: 'Times New Roman', value: 'Times New Roman, serif' },
        { name: 'Courier New', value: 'Courier New, monospace' }, 
        { name: '굴림체', value: 'Gulim, sans-serif' },
      ];
    }
  }
  
  /**
   * 폰트 데이터 스크립트 로드 함수
   * 외부 폰트 데이터 파일을 동적으로 로드합니다.
   * @param {Function} callback - 로드 완료 후 실행할 콜백 함수
   */
  function loadFontScript(callback) {
    // 이미 로드된 경우 바로 콜백 실행
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
      console.error('폰트 데이터 파일 로드 실패');
      if (callback) callback();
    };
    
    document.head.appendChild(script);
  }
  
  // 폰트 플러그인 등록
  LiteEditor.registerPlugin('fontFamily', {
    customRender: function(toolbar, contentArea) {
      // 1. 폰트 버튼 컨테이너 생성 (셀렉트 박스 스타일)
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
      
      // 3. Font Family 텍스트 추가
      const fontText = util.dom.createElement('span', {
        textContent: 'Font Family'
      }, {
        fontSize: '14px'
      });
      fontContainer.appendChild(fontText);
      
      // 4. 드롭다운 화살표 추가
      const arrowIcon = util.dom.createElement('i', {
        className: 'material-icons',
        textContent: 'arrow_drop_down'
      }, {
        fontSize: '18px',
        marginLeft: '5px'
      });
      fontContainer.appendChild(arrowIcon);
      
      // 5. 드롭다운 메뉴 생성 - 정렬 플러그인처럼 처리
      const dropdownMenu = util.dom.createElement('div', {
        id: 'font-family-dropdown',
        className: 'lite-editor-font-dropdown'
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
      
      // 외부 폰트 데이터 파일 로드 및 드롭다운 메뉴 구성
      loadFontScript(function() {
        // 폰트 목록 가져오기
        const fonts = loadFontData();
        
        // 드롭다운에 폰트 목록 추가
        fonts.forEach(font => {
          // 구분선 처리
          if (font.type === 'divider') {
            const divider = util.dom.createElement('hr', {
              className: 'lite-editor-font-divider'
            }, {
              margin: '5px 0'
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
              color: '#666',
              fontSize: '12px'
            });
            dropdownMenu.appendChild(header);
            return;
          }
          
          // 폰트 아이템 추가
          const fontItem = util.dom.createElement('div', {
            textContent: font.name
          }, {
            padding: '5px 10px',
            cursor: 'pointer',
            fontFamily: font.value
          });
          
          // 호버 이벤트
          fontItem.addEventListener('mouseover', () => {
            fontItem.style.backgroundColor = '#e9e9e9';
          });
          
          fontItem.addEventListener('mouseout', () => {
            fontItem.style.backgroundColor = '';
          });
          
          // 클릭 이벤트 - 폰트 적용 (수정된 버전)
          fontItem.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('폰트 선택함:', font.name, font.value);
            
            // 현재 스크롤 위치 저장
            const currentScrollY = window.scrollY;
            
            // 드롭다운 닫기
            dropdownMenu.style.display = 'none';
            arrowIcon.textContent = 'arrow_drop_down';
            fontContainer.classList.remove('active');
            
            // 에디터에 포커스 (스크롤 방지 옵션 추가)
            try {
              contentArea.focus({ preventScroll: true });
            } catch (e) {
              // 일부 구형 브라우저에서는 preventScroll 옵션을 지원하지 않음
              contentArea.focus();
            }
            
            // 선택 영역 복원
            restoreSelection();
            
            // 폰트 스타일 적용을 위한 스타일 주입
            injectFontFamilyStyles();
            
            // 폰트 적용
            console.log(`Applying font: ${font.name} with value: ${font.value}`);
            
            // 코딩 폰트 특별 처리
            if (font.name.includes('Mono') || font.name.includes('Code') || font.name.includes('Hack')) {
              const selection = util.selection.getSafeSelection();
              if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                
                // 선택된 텍스트 감싸는 span 생성
                const span = util.dom.createElement('span', {
                  className: 'lite-editor-coding-font'
                }, {
                  fontFamily: font.value
                });
                
                // 선택된 텍스트를 span 안에 넣기
                const fragment = range.extractContents();
                span.appendChild(fragment);
                range.insertNode(span);
                
                // 선택 영역 업데이트
                selection.removeAllRanges();
                const newRange = document.createRange();
                newRange.selectNode(span);
                selection.addRange(newRange);
                
                console.log(`코딩 폰트 '${font.name}' 적용됨`);
              }
            } else {
              // 일반 폰트는 기본 execCommand 사용
              document.execCommand('fontName', false, font.value);
              console.log(`일반 폰트 '${font.name}' 적용됨`);
            }
            
            // UI 업데이트
            fontText.textContent = font.name;
            
            // 스크롤 위치 복원 (더 강력한 방법 사용)
            // requestAnimationFrame을 사용하여 다음 렌더링 사이클에서 스크롤 복원
            requestAnimationFrame(() => {
              // 더 긴 지연 시간 적용 (50ms)
              setTimeout(() => {
                window.scrollTo(window.scrollX, currentScrollY);
              }, 50);
            });
          });
          
          dropdownMenu.appendChild(fontItem);
        });
      });
      
      // 6. 드롭다운을 document.body에 직접 추가 (align과 동일하게 처리)
      document.body.appendChild(dropdownMenu);
      
      // 7. 버튼 클릭 이벤트 - 드롭다운 토글 (업데이트)
      fontContainer.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 현재 스크롤 위치 저장
        const currentScrollY = window.scrollY;
        
        // 드롭다운이 열려있는 경우 닫기 (토글 동작)
        if (dropdownMenu.style.display === 'block') {
          dropdownMenu.style.display = 'none';
          arrowIcon.textContent = 'arrow_drop_down';
          fontContainer.classList.remove('active');
          return;
        }
        
        // 다른 모든 드롭다운 닫기
        document.querySelectorAll('.lite-editor-dropdown-menu.show, .lite-editor-font-dropdown.show').forEach(menu => {
          if (menu !== dropdownMenu) menu.style.display = 'none';
        });
        
        // 선택 영역 저장
        saveSelection();
        
        // 드롭다운 표시
        dropdownMenu.style.display = 'block';
        
        // 버튼 활성화 스타일 추가
        fontContainer.classList.add('active');
        
        // 레이어 위치 설정
        if (util.layer && util.layer.setLayerPosition) {
          util.layer.setLayerPosition(dropdownMenu, fontContainer);
        } else {
          const buttonRect = fontContainer.getBoundingClientRect();
          dropdownMenu.style.top = (buttonRect.bottom + window.scrollY) + 'px';
          dropdownMenu.style.left = buttonRect.left + 'px';
        }
        
        // 화살표 변경
        arrowIcon.textContent = 'arrow_drop_up';
        
        // 스크롤 위치 복원 (더 강력한 방법 사용)
        requestAnimationFrame(() => {
          setTimeout(() => {
            window.scrollTo(window.scrollX, currentScrollY);
          }, 50);
        });
      });
      
      // 8. body 클릭 시 드롭다운 닫기 (업데이트)
      util.setupOutsideClickHandler(dropdownMenu, () => {
        dropdownMenu.style.display = 'none';
        arrowIcon.textContent = 'arrow_drop_down';
        fontContainer.classList.remove('active');
      }, [fontContainer]);
      
      return fontContainer;
    }
  });
})();
