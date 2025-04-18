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
    return { btn, icon };
  }

  // 2) 드롭다운 생성
  function createAlignDropdown(contentArea, iconElement) {
    const dropdown = util.dom.createElement('div', {
      className: 'lite-editor-dropdown-menu lite-editor-align-dropdown'
    });
    
    commands.forEach(({ cmd, icon, title }) => {
      const item = util.dom.createElement('div', {
        className: 'lite-editor-dropdown-item',
        title: title,
        'data-cmd': cmd
      }, {
        width: '32px', 
        height: '32px', 
        display: 'flex',
        justifyContent: 'center', 
        alignItems: 'center', 
        padding: '0', 
        margin: '0'
      });
      
      const i = util.dom.createElement('i', {
        className: 'material-icons',
        textContent: icon
      }, { 
        fontSize: '18px' 
      });
      
      item.appendChild(i);

      item.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        applyAlignment(cmd, contentArea, iconElement, icon);
        toggleDropdown(false, dropdown);
      });
      
      dropdown.appendChild(item);
    });
    
    document.body.appendChild(dropdown);
    return dropdown;
  }

  // 3) 드롭다운 토글 - !important 스타일 적용 및 가로 배치 보장
  function toggleDropdown(show, dropdown, anchor) {
    if (show) {
      dropdown.classList.add('show');
      
      // 기본 스타일 설정 - !important 사용을 위해 setAttribute 활용
      const dropdownWidth = 146;
      dropdown.setAttribute('style', 
        `width: ${dropdownWidth}px !important; 
         height: 38px !important; 
         display: flex !important; 
         flex-direction: row !important;
         justify-content: space-between !important;
         padding: 2px !important;
         overflow: hidden !important;`
      );
      
      // 위치 계산 및 설정 (중앙 정렬)
      const buttonRect = anchor.getBoundingClientRect();
      const buttonCenter = buttonRect.left + (buttonRect.width / 2);
      const dropdownLeft = buttonCenter - (dropdownWidth / 2);
      
      // 화면 경계 체크
      const viewportWidth = window.innerWidth;
      let finalLeft = dropdownLeft;
      
      if (finalLeft < 5) finalLeft = 5;
      if (finalLeft + dropdownWidth > viewportWidth - 5) {
        finalLeft = viewportWidth - dropdownWidth - 5;
      }
      
      // 위치 적용
      dropdown.style.top = `${buttonRect.bottom + window.scrollY}px`;
      dropdown.style.left = `${finalLeft}px`;
    } else {
      dropdown.classList.remove('show');
      dropdown.style.display = 'none';
    }
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

  // 5) 이벤트 바인딩
  function setupAlignEvents(btn, dropdown, contentArea, toolbar) {
    // 버튼 클릭 시
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      
      // 선택 영역 저장
      if (window.liteEditorSelection) {
        window.liteEditorSelection.save();
      }

      // 다른 드롭다운 닫기
      document.querySelectorAll('.lite-editor-dropdown-menu.show')
        .forEach(d => {
          if (d !== dropdown) toggleDropdown(false, d);
        });

      // 이 드롭다운 토글
      const opening = !dropdown.classList.contains('show');
      toggleDropdown(opening, dropdown, btn);
    });

    // 외부 클릭 시 닫기
    document.addEventListener('click', e => {
      if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
        toggleDropdown(false, dropdown);
      }
    });

    // 툴바 내 다른 버튼 클릭 시 닫기
    toolbar.addEventListener('click', e => {
      const clickBtn = e.target.closest('.lite-editor-button');
      if (clickBtn && clickBtn !== btn) {
        toggleDropdown(false, dropdown);
      }
    });
    
    // 문서 클릭 이벤트 위임을 통한 다른 버튼 클릭 감지 (추가)
    document.addEventListener('mousedown', e => {
      const clickedElement = e.target.closest('.lite-editor-button');
      if (clickedElement && clickedElement !== btn && dropdown.classList.contains('show')) {
        toggleDropdown(false, dropdown);
      }
    });
  }

  // 플러그인 등록
  LiteEditor.registerPlugin(ID, {
    title: 'Alignment',
    icon: commands[0].icon,
    customRender(toolbar, contentArea) {
      const { btn, icon } = createAlignButton(contentArea);
      const dropdown = createAlignDropdown(contentArea, icon);
      setupAlignEvents(btn, dropdown, contentArea, toolbar);
      return btn;
    }
  });
})();
