/**
 * LiteEditor Font Family Plugin
 * 폰트 목록만 표시하는 간략한 버전
 * 수정된 버전 - 폰트 적용 오류 수정
 */

(function() {
  // PluginUtil 참조 추가
  const util = window.PluginUtil || {};
  
  // 전역 상태 변수 추가
  let savedRange = null;          // 임시로 저장된 선택 영역
  
  // TODO 리팩토링 (공통 영역 util로 빼기)
  // 선택 영역 저장 함수 복구 (기능 유지)
  function saveSelection() {
    if (window.liteEditorSelection) {
      window.liteEditorSelection.save();
      savedRange = window.liteEditorSelection.get();
    } else if (util.selection) {
      savedRange = util.selection.saveSelection();
    } else {
      const sel = util.selection.getSafeSelection();
      if (sel && sel.rangeCount > 0) {
        savedRange = sel.getRangeAt(0).cloneRange();
      }
    }
  }

  // TODO 리팩토링 (공통 영역 util로 빼기)
  // 선택 영역 복원 함수 복구 (기능 유지)
  function restoreSelection() {
    if (!savedRange) return false;
    
    if (window.liteEditorSelection) {
      window.liteEditorSelection.restore();
      return true;
    } else if (util.selection) {
      util.selection.restoreSelection(savedRange);
      return true;
    } else {
      try {
        const sel = util.selection.getSafeSelection();
        sel.removeAllRanges();
        sel.addRange(savedRange);
        return true;
      } catch (e) {
        console.error('선택 영역 복원 실패:', e);
        return false;
      }
    }
  }
  
  // 폰트 적용 테스트를 위한 스타일 추가
  function injectFontFamilyStyles() {
    // CSS 파일 로드 (없으면 추가)
    if (util.styles && util.styles.loadCssFile) {
      util.styles.loadCssFile('lite-editor-font-styles', 'css/plugins/fontFamily.css');
    }
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
      
      // 4. 폰트 목록 정의
      const fonts = [
        // 한글 폰트 그룹 (상단)
        { type: 'group_header', name: '한글 폰트' },
        { type: 'divider' },
        { name: '바탕체', value: 'Batang, Batangche, serif' },
        { name: '굴림체', value: 'Gulim, sans-serif' },
        { name: '맑은 고딕', value: 'Malgun Gothic, AppleGothic, sans-serif' },
        { name: 'Noto Sans KR', value: 'Noto Sans KR, sans-serif' },
        { name: 'Do Hyeon', value: '"Do Hyeon", sans-serif' },
        { name: 'Black Han Sans', value: '"Black Han Sans", sans-serif' },
        
        // 구분선
        { type: 'divider' },
        
        // 코딩 폰트 그룹 (중단)
        { type: 'group_header', name: '코딩 폰트' },
        { type: 'divider' },
        { name: 'IBM Plex Mono', value: 'IBM Plex Mono, monospace' },
        { name: 'Source Code Pro', value: 'Source Code Pro, monospace' },
        { name: 'JetBrains Mono', value: 'JetBrains Mono, monospace' },
        { name: 'Hack', value: 'Hack, monospace' },
        { name: 'Fira Code', value: 'Fira Code, monospace' },
        { name: 'Consolas', value: 'Consolas, monospace' },
        
        // 구분선
        { type: 'divider' },
        
        // 영문 폰트 그룹 (하단)
        { type: 'group_header', name: '영문 폰트' },
        { type: 'divider' },
        { name: 'Arial', value: 'Arial, sans-serif' },
        { name: 'Helvetica', value: 'Helvetica, sans-serif' },
        { name: 'Times New Roman', value: 'Times New Roman, serif' },
        { name: 'Georgia', value: 'Georgia, serif' },
        { name: 'Courier New', value: 'Courier New, monospace' },
        { name: 'Roboto', value: 'Roboto, sans-serif' },
        { name: 'Montserrat', value: 'Montserrat, sans-serif' }
      ];
      
      // 5. 드롭다운에 폰트 목록 추가
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
        
        // 클릭 이벤트 - 폰트 적용 (heading 플러그인과 동일한 방식으로 수정)
        fontItem.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          console.log('폰트 선택함:', font.name, font.value);
          
          // 현재 스크롤 위치 저장
          const currentScrollY = window.scrollY;
          
          // 드롭다운 닫기
          dropdownMenu.style.display = 'none';
          arrowIcon.textContent = 'arrow_drop_down';
          
          // 에디터에 포커스 (이 부분이 필요함)
          contentArea.focus();
          
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
          
          // 스크롤 위치 복원
          window.scrollTo(window.scrollX, currentScrollY);
        });
        
        dropdownMenu.appendChild(fontItem);
      });
      
      // 6. 드롭다운을 document.body에 직접 추가 (align과 동일하게 처리)
      document.body.appendChild(dropdownMenu);
      
      // 7. 버튼 클릭 이벤트 - 드롭다운 토글 (완전 수정)
      fontContainer.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation(); // 이벤트 전파 중지
        
        // 드롭다운이 열려있는 경우 닫기 (토글 동작)
        if (dropdownMenu.style.display === 'block') {
          dropdownMenu.style.display = 'none';
          arrowIcon.textContent = 'arrow_drop_down';
          return;
        }
        
        // 다른 모든 드롭다운 닫기
        document.querySelectorAll('.lite-editor-dropdown-menu.show, .lite-editor-font-dropdown.show').forEach(menu => {
          if (menu !== dropdownMenu) menu.style.display = 'none';
        });
        
        // 선택 영역 저장
        saveSelection();
        
        // 현재 스크롤 위치 저장
        const currentScrollY = window.scrollY;
        
        // 드롭다운 표시
        dropdownMenu.style.display = 'block';
        
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
        
        // 스크롤 위치 복원
        window.scrollTo(window.scrollX, currentScrollY);
      });
      
      // 8. body 클릭 시 드롭다운 닫기
      util.setupOutsideClickHandler(dropdownMenu, () => {
        dropdownMenu.style.display = 'none';
        arrowIcon.textContent = 'arrow_drop_down';
      }, [fontContainer]);
      
      return fontContainer;
    }
  });
})();
