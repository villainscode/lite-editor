/**
 * LiteEditor Emphasis Plugin
 * 텍스트 배경색(하이라이트) 플러그인
 * 수정: 선택 블록 유지 기능 추가
 */

(function() {
  // 하이라이트(배경색) 플러그인
  LiteEditor.registerPlugin('emphasis', {
    customRender: function(toolbar, contentArea) {
      // 하이라이트 컨테이너 생성
      const highlightContainer = document.createElement('div');
      highlightContainer.className = 'lite-editor-button';
      
      // 아이콘 추가
      const icon = document.createElement('i');
      icon.className = 'material-icons';
      icon.textContent = 'format_color_fill';
      highlightContainer.setAttribute('title', 'Emphasis');
      highlightContainer.appendChild(icon);
      
      // 선택된 색상 표시기
      const colorIndicator = document.createElement('span');
      colorIndicator.className = 'lite-editor-color-indicator';
      colorIndicator.style.backgroundColor = 'transparent';
      colorIndicator.style.border = '1px solid #ccc';
      highlightContainer.appendChild(colorIndicator);
      
      // 드롭다운 메뉴 생성
      const dropdownMenu = document.createElement('div');
      dropdownMenu.className = 'lite-editor-dropdown-menu';
      dropdownMenu.id = 'highlight-dropdown-' + Math.random().toString(36).substr(2, 9);
      dropdownMenu.style.position = 'fixed'; 
      dropdownMenu.style.zIndex = '2147483647';
      
      // 하이라이트 색상 목록
      const highlightColors = [
        '#ffffcc', '#ffff00', '#ffecb3', '#ffcc00', '#d0f0c0', '#daf2f9', '#b1d6f7',
        '#ffd9cc', '#ffccff', '#e6d3ff', '#ccccff', '#e6ffcc', '#d9d9d9', '#bdbdbd'
      ];
      
      // 업데이트 위치 함수 - 전역 스코프로 선언
      let updatePosition = null;
      
      // 문서 클릭 이벤트 핸들러 - 전역 스코프로 선언
      let documentClickHandler = null;
      
      // 드롭다운 닫기 함수
      const closeDropdown = () => {
        if (dropdownMenu.style.display === 'block' || dropdownMenu.classList.contains('show')) {
          dropdownMenu.classList.remove('show');
          dropdownMenu.style.display = 'none';
          
          // 스크롤 이벤트 리스너 제거
          if (updatePosition) {
            window.removeEventListener('scroll', updatePosition);
            updatePosition = null;
          }
          
          // 클릭 이벤트 리스너 제거
          if (documentClickHandler) {
            document.removeEventListener('click', documentClickHandler);
            document.removeEventListener('mousedown', documentClickHandler);
            documentClickHandler = null;
          }
        }
      };
      
      // 색상 그리드 생성
      const colorGrid = document.createElement('div');
      colorGrid.className = 'lite-editor-color-grid';
      // 그리드 레이아웃 설정 - fontColor.js와 동일하게
      colorGrid.style.display = 'grid';
      colorGrid.style.gridTemplateColumns = 'repeat(7, 1fr)'; // 7열 그리드
      colorGrid.style.gap = '3px'; // 셀 간격
      colorGrid.style.padding = '8px'; // 패딩
      colorGrid.style.width = 'auto'; // 너비 자동 조정
      dropdownMenu.appendChild(colorGrid);
      
      // 색상 셀 생성
      highlightColors.forEach(color => {
        const colorCell = document.createElement('div');
        colorCell.className = 'lite-editor-color-cell';
        colorCell.style.backgroundColor = color;
        // 셀 크기 설정 - fontColor.js와 동일하게
        colorCell.style.width = '20px';
        colorCell.style.height = '20px';
        colorCell.setAttribute('data-color', color);
        
        // 색상 클릭 이벤트
        colorCell.addEventListener('click', () => {
          if (window.liteEditorSelection) {
            try {
              // 현재 스크롤 위치 저장
              const currentScrollY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop;
              const currentScrollX = window.scrollX || document.documentElement.scrollLeft || document.body.scrollLeft;
              
              // 드롭다운 닫기
              closeDropdown();
              
              // 포커스 설정 (스크롤 방지)
              try {
                contentArea.focus({ preventScroll: true });
              } catch (e) {
                contentArea.focus();
              }
              
              // 선택 영역 복원
              window.liteEditorSelection.restore();
              
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
                const spanElement = document.createElement('span');
                spanElement.style.backgroundColor = color;
                spanElement.appendChild(fragment);
                
                // 새 <span> 요소를 DOM에 삽입
                range.insertNode(spanElement);
                
                // 방금 추가한 <span> 요소 전체를 선택
                const newRange = document.createRange();
                newRange.selectNodeContents(spanElement);
                selection.removeAllRanges();
                selection.addRange(newRange);
                
                // 에디터 변경 이벤트 발생
                contentArea.dispatchEvent(new Event('input', { bubbles: true }));
              }
              
              // 색상 인디케이터 업데이트
              colorIndicator.style.backgroundColor = color;
              colorIndicator.style.border = 'none';
              
              // 스크롤 복원
              requestAnimationFrame(() => {
                window.scrollTo(currentScrollX, currentScrollY);
              });
            } catch (e) {
              console.error('하이라이트 색상 적용 중 오류:', e);
            }
          }
        });
        
        colorGrid.appendChild(colorCell);
      });
      
      // 드롭다운 메뉴를 document.body에 추가
      document.body.appendChild(dropdownMenu);
      
      // 드롭다운 내부 클릭 이벤트 버블링 중지
      dropdownMenu.addEventListener('click', function(e) {
        e.stopPropagation();
      });
      
      // 툴바의 다른 요소 클릭 시 드롭다운 닫기
      toolbar.addEventListener('mousedown', function(e) {
        // 현재 버튼이 아닌 다른 툴바 요소 클릭 시 닫기
        if (e.target !== highlightContainer && !highlightContainer.contains(e.target)) {
          closeDropdown();
        }
      }, true);
      
      // 버튼 클릭 시 드롭다운 표시/숨김
      highlightContainer.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 현재 스크롤 위치 저장
        const currentScrollY = window.scrollY;
        const currentScrollX = window.scrollX;
        
        // 현재 선택 영역 저장
        if (window.liteEditorSelection) {
          window.liteEditorSelection.save();
        }
        
        // 드롭다운 토글
        if (dropdownMenu.style.display === 'block') {
          closeDropdown();
          return;
        }
        
        // 다른 모든 드롭다운 닫기
        document.querySelectorAll('.lite-editor-dropdown-menu.show, .lite-editor-font-dropdown, .lite-editor-heading-dropdown').forEach(menu => {
          if (menu !== dropdownMenu && menu.style.display === 'block') {
            menu.style.display = 'none';
          }
        });
        
        // 레이어 위치 설정 - 버튼 위치 기준으로 고정 위치 계산
        const buttonRect = highlightContainer.getBoundingClientRect();
        // fixed position은 viewport 기준이므로 scrollY를 더하지 않음
        dropdownMenu.style.top = buttonRect.bottom + 'px';
        dropdownMenu.style.left = buttonRect.left + 'px';
        
        // 화면 경계 체크
        setTimeout(() => {
          const layerRect = dropdownMenu.getBoundingClientRect();
          if (layerRect.right > window.innerWidth) {
            dropdownMenu.style.left = (window.innerWidth - layerRect.width - 10) + 'px';
          }
        }, 0);
        
        // 드롭다운 표시
        dropdownMenu.style.display = 'block';
        dropdownMenu.classList.add('show');
        
        // 스크롤 이벤트 핸들러 등록 - 스크롤 시에도 버튼 아래 위치하도록
        updatePosition = function() {
          const newRect = highlightContainer.getBoundingClientRect();
          dropdownMenu.style.top = newRect.bottom + 'px';
          dropdownMenu.style.left = newRect.left + 'px';
        };
        
        // 스크롤 이벤트 리스너 추가
        window.addEventListener('scroll', updatePosition);
        
        // 문서 클릭 이벤트 핸들러 - 드롭다운 외부 클릭 시 닫기
        documentClickHandler = (event) => {
          // highlightContainer나 dropdownMenu 영역 외부 클릭인 경우에만 닫기
          if (!highlightContainer.contains(event.target) && !dropdownMenu.contains(event.target)) {
            closeDropdown();
          }
        };
        
        // 클릭 이벤트 등록 (mousedown도 함께 등록)
        document.addEventListener('click', documentClickHandler);
        document.addEventListener('mousedown', documentClickHandler);
        
        // 스크롤 위치 복원
        requestAnimationFrame(() => {
          window.scrollTo(currentScrollX, currentScrollY);
        });
      });
      
      // 드롭다운 메뉴 스타일 추가
      dropdownMenu.style.padding = '6px 0'; // 상하 패딩 줄이기
      
      // 드롭다운 메뉴 사이즈 최적화
      dropdownMenu.style.width = 'auto'; // 내용에 맞게 자동 조정
      dropdownMenu.style.minWidth = 'auto'; // 최소 폭 설정 제거
      
      return highlightContainer;
    }
  });
})();
