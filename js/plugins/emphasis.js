/**
 * LiteEditor Emphasis Plugin
 * 텍스트 배경색(하이라이트) 플러그인
 * 수정: 선택 블록 유지 기능 추가
 */

(function() {
  // PluginUtil 참조
  const util = window.PluginUtil || {};
  
  // 전역 상태 변수
  let savedRange = null;          // 임시로 저장된 선택 영역
  let isDropdownOpen = false;     // 드롭다운 열림 상태
  
  // 선택 영역 저장 함수
  function saveSelection() {
    savedRange = util.selection.saveSelection();
  }

  // 선택 영역 복원 함수
  function restoreSelection() {
    if (!savedRange) return false;
    return util.selection.restoreSelection(savedRange);
  }
  
  /**
   * 색상 데이터 스크립트 로드 함수
   * 외부 색상 데이터 파일을 동적으로 로드
   * @param {Function} callback - 로드 후 실행할 콜백 함수
   */
  function loadColorScript(callback) {
    util.dataLoader.loadExternalScript('js/data/colors.js', 'LiteEditorColorData', callback);
  }
  
  /**
   * 하이라이트 색상 데이터 로드 함수
   * 다국어 지원이 포함된 외부 데이터 파일에서 색상 목록 가져오기
   * @returns {Array} 색상 목록 배열
   */
  function loadHighlightColorData() {
    const defaultColors = [
      '#ffffcc', '#ffff00', '#ffecb3', '#ffcc00', '#d0f0c0', '#daf2f9', '#b1d6f7',
      '#ffd9cc', '#ffccff', '#e6d3ff', '#ccccff', '#e6ffcc', '#d9d9d9', '#bdbdbd'
    ];
    return util.dataLoader.loadColorData('highlight', defaultColors);
  }
  
  /**
   * 배경색(하이라이트) 적용 함수
   * @param {string} color - 적용할 색상 (hex 코드)
   * @param {HTMLElement} contentArea - 편집 영역 요소
   * @param {HTMLElement} colorIndicator - 색상 표시기 요소
   */
  function applyHighlightColor(color, contentArea, colorIndicator) {
    try {
      // 현재 스크롤 위치 저장
      const currentScrollY = window.scrollY;
      const currentScrollX = window.scrollX;
      
      // 색상 인디케이터 업데이트
      if (colorIndicator) {
        colorIndicator.style.backgroundColor = color;
        colorIndicator.style.border = 'none';
      }
      
      // 포커스 설정 (스크롤 방지)
      try {
        contentArea.focus({ preventScroll: true });
      } catch (e) {
        contentArea.focus();
      }
      
      // 선택 영역 복원
      restoreSelection();
      
      // 현재 선택된 범위 가져오기
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        // 선택 영역이 포함된 공통 조상 컨테이너 찾기
        let container = range.commonAncestorContainer;
        if (container.nodeType === 3) { // 텍스트 노드인 경우
          container = container.parentNode;
        }
        
        // 텍스트 컨텐츠를 복제하고 <span> 태그로 래핑
        const fragment = range.extractContents();
        const spanElement = util.dom.createElement('span', {}, {
          backgroundColor: color
        });
        spanElement.appendChild(fragment);
        
        // 새 <span> 요소를 DOM에 삽입
        range.insertNode(spanElement);
        
        // 방금 추가한 <span> 요소 전체를 선택
        const newRange = document.createRange();
        newRange.selectNodeContents(spanElement);
        selection.removeAllRanges();
        selection.addRange(newRange);
        
        // 에디터 변경 이벤트 발생 (이전 오류 수정: styles -> editor)
        util.editor.dispatchEditorEvent(contentArea);
      }
      
      // 스크롤 위치 복원
      requestAnimationFrame(() => {
        setTimeout(() => {
          window.scrollTo(currentScrollX, currentScrollY);
        }, 50);
      });
    } catch (e) {
      console.error('하이라이트 색상 적용 중 오류:', e);
    }
  }
  
  // 하이라이트(배경색) 플러그인 등록
  LiteEditor.registerPlugin('emphasis', {
    customRender: function(toolbar, contentArea) {
      // 1. 하이라이트 버튼 컨테이너 생성
      const highlightContainer = util.dom.createElement('div', {
        className: 'lite-editor-button',
        title: 'Emphasis'
      });
      
      // 2. 버튼 아이콘 추가
      const icon = util.dom.createElement('i', {
        className: 'material-icons',
        textContent: 'format_color_fill'
      });
      highlightContainer.appendChild(icon);
      
      // 3. 색상 표시기 추가
      const colorIndicator = util.dom.createElement('span', {
        className: 'lite-editor-color-indicator'
      }, {
        backgroundColor: 'transparent',
        border: '1px solid #ccc'
      });
      highlightContainer.appendChild(colorIndicator);
      
      // 4. 드롭다운 메뉴 생성
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
      
      // 5. 색상 그리드 생성
      const colorGrid = util.dom.createElement('div', {
        className: 'lite-editor-color-grid'
      });
      dropdownMenu.appendChild(colorGrid);
      
      // 6. 외부 색상 데이터 파일 로드 후 드롭다운 구성
      loadColorScript(function() {
        // 색상 목록 가져오기
        const highlightColors = loadHighlightColorData();
        
        // 색상 셀 생성
        highlightColors.forEach(color => {
          const colorCell = util.dom.createElement('div', {
            className: 'lite-editor-color-cell',
            'data-color': color
          }, {
            backgroundColor: color
          });
          
          // 색상 클릭 이벤트
          colorCell.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // 현재 스크롤 위치 저장
            const currentScrollY = window.scrollY;
            
            // 드롭다운 API를 통해 닫기
            if (highlightContainer._dropdownAPI) {
              highlightContainer._dropdownAPI.close();
            }
            
            // 하이라이트 색상 적용
            applyHighlightColor(color, contentArea, colorIndicator);
            
            // 스크롤 위치 복원
            requestAnimationFrame(() => {
              setTimeout(() => {
                window.scrollTo(window.scrollX, currentScrollY);
              }, 50);
            });
          });
          
          colorGrid.appendChild(colorCell);
        });
      });
      
      // 7. 드롭다운을 document.body에 직접 추가
      document.body.appendChild(dropdownMenu);
      
      // 8. 버튼 클릭 이벤트 - 드롭다운 토글 (공통 API 사용)
      highlightContainer.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 현재 스크롤 위치 저장
        const currentScrollY = window.scrollY;
        
        // 드롭다운 API 사용
        const dropdownAPI = util.dropdown.setupDropdown(highlightContainer, dropdownMenu, {
          buttonActiveClass: 'active',
          toolbar: toolbar,
          closeOthers: true,
          onOpen: () => {
            // 선택 영역 저장
            saveSelection();
          },
          onClose: () => {
            // 드롭다운 상태 업데이트
            isDropdownOpen = false;
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
      
      return highlightContainer;
    }
  });
})();
