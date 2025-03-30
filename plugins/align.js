/**
 * LiteEditor Alignment Plugin
 * 텍스트 정렬 관련 통합 플러그인
 */

(function() {
  // 텍스트 정렬 플러그인 (드롭다운 형태)
  LiteEditor.registerPlugin('align', {
    title: 'Alignment',
    icon: 'format_align_left',
    customRender: function(toolbar, contentArea) {
      // 버튼 컨테이너 생성
      const alignContainer = document.createElement('div');
      alignContainer.className = 'lite-editor-button';
      alignContainer.setAttribute('title', 'Text Alignment');
      
      // 아이콘 추가
      const alignIcon = document.createElement('i');
      alignIcon.className = 'material-icons';
      alignIcon.textContent = 'format_align_left'; // 기본 아이콘은 왼쪽 정렬
      alignContainer.appendChild(alignIcon);
      
      // 드롭다운 메뉴 생성
      const alignDropdown = document.createElement('div');
      alignDropdown.className = 'lite-editor-dropdown-menu';
      alignDropdown.style.width = '120px';
      
      // 정렬 옵션 정의
      const alignOptions = [
        { name: 'Left', icon: 'format_align_left', command: 'justifyLeft' },
        { name: 'Center', icon: 'format_align_center', command: 'justifyCenter' },
        { name: 'Right', icon: 'format_align_right', command: 'justifyRight' },
        { name: 'Justify', icon: 'format_align_justify', command: 'justifyFull' }
      ];
      
      // 각 옵션에 대한 항목 생성
      alignOptions.forEach(option => {
        const alignOption = document.createElement('div');
        alignOption.className = 'lite-editor-dropdown-item';
        alignOption.setAttribute('data-command', option.command);
        
        // 옵션 아이콘 추가
        const optionIcon = document.createElement('i');
        optionIcon.className = 'material-icons';
        optionIcon.textContent = option.icon;
        optionIcon.style.marginRight = '8px';
        alignOption.appendChild(optionIcon);
        
        // 옵션 텍스트 추가
        const optionText = document.createElement('span');
        optionText.textContent = option.name;
        alignOption.appendChild(optionText);
        
        // 클릭 이벤트 추가
        alignOption.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          // 선택 영역 관리
          if (window.liteEditorSelection) {
            window.liteEditorSelection.restore();
          }
          
          // 명령 실행
          document.execCommand(option.command, false, null);
          
          // 아이콘 변경
          alignIcon.textContent = option.icon;
          
          // 드롭다운 닫기
          alignDropdown.classList.remove('show');
          alignDropdown.style.display = 'none';
          
          // 포커스 유지
          contentArea.focus();
          
          // 변경 효과 확인을 위해 다시 선택 영역 저장
          if (window.liteEditorSelection) {
            window.liteEditorSelection.save();
          }
        });
        
        // 드롭다운에 옵션 추가
        alignDropdown.appendChild(alignOption);
      });
      
      // 드롭다운을 body에 추가
      document.body.appendChild(alignDropdown);
      
      // 클릭 이벤트 처리
      alignContainer.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 현재 선택 영역 저장
        if (window.liteEditorSelection) {
          window.liteEditorSelection.save();
        }
        
        // 다른 모든 드롭다운 닫기
        document.querySelectorAll('.lite-editor-dropdown-menu.show').forEach(menu => {
          if (menu !== alignDropdown) {
            menu.classList.remove('show');
            menu.style.display = 'none';
          }
        });
        
        // 이 드롭다운 토글
        const isShowing = alignDropdown.classList.toggle('show');
        
        // 드롭다운 위치 조정
        if (isShowing) {
          const buttonRect = alignContainer.getBoundingClientRect();
          alignDropdown.style.top = (buttonRect.bottom + window.scrollY) + 'px';
          alignDropdown.style.left = buttonRect.left + 'px';
          alignDropdown.style.display = 'block';
        } else {
          alignDropdown.style.display = 'none';
        }
      });
      
      // body 클릭 시 드롭다운 닫기
      document.addEventListener('click', (e) => {
        if (!alignDropdown.contains(e.target) && !alignContainer.contains(e.target)) {
          alignDropdown.classList.remove('show');
          alignDropdown.style.display = 'none';
        }
      });
      
      return alignContainer;
    }
  });
})();
