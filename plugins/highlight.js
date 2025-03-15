/**
 * LiteEditor Highlight Plugin
 * 텍스트 배경색(하이라이트) 플러그인
 */

(function() {
  // 하이라이트(배경색) 플러그인
  LiteEditor.registerPlugin('highlight', {
    customRender: function(toolbar, contentArea) {
      // 하이라이트 컨테이너 생성
      const highlightContainer = document.createElement('div');
      highlightContainer.className = 'lite-editor-button';
      
      
      // 아이콘 추가
      const icon = document.createElement('i');
      icon.className = 'material-icons';
      icon.textContent = 'format_color_fill';
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
      dropdownMenu.id = 'highlight-dropdown-' + Math.random().toString(36).substr(2, 9); // 고유 ID 추가
      
      // 하이라이트 색상 목록
      const highlightColors = [
        '#ffff00', '#ffffcc', '#ffcc00', '#ffecb3', '#e6ffcc', 
        '#ccffcc', '#ccffff', '#cce6ff', '#ccccff', '#e6ccff',
        '#ffccff', '#ffcce6', '#ffd9cc'
      ];
      
      // 색상 그리드 생성
      const colorGrid = document.createElement('div');
      colorGrid.className = 'lite-editor-color-grid';
      dropdownMenu.appendChild(colorGrid);
      
      // 색상 셀 생성
      highlightColors.forEach(color => {
        const colorCell = document.createElement('div');
        colorCell.className = 'lite-editor-color-cell';
        colorCell.style.backgroundColor = color;
        colorCell.setAttribute('data-color', color);
        
        // 색상 클릭 이벤트
        colorCell.addEventListener('click', () => {
          // 1. 현재 선택 영역 확인 및 복원
          if (window.liteEditorSelection) {
            try {
              window.liteEditorSelection.restore();
              
              // 지연 시간 추가 (선택 영역 복원 완료 대기)
              setTimeout(() => {
                // 2. 배경색 명령 실행
                document.execCommand('hiliteColor', false, color);
                
                // 3. 선택된 색상 표시 업데이트
                colorIndicator.style.backgroundColor = color;
                colorIndicator.style.border = 'none';
                
                // 4. 드롭다운 닫기 (모든 스타일 명시적으로 설정)
                dropdownMenu.classList.remove('show');
                dropdownMenu.style.cssText = 'display:none; visibility:hidden; opacity:0; pointer-events:none;';
                
                console.log('하이라이트 색상 적용 완료:', color);
              }, 50); // 50ms 지연 추가
            } catch (e) {
              console.error('하이라이트 색상 적용 중 오류:', e);
            }
          }
        });
        
        colorGrid.appendChild(colorCell);
      });
      
      // 'None' 옵션 추가 (하이라이트 제거)
      const noneOption = document.createElement('div');
      noneOption.className = 'lite-editor-color-cell lite-editor-color-none';
      noneOption.textContent = 'None';
      noneOption.style.textAlign = 'center';
      noneOption.addEventListener('click', () => {
        document.execCommand('hiliteColor', false, 'transparent');
        colorIndicator.style.backgroundColor = 'transparent';
        colorIndicator.style.border = '1px solid #ccc';
        dropdownMenu.classList.remove('show');
      });
      colorGrid.appendChild(noneOption);
      
      // 드롭다운 메뉴를 document.body에 추가
      document.body.appendChild(dropdownMenu);
      
      // 드롭다운 내부 클릭 이벤트 버블링 중지
      dropdownMenu.addEventListener('click', function(e) {
        e.stopPropagation();
      });
      
      // 버튼 클릭 시 드롭다운 표시/숨김
      highlightContainer.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // 현재 선택 영역 저장
        if (window.liteEditorSelection) {
          window.liteEditorSelection.save();
        }
        
        // 다른 모든 드롭다운 닫기
        document.querySelectorAll('.lite-editor-dropdown-menu.show').forEach(menu => {
          if (menu !== dropdownMenu) {
            menu.classList.remove('show');
          }
        });
        
        // 현재 드롭다운 토글
        dropdownMenu.classList.toggle('show');
        
        // 드롭다운 메뉴 위치 조정
        if (dropdownMenu.classList.contains('show')) {
          const buttonRect = highlightContainer.getBoundingClientRect();
          
          // 절대 위치로 계산
          dropdownMenu.style.top = (buttonRect.bottom + window.scrollY) + 'px';
          dropdownMenu.style.left = buttonRect.left + 'px';
          
          // 가시성 강제 확인
          dropdownMenu.style.visibility = 'visible';
          dropdownMenu.style.opacity = '1';
          dropdownMenu.style.pointerEvents = 'auto';
          dropdownMenu.style.display = 'block';
          dropdownMenu.style.zIndex = '99999';
        }
        
        console.log('드롭다운 상태:', dropdownMenu.classList.contains('show') ? '열림' : '닫힘');
      });
      
      // 바디 클릭 시 드롭다운 닫기
      const closeHighlightDropdown = () => {
        if (dropdownMenu.classList.contains('show')) {
          dropdownMenu.classList.remove('show');
          dropdownMenu.style.display = 'none';
        }
      };
      
      document.body.addEventListener('click', closeHighlightDropdown);
      
      return highlightContainer;
    }
  });
})();
