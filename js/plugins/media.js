/**
 * LiteEditor Media Plugin
 * 동영상 삽입 관련 플러그인
 * 리팩토링: 공통 드롭다운 유틸리티 적용
 */

(function() {
  // 상수 정의
  const PLUGIN_ID = 'media';
  const MODULE_NAME = 'MEDIA'; // 디버깅 로그용 모듈명
  const CSS_PATH = 'css/plugins/media.css';
  const STYLE_ID = 'mediaStyles';
  
  // 드롭다운 UI 설정
  const DROPDOWN_WIDTH = 300;    // 드롭다운 너비 (px)
  const DROPDOWN_HEIGHT = 80;    // 드롭다운 높이 (px)
  
  // PluginUtil 참조
  const util = window.PluginUtil;
  
  // 전역 상태 변수
  let savedRange = null;          // 임시로 저장된 선택 영역
  let isDropdownOpen = false;     // 드롭다운 열림 상태

  // CSS 파일 로드
  util.styles.loadCssFile(`${PLUGIN_ID}-css`, CSS_PATH);

  /**
   * YouTube URL에서 video ID 추출
   * @param {string} url - YouTube URL
   * @returns {string|null} - 추출된 video ID 또는 null
   */
  function parseYouTubeID(url) {
    const reg = /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/))([A-Za-z0-9_-]{11})/;
    const m = url.match(reg);
    return m ? m[1] : null;
  }

  /**
   * URL 유효성 검사
   * @param {string} url - 검사할 URL
   * @returns {boolean} - 유효성 여부
   */
  function isValidYouTubeUrl(url) {
    return parseYouTubeID(url) !== null;
  }
  
  /**
   * 선택 영역 저장
   */
  function saveSelection() {
    savedRange = util.selection.saveSelection();
  }
  
  /**
   * 저장된 선택 영역 복원
   */
  function restoreSelection() {
    if (!savedRange) return false;
    return util.selection.restoreSelection(savedRange);
  }
  
  /**
   * 선택 영역 초기화
   */
  function clearSelection() {
    savedRange = null;
  }

  /**
   * YouTube iframe 요소 생성
   * @param {string} videoId - YouTube 비디오 ID
   * @returns {HTMLIFrameElement} - 생성된 iframe 요소
   */
  function createYouTubeIframe(videoId) {
    return util.dom.createElement('iframe', {
      width: '100%',
      height: '100%',
      src: `https://www.youtube.com/embed/${videoId}?enablejsapi=0&rel=0&modestbranding=1&origin=${encodeURIComponent(window.location.origin || '*')}`,
      title: 'YouTube video player',
      frameBorder: '0',
      allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
      allowFullscreen: true,
      loading: 'lazy',
      referrerPolicy: 'strict-origin-when-cross-origin'
    });
  }

  /**
   * YouTube 동영상 삽입
   * @param {string} url - YouTube URL
   * @param {HTMLElement} contentArea - 에디터 콘텐츠 영역
   */
  function insertYouTubeVideo(url, contentArea) {
    try {
      // 현재 스크롤 위치 저장
      const currentScrollY = window.scrollY;
      const currentScrollX = window.scrollX;
      
      // YouTube ID 추출
      const videoId = parseYouTubeID(url);
      
      if (!videoId) return;
      
      // 선택 영역 복원
      restoreSelection();
      
      try {
        contentArea.focus({ preventScroll: true });
      } catch (e) {
        contentArea.focus();
      }
      
      // 보안 관리자가 있는 경우 도메인 검증
      if (typeof LiteEditorSecurity !== 'undefined') {
        const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
        
        // 도메인 허용 여부 확인
        if (!LiteEditorSecurity.isDomainAllowed(youtubeUrl)) {
          console.warn(`보안 정책: YouTube 도메인이 허용 목록에 없습니다.`);
          return;
        }
      }
      
      // iframe 요소 생성
      const iframe = createYouTubeIframe(videoId);
      
      // 래퍼 생성 및 기본 크기 설정
      const wrapper = util.dom.createElement('div', {
        className: 'video-wrapper'
      }, {
        width: '480px',
        height: '270px'
      });
      wrapper.appendChild(iframe);
      
      // 에디터에 삽입
      // 커서 위치에 삽입하기 위해 Range API 사용
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(wrapper);
        
        // 삽입 후 커서를 동영상 다음으로 이동
        range.setStartAfter(wrapper);
        range.setEndAfter(wrapper);
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        // 선택 영역이 없는 경우 에디터 끝에 삽입
        contentArea.appendChild(wrapper);
      }
      
      // 에디터 이벤트 발생 (수정사항 적용)
      if (util.editor && util.editor.dispatchEditorEvent) {
        util.editor.dispatchEditorEvent(contentArea);
      }
      
      // 선택 영역 초기화
      clearSelection();
      
      // 스크롤 위치 복원
      requestAnimationFrame(() => {
        setTimeout(() => {
          window.scrollTo(currentScrollX, currentScrollY);
        }, 50);
      });
      
    } catch (error) {
      console.error('동영상 삽입 중 오류 발생:', error);
    }
  }
  
  // 플러그인 등록
  LiteEditor.registerPlugin(PLUGIN_ID, {
    title: 'Insert Media',
    icon: 'live_tv', 
    customRender: function(toolbar, contentArea) {
      // CSS 파일 로드
      util.styles.loadCssFile(STYLE_ID, CSS_PATH);
      
      // 1. 미디어 버튼 생성
      const mediaButton = util.dom.createElement('button', {
        className: 'lite-editor-button',
        title: 'Insert Media'
      });

      // 2. 버튼 아이콘 추가
      const icon = util.dom.createElement('i', {
        className: 'material-icons',
        textContent: 'live_tv'
      });
      mediaButton.appendChild(icon);
      
      // 3. 드롭다운 메뉴 생성 - 새로운 구조
      const dropdownMenu = util.dom.createElement('div', {
        className: 'lite-editor-dropdown-menu media-dropdown',
        id: 'media-dropdown-' + Math.random().toString(36).substr(2, 9)
      }, {
        width: DROPDOWN_WIDTH + 'px',
        height: DROPDOWN_HEIGHT + 'px',
        padding: '0',
        margin: '0',
        boxShadow: '0 1px 5px rgba(0,0,0,0.1)',
        textAlign: 'left',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: '4px',
        backgroundColor: 'transparent'
      });
      
      // 4. 헤더 생성 - 상단에 완전히 맞도록 조정
      const header = util.dom.createElement('div', {
        className: 'lite-editor-media-header'
      }, {
        padding: '4px 8px',
        margin: '0',
        borderTopLeftRadius: '4px',
        borderTopRightRadius: '4px',
        borderBottom: '1px solid #e0e0e0',
        backgroundColor: '#f8f9fa',
        width: '100%',
        boxSizing: 'border-box'
      });
      
      const title = util.dom.createElement('span', {
        className: 'lite-editor-media-title',
        textContent: 'Enter the video URL to insert'
      }, {
        fontSize: '13px',
        fontWeight: '500',
        color: '#333',
        lineHeight: '1.2'
      });
      
      header.appendChild(title);
      dropdownMenu.appendChild(header);
      
      // 5. 입력 그룹 생성 - 입력 필드 상단 여백 추가
      const inputGroup = util.dom.createElement('div', {
        className: 'lite-editor-media-input-group'
      }, {
        display: 'flex',
        padding: '14px 8px 8px 8px',
        margin: '0',
        alignItems: 'center',
        backgroundColor: 'white',
        flexGrow: '1',
        width: '100%',
        boxSizing: 'border-box'
      });
      
      const urlInput = util.dom.createElement('input', {
        type: 'text', 
        className: 'lite-editor-media-input',
        placeholder: 'https://www.youtube.com/watch?v=...'
      }, {
        flex: '1',
        height: '28px',
        padding: '3px 6px',
        fontSize: '12px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        outline: 'none',
        boxSizing: 'border-box'
      });
      
      // OK 버튼 (link.js 스타일)
      const submitButton = util.dom.createElement('button', {
        type: 'submit',
        className: 'lite-editor-media-insert',
        title: 'Insert',
        textContent: 'OK'
      }, {
        marginLeft: '6px',
        padding: '4px 8px',
        border: 'none',
        borderRadius: '3px',
        backgroundColor: '#4285f4',
        color: 'white',
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: '500',
        height: '28px',
        minWidth: '32px',
        boxSizing: 'border-box'
      });
      
      inputGroup.appendChild(urlInput);
      inputGroup.appendChild(submitButton);
      dropdownMenu.appendChild(inputGroup);
      
      // 6. 드롭다운을 document.body에 추가
      document.body.appendChild(dropdownMenu);
      
      // 7. 처리 함수 정의
      const processVideoUrl = (url) => {
        url = url.trim();
        if (!isValidYouTubeUrl(url)) {
          if (typeof LiteEditorModal !== 'undefined') {
            LiteEditorModal.alert('Please enter a valid YouTube URL.<BR>Ex : https://www.youtube.com/watch?v=...');
          } else {
            alert('Please enter a valid YouTube URL.\nEx : https://www.youtube.com/watch?v=...');
          }
          return;
        }
        
        // 드롭다운 닫기
        if (mediaButton._dropdownAPI) {
          mediaButton._dropdownAPI.close();
        }
        
        // 동영상 삽입
        insertYouTubeVideo(url, contentArea);
      };
      
      // 8. 이벤트 설정
      submitButton.addEventListener('click', () => processVideoUrl(urlInput.value));
      
      urlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          processVideoUrl(urlInput.value);
        }
      });
      
      // 9. 버튼 클릭 이벤트 - 드롭다운 토글
      mediaButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 현재 스크롤 위치 저장
        const currentScrollY = window.scrollY;
        
        // 드롭다운 API 사용
        const dropdownAPI = util.dropdown.setupDropdown(mediaButton, dropdownMenu, {
          buttonActiveClass: 'active',
          toolbar: toolbar,
          closeOthers: true,
          customStyles: {
            width: DROPDOWN_WIDTH + 'px',
            height: DROPDOWN_HEIGHT + 'px',
            padding: '0',
            margin: '0',
            overflow: 'hidden'
          },
          onOpen: () => {
            // 선택 영역 저장
            saveSelection();
            
            // 입력창 초기화 및 포커스
            urlInput.value = '';
            setTimeout(() => urlInput.focus(), 10);
          },
          onClose: () => {
            // 드롭다운 상태 업데이트
            isDropdownOpen = false;
          }
        });
        
        // 토글 수행
        dropdownAPI.toggle(e);
        
        // 상태 업데이트
        isDropdownOpen = dropdownAPI.isOpen();
        
        // 스크롤 위치 복원
        requestAnimationFrame(() => {
          setTimeout(() => {
            window.scrollTo(window.scrollX, currentScrollY);
          }, 50);
        });
      });
      
      // 10. 활성 모달 관리자에 버튼 등록
      util.activeModalManager.registerButton(mediaButton);
      
      return mediaButton;
    }
  });
})();