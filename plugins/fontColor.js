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
        '#ff0000', '#FF00FF', '#f44336', '#ff9c00', '#ffa723', '#ffacb0', '#ffe2e3',  
        '#9c00ff', '#4caf50', '#00bcd4', '#00ffff', '#00ff00', '#93ccff', '#59b4ff', 
        '#2196f3', '#107aea', '#0000ff', '#fbffa9', '#ffff00', '#ffea00', '#e9d201'
      ];
      
      // 드롭다운 메뉴 생성
      const dropdownMenu = document.createElement('div');
      dropdownMenu.className = 'lite-editor-dropdown-menu';
      dropdownMenu.id = 'font-color-dropdown-' + Math.random().toString(36).substr(2, 9); // 고유 ID 추가
      
      // 색상 그리드 생성
      const colorGrid = document.createElement('div');
      colorGrid.className = 'lite-editor-color-grid';
      dropdownMenu.appendChild(colorGrid);
      
      // 색상 셀 생성 함수
      colors.forEach(color => {
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
                // 2. 색상 명령 실행
                document.execCommand('foreColor', false, color);
                
                // 3. 선택된 색상 표시 업데이트
                colorIndicator.style.backgroundColor = color;
                
                // 4. 드롭다운 닫기 (모든 스타일 명시적으로 설정)
                dropdownMenu.classList.remove('show');
                dropdownMenu.style.cssText = 'display:none; visibility:hidden; opacity:0; pointer-events:none;';
                
                console.log('색상 적용 완료:', color);
              }, 50); // 50ms 지연 추가
            } catch (e) {
              console.error('색상 적용 중 오류:', e);
            }
          }
        });
        
        colorGrid.appendChild(colorCell);
      });
      
      // 드롭다운을 document.body에 직접 추가
      document.body.appendChild(dropdownMenu);
      
      // 드롭다운 내부 클릭 이벤트 버블링 중지
      dropdownMenu.addEventListener('click', function(e) {
        e.stopPropagation();
      });
      
      // 드롭다운과 버튼 연결
      colorContainer.dropdownMenu = dropdownMenu;
      
      // 클릭 이벤트 처리
      colorContainer.addEventListener('click', (e) => {
        e.preventDefault();
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
        
        // 이 드롭다운 토글
        dropdownMenu.classList.toggle('show');
        
        // 드롭다운 위치 조정
        if (dropdownMenu.classList.contains('show')) {
          const buttonRect = colorContainer.getBoundingClientRect();
          dropdownMenu.style.top = (buttonRect.bottom + window.scrollY) + 'px';
          dropdownMenu.style.left = buttonRect.left + 'px';
          dropdownMenu.style.visibility = 'visible';
          dropdownMenu.style.opacity = '1';
          dropdownMenu.style.pointerEvents = 'auto';
          dropdownMenu.style.display = 'block';
          dropdownMenu.style.zIndex = '99999';
        }
        
        // 선택 영역 복원
        if (window.liteEditorSelection) {
          window.liteEditorSelection.restore();
        }
      });
      
      // 바디 클릭 시 드롭다운 닫기
      const closeColorDropdown = () => {
        if (dropdownMenu.classList.contains('show')) {
          dropdownMenu.classList.remove('show');
          dropdownMenu.style.display = 'none';
        }
      };
      
      document.body.addEventListener('click', closeColorDropdown);
      
      return colorContainer;
    }
  });
})();
