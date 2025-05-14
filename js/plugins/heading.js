/**
 * LiteEditor Heading Plugin
 * 제목 및 정렬 관련 플러그인
 */

(function() {
  // PluginUtil 참조
  const util = window.PluginUtil || {};
  if (!util.selection) {
    console.error('HeadingPlugin: PluginUtil.selection이 필요합니다.');
  }
  
  // 전역 상태 변수
  let savedRange = null;          // 임시로 저장된 선택 영역
  let isDropdownOpen = false;     // 드롭다운 상태 추적
  
  // 선택 영역 저장 함수 (util 사용)
  function saveSelection() {
    savedRange = util.selection.saveSelection();
  }

  // 선택 영역 복원 함수 (util 사용)
  function restoreSelection() {
    if (!savedRange) return false;
    return util.selection.restoreSelection(savedRange);
  }  

  // 제목 플러그인
  LiteEditor.registerPlugin('heading', {
    title: 'Heading',
    icon: 'title',
    customRender: function(toolbar, contentArea) {
      // 제목 버튼 생성
      const headingButton = util.dom.createElement('button', {
        className: 'lite-editor-button lite-editor-heading-button',
        title: 'Heading'
      });
      
      // 아이콘 추가
      const icon = util.dom.createElement('i', {
        className: 'material-icons',
        textContent: 'title'
      });
      headingButton.appendChild(icon);
      
      // 드롭다운 생성
      const dropdownMenu = util.dom.createElement('div', {
        className: 'lite-editor-heading-dropdown lite-editor-dropdown-menu'
      }, {
        position: 'absolute',
        zIndex: '2147483647',
        backgroundColor: '#fff',
        border: '1px solid #ccc',
        borderRadius: '4px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        padding: '8px 0',
        display: 'none'
      });
      
      // 제목 레벨 옵션
      const headingLevels = [
        { text: 'Heading 1', tag: 'h1' },
        { text: 'Heading 2', tag: 'h2' },
        { text: 'Heading 3', tag: 'h3' },
        { text: 'Paragraph', tag: 'p' }
      ];
      
      // 각 제목 레벨에 대한 옵션 추가
      headingLevels.forEach(level => {
        const option = util.dom.createElement('div', {
          className: 'lite-editor-heading-option lite-editor-heading-' + level.tag,
          textContent: level.text
        });
        
        // 해당 태그에 맞는 스타일 적용
        switch (level.tag) {
          case 'h1':
            option.style.fontSize = '28px';
            option.style.fontWeight = 'bold';
            break;
          case 'h2':
            option.style.fontSize = '22px';
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
          e.stopPropagation();
          
          // 현재 스크롤 위치 저장
          const currentScrollY = window.scrollY;
          
          // API를 통해 드롭다운 닫기
          if (headingButton._dropdownAPI) {
            headingButton._dropdownAPI.close();
          }
          
          // 에디터에 포커스 (스크롤 방지 옵션 추가)
          try {
            contentArea.focus({ preventScroll: true });
          } catch (e) {
            // 일부 구형 브라우저에서는 preventScroll 옵션을 지원하지 않음
            contentArea.focus();
          }
          
          // 선택 영역 복원
          restoreSelection();
          
          // Range API를 사용한 heading 적용 (직접 DOM 조작)
          const selection = util.selection.getSafeSelection();
          if (selection && selection.rangeCount > 0) {
            // 선택한 영역의 범위 가져오기
            const range = selection.getRangeAt(0);
            let container = range.commonAncestorContainer;
            
            // 텍스트 노드인 경우 부모 노드 확인
            if (container.nodeType === 3) { // Text node
              container = container.parentNode;
            }
            
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
                
                // 선택 영역 재설정
                const newRange = document.createRange();
                newRange.selectNodeContents(newHeading);
                selection.removeAllRanges();
                selection.addRange(newRange);
              }
            } else {
              // 새 태그 요소 생성 (H1, H2, H3, P)
              const heading = document.createElement(level.tag.toUpperCase());
              
              // 선택한 내용을 사용하여 새 요소에 추가
              heading.appendChild(range.extractContents());
              
              // 새 요소를 DOM에 삽입
              range.insertNode(heading);
            }
            
            // 에디터 상태 업데이트
            contentArea.dispatchEvent(new Event('input', { bubbles: true }));
          } else {
            errorHandler.logError('HeadingPlugin', errorHandler.codes.COMMON.SELECTION_GET, e);
          }
          
          // 스크롤 위치 복원 (애니메이션 프레임 사용)
          requestAnimationFrame(() => {
            setTimeout(() => {
              window.scrollTo(window.scrollX, currentScrollY);
            }, 50);
          });
        });
        
        dropdownMenu.appendChild(option);
      });
      
      // 드롭다운을 document.body에 직접 추가
      document.body.appendChild(dropdownMenu);
      
      // 버튼 클릭 이벤트 - 직접 구현한 드롭다운 토글 로직
      headingButton.addEventListener('click', (e) => {
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
          headingButton.classList.remove('active');
          isDropdownOpen = false;
          
          // 모달 관리 시스템에서 제거
          util.activeModalManager.unregister(dropdownMenu);
        } else {
          // 열기
          dropdownMenu.classList.add('show');
          dropdownMenu.style.display = 'block';
          headingButton.classList.add('active');
          isDropdownOpen = true;
          
          // 위치 설정
          const buttonRect = headingButton.getBoundingClientRect();
          dropdownMenu.style.top = (buttonRect.bottom + window.scrollY) + 'px';
          dropdownMenu.style.left = buttonRect.left + 'px';
          
          // 활성 모달 등록 (관리 시스템에 추가)
          dropdownMenu.closeCallback = () => {
            dropdownMenu.classList.remove('show');
            dropdownMenu.style.display = 'none';
            headingButton.classList.remove('active');
            isDropdownOpen = false;
          };
          
          util.activeModalManager.register(dropdownMenu);
          
          // 외부 클릭 시 닫기 설정 - 열 때만 등록
          util.setupOutsideClickHandler(dropdownMenu, () => {
            dropdownMenu.classList.remove('show');
            dropdownMenu.style.display = 'none';
            headingButton.classList.remove('active');
            isDropdownOpen = false;
            util.activeModalManager.unregister(dropdownMenu);
          }, [headingButton]);
        }
        
        // 스크롤 위치 복원
        requestAnimationFrame(() => {
          setTimeout(() => {
            window.scrollTo(window.scrollX, currentScrollY);
          }, 50);
        });
      });
      
      // 버튼 반환
      return headingButton;
    }
  });
})();
