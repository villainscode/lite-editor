/**
 * LiteEditor 드롭다운 유틸리티
 * 드롭다운 관련 공통 기능 제공
 */
(function() {
  // 기존 PluginUtil 객체가 있는지 확인
  if (!window.PluginUtil) {
    console.error('PluginUtil이 정의되지 않았습니다. plugin-util.js가 먼저 로드되었는지 확인하세요.');
    return;
  }
  
  // 활성화된 드롭다운 관리를 위한 내부 상태
  const activeDropdowns = new Set();
  
  // 드롭다운 유틸리티 추가
  window.PluginUtil.dropdown = {
    /**
     * 드롭다운 공통 기능 설정
     * @param {HTMLElement} button - 드롭다운을 토글할 버튼
     * @param {HTMLElement} dropdownMenu - 드롭다운 메뉴 요소
     * @param {Object} params - 추가 설정 (옵션)
     * @returns {Object} - 드롭다운 제어 API
     */
    setupDropdown: function(button, dropdownMenu, params = {}) {
      // 이미 설정된 경우 기존 API 반환
      if (button._dropdownAPI) return button._dropdownAPI;
      
      // 기본 옵션 설정
      const options = Object.assign({
        position: 'absolute',       // 'absolute' 또는 'fixed'
        zIndex: '99999',            // z-index 값
        arrowIcon: null,            // 화살표 아이콘 요소 (있는 경우)
        buttonActiveClass: 'active', // 버튼 활성화 클래스
        onOpen: null,               // 열릴 때 호출될 콜백
        onClose: null,              // 닫힐 때 호출될 콜백
        closeOthers: true,          // 다른 드롭다운 닫기 여부
        toolbar: null,              // 툴바 요소 (툴바 이벤트 등록용)
        customStyles: {},           // 추가 스타일
        replaceClickHandler: false  // 기존 클릭 핸들러 대체 여부 (기본값: false)
      }, params);
      
      // 드롭다운 메뉴 초기 설정
      if (options.position) {
        dropdownMenu.style.position = options.position;
      }
      
      if (options.zIndex) {
        dropdownMenu.style.zIndex = options.zIndex;
      }
      
      // 기본적인 스타일 설정
      Object.assign(dropdownMenu.style, {
        display: 'none',
        backgroundColor: '#fff',
        border: '1px solid #ccc',
        borderRadius: '4px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        padding: '8px 0'
      }, options.customStyles);
      
      // 드롭다운 상태 관리
      let isDropdownOpen = false;
      
      // 드롭다운 닫기 함수
      const closeDropdown = () => {
        if (!isDropdownOpen) return;
        
        isDropdownOpen = false;
        dropdownMenu.classList.remove('show');
        dropdownMenu.style.display = 'none';
        
        // 버튼 비활성화
        button.classList.remove(options.buttonActiveClass);
        
        // 아이콘 방향 변경 (아이콘이 있는 경우)
        if (options.arrowIcon && options.arrowIcon.textContent === 'arrow_drop_up') {
          options.arrowIcon.textContent = 'arrow_drop_down';
        }
        
        // 활성 드롭다운에서 제거
        activeDropdowns.delete(dropdownMenu);
        
        // 닫힘 콜백 호출
        if (typeof options.onClose === 'function') {
          options.onClose();
        }
      };
      
      // 드롭다운 열기 함수
      const openDropdown = () => {
        // 다른 드롭다운 닫기
        if (options.closeOthers) {
          this.closeAllDropdowns();
        }
        
        // 위치 설정
        const buttonRect = button.getBoundingClientRect();
        dropdownMenu.style.top = (buttonRect.bottom + (options.position === 'absolute' ? window.scrollY : 0)) + 'px';
        dropdownMenu.style.left = buttonRect.left + 'px';
        
        // 드롭다운 표시
        dropdownMenu.style.display = 'block';
        dropdownMenu.classList.add('show');
        isDropdownOpen = true;
        
        // 버튼 활성화
        button.classList.add(options.buttonActiveClass);
        
        // 아이콘 방향 변경 (아이콘이 있는 경우)
        if (options.arrowIcon && options.arrowIcon.textContent === 'arrow_drop_down') {
          options.arrowIcon.textContent = 'arrow_drop_up';
        }
        
        // 활성 드롭다운에 추가
        activeDropdowns.add(dropdownMenu);
        
        // 열림 콜백 호출
        if (typeof options.onOpen === 'function') {
          options.onOpen();
        }
      };
      
      // 드롭다운 토글 함수
      const toggleDropdown = (e) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        
        if (isDropdownOpen) {
          closeDropdown();
        } else {
          openDropdown();
        }
        
        return isDropdownOpen;
      };
      
      // 기존 클릭 이벤트 핸들러 대체 여부에 따라 처리
      if (options.replaceClickHandler) {
        // 기존 핸들러 제거 (가능하다면)
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        button = newButton;
        
        // 새 이벤트 핸들러 추가
        button.addEventListener('click', toggleDropdown);
      } else {
        // 버튼에 토글 기능 추가 (기존 이벤트는 유지)
        button._toggleDropdown = toggleDropdown;
      }
      
      // 외부 클릭 시 드롭다운 닫기
      window.PluginUtil.setupOutsideClickHandler(dropdownMenu, closeDropdown, [button]);
      
      // 툴바가 제공된 경우 툴바 이벤트 설정
      if (options.toolbar) {
        const handler = (e) => {
          if (e.target !== button && !button.contains(e.target)) {
            closeDropdown();
          }
        };
        
        // 이미 이벤트 리스너가 있는지 확인 후 추가
        if (!options.toolbar._hasDropdownListener) {
          options.toolbar.addEventListener('mousedown', handler, true);
          options.toolbar._hasDropdownListener = true;
        }
      }
      
      // API 생성
      const api = {
        isOpen: () => isDropdownOpen,
        open: openDropdown,
        close: closeDropdown,
        toggle: toggleDropdown
      };
      
      // 버튼에 API 저장
      button._dropdownAPI = api;
      
      return api;
    },
    
    /**
     * 모든 활성 드롭다운 닫기
     */
    closeAllDropdowns: function() {
      activeDropdowns.forEach(dropdown => {
        dropdown.style.display = 'none';
        dropdown.classList.remove('show');
      });
      
      // 모든 버튼 비활성화
      document.querySelectorAll('.lite-editor-button.active, .lite-editor-font-button.active').forEach(btn => {
        btn.classList.remove('active');
      });
      
      // 모든 화살표 아이콘 방향 초기화
      document.querySelectorAll('.material-icons').forEach(icon => {
        if (icon.textContent === 'arrow_drop_up') {
          icon.textContent = 'arrow_drop_down';
        }
      });
      
      activeDropdowns.clear();
    }
  };
})();