/**
 * LiteEditor Font Color Plugin
 * 글자 색상 플러그인
 */

(function() {
  // 글자 색상 플러그인
  LiteEditor.registerPlugin('fontColor', {
    customRender: function(toolbar, contentArea) {
      // 컬러 컨테이너 생성
      const colorContainer = document.createElement('div');
      colorContainer.className = 'lite-editor-button';
      colorContainer.setAttribute('title', 'Font Color');
      
      // 아이콘 추가
      const icon = document.createElement('i');
      icon.className = 'material-icons';
      icon.textContent = 'palette';
      colorContainer.appendChild(icon);
      
      // 선택된 색상 표시기
      const colorIndicator = document.createElement('span');
      colorIndicator.className = 'lite-editor-color-indicator';
      colorIndicator.style.backgroundColor = '#000000';
      colorContainer.appendChild(colorIndicator);
      
      // 자주 사용하는 색상 목록
      const colors = [
        '#000000', '#666666', '#999999', '#b7b7b7', '#d9d9d9', '#efefef', '#ffffff', 
        '#ffdcdc', '#ffbfbf', '#ff9292', '#ff5454', '#ff0000', '#db0000', '#b20000',
        '#d5ebff', '#b3d8ff', '#85bcff', '#5692ff', '#2f67ff', '#002aff', '#102d9f',
        '#eaffe4', '#d0ffc4', '#6bff50', '#15e600', '#0cb800', '#0d6d07', '#003400',
        '#f9ffc1', '#f8ff86', '#efee03', '#ffea00',  '#d1ae00', '#a67d02', '#89610a'
      ];
      
      // 드롭다운 메뉴 생성
      const dropdownMenu = document.createElement('div');
      dropdownMenu.className = 'lite-editor-dropdown-menu';
      dropdownMenu.id = 'font-color-dropdown-' + Math.random().toString(36).substr(2, 9);
      dropdownMenu.style.position = 'fixed';
      dropdownMenu.style.zIndex = '2147483647';
      
      // 색상 그리드 생성
      const colorGrid = document.createElement('div');
      colorGrid.className = 'lite-editor-color-grid';
      dropdownMenu.appendChild(colorGrid);
      
      // 중복 이벤트와 충돌을 방지하기 위한 추적 변수
      let isDropdownOpen = false;
      let documentClickHandlerAdded = false;
      
      // 드롭다운 닫기 함수 - 단일 함수로 정의하고 변경하지 않음
      const closeDropdown = () => {
        isDropdownOpen = false;
        dropdownMenu.classList.remove('show');
        dropdownMenu.style.display = 'none';
        
        // 이벤트 리스너 제거
        if (documentClickHandlerAdded) {
          document.removeEventListener('click', documentClickHandler);
          documentClickHandlerAdded = false;
        }
        
        // 스크롤 이벤트 리스너 제거
        window.removeEventListener('scroll', updatePosition);
      };
      
      // 스크롤 이벤트 핸들러
      const updatePosition = () => {
        if (!isDropdownOpen) return;
        
        const newRect = colorContainer.getBoundingClientRect();
        dropdownMenu.style.top = newRect.bottom + 'px';
        dropdownMenu.style.left = newRect.left + 'px';
      };
      
      // 문서 클릭 이벤트 핸들러
      const documentClickHandler = (e) => {
        if (!dropdownMenu.contains(e.target) && !colorContainer.contains(e.target)) {
          closeDropdown();
        }
      };
      
      // 색상 셀 생성
      colors.forEach(color => {
        const colorCell = document.createElement('div');
        colorCell.className = 'lite-editor-color-cell';
        colorCell.style.backgroundColor = color;
        colorCell.setAttribute('data-color', color);
        
        // 색상 클릭 이벤트
        colorCell.addEventListener('click', () => {
          try {
            // 현재 스크롤 위치 저장
            const currentScrollY = window.scrollY;
            
            // 색상 인디케이터 업데이트
            colorIndicator.style.backgroundColor = color;
            
            // 드롭다운 닫기 - 명시적으로 함수 호출
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
              
              // 텍스트 컨텐츠를 복제하고 <font> 태그로 래핑
              const fragment = range.extractContents();
              const fontElement = document.createElement('font');
              fontElement.setAttribute('color', color);
              fontElement.appendChild(fragment);
              
              // 새 <font> 요소를 DOM에 삽입
              range.insertNode(fontElement);
              
              // 방금 추가한 <font> 요소 전체를 선택
              const newRange = document.createRange();
              newRange.selectNodeContents(fontElement);
              selection.removeAllRanges();
              selection.addRange(newRange);
              
              // 에디터 변경 이벤트 발생
              contentArea.dispatchEvent(new Event('input', { bubbles: true }));
            }
            
            // 스크롤 위치 복원
            requestAnimationFrame(() => {
              window.scrollTo(window.scrollX, currentScrollY);
            });
          } catch (e) {
            console.error('색상 적용 중 오류:', e);
          }
        });
        
        colorGrid.appendChild(colorCell);
      });
      
      // 드롭다운 내부 클릭 이벤트 버블링 중지
      dropdownMenu.addEventListener('click', function(e) {
        e.stopPropagation();
      });
      
      // 클릭 이벤트 처리
      colorContainer.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 현재 스크롤 위치 저장
        const currentScrollY = window.scrollY;
        const currentScrollX = window.scrollX;
        
        // 선택 영역 저장
        if (window.liteEditorSelection) {
          window.liteEditorSelection.save();
        }
        
        // 드롭다운 토글
        if (isDropdownOpen) {
          closeDropdown();
          return;
        }
        
        // 다른 드롭다운 닫기
        document.querySelectorAll('.lite-editor-dropdown-menu.show, .lite-editor-font-dropdown, .lite-editor-heading-dropdown').forEach(menu => {
          if (menu !== dropdownMenu && menu.style.display === 'block') {
            menu.style.display = 'none';
          }
        });
        
        // 레이어 위치 설정
        const buttonRect = colorContainer.getBoundingClientRect();
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
        isDropdownOpen = true;
        dropdownMenu.style.display = 'block';
        dropdownMenu.classList.add('show');
        
        // 스크롤 이벤트 리스너 추가
        window.addEventListener('scroll', updatePosition);
        
        // 클릭 이벤트 등록 (한 번만 등록되게)
        if (!documentClickHandlerAdded) {
          setTimeout(() => {
            document.addEventListener('click', documentClickHandler);
            documentClickHandlerAdded = true;
          }, 0);
        }
        
        // 스크롤 위치 복원
        requestAnimationFrame(() => {
          window.scrollTo(currentScrollX, currentScrollY);
        });
      });
      
      // 드롭다운을 document.body에 직접 추가
      document.body.appendChild(dropdownMenu);
      
      // 툴바의 다른 요소 클릭 시 드롭다운 닫기
      toolbar.addEventListener('mousedown', function(e) {
        // 현재 버튼이 아닌 다른 툴바 요소 클릭 시 닫기
        if (e.target !== colorContainer && !colorContainer.contains(e.target)) {
          closeDropdown();
        }
      }, true);
      
      return colorContainer;
    }
  });
})();
