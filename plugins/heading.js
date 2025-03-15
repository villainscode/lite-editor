/**
 * LiteEditor Heading Plugin
 * 제목 및 정렬 관련 플러그인
 */

(function() {
  // 제목 플러그인
  LiteEditor.registerPlugin('heading', {
    title: 'Heading',
    icon: 'title',
    customRender: function(toolbar, contentArea) {
      // 제목 버튼 생성
      const headingButton = document.createElement('button');
      headingButton.className = 'lite-editor-button lite-editor-heading-button';
      headingButton.setAttribute('title', 'Heading');
      
      // 아이콘 추가
      const icon = document.createElement('i');
      icon.className = 'material-icons';
      icon.textContent = 'title';
      headingButton.appendChild(icon);
      
      // 드롭다운 생성
      const dropdownMenu = document.createElement('div');
      dropdownMenu.className = 'lite-editor-dropdown-menu';
      
      // 드롭다운 헤더 생성
      const dropdownHeader = document.createElement('div');
      dropdownHeader.className = 'lite-editor-dropdown-header';
      dropdownHeader.textContent = 'Heading';
      dropdownMenu.appendChild(dropdownHeader);
      
      // 제목 레벨 옵션
      const headingLevels = [
        { text: 'Heading 1', tag: 'h1' },
        { text: 'Heading 2', tag: 'h2' },
        { text: 'Heading 3', tag: 'h3' },
        { text: 'Paragraph', tag: 'p' }
      ];
      
      // 각 제목 레벨에 대한 옵션 추가
      headingLevels.forEach(level => {
        const option = document.createElement('div');
        option.className = 'lite-editor-dropdown-item lite-editor-heading-' + level.tag;
        option.textContent = level.text;
        
        // 해당 태그에 맞는 스타일 적용
        switch (level.tag) {
          case 'h1':
            option.style.fontSize = '24px';
            option.style.fontWeight = 'bold';
            break;
          case 'h2':
            option.style.fontSize = '20px';
            option.style.fontWeight = 'bold';
            break;
          case 'h3':
            option.style.fontSize = '16px';
            option.style.fontWeight = 'bold';
            break;
          case 'p':
            option.style.fontSize = '14px';
            option.style.fontWeight = 'normal';
            break;
        }
        
        // 클릭 이벤트
        option.addEventListener('click', (e) => {
          e.preventDefault();
          // e.stopPropagation() 제거 - 이벤트 전파 허용
          
          // 선택 영역 처리
          if (window.liteEditorSelection) {
            // 1. 선택 영역 저장
            window.liteEditorSelection.save();
            
            // 2. 에디터 포커스
            contentArea.focus();
            
            // 3. 선택 영역 복원
            window.liteEditorSelection.restore();
          }
          
          console.log('level : ', level);
          
          // Range API를 사용한 heading 적용 (직접 DOM 조작)
          const selection = window.getSelection();
          if (selection.rangeCount > 0) {
            // 선택한 영역의 범위 가져오기
            const range = selection.getRangeAt(0);
            let container = range.commonAncestorContainer;
            
            // 텍스트 노드인 경우 부모 노드 확인
            if (container.nodeType === 3) { // Text node
              container = container.parentNode;
            }
            
            console.log('현재 컨테이너:', container.nodeName);
            
            // 헤딩 또는 단락 태그 가져오기 (업데이트된 로직)
            let headingElement = null;
            
            // 현재 요소가 텍스트 노드인 경우 부모 요소 확인
            if (container.nodeType === 3) { // Text node
              container = container.parentNode;
            }
            
            // 현재 요소가 헤딩 또는 단락 태그인지 확인
            if (container.nodeName === 'H1' || container.nodeName === 'H2' || 
                container.nodeName === 'H3' || container.nodeName === 'P') {
              headingElement = container;
            } else {
              // 부모 요소 중에서 헤딩 태그 찾기
              const closestH1 = container.closest('h1');
              const closestH2 = container.closest('h2');
              const closestH3 = container.closest('h3');
              const closestP = container.closest('p');
              
              if (closestH1) headingElement = closestH1;
              else if (closestH2) headingElement = closestH2;
              else if (closestH3) headingElement = closestH3;
              else if (closestP) headingElement = closestP;
            }
            
            console.log('현재 태그 요소:', headingElement ? headingElement.nodeName : '없음');
            
            // 기존 헤딩 태그가 있는 경우 처리
            if (headingElement) {
              // 1. 현재 태그와 동일한 태그를 적용하려는 경우 (토글)
              if (headingElement.nodeName.toLowerCase() === level.tag) {
                // 기본 단락(p)으로 변환
                const content = headingElement.innerHTML;
                const p = document.createElement('P');
                p.innerHTML = content;
                
                // 기존 헤딩 태그를 새 p 태그로 교체
                headingElement.parentNode.replaceChild(p, headingElement);
                console.log('동일한 태그 토글:', headingElement.nodeName, '->', 'P');
                
                // 선택 영역 재설정
                const newRange = document.createRange();
                newRange.selectNodeContents(p);
                selection.removeAllRanges();
                selection.addRange(newRange);
              } 
              // 2. paragraph를 적용하려는 경우 (헤딩 -> 단락)
              else if (level.tag === 'p') {
                // 헤딩 태그의 내용을 가져와서 p 태그로 변경
                const content = headingElement.innerHTML;
                const p = document.createElement('P');
                p.innerHTML = content;
                
                // 기존 헤딩 태그를 새 p 태그로 교체
                headingElement.parentNode.replaceChild(p, headingElement);
                console.log('헤딩에서 단락으로 변경:', headingElement.nodeName, '->', 'P');
                
                // 선택 영역 재설정
                const newRange = document.createRange();
                newRange.selectNodeContents(p);
                selection.removeAllRanges();
                selection.addRange(newRange);
              }
              // 3. 다른 헤딩 태그를 적용하려는 경우 (헤딩 -> 다른 헤딩)
              else {
                // 현재 헤딩 태그의 내용을 가져와서 새 헤딩 태그로 변경
                const content = headingElement.innerHTML;
                const newHeading = document.createElement(level.tag.toUpperCase());
                newHeading.innerHTML = content;
                
                // 기존 헤딩 태그를 새 헤딩 태그로 교체
                headingElement.parentNode.replaceChild(newHeading, headingElement);
                console.log('헤딩 변경:', headingElement.nodeName, '->', level.tag.toUpperCase());
                
                // 선택 영역 재설정
                const newRange = document.createRange();
                newRange.selectNodeContents(newHeading);
                selection.removeAllRanges();
                selection.addRange(newRange);
              }
            } else {
              // 새 테그 요소 생성 (H1, H2, H3, P)
              const heading = document.createElement(level.tag.toUpperCase());
              
              // 선택한 내용을 사용하여 새 요소에 추가
              heading.appendChild(range.extractContents());
              
              // 새 요소를 DOM에 삽입
              range.insertNode(heading);
              
              console.log('새 헤딩 적용:', level.tag.toUpperCase());
            }
            
            // 선택 영역 정리
            selection.removeAllRanges();
            selection.addRange(range);
          } else {
            console.log('선택된 범위가 없습니다.');
          }
          
          // 드롭다운 닫기 (클래스만 제거하지 말고 closeDropdown 함수 호출)
          closeDropdown();
          
          // 5. 선택 영역 재저장
          if (window.liteEditorSelection) {
            window.liteEditorSelection.save();
          }
        });
        
        dropdownMenu.appendChild(option);
      });
      
      // 드롭다운 관리를 위한 변수
      let documentClickHandler;
      
      // 드롭다운 닫기 함수
      const closeDropdown = () => {
        dropdownMenu.classList.remove('show');
        // 문서 레벨 클릭 이벤트 리스너 제거
        if (documentClickHandler) {
          document.removeEventListener('click', documentClickHandler);
          documentClickHandler = null;
        }
      };
      
      // 드롭다운과 버튼 연결
      headingButton.dropdownMenu = dropdownMenu;
      
      // 클릭 이벤트 추가
      headingButton.addEventListener('click', (e) => {
        e.preventDefault();
        // 이벤트 버블링 방지를 제거하여 전역 이벤트 흐름 유지
        
        // 선택 영역 저장
        if (window.liteEditorSelection) {
          window.liteEditorSelection.save();
        }
        
        // 다른 모든 드롭다운 먼저 닫기
        document.querySelectorAll('.lite-editor-dropdown-menu.show').forEach(menu => {
          if (menu !== headingButton.dropdownMenu) menu.classList.remove('show');
        });
        
        // 이 드롭다운 토글
        const isShowing = headingButton.dropdownMenu.classList.toggle('show');
        
        // 드롭다운 메뉴 위치 조정
        if (isShowing) {
          // 드롭다운이 표시되면 body에 추가
          document.body.appendChild(dropdownMenu);
          
          const buttonRect = headingButton.getBoundingClientRect();
          
          // 절대 위치로 계산
          headingButton.dropdownMenu.style.top = (buttonRect.bottom + window.scrollY) + 'px';
          headingButton.dropdownMenu.style.left = buttonRect.left + 'px';
          
          // 문서 레벨 클릭 이벤트 추가 (다음 이벤트 루프에서 등록)
          setTimeout(() => {
            documentClickHandler = (evt) => {
              // 버튼이나 드롭다운 영역 외부 클릭 시 드롭다운 닫기
              if (!headingButton.contains(evt.target) && !dropdownMenu.contains(evt.target)) {
                closeDropdown();
              }
            };
            document.addEventListener('click', documentClickHandler);
          }, 0);
        } else {
          closeDropdown();
        }
      });
      
      // 페이지 unload 시 이벤트 정리
      window.addEventListener('unload', () => {
        if (documentClickHandler) {
          document.removeEventListener('click', documentClickHandler);
        }
      });
      
      return headingButton;
    }
  });
  
  // 왼쪽 정렬 플러그인
  LiteEditor.registerPlugin('align', {
    title: 'Align',
    icon: 'format_align_left',
    customRender: function(toolbar, contentArea) {
      // 정렬 버튼 생성
      const alignButton = document.createElement('button');
      alignButton.className = 'lite-editor-button';
      alignButton.setAttribute('title', 'Align');
      
      // 아이콘 추가
      const icon = document.createElement('i');
      icon.className = 'material-icons';
      icon.textContent = 'format_align_left';
      alignButton.appendChild(icon);
      
      // 팝업 메뉴 생성
      const alignPopup = document.createElement('div');
      alignPopup.className = 'lite-editor-align-popup';
      
      // 정렬 옵션 (왼쪽, 가운데, 오른쪽, 양쪽)
      const alignOptions = [
        { title: 'Align Left', icon: 'format_align_left', command: 'justifyLeft' },
        { title: 'Align Center', icon: 'format_align_center', command: 'justifyCenter' },
        { title: 'Align Right', icon: 'format_align_right', command: 'justifyRight' },
        { title: 'Justify', icon: 'format_align_justify', command: 'justifyFull' }
      ];
      
      // 정렬 버튼 추가
      alignOptions.forEach(option => {
        const button = document.createElement('button');
        button.className = 'lite-editor-align-button';
        button.setAttribute('title', option.title);
        
        const optionIcon = document.createElement('i');
        optionIcon.className = 'material-icons';
        optionIcon.textContent = option.icon;
        button.appendChild(optionIcon);
        
        // 클릭 이벤트
        button.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          // 선택 영역 처리
          if (window.liteEditorSelection) {
            // 1. 선택 영역 저장
            window.liteEditorSelection.save();
            
            // 2. 에디터 포커스
            contentArea.focus();
            
            // 3. 선택 영역 복원
            window.liteEditorSelection.restore();
          }
          
          // 4. 정렬 명령 실행
          document.execCommand(option.command, false, null);
          
          // 5. 선택 영역 재저장
          if (window.liteEditorSelection) {
            window.liteEditorSelection.save();
          }
          
          // 팝업 닫기
          alignPopup.classList.remove('show');
          
          // 메인 버튼 아이콘 업데이트
          icon.textContent = option.icon;
        });
        
        alignPopup.appendChild(button);
      });
      
      // 팝업을 문서 body에 직접 추가
      document.body.appendChild(alignPopup);
      
      // 메인 버튼 클릭 이벤트
      alignButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 선택 영역 저장
        if (window.liteEditorSelection) {
          window.liteEditorSelection.save();
        }
        
        // 다른 모든 드롭다운 먼저 닫기
        document.querySelectorAll('.lite-editor-dropdown-menu.show, .lite-editor-align-popup.show').forEach(menu => {
          if (menu !== alignPopup) menu.classList.remove('show');
        });
        
        // 팝업 토글
        alignPopup.classList.toggle('show');
        
        // 팝업 위치 조정
        if (alignPopup.classList.contains('show')) {
          const buttonRect = alignButton.getBoundingClientRect();
          
          // 절대 위치로 계산
          alignPopup.style.top = (buttonRect.bottom + window.scrollY) + 'px';
          alignPopup.style.left = buttonRect.left + 'px';
        }
      });
      
      return alignButton;
    }
  });
  
  // 들여쓰기 플러그인
  LiteEditor.registerPlugin('formatIndent', {
    title: 'Indent',
    icon: 'format_indent_increase',
    customRender: function(toolbar, contentArea) {
      // 컨테이너 생성
      const indentContainer = document.createElement('div');
      indentContainer.style.display = 'flex';
      
      // 들여쓰기 버튼
      const increaseButton = document.createElement('button');
      increaseButton.className = 'lite-editor-button';
      increaseButton.setAttribute('title', 'Increase Indent');
      
      const increaseIcon = document.createElement('i');
      increaseIcon.className = 'material-icons';
      increaseIcon.textContent = 'format_indent_increase';
      increaseButton.appendChild(increaseIcon);
      
      // 내어쓰기 버튼
      const decreaseButton = document.createElement('button');
      decreaseButton.className = 'lite-editor-button';
      decreaseButton.setAttribute('title', 'Decrease Indent');
      
      const decreaseIcon = document.createElement('i');
      decreaseIcon.className = 'material-icons';
      decreaseIcon.textContent = 'format_indent_decrease';
      decreaseButton.appendChild(decreaseIcon);
      
      // 들여쓰기 버튼 클릭 이벤트
      increaseButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 선택 영역 처리
        if (window.liteEditorSelection) {
          window.liteEditorSelection.save();
          contentArea.focus();
          window.liteEditorSelection.restore();
        }
        
        document.execCommand('indent', false, null);
        
        if (window.liteEditorSelection) {
          window.liteEditorSelection.save();
        }
      });
      
      // 내어쓰기 버튼 클릭 이벤트
      decreaseButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 선택 영역 처리
        if (window.liteEditorSelection) {
          window.liteEditorSelection.save();
          contentArea.focus();
          window.liteEditorSelection.restore();
        }
        
        document.execCommand('outdent', false, null);
        
        if (window.liteEditorSelection) {
          window.liteEditorSelection.save();
        }
      });
      
      // 버튼 추가
      indentContainer.appendChild(increaseButton);
      indentContainer.appendChild(decreaseButton);
      
      return indentContainer;
    }
  });
})();
