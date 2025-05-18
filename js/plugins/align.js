/**
 * LiteEditor Alignment Plugin
 * 텍스트 정렬 관련 통합 플러그인
 * 통합 레이어 관리 방식으로 변경
 */

// 디버깅 유틸리티 공통 참조
// @[js/debug-utils.js]

(function() {
  // PluginUtil 참조
  const util = window.PluginUtil || {};
  
  // 전역 상태 변수
  let savedRange = null;          // 임시로 저장된 선택 영역
  let isDropdownOpen = false;     // 드롭다운 열림 상태
  
  // 선택 영역 저장/복원 함수
  function saveSelection() {
    savedRange = util.selection.saveSelection();
  }

  function restoreSelection() {
    if (!savedRange) return false;
    return util.selection.restoreSelection(savedRange);
  }
  
  /**
   * 더블클릭 선택 정규화 함수
   * 브라우저의 더블클릭 선택 범위를 정확한 단어 경계로 조정
   * @param {HTMLElement} contentArea - 편집 영역 요소
   * @returns {Range|null} - 정규화된 선택 범위
   */
  function normalizeDoubleClickSelection(contentArea) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return null;
    
    const range = selection.getRangeAt(0);
    const text = range.toString();
    
    // 선택된 텍스트에서 줄바꿈과 후발 공백 제거
    const cleanText = text.split('\n')[0].trim();
    
    // 줄바꿈이나 후발 공백이 있는지 확인
    const hasExtraWhitespace = text.length > cleanText.length;
    
    // 더블클릭 선택이거나 공백이 포함된 경우 처리
    if ((text.length < 50 || hasExtraWhitespace) && range.startContainer.nodeType === 3) {
      // 텍스트 노드의 전체 내용
      const fullText = range.startContainer.textContent;
      
      // 정확한 위치 찾기
      let startPos = -1;
      let searchStart = Math.max(0, range.startOffset - cleanText.length);
      
      // 정확한 위치를 찾기 위해 여러 방법 시도
      while (startPos === -1 && searchStart <= range.startOffset) {
        startPos = fullText.indexOf(cleanText, searchStart);
        searchStart++;
      }
      
      // 여전히 찾지 못한 경우 전체 텍스트에서 검색
      if (startPos === -1) {
        startPos = fullText.indexOf(cleanText);
      }
      
      // 여전히 찾지 못한 경우 원래 시작점 사용
      if (startPos === -1) {
        startPos = range.startOffset;
      }
      
      // 정확한 끝 위치 계산
      const endPos = startPos + cleanText.length;
      
      // 새 범위 생성
      const newRange = document.createRange();
      newRange.setStart(range.startContainer, startPos);
      newRange.setEnd(range.startContainer, endPos);
      
      // 선택 영역 업데이트
      selection.removeAllRanges();
      selection.addRange(newRange);
      
      return newRange;
    }
    
    // 일반 선택이거나 조정할 필요 없는 경우 원래 범위 반환
    return range;
  }
  
  /**
   * 정렬 적용 함수
   * @param {string} alignType - 정렬 유형 (Left/Center/Right/Full)
   * @param {HTMLElement} contentArea - 편집 영역 요소
   */
  function applyAlignment(alignType, contentArea) {
    try {
      // 현재 스크롤 위치 저장
      const currentScrollY = window.scrollY;
      const currentScrollX = window.scrollX;
      
      // 포커스 설정 (스크롤 방지)
      try {
        contentArea.focus({ preventScroll: true });
      } catch (e) {
        contentArea.focus();
      }
      
      // 선택 영역 복원
      restoreSelection();
      
      // 선택 영역 정규화 (더블클릭 처리)
      normalizeDoubleClickSelection(contentArea);
      
      // 정렬 명령 실행
      document.execCommand('justify' + alignType);
      
      // 선택 영역 재저장
      saveSelection();
      
      // 에디터 변경 이벤트 발생
      util.editor.dispatchEditorEvent(contentArea);
      
      // 스크롤 위치 복원
      requestAnimationFrame(() => {
        setTimeout(() => {
          window.scrollTo(currentScrollX, currentScrollY);
        }, 50);
      });
    } catch (e) {
      errorHandler.logError('AlignPlugin', errorHandler.codes.PLUGINS.ALIGN.APPLY, e);
    }
  }
  
  // 정렬 플러그인 등록
  LiteEditor.registerPlugin('align', {
    title: 'Alignment',
    icon: 'format_align_justify',
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
        
        // 정렬 버튼 클릭 이벤트
        alignBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          // 드롭다운 닫기
          dropdownMenu.classList.remove('show');
          dropdownMenu.style.display = 'none';
          alignButton.classList.remove('active');
          isDropdownOpen = false;
          
          // 모달 관리 시스템에서 제거
          util.activeModalManager.unregister(dropdownMenu);
          
          // 정렬 적용
          applyAlignment(option.align, contentArea);
        });
        
        buttonContainer.appendChild(alignBtn);
      });
      
      // 5. 드롭다운을 document.body에 추가
      document.body.appendChild(dropdownMenu);
      
      // 6. 버튼 클릭 이벤트 - 직접 구현한 드롭다운 토글 로직
      alignButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 현재 스크롤 위치 저장
        const currentScrollY = window.scrollY;
        
        // 선택 영역 저장
        saveSelection();
        
        // 현재 드롭다운의 상태 확인
        const isVisible = dropdownMenu.classList.contains('show');
        
        // 다른 모든 드롭다운 닫기 - activeModalManager 사용
        // 이미 열려있는 상태에서 닫는 경우에는 closeAll을 호출하지 않음
        if (!isVisible) {
          util.activeModalManager.closeAll();
        }
        
        if (isVisible) {
          // 닫기
          dropdownMenu.classList.remove('show');
          dropdownMenu.style.display = 'none';
          alignButton.classList.remove('active');
          isDropdownOpen = false;
          
          // 모달 관리 시스템에서 제거
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
          
          // 활성 모달 등록 (관리 시스템에 추가)
          dropdownMenu.closeCallback = () => {
            dropdownMenu.classList.remove('show');
            dropdownMenu.style.display = 'none';
            alignButton.classList.remove('active');
            isDropdownOpen = false;
          };
          
          util.activeModalManager.register(dropdownMenu);
          
          // 외부 클릭 시 닫기 설정 - 열 때만 등록
          util.setupOutsideClickHandler(dropdownMenu, () => {
            dropdownMenu.classList.remove('show');
            dropdownMenu.style.display = 'none';
            alignButton.classList.remove('active');
            isDropdownOpen = false;
            util.activeModalManager.unregister(dropdownMenu);
          }, [alignButton]);
        }
        
        // 스크롤 위치 복원
        requestAnimationFrame(() => {
          setTimeout(() => {
            window.scrollTo(window.scrollX, currentScrollY);
          }, 50);
        });
      });
      
      return alignButton;
    }
  });
  
  // 정렬 단축키 추가
  // 왼쪽 정렬 (Ctrl+Alt+L)
  LiteEditor.registerShortcut('alignLeft', {
    key: 'l',
    ctrl: true,
    alt: true,
    action: function(contentArea) {
      saveSelection();
      applyAlignment('Left', contentArea);
    }
  });

  // 가운데 정렬 (Ctrl+Alt+C)
  LiteEditor.registerShortcut('alignCenter', {
    key: 'c',
    ctrl: true,
    alt: true,
    action: function(contentArea) {
      saveSelection();
      applyAlignment('Center', contentArea);
    }
  });

  // 오른쪽 정렬 (Ctrl+Alt+R)
  LiteEditor.registerShortcut('alignRight', {
    key: 'r',
    ctrl: true,
    alt: true,
    action: function(contentArea) {
      saveSelection();
      applyAlignment('Right', contentArea);
    }
  });
  
  // 전역 단축키 이벤트 처리
  document.addEventListener('keydown', function(e) {
    // 에디터 영역 찾기
    const contentArea = document.querySelector('[contenteditable="true"]');
    if (!contentArea) return;
    
    // 왼쪽 정렬 (Ctrl+Alt+L)
    if ((e.key === 'l' || e.key === 'ㅣ') && e.ctrlKey && e.altKey) {
      e.preventDefault();
      contentArea.focus();
      saveSelection();
      applyAlignment('Left', contentArea);
    }
    
    // 가운데 정렬 (Ctrl+Alt+C)
    if ((e.key === 'c' || e.key === 'ㅊ') && e.ctrlKey && e.altKey) {
      e.preventDefault();
      contentArea.focus();
      saveSelection();
      applyAlignment('Center', contentArea);
    }
    
    // 오른쪽 정렬 (Ctrl+Alt+R)
    if ((e.key === 'r' || e.key === 'ㄱ') && e.ctrlKey && e.altKey) {
      e.preventDefault();
      contentArea.focus();
      saveSelection();
      applyAlignment('Right', contentArea);
    }
  });
})();