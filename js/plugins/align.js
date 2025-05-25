/**
 * LiteEditor Alignment Plugin
 * 텍스트 정렬 관련 통합 플러그인
 */

(function() {
  const util = window.PluginUtil || {};
  
  let savedRange = null;
  let isDropdownOpen = false;

  function applyAlignment(alignType, contentArea) {
    try {
      if (!savedRange || savedRange.toString().trim().length === 0) {
        throw new Error('No selection to restore');
      }
      
      // 스타일 직접 적용 (execCommand 대신)
      const alignStyles = {
        'Left': 'left',
        'Center': 'center', 
        'Right': 'right',
        'Full': 'justify'
      };
      
      const alignValue = alignStyles[alignType];
      if (!alignValue) return;
      
      // 현재 스크롤 위치 저장
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;
      
      // 선택된 텍스트를 span으로 감싸서 정확한 범위에만 적용
      const selectedText = savedRange.toString();
      const spanElement = document.createElement('span');
      spanElement.style.display = 'block';
      spanElement.style.textAlign = alignValue;
      spanElement.textContent = selectedText;
      
      // 기존 선택 영역을 새 요소로 교체
      savedRange.deleteContents();
      savedRange.insertNode(spanElement);
      
      // 새로 생성된 span 요소를 선택
      const selection = window.getSelection();
      selection.removeAllRanges();
      
      const newRange = document.createRange();
      newRange.selectNodeContents(spanElement);
      selection.addRange(newRange);
      
      // 새로운 선택 영역을 저장
      savedRange = newRange.cloneRange();
      
      // 스크롤 위치 복원
      if (window.scrollX !== scrollX || window.scrollY !== scrollY) {
        window.scrollTo(scrollX, scrollY);
      }
      
      util.editor.dispatchEditorEvent(contentArea);
      
    } catch (e) {
      errorHandler.logError('AlignPlugin', errorHandler.codes.PLUGINS.ALIGN.APPLY, e);
    }
  }


  // 정확한 선택 영역 저장
  function saveSelectionWithNormalization() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return false;
    
    const range = selection.getRangeAt(0);
    let selectedText = range.toString();
    
    if (selectedText.trim().length > 0) {
      // 정확한 범위만 저장 - 더 엄격하게
      savedRange = range.cloneRange();
      return true;
    }
    return false;
  }

  // 정렬 플러그인 등록
  LiteEditor.registerPlugin('align', {
    title: 'Align',
    icon: 'format_align_left',
    customRender: function(toolbar, contentArea) {
      // 1. 정렬 버튼 생성
      const alignButton = util.dom.createElement('div', {
        className: 'lite-editor-button',
        title: 'Text Alignment'
      });
      
      // 2. 버튼 아이콘 추가
      const icon = util.dom.createElement('i', {
        className: 'material-icons',
        textContent: 'format_align_justify'
      });
      alignButton.appendChild(icon);
      
      // 3. 드롭다운 메뉴 생성
      const dropdownMenu = util.dom.createElement('div', {
        className: 'lite-editor-dropdown-menu align-dropdown',
        id: 'align-dropdown-' + Math.random().toString(36).substr(2, 9)
      }, {
        width: 'auto',
        minWidth: '140px',
        padding: '4px',
        boxShadow: '0 1px 5px rgba(0,0,0,0.1)',
        position: 'absolute',
        zIndex: '99999',
        backgroundColor: '#fff',
        border: '1px solid #ccc',
        borderRadius: '4px',
        display: 'none'
      });
      
      // 3-1. 가로 레이아웃을 위한 컨테이너 추가
      const buttonContainer = util.dom.createElement('div', {
        className: 'align-button-container'
      }, {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        width: '100%',
        margin: '0',
        padding: '2px 0'
      });
      
      dropdownMenu.appendChild(buttonContainer);
      
      // 4. 정렬 버튼들 생성
      const alignOptions = [
        { align: 'Left', icon: 'format_align_left' },
        { align: 'Center', icon: 'format_align_center' },
        { align: 'Right', icon: 'format_align_right' },
        { align: 'Full', icon: 'format_align_justify' }
      ];
      
      alignOptions.forEach(option => {
        const alignBtn = util.dom.createElement('div', {
          className: 'align-btn',
          'data-align': option.align
        }, {
          width: '28px',
          height: '28px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          cursor: 'pointer',
          borderRadius: '3px',
          margin: '0 1px',
          transition: 'all 0.2s ease',
          boxSizing: 'border-box'
        });
        
        // 호버 효과 추가
        alignBtn.addEventListener('mouseover', function() {
          this.style.backgroundColor = '#f0f0f0';
        });
        
        alignBtn.addEventListener('mouseout', function() {
          this.style.backgroundColor = 'transparent';
        });
        
        // 클릭 효과 추가 (mousedown/mouseup 이벤트)
        alignBtn.addEventListener('mousedown', function() {
          this.style.backgroundColor = '#d0d0d0';
          this.style.transform = 'scale(0.95)';
        });
        
        alignBtn.addEventListener('mouseup', function() {
          this.style.backgroundColor = '#f0f0f0';
          this.style.transform = 'scale(1)';
        });
        
        // 클릭 끝난 후 처리
        alignBtn.addEventListener('mouseleave', function() {
          if(this.style.transform === 'scale(0.95)') {
            this.style.transform = 'scale(1)';
            this.style.backgroundColor = 'transparent';
          }
        });
        
        // 아이콘 스타일 개선
        const btnIcon = util.dom.createElement('i', {
          className: 'material-icons',
          textContent: option.icon
        }, {
          fontSize: '18px',
          width: '18px',
          height: '18px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          lineHeight: '1',
          textAlign: 'center',
          overflow: 'hidden'
        });
        
        alignBtn.appendChild(btnIcon);
        
        // 정렬 버튼 클릭 이벤트 - 순서 변경
        alignBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          // 이미 저장된 선택 영역이 있으면 바로 정렬 적용
          if (savedRange && savedRange.toString().trim().length > 0) {
            
            // 1. 먼저 드롭다운 닫기
            dropdownMenu.classList.remove('show');
            dropdownMenu.style.display = 'none';
            alignButton.classList.remove('active');
            isDropdownOpen = false;
            util.activeModalManager.unregister(dropdownMenu);
            
            // 2. 스크롤 복원
            util.scroll.restorePosition();
            
            // 3. 모든 처리 완료 후 정렬 적용 (setTimeout으로 지연)
            setTimeout(() => {
              applyAlignment(option.align, contentArea);
            }, 10);
          }
        });
        
        buttonContainer.appendChild(alignBtn);
      });
      
      // 5. 드롭다운을 document.body에 추가
      document.body.appendChild(dropdownMenu);
      
      // align 버튼 mousedown에서 선택 영역 저장 (정규화 포함)
      alignButton.addEventListener('mousedown', (e) => {
        saveSelectionWithNormalization();
      });
      
      // 드롭다운 버튼 클릭 이벤트
      alignButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 현재 스크롤 위치 저장
        const currentScrollY = window.scrollY;
        const currentScrollX = window.scrollX;
        
        // 드롭다운 토글 로직만 수행
        const isVisible = dropdownMenu.classList.contains('show');
        
        if (!isVisible) {
          util.activeModalManager.closeAll();
        }
        
        if (isVisible) {
          // 닫기
          dropdownMenu.classList.remove('show');
          dropdownMenu.style.display = 'none';
          alignButton.classList.remove('active');
          isDropdownOpen = false;
          util.activeModalManager.unregister(dropdownMenu);
        } else {
          // 열기
          dropdownMenu.classList.add('show');
          dropdownMenu.style.display = 'block';
          alignButton.classList.add('active');
          isDropdownOpen = true;
          
          // 위치 설정
          const buttonRect = alignButton.getBoundingClientRect();
          dropdownMenu.style.top = (buttonRect.bottom + window.scrollY) + 'px';
          dropdownMenu.style.left = buttonRect.left + 'px';
          
          util.activeModalManager.register(dropdownMenu);
          dropdownMenu.closeCallback = () => {
            dropdownMenu.classList.remove('show');
            dropdownMenu.style.display = 'none';
            alignButton.classList.remove('active');
            isDropdownOpen = false;
            util.activeModalManager.unregister(dropdownMenu);
          };
          util.setupOutsideClickHandler(dropdownMenu, () => {
            dropdownMenu.classList.remove('show');
            dropdownMenu.style.display = 'none';
            alignButton.classList.remove('active');
            isDropdownOpen = false;
            util.activeModalManager.unregister(dropdownMenu);
          }, [alignButton]);
        }
        
        // 즉시 스크롤 위치 복원
        window.scrollTo(currentScrollX, currentScrollY);
      });
      
      return alignButton;
    }
  });
})();