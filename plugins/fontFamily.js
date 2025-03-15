/**
 * LiteEditor Font Family Plugin
 * 폰트 목록만 표시하는 간략한 버전
 */

(function() {
  // 폰트 드롭다운이 이미 DOM에 있는지 체크
  function ensureFontDropdownContainer() {
    let container = document.getElementById('lite-editor-font-dropdown-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'lite-editor-font-dropdown-container';
      container.style.position = 'absolute';
      container.style.top = '0';
      container.style.left = '0';
      container.style.width = '100%';
      container.style.height = '0';
      container.style.overflow = 'visible';
      container.style.zIndex = '2147483647'; // 최대 z-index 값
      document.body.appendChild(container);
    }
    return container;
  }
  
  // 폰트 플러그인 등록
  LiteEditor.registerPlugin('fontFamily', {
    customRender: function(toolbar, contentArea) {
      // 1. 폰트 버튼 컨테이너 생성 (셀렉트 박스 스타일)
      const fontContainer = document.createElement('div');
      fontContainer.className = 'lite-editor-font-button';
      fontContainer.style.position = 'relative';
      
      // 2. 버튼 아이콘 추가
      const icon = document.createElement('i');
      icon.className = 'material-icons';
      icon.textContent = 'font_download';
      icon.style.fontSize = '18px';
      icon.style.marginRight = '5px';
      fontContainer.appendChild(icon);
      
      // 3. Font Family 텍스트 추가
      const fontText = document.createElement('span');
      fontText.textContent = 'Font Family';
      fontText.style.fontSize = '14px';
      fontContainer.appendChild(fontText);
      
      // 4. 드롭다운 화살표 추가
      const arrowIcon = document.createElement('i');
      arrowIcon.className = 'material-icons';
      arrowIcon.textContent = 'arrow_drop_down';
      arrowIcon.style.fontSize = '18px';
      arrowIcon.style.marginLeft = '5px';
      fontContainer.appendChild(arrowIcon);
      
      // 5. 드롭다운 메뉴 생성
      const dropdownMenu = document.createElement('div');
      dropdownMenu.id = 'font-family-dropdown';
      dropdownMenu.style.display = 'none';
      dropdownMenu.style.position = 'fixed'; // fixed 포지션 사용
      dropdownMenu.style.zIndex = '2147483647'; // 최대 z-index 값
      dropdownMenu.style.backgroundColor = '#fff';
      dropdownMenu.style.border = '1px solid #ccc';
      dropdownMenu.style.borderRadius = '4px';
      dropdownMenu.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
      dropdownMenu.style.maxHeight = '300px';
      dropdownMenu.style.minWidth = '200px';
      dropdownMenu.style.overflowY = 'auto';
      dropdownMenu.style.padding = '8px 0';
      
      // 4. 폰트 목록 정의
      const fonts = [
        // 한글 폰트 그룹 (상단)
        { type: 'group_header', name: '한글 폰트' },
        { name: '바탕', value: 'Batang, Batangche, serif' },
        { name: '굴림', value: 'Gulim, sans-serif' },
        { name: '맑은 고딕', value: 'Malgun Gothic, AppleGothic, sans-serif' },
        { name: 'Noto Sans KR', value: 'Noto Sans KR, sans-serif' },
        { name: '나눔고딕', value: 'Nanum Gothic, sans-serif' },
        { name: '서울나무', value: 'Seoul Namsan, sans-serif' },
        
        // 구분선
        { type: 'divider' },
        
        // 코딩 폰트 그룹 (중단)
        { type: 'group_header', name: '코딩 폰트' },
        { name: 'IBM Plex Mono', value: 'IBM Plex Mono, monospace' },
        { name: 'Source Code Pro', value: 'Source Code Pro, monospace' },
        { name: 'JetBrains Mono', value: 'JetBrains Mono, monospace' },
        { name: 'Hack', value: 'Hack, monospace' },
        { name: 'Fira Code', value: 'Fira Code, monospace' },
        { name: 'Consolas', value: 'Consolas, monospace' },
        
        // 구분선
        { type: 'divider' },
        
        // 영문 폰트 그룹 (하단)
        { type: 'group_header', name: '영문 폰트' },
        { name: 'Arial', value: 'Arial, sans-serif' },
        { name: 'Helvetica', value: 'Helvetica, sans-serif' },
        { name: 'Times New Roman', value: 'Times New Roman, serif' },
        { name: 'Georgia', value: 'Georgia, serif' },
        { name: 'Courier New', value: 'Courier New, monospace' },
        { name: 'Roboto', value: 'Roboto, sans-serif' },
        { name: 'Montserrat', value: 'Montserrat, sans-serif' }
      ];
      
      // 5. 드롭다운에 폰트 목록 추가
      
      // 폰트 목록 추가
      fonts.forEach(font => {
        // 구분선 처리
        if (font.type === 'divider') {
          const divider = document.createElement('hr');
          divider.style.margin = '5px 0';
          divider.style.border = '0';
          divider.style.borderTop = '1px solid #eee';
          dropdownMenu.appendChild(divider);
          return;
        }
        
        // 그룹 헤더 처리
        if (font.type === 'group_header') {
          const header = document.createElement('div');
          header.textContent = font.name;
          header.style.fontWeight = 'bold';
          header.style.padding = '5px 10px';
          header.style.color = '#666';
          header.style.fontSize = '12px';
          dropdownMenu.appendChild(header);
          return;
        }
        
        // 폰트 아이템 추가
        const fontItem = document.createElement('div');
        fontItem.textContent = font.name;
        fontItem.style.padding = '5px 10px';
        fontItem.style.cursor = 'pointer';
        fontItem.style.fontFamily = font.value;
        
        // 호버 이벤트
        fontItem.addEventListener('mouseover', () => {
          fontItem.style.backgroundColor = '#f0f0f0';
        });
        
        fontItem.addEventListener('mouseout', () => {
          fontItem.style.backgroundColor = '';
        });
        
        // 클릭 이벤트 - 폰트 적용
        fontItem.addEventListener('click', () => {
          document.execCommand('fontName', false, font.value);
          dropdownMenu.style.display = 'none';
          arrowIcon.textContent = 'arrow_drop_down';
        });
        
        dropdownMenu.appendChild(fontItem);
      });
      
      // 6. 드롭다운을 전용 컨테이너에 추가 (다른 요소들의 영향을 받지 않도록)
      const dropdownContainer = ensureFontDropdownContainer();
      dropdownContainer.appendChild(dropdownMenu);
      
      // 7. 버튼 클릭 이벤트 - 드롭다운 토글
      fontContainer.addEventListener('click', (e) => {
        e.stopPropagation(); // 클릭 이벤트 버블링 방지
        console.log('Font container clicked');
        console.log('fontContainer position:', fontContainer.style.position);
        console.log('fontContainer dimensions:', fontContainer.getBoundingClientRect());
        
        // 선택 박스 스타일 효과: 클릭시 스타일 변경
        if (dropdownMenu.style.display === 'none') {
          fontContainer.style.borderColor = '#999';
          fontContainer.style.backgroundColor = '#f5f5f5';
        } else {
          fontContainer.style.borderColor = '#ddd';
          fontContainer.style.backgroundColor = '#fff';
        }
        
        // 다른 드롭다운 메뉴 닫기
        document.querySelectorAll('.lite-editor-dropdown-menu').forEach(menu => {
          if (menu !== dropdownMenu) {
            menu.style.display = 'none';
          }
        });
        
        // 현재 메뉴 토글
        const isVisible = dropdownMenu.style.display === 'block';
        
        if (!isVisible) {
          // 버튼 위치를 기준으로 드롭다운 배치
          const rect = fontContainer.getBoundingClientRect();
          
          // 위치 설정 - 고정 좌표로 문서 전체에서 정확한 위치 보장
          dropdownMenu.style.top = (rect.bottom + window.scrollY) + 'px';
          dropdownMenu.style.left = (rect.left + window.scrollX) + 'px';
          dropdownMenu.style.minWidth = Math.max(200, rect.width) + 'px';
          dropdownMenu.style.display = 'block';
          
          // 화살표 둘려서 허쇼이 바라보는 효과
          arrowIcon.textContent = 'arrow_drop_up';
        } else {
          dropdownMenu.style.display = 'none';
          arrowIcon.textContent = 'arrow_drop_down';
        }
      });
      
      // 8. body 클릭 시 드롭다운 닫기
      document.addEventListener('click', (e) => {
        // 클릭이 폰트 컨테이너나 드롭다운 외부에서 발생했는지 확인
        if (!fontContainer.contains(e.target) && !dropdownMenu.contains(e.target)) {
          dropdownMenu.style.display = 'none';
          fontContainer.style.borderColor = '#ddd';
          fontContainer.style.backgroundColor = '#fff';
          arrowIcon.textContent = 'arrow_drop_down';
        }
      });
      
      return fontContainer;
    }
  });
})();
