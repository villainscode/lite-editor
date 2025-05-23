/**
 * LiteEditor Alignment Plugin
 * 텍스트 정렬 관련 통합 플러그인
 * 통합 레이어 관리 방식으로 변경
 */

// 디버깅 유틸리티 공통 참조
// @[js/debug-utils.js]

(function() {
  const util = window.PluginUtil || {};
  
  let savedRange = null;          // 임시로 저장된 선택 영역
  let isDropdownOpen = false;     // 드롭다운 열림 상태
  
  let selectionSaveTimeout = null;

  // 함수들을 전역 스코프로 이동 (customRender 외부)
  function saveSelection() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return null;
    savedRange = selection.getRangeAt(0).cloneRange();
    return savedRange;
  }

  function applyAlignment(alignType, contentArea) {
    try {
      // 선택 영역 복원
      if (!window.liteEditorSelection.restore()) {
        throw new Error('No selection to restore');
      }
      
      // document.execCommand를 사용하여 정렬 적용
      const commands = {
        'Left': 'justifyLeft',
        'Center': 'justifyCenter', 
        'Right': 'justifyRight',
        'Full': 'justifyFull'
      };
      
      const command = commands[alignType];
      if (command) {
        document.execCommand(command, false, null);
        console.log('Applied alignment:', alignType, 'using command:', command);
      }
      
      // 에디터 이벤트 발생
      util.editor.dispatchEditorEvent(contentArea);
      
    } catch (e) {
      errorHandler.logError('AlignPlugin', e);
    }
  }

  // 선택 영역 정규화 함수
  function normalizeSelectionRange() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return null;
    
    const range = selection.getRangeAt(0);
    const text = range.toString();
    
    // 줄바꿈이 포함된 경우 Range를 줄바꿈 전까지로 제한
    if (text.includes('\n')) {
      const textBeforeNewline = text.split('\n')[0];
      
      if (textBeforeNewline.trim().length > 0) {
        // 새로운 Range 생성 (줄바꿈 제외)
        const newRange = document.createRange();
        newRange.setStart(range.startContainer, range.startOffset);
        
        // 줄바꿈 전까지의 길이로 endOffset 설정
        if (range.startContainer.nodeType === 3) { // 텍스트 노드
          const newEndOffset = range.startOffset + textBeforeNewline.length;
          newRange.setEnd(range.startContainer, newEndOffset);
        } else {
          newRange.setEnd(range.endContainer, range.startOffset + textBeforeNewline.length);
        }
        
        // 선택 영역 업데이트
        selection.removeAllRanges();
        selection.addRange(newRange);
        
        console.log('Range normalized:', {
          original: text,
          normalized: newRange.toString(),
          startOffset: newRange.startOffset,
          endOffset: newRange.endOffset
        });
        
        return newRange.cloneRange();
      }
    }
    
    // 줄바꿈이 없거나 유효하지 않은 경우 원본 반환
    return range.cloneRange();
  }

  // 선택 영역 변경 감지
  document.addEventListener('selectionchange', () => {
    // 연속 이벤트 방지를 위한 디바운싱
    if (selectionSaveTimeout) {
      clearTimeout(selectionSaveTimeout);
    }
    
    selectionSaveTimeout = setTimeout(() => {
      const normalizedRange = normalizeSelectionRange();
      
      if (normalizedRange && normalizedRange.toString().trim().length > 0) {
        savedRange = normalizedRange;
        console.log('Valid normalized selection saved:', {
          startOffset: savedRange.startOffset,
          endOffset: savedRange.endOffset,
          text: savedRange.toString(),
          hasNewline: savedRange.toString().includes('\n')
        });
      }
    }, 100); // 100ms 지연으로 더블클릭 완료 대기
  });
  
  // window.liteEditorSelection 통합 관리
  if (!window.liteEditorSelection) {
    window.liteEditorSelection = {
      save: function() {
        return savedRange;
      },
      restore: function() {
        if (!savedRange || savedRange.toString().trim().length === 0) {
          return false;
        }
        
        try {
          // 복원 전에 다시 한번 정규화
          const selection = window.getSelection();
          selection.removeAllRanges();
          
          // 줄바꿈이 없는 깨끗한 Range인지 확인
          const text = savedRange.toString();
          if (text.includes('\n')) {
            console.warn('Saved range still contains newline, re-normalizing');
            return false;
          }
          
          selection.addRange(savedRange.cloneRange());
          
          console.log('Restored clean range:', {
            text: savedRange.toString(),
            hasNewline: false
          });
          
          return true;
        } catch (e) {
          console.error('Selection restore failed:', e);
          return false;
        }
      }
    };
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
          
          // 저장된 선택 영역 검증
          if (savedRange && savedRange.toString().trim().length > 0) {
            console.log('Using saved selection:', {
              text: savedRange.toString(),
              valid: true
            });
          } else {
            console.log('No valid selection saved');
            return; // 유효한 선택 영역이 없으면 드롭다운 열지 않음
          }
          
          // 정렬 적용
          applyAlignment(option.align, contentArea);
          
          // 드롭다운 닫기
          dropdownMenu.classList.remove('show');
          dropdownMenu.style.display = 'none';
          alignButton.classList.remove('active');
          isDropdownOpen = false;
          util.activeModalManager.unregister(dropdownMenu);
        });
        
        buttonContainer.appendChild(alignBtn);
      });
      
      // 5. 드롭다운을 document.body에 추가
      document.body.appendChild(dropdownMenu);
      
      // 6. 드롭다운 버튼에 mousedown 이벤트 추가 (click 이벤트 전에 실행됨)
      alignButton.addEventListener('mousedown', (e) => {
        // 마우스가 내려가는 순간 즉시 선택 영역 저장
        window.liteEditorSelection.save();
      });
      
      // 드롭다운 버튼 클릭 이벤트 (기존 코드 유지)
      alignButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
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
          util.setupOutsideClickHandler(dropdownMenu, () => {
            dropdownMenu.classList.remove('show');
            dropdownMenu.style.display = 'none';
            alignButton.classList.remove('active');
            isDropdownOpen = false;
            util.activeModalManager.unregister(dropdownMenu);
          }, [alignButton]);
        }
      });
      
      // 에디터 영역 mousedown 이벤트에서 선택 영역 저장
      contentArea.addEventListener('mousedown', () => {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          savedRange = selection.getRangeAt(0).cloneRange();
          errorHandler.selectionLog.save(contentArea);
        }
      });
      
      return alignButton;
    }
  });
})();