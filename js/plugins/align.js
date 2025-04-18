/**
 * LiteEditor Alignment Plugin
 * 텍스트 정렬 관련 통합 플러그인
 */

(function() {
  // 상수 정의
  const PLUGIN_ID = 'align';
  
  // 유틸리티 임포트
  const { dom } = PluginUtil;
  
  /**
   * 드롭다운 토글 함수 - 플러그인 내부에서만 사용
   * @param {boolean} isShow - 보여줄지 여부
   * @param {HTMLElement} dropdown - 드롭다운 요소
   * @param {HTMLElement} [anchor] - 기준 요소 (표시할 때만 필요)
   */
  function toggleDropdown(isShow, dropdown, anchor) {
    if (isShow) {
      // 드롭다운 보이기
      dropdown.classList.add('show');
      
      const buttonRect = anchor.getBoundingClientRect();
      const dropdownWidth = 146;
      
      // 중앙 정렬 계산
      const buttonCenter = buttonRect.left + (buttonRect.width / 2);
      const dropdownLeft = buttonCenter - (dropdownWidth / 2);
      
      // 화면 경계 체크
      const viewportWidth = window.innerWidth;
      let finalLeft = dropdownLeft;
      
      if (finalLeft < 5) {
        finalLeft = 5;
      }
      
      if (finalLeft + dropdownWidth > viewportWidth - 5) {
        finalLeft = viewportWidth - dropdownWidth - 5;
      }
      
      // 스타일 적용
      dropdown.setAttribute('style', 
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
      // 드롭다운 숨기기
      dropdown.classList.remove('show');
      dropdown.style.display = 'none';
    }
  }
  
  /**
   * 선택된 블록에 정렬 적용 함수
   * @param {string} command - 실행할 정렬 명령
   * @param {HTMLElement} contentArea - 에디터 콘텐츠 영역
   * @param {HTMLElement} iconElement - 업데이트할 아이콘 요소
   * @param {string} iconName - 설정할 아이콘 이름
   */
  function applyAlignmentToBlock(command, contentArea, iconElement, iconName) {
    // 선택 영역 관리
    if (window.liteEditorSelection) {
      window.liteEditorSelection.restore();
      
      // 선택 범위 확인 및 제한
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        
        // 현재 선택된 노드의 공통 부모 요소 찾기
        let commonAncestor = range.commonAncestorContainer;
        
        // 텍스트 노드인 경우 부모 요소로 변경
        if (commonAncestor.nodeType === 3) {  // 3은 TEXT_NODE
          commonAncestor = commonAncestor.parentNode;
        }
        
        // 선택 범위가 포함된 가장 가까운 블록 요소 찾기
        let targetBlock = dom.findClosestBlock(commonAncestor, contentArea);
        
        // 블록 요소를 찾았다면 해당 요소만 선택하도록 범위 수정
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
    document.execCommand(command, false, null);
    
    // 아이콘 변경
    iconElement.textContent = iconName;
    
    // 포커스 유지
    contentArea.focus();
    
    // 변경 효과 확인을 위해 다시 선택 영역 저장
    if (window.liteEditorSelection) {
      window.liteEditorSelection.save();
    }
  }
  
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
          
          // 정렬 적용
          applyAlignmentToBlock(option.command, contentArea, alignIcon, option.icon);
          
          // 드롭다운 닫기
          toggleDropdown(false, alignDropdown);
        });
        
        // 드롭다운에 옵션 추가
        alignDropdown.appendChild(alignOption);
      });
      
      // 드롭다운을 body에 추가
      document.body.appendChild(alignDropdown);
      
      // 이벤트 핸들러 설정
      setupEventHandlers(alignContainer, alignDropdown, contentArea, toolbar);
      
      return alignContainer;
    }
  });
  
  /**
   * 이벤트 핸들러 설정 함수
   * @param {HTMLElement} container - 정렬 버튼 컨테이너
   * @param {HTMLElement} dropdown - 드롭다운 요소
   * @param {HTMLElement} contentArea - 에디터 콘텐츠 영역
   * @param {HTMLElement} toolbar - 툴바 요소
   */
  function setupEventHandlers(container, dropdown, contentArea, toolbar) {
    // 정렬 버튼 클릭 이벤트
    container.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // 현재 선택 영역 저장
      if (window.liteEditorSelection) {
        window.liteEditorSelection.save();
      }
      
      // 다른 모든 드롭다운 닫기
      document.querySelectorAll('.lite-editor-dropdown-menu.show').forEach(menu => {
        if (menu !== dropdown) {
          toggleDropdown(false, menu);
        }
      });
      
      // 이 드롭다운 토글
      const isShowing = !dropdown.classList.contains('show');
      toggleDropdown(isShowing, dropdown, container);
    });
    
    // body 클릭 시 드롭다운 닫기
    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && !container.contains(e.target)) {
        toggleDropdown(false, dropdown);
      }
    });
    
    // 다른 에디터 아이콘 클릭 시 드롭다운 닫기
    toolbar.addEventListener('click', (e) => {
      const clickedButton = e.target.closest('.lite-editor-button');
      if (clickedButton && clickedButton !== container) {
        toggleDropdown(false, dropdown);
      }
    });
  }
})();
