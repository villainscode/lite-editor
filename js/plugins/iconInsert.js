/**
 * 초간단 :: 아이콘 삽입 - 데이터 파일 연동 + 20px 그리드
 */

(function() {
  let icons = []; // 빈 배열로 시작
  let colonCount = 0;
  let colonTimer = null;
  let layer = null;
  let selection = 0;
  let autoCloseTimer = null; // ✅ 자동 닫기 타이머 추가
  
  // ✅ 아이콘 데이터 내부 통합
  const iconData = ['⓵', '⓶', '⓷', '⓸', '⓹', '⓺', '⓻', '⓼', '⓽', '⓾',
                    '✅', '✔️', '🟢', '📌', '⭐', '🔔', '❗', '❌', '⚠️', '🔴'];

  // 아이콘 데이터 로드 (단순화)
  function loadIconsFromData() {
    icons = iconData.slice(0, 20);
    return true;
  }
  
  // ✅ :: 위치 저장
  let savedCaretRect = null;
  function saveCaretPosition() {
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
      savedCaretRect = sel.getRangeAt(0).getBoundingClientRect();
    }
  }
  
  // 키 감지
  function handleKey(e) {
    // 레이어가 열려있을 때만 처리
    if (layer) {
      // 방향키, Enter, Esc만 처리하고 나머지는 통과
      if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(e.key)) {
        return; // ✅ 다른 키는 다른 플러그인이 처리하도록 통과
      }
      
      switch(e.key) {
        case 'ArrowRight': 
          e.preventDefault(); 
          selection = Math.min(selection + 1, icons.length - 1); 
          updateGrid();
          startAutoCloseTimer(); // ✅ 타이머 리셋 추가
          break;
        case 'ArrowLeft': 
          e.preventDefault(); 
          selection = Math.max(selection - 1, 0); 
          updateGrid();
          startAutoCloseTimer(); // ✅ 타이머 리셋 추가
          break;
        case 'ArrowDown': 
          e.preventDefault(); 
          selection = Math.min(selection + 10, icons.length - 1); 
          updateGrid();
          startAutoCloseTimer(); // ✅ 타이머 리셋 추가
          break;
        case 'ArrowUp': 
          e.preventDefault(); 
          selection = Math.max(selection - 10, 0); 
          updateGrid();
          startAutoCloseTimer(); // ✅ 타이머 리셋 추가
          break;
        case 'Enter':
          e.preventDefault();
          insertIcon();
          break;
        case 'Escape':
          e.preventDefault();
          closeLayer();
          break;
      }
      e.stopPropagation(); // 처리한 키만 차단
      return;
    }
    
    // "::" 감지
    if (e.key === ':') {
      colonCount++;
      
      clearTimeout(colonTimer);
      colonTimer = setTimeout(() => {
        colonCount = 0;
      }, 1000);
      
      if (colonCount === 2) {
        e.preventDefault();
        e.stopPropagation();
        saveCaretPosition();
        showLayer();
        colonCount = 0;
      }
    } else {
      colonCount = 0;
    }
  }
  
  // 레이어 표시
  function showLayer() {
    
    if (layer) return;
    
    // 아이콘이 없으면 로드 시도
    if (icons.length === 0) {
      loadIconsFromData();
    }
    
    // ✅ 저장된 :: 위치 사용
    const rect = savedCaretRect || { left: window.innerWidth/2, top: window.innerHeight/2 };
    
    // 레이어 생성 (20px 그리드)
    layer = document.createElement('div');
    layer.className = 'icon-insert-layer';
    layer.style.cssText = `
      position: fixed !important;
      left: ${rect.left}px;
      top: ${rect.top - 60}px;
      width: 280px !important;
      height: 64px !important;
      background: white !important;
      border: 2px solid #22a5ff !important;
      border-radius: 3px;
      padding: 5px;
      display: grid !important;
      grid-template-columns: repeat(10, 25px);
      grid-template-rows: repeat(2, 25px);
      gap: 2px;
      z-index: 9999 !important;
      pointer-events: auto !important;
      opacity: 1 !important;
      visibility: visible !important;
    `;
    
    // 아이콘 생성 (20px 사이즈)
    icons.forEach((icon, i) => {
      const item = document.createElement('div');
      item.textContent = icon;
      item.className = 'icon-item';
      item.setAttribute('data-index', i);
      item.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        width: 25px;
        height: 25px;
        border-radius: 2px;
        cursor: pointer;
        background: ${i === 0 ? '#007bff' : '#f5f5f5'};
        color: ${i === 0 ? 'white' : 'black'};
      `;
      
      item.onclick = () => {
        selection = i;
        insertIcon();
      };
      
      // 마우스 호버 이벤트 추가
      item.addEventListener('mouseenter', () => {
        selection = i;
        updateGrid();
        startAutoCloseTimer(); // ✅ 타이머 리셋 추가
      });
      
      // 툴크 추가 (데이터 파일에서 설명 가져오기)
      if (window.ICON_INSERT_DATA && window.ICON_INSERT_DATA.descriptions) {
        const description = window.ICON_INSERT_DATA.descriptions[icon];
        if (description) {
          item.title = description;
        }
      }
      
      layer.appendChild(item);
    });
    
    document.body.appendChild(layer);
    selection = 0;
    
    // ✅ 5초 후 자동 닫기
    startAutoCloseTimer();
  }
  
  // 선택 업데이트
  function updateGrid() {
    if (!layer) return;
    
    Array.from(layer.children).forEach((item, i) => {
      if (i === selection) {
        item.style.background = '#007bff';
        item.style.color = 'white';
      } else {
        item.style.background = '#f8f8f8';
        item.style.color = 'black';
      }
    });
  }
  
  // 아이콘 삽입
  function insertIcon() {
    const icon = icons[selection];
    
    // ✅ 바로 앞 ":" 하나만 삭제 후 아이콘 삽입
    document.execCommand('delete');  // 앞글자 1개 삭제
    document.execCommand('insertHTML', false, `<span style="font-size: 14px;">${icon}</span>`);
    
    closeLayer();
  }
  
  // 레이어 닫기
  function closeLayer() {
    if (layer) {
      layer.remove();
      layer = null;
      selection = 0;
    }
  }
  
  // ✅ 즉시 초기화 (데이터 대기 불필요)
  function init() {
    loadIconsFromData();
    document.addEventListener('keydown', handleKey, true);
    window.testIconLayer = showLayer;
  }
  
  // ✅ 자동 닫기 타이머 5초 시작
  function startAutoCloseTimer() {
    clearTimeout(autoCloseTimer);
    autoCloseTimer = setTimeout(() => {
      if (layer) {
        layer.style.opacity = '0';
        layer.style.transition = 'opacity 0.5s ease';
        setTimeout(() => closeLayer(), 500);
      }
    }, 5000);
  }
  
  setTimeout(init, 1000);
})();