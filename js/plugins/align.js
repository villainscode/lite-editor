/**
 * LiteEditor Alignment Plugin
 * 텍스트 정렬 관련 통합 플러그인
 */

(function() {
  const ID = 'align';
  const util = window.PluginUtil;
  const commands = [
    { cmd: 'justifyLeft',    icon: 'format_align_left',   title: 'Left Align' },
    { cmd: 'justifyCenter',  icon: 'format_align_center', title: 'Center Align' },
    { cmd: 'justifyRight',   icon: 'format_align_right',  title: 'Right Align' },
    { cmd: 'justifyFull',    icon: 'format_align_justify', title: 'Justify Align' }
  ];

  // 1) 버튼 생성
  function createAlignButton(contentArea) {
    const btn = util.dom.createElement('div', {
      className: 'lite-editor-button',
      title: 'Text Alignment'
    });
    const icon = util.dom.createElement('i', {
      className: 'material-icons',
      textContent: commands[0].icon  // 기본 아이콘
    });
    btn.appendChild(icon);
    
    // 버튼을 activeModalManager에 등록 (다른 레이어 닫기 위함)
    util.activeModalManager.registerButton(btn);
    
    return { btn, icon };
  }

  // 2) 드롭다운 생성 - PluginUtil의 createDropdown 활용
  function createAlignDropdown(contentArea, iconElement) {
    // 드롭다운 아이템 생성
    const items = commands.map(({ cmd, icon, title }) => ({
      text: '',  // 텍스트 대신 아이콘 사용
      value: cmd,
      icon: icon,
      title: title
    }));
    
    // PluginUtil의 createDropdown 함수로 드롭다운 생성
    const dropdown = util.createDropdown({
      className: 'lite-editor-dropdown-menu lite-editor-align-dropdown',
      items: items,
      onSelect: (cmd, item) => {
        applyAlignment(cmd, contentArea, iconElement, item.icon);
      }
    });
    
    // 가로 배치를 위한 커스텀 스타일 적용
    configureDropdownStyle(dropdown);
    
    // 드롭다운에 closeCallback 추가 (activeModalManager에서 사용)
    dropdown.closeCallback = () => {
      dropdown.classList.remove('show');
    };
    
    return dropdown;
  }

  // 3) 드롭다운 가로 배치 스타일 설정
  function configureDropdownStyle(dropdown) {
    // 드롭다운 아이템 스타일 설정
    const items = dropdown.querySelectorAll('.lite-editor-dropdown-item');
    items.forEach(item => {
      Object.assign(item.style, {
        width: '32px',
        height: '32px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '0',
        margin: '0'
      });
      
      // 아이콘 스타일 설정
      const icon = item.querySelector('.material-icons');
      if (icon) {
        icon.style.fontSize = '18px';
      }
    });
    
    // !important 스타일을 위한 스타일 속성 설정
    dropdown.setAttribute('style', `
      width: 146px !important; 
      height: 38px !important; 
      display: flex !important; 
      flex-direction: row !important;
      justify-content: space-between !important;
      padding: 2px !important;
      overflow: hidden !important;
    `);
    
    return dropdown;
  }

  // 4) 정렬 명령 실행 - window.liteEditorSelection 활용
  function applyAlignment(command, contentArea, iconEl, iconName) {
    // 선택 영역 관리 - 기존 방식 유지 (호환성 문제 방지)
    if (window.liteEditorSelection) {
      window.liteEditorSelection.restore();
      
      // 블록 단위로 선택 조정
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        let node = range.commonAncestorContainer;
        
        if (node.nodeType === 3) node = node.parentNode;
        const block = util.dom.findClosestBlock(node, contentArea);
        
        if (block) {
          sel.removeAllRanges();
          const newRange = document.createRange();
          newRange.selectNodeContents(block);
          sel.addRange(newRange);
        }
      }
    }

    // 명령 실행
    document.execCommand(command, false, null);
    
    // UI 업데이트
    iconEl.textContent = iconName;
    contentArea.focus();
    
    // 선택 영역 저장
    if (window.liteEditorSelection) {
      window.liteEditorSelection.save();
    }
  }

  // 5) 이벤트 설정 - PluginUtil의 setupToolbarButtonEvents 활용
  function setupAlignPlugin(toolbar, contentArea) {
    // 버튼 및 드롭다운 생성
    const { btn, icon } = createAlignButton(contentArea);
    const dropdown = createAlignDropdown(contentArea, icon);
    
    // 선택 영역 저장용 클릭 이벤트 추가
    btn.addEventListener('click', () => {
      // 다른 모든 활성화된 모달 닫기
      util.activeModalManager.closeAll();
      
      if (window.liteEditorSelection) {
        window.liteEditorSelection.save();
      }
      
      // 드롭다운이 열리면 활성 모달로 등록
      if (!dropdown.classList.contains('show')) {
        util.activeModalManager.register(dropdown);
      }
    });
    
    // PluginUtil의 setupToolbarButtonEvents 함수로 이벤트 설정
    util.setupToolbarButtonEvents(btn, dropdown, toolbar);
    
    // PluginUtil의 setupOutsideClickHandler로 외부 클릭 처리
    util.setupOutsideClickHandler(dropdown, () => {
      dropdown.classList.remove('show');
      // 활성 모달에서 제거
      util.activeModalManager.unregister(dropdown);
    });
    
    return btn;
  }

  // 플러그인 등록
  LiteEditor.registerPlugin(ID, {
    title: 'Alignment',
    icon: commands[0].icon,
    customRender(toolbar, contentArea) {
      return setupAlignPlugin(toolbar, contentArea);
    }
  });
})();
