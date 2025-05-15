/**
 * LiteEditor Media Plugin
 * 동영상 삽입 관련 플러그인
 * 통합 레이어 관리 방식으로 변경
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
  if (!util.selection) {
    console.error('MediaPlugin: PluginUtil.selection이 필요합니다.');
  }
  
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
    // URL에서 불필요한 @ 기호 제거
    url = url.replace(/^@/, '');
    
    // 다양한 YouTube 링크 패턴 처리
    // 1. 일반 유튜브 링크: youtube.com/watch?v=VIDEO_ID
    // 2. 짧은 링크: youtu.be/VIDEO_ID
    // 3. 임베드 링크: youtube.com/embed/VIDEO_ID
    // 4. 쇼츠 링크: youtube.com/shorts/VIDEO_ID
    const patterns = [
      // 일반 유튜브 및 임베드 링크
      /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/))([A-Za-z0-9_-]{11})(?:&|\?|$|\/|#)/,
      // 짧은 링크
      /(?:youtu\.be\/)([A-Za-z0-9_-]{11})(?:&|\?|$|\/|#)?/,
      // 쇼츠 링크
      /(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})(?:&|\?|$|\/|#)?/
    ];
    
    // 각 패턴에 대해 매칭 시도
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    // 기본 비디오 ID 추출 (다른 모든 패턴 실패 시 시도)
    // URL 내 11자 영숫자 패턴 찾기
    const basicIdMatch = url.match(/([A-Za-z0-9_-]{11})/);
    if (basicIdMatch) {
      return basicIdMatch[1];
    }
    
    return null;
  }

  /**
   * URL 유효성 검사
   * @param {string} url - 검사할 URL
   * @returns {boolean} - 유효성 여부
   */
  function isValidYouTubeUrl(url) {
    // URL에 youtube 또는 youtu.be가 포함되어 있는지만 확인
    // 더 적극적으로 수용하는 방식 사용
    return (
      url.includes('youtube.com') || 
      url.includes('youtu.be') || 
      parseYouTubeID(url) !== null
    );
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
      // YouTube ID 추출
      const videoId = parseYouTubeID(url);
      
      if (!videoId) return;
      
      try {
        contentArea.focus({ preventScroll: true });
      } catch (e) {
        contentArea.focus();
      }
      
      restoreSelection();
      
      // 보안 관리자가 있는 경우 도메인 검증
      if (typeof LiteEditorSecurity !== 'undefined') {
        const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
        
        // 도메인 허용 여부 확인
        if (!LiteEditorSecurity.isDomainAllowed(youtubeUrl)) {
          errorHandler.logError('MediaPlugin', errorHandler.codes.SECURITY.DOMAIN_NOT_ALLOWED, e);
          return;
        }
      }
      
      // iframe 요소 생성
      const iframe = createYouTubeIframe(videoId);
      
      // 래퍼 생성 - 클래스와 인라인 스타일 모두 적용
      const wrapper = document.createElement('div');
      wrapper.className = 'video-wrapper';
      
      // 중요: width와 height를 style 속성에 직접 지정 (저장 시 유지)
      wrapper.style.width = '640px';
      wrapper.style.height = '360px';
      wrapper.style.position = 'relative';
      wrapper.style.margin = '10px 0';
      wrapper.style.resize = 'both';
      wrapper.style.overflow = 'hidden';
      wrapper.style.border = '2px solid #e0e0e0';
      wrapper.style.boxSizing = 'border-box';
      wrapper.style.maxWidth = '100%';
      
      // 리사이즈 핸들 요소 추가 (CSS pseudo-element 대신 실제 요소로 대체)
      const resizeHandle = util.dom.createElement('div', {
        className: 'video-resize-handle'
      });
      resizeHandle.style.position = 'absolute';
      resizeHandle.style.right = '0';
      resizeHandle.style.bottom = '0';
      resizeHandle.style.width = '20px';
      resizeHandle.style.height = '20px';
      resizeHandle.style.backgroundImage = 'linear-gradient(135deg, transparent 50%, #4285f4 50%, #4285f4 100%)';
      resizeHandle.style.cursor = 'nwse-resize';
      resizeHandle.style.zIndex = '10';
      
      wrapper.contentEditable = false;
      wrapper.appendChild(iframe);
      wrapper.appendChild(resizeHandle);
      
      // 에디터에 삽입
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
      
      // 크기 변경 감지를 위한 MutationObserver 설정
      if (window.MutationObserver) {
        const observer = new MutationObserver(mutations => {
          // 에디터 이벤트 발생 (수정사항 적용)
          if (util.editor && util.editor.dispatchEditorEvent) {
            util.editor.dispatchEditorEvent(contentArea);
          }
        });
        
        observer.observe(wrapper, {
          attributes: true,
          attributeFilter: ['style']
        });
      }
      
      // 선택 영역 초기화
      clearSelection();
      
    } catch (error) {
      errorHandler.logError('MediaPlugin', errorHandler.codes.PLUGINS.MEDIA.INSERT, error);
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
        display: 'none',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: '4px',
        backgroundColor: 'transparent',
        position: 'absolute',
        zIndex: '99999'
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
        
        // 보안 검사: HTML 태그 감지
        if (url.indexOf('<') !== -1 || url.indexOf('>') !== -1) {
          // 드롭다운 닫기
          dropdownMenu.classList.remove('show');
          dropdownMenu.style.display = 'none';
          mediaButton.classList.remove('active');
          isDropdownOpen = false;
          
          // 모달 관리 시스템에서 제거
          util.activeModalManager.unregister(dropdownMenu);
          
          // 경고 메시지 표시 (지연 적용)
          setTimeout(() => {
            if (typeof LiteEditorModal !== 'undefined') {
              LiteEditorModal.alert('유효하지 않은 동영상 URL입니다.<BR>HTML 태그는 허용되지 않습니다.');
            } else {
              alert('유효하지 않은 동영상 URL입니다.\nHTML 태그는 허용되지 않습니다.');
            }
          }, 300);
          
          return;
        }
        
        // 기존 YouTube URL 유효성 검사 대신 SecurityManager 사용
        if (!LiteEditorSecurity.isDomainAllowed(url)) {
          // 드롭다운 닫기
          dropdownMenu.classList.remove('show');
          dropdownMenu.style.display = 'none';
          mediaButton.classList.remove('active');
          isDropdownOpen = false;
          
          // 모달 관리 시스템에서 제거
          util.activeModalManager.unregister(dropdownMenu);
          
          // 경고 메시지 표시 (지연 적용)
          setTimeout(() => {
            if (typeof LiteEditorModal !== 'undefined') {
              LiteEditorModal.alert('유효한 YouTube URL을 입력해주세요.<BR>Ex : https://www.youtube.com/watch?v=...');
            } else {
              alert('유효한 YouTube URL을 입력해주세요.\nEx : https://www.youtube.com/watch?v=...');
            }
          }, 300);
          
          return;
        }
        
        // 드롭다운 닫기
        dropdownMenu.classList.remove('show');
        dropdownMenu.style.display = 'none';
        mediaButton.classList.remove('active');
        isDropdownOpen = false;
        
        // 모달 관리 시스템에서 제거
        util.activeModalManager.unregister(dropdownMenu);
        
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
      
      // 9. 버튼 클릭 이벤트 - 직접 구현한 드롭다운 토글 로직
      mediaButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
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
          mediaButton.classList.remove('active');
          isDropdownOpen = false;
          
          // 모달 관리 시스템에서 제거
          util.activeModalManager.unregister(dropdownMenu);
        } else {
          // 열기
          dropdownMenu.classList.add('show');
          dropdownMenu.style.display = 'flex'; // flex로 변경 (레이아웃 유지)
          mediaButton.classList.add('active');
          isDropdownOpen = true;
          
          // 위치 설정
          const buttonRect = mediaButton.getBoundingClientRect();
          dropdownMenu.style.top = (buttonRect.bottom + window.scrollY) + 'px';
          dropdownMenu.style.left = buttonRect.left + 'px';
          
          // 입력창 초기화 및 포커스
          urlInput.value = '';
          setTimeout(() => urlInput.focus(), 10);
          
          // 활성 모달 등록 (관리 시스템에 추가)
          dropdownMenu.closeCallback = () => {
            dropdownMenu.classList.remove('show');
            dropdownMenu.style.display = 'none';
            mediaButton.classList.remove('active');
            isDropdownOpen = false;
          };
          
          util.activeModalManager.register(dropdownMenu);
          
          // 외부 클릭 시 닫기 설정 - 열 때만 등록
          util.setupOutsideClickHandler(dropdownMenu, () => {
            dropdownMenu.classList.remove('show');
            dropdownMenu.style.display = 'none';
            mediaButton.classList.remove('active');
            isDropdownOpen = false;
            util.activeModalManager.unregister(dropdownMenu);
          }, [mediaButton]);
        }
      });
      
      return mediaButton;
    }
  });
})();