/**
 * LiteEditor Indentation Plugin
 * 들여쓰기 및 내어쓰기 통합 플러그인
 */

(function() {
  // 들여쓰기 플러그인
  LiteEditor.registerPlugin('formatIndent', {
    title: 'Indentation',
    icon: 'format_indent_increase',
    customRender: function(toolbar, contentArea) {
      // 버튼 컨테이너 생성
      const indentContainer = document.createElement('div');
      indentContainer.className = 'lite-editor-button';
      indentContainer.setAttribute('title', 'Indentation');
      
      // 아이콘 추가
      const indentIcon = document.createElement('i');
      indentIcon.className = 'material-icons';
      indentIcon.textContent = 'format_indent_increase';
      indentContainer.appendChild(indentIcon);
      
      // 드롭다운 메뉴 생성
      const indentDropdown = document.createElement('div');
      indentDropdown.className = 'lite-editor-dropdown-menu';
      indentDropdown.style.width = '160px';
      
      // 들여쓰기 옵션 정의
      const indentOptions = [
        { name: 'Increase Indent', icon: 'format_indent_increase', command: 'indent' },
        { name: 'Decrease Indent', icon: 'format_indent_decrease', command: 'outdent' },
      ];
      
      // 각 옵션에 대한 항목 생성
      indentOptions.forEach(option => {
        const indentOption = document.createElement('div');
        indentOption.className = 'lite-editor-dropdown-item';
        indentOption.setAttribute('data-command', option.command);
        
        // 옵션 아이콘 추가
        const optionIcon = document.createElement('i');
        optionIcon.className = 'material-icons';
        optionIcon.textContent = option.icon;
        optionIcon.style.marginRight = '8px';
        indentOption.appendChild(optionIcon);
        
        // 옵션 텍스트 추가
        const optionText = document.createElement('span');
        optionText.textContent = option.name;
        indentOption.appendChild(optionText);
        
        // 클릭 이벤트 추가
        indentOption.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          // 선택 영역 관리
          if (window.liteEditorSelection) {
            window.liteEditorSelection.restore();
          }
          
          // 명령 실행
          document.execCommand(option.command, false, null);
          
          // 아이콘 변경
          indentIcon.textContent = option.icon;
          
          // 드롭다운 닫기
          indentDropdown.classList.remove('show');
          indentDropdown.style.display = 'none';
          
          // 포커스 유지
          contentArea.focus();
          
          // 변경 효과 확인을 위해 다시 선택 영역 저장
          if (window.liteEditorSelection) {
            window.liteEditorSelection.save();
          }
        });
        
        // 드롭다운에 옵션 추가
        indentDropdown.appendChild(indentOption);
      });
      
      // 드롭다운을 body에 추가
      document.body.appendChild(indentDropdown);
      
      // 클릭 이벤트 처리
      indentContainer.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 현재 선택 영역 저장
        if (window.liteEditorSelection) {
          window.liteEditorSelection.save();
        }
        
        // 다른 모든 드롭다운 닫기
        document.querySelectorAll('.lite-editor-dropdown-menu.show').forEach(menu => {
          if (menu !== indentDropdown) {
            menu.classList.remove('show');
            menu.style.display = 'none';
          }
        });
        
        // 이 드롭다운 토글
        const isShowing = indentDropdown.classList.toggle('show');
        
        // 드롭다운 위치 조정
        if (isShowing) {
          const buttonRect = indentContainer.getBoundingClientRect();
          indentDropdown.style.top = (buttonRect.bottom + window.scrollY) + 'px';
          indentDropdown.style.left = buttonRect.left + 'px';
          indentDropdown.style.display = 'block';
        } else {
          indentDropdown.style.display = 'none';
        }
      });
      
      // body 클릭 시 드롭다운 닫기
      document.addEventListener('click', (e) => {
        if (!indentDropdown.contains(e.target) && !indentContainer.contains(e.target)) {
          indentDropdown.classList.remove('show');
          indentDropdown.style.display = 'none';
        }
      });
      
      return indentContainer;
    }
  });
})();
