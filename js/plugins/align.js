/**
 * LiteEditor Alignment Plugin
 * 텍스트 정렬 관련 통합 플러그인
 */

(function() {
  // 상수 정의
  const PLUGIN_ID = 'align';
  
  // 유틸리티 임포트 (dom 유틸리티만 사용)
  const { dom } = PluginUtil;
  
  // 텍스트 정렬 플러그인 (드롭다운 형태)
  LiteEditor.registerPlugin(PLUGIN_ID, {
    title: 'Alignment',
    icon: 'format_align_left',
    customRender: function(toolbar, contentArea) {
      // 버튼 컨테이너 생성
      const alignContainer = dom.createElement('div', {
        className: 'lite-editor-button',
        title: 'Text Alignment'
      });
      
      // 아이콘 추가
      const alignIcon = dom.createElement('i', {
        className: 'material-icons',
        textContent: 'format_align_justify' // 기본 아이콘은 왼쪽 정렬
      });
      alignContainer.appendChild(alignIcon);
      
      // 드롭다운 메뉴 생성 (가로형으로 변경)
      const alignDropdown = dom.createElement('div', {
        className: 'lite-editor-dropdown-menu lite-editor-align-dropdown'
      });
      
      // 정렬 옵션 정의
      const alignOptions = [
        { name: 'Left', icon: 'format_align_left', command: 'justifyLeft' },
        { name: 'Center', icon: 'format_align_center', command: 'justifyCenter' },
        { name: 'Right', icon: 'format_align_right', command: 'justifyRight' },
        { name: 'Justify', icon: 'format_align_justify', command: 'justifyFull' }
      ];
      
      // 각 옵션에 대한 항목 생성
      alignOptions.forEach(option => {
        const alignOption = dom.createElement('div', {
          className: 'lite-editor-dropdown-item',
          'data-command': option.command,
          title: option.name + ' Align'
        }, {
          width: '32px',
          height: '32px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '0',
          margin: '0'
        });
        
        // 옵션 아이콘만 추가 (텍스트 제거)
        const optionIcon = dom.createElement('i', {
          className: 'material-icons',
          textContent: option.icon
        }, {
          fontSize: '18px'
        });
        
        alignOption.appendChild(optionIcon);
        
        // 클릭 이벤트 추가
        alignOption.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          // 선택 영역 관리 - 원래 방식으로 복원
          if (window.liteEditorSelection) {
            window.liteEditorSelection.restore();
            
            // 선택 범위 확인 및 제한
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
              const range = sel.getRangeAt(0);
              
              // 1. 현재 선택된 노드의 공통 부모 요소 찾기
              let commonAncestor = range.commonAncestorContainer;
              
              // 텍스트 노드인 경우 부모 요소로 변경
              if (commonAncestor.nodeType === 3) {  // 3은 TEXT_NODE
                commonAncestor = commonAncestor.parentNode;
              }
              
              // 2. 선택 범위가 포함된 가장 가까운 블록 요소 찾기
              let targetBlock = dom.findClosestBlock(commonAncestor, contentArea);
              
              // 3. 블록 요소를 찾았다면 해당 요소만 선택하도록 범위 수정
              if (targetBlock) {
                // 기존 선택 지우기
                sel.removeAllRanges();
                
                // 새 범위 생성 (블록 요소만 포함하도록)
                const newRange = document.createRange();
                newRange.selectNodeContents(targetBlock);
                sel.addRange(newRange);
              }
            }
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
        
        // 현재 선택 영역 저장 - 원래 방식으로 복원
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
          const dropdownWidth = 146; // 드롭다운 너비
          
          // 버튼 중앙에 드롭다운 배치하기 위한 계산
          const buttonCenter = buttonRect.left + (buttonRect.width / 2);
          const dropdownLeft = buttonCenter - (dropdownWidth / 2);
          
          // 화면 경계 체크 및 조정
          const viewportWidth = window.innerWidth;
          let finalLeft = dropdownLeft;
          
          // 왼쪽 경계 체크
          if (finalLeft < 5) {
            finalLeft = 5;
          }
          
          // 오른쪽 경계 체크
          if (finalLeft + dropdownWidth > viewportWidth - 5) {
            finalLeft = viewportWidth - dropdownWidth - 5;
          }
          
          // 드롭다운 전체 크기 조정 및 강력한 인라인 스타일 적용
          alignDropdown.setAttribute('style', 
            `top: ${buttonRect.bottom + window.scrollY}px; 
             left: ${finalLeft}px; 
             width: ${dropdownWidth}px !important; 
             height: 38px !important; 
             display: flex !important; 
             flex-direction: row !important;
             justify-content: space-between !important;
             padding: 2px !important;
             overflow: hidden !important;`
          );
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
      
      // 다른 에디터 아이콘 클릭 시 드롭다운 닫기
      toolbar.addEventListener('click', (e) => {
        // 클릭된 요소 또는 그 부모가 에디터 버튼인지 확인
        const clickedButton = e.target.closest('.lite-editor-button');
        
        // 클릭된 버튼이 alignContainer가 아닌 다른 버튼인 경우 드롭다운 닫기
        if (clickedButton && clickedButton !== alignContainer) {
          alignDropdown.classList.remove('show');
          alignDropdown.style.display = 'none';
        }
      });
      
      return alignContainer;
    }
  });
})();
