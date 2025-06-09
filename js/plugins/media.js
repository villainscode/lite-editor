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
  const DROPDOWN_HEIGHT = 90;    // 드롭다운 높이 (px)
  
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
  
  // ✅ 개선안: 단일 Observer + WeakMap 관리
  const videoObservers = new WeakMap();

  // ✅ 개선안: WeakMap 기반 cleanup 관리
  const resizeCleanupMap = new WeakMap();

  // ✅ 개선안: 드롭다운 cleanup 관리
  const dropdownCleanupMap = new WeakMap();

  // ✅ 개선안: 타이머 관리 (전역 변수 대신 WeakMap)
  const resizeTimeoutMap = new WeakMap();

  /**
   * ✅ 동영상 URL 유효성 검사 (통합 보안 시스템 활용)
   * @param {string} url - 검사할 URL
   * @returns {boolean} 유효성 여부
   */
  function isValidVideoUrl(url) {
    if (!url || typeof url !== 'string') return false;
    
    // 1. 기본 URL 형식 검사 (security-manager.js 활용)
    if (typeof LiteEditorSecurity !== 'undefined' && LiteEditorSecurity.isValidUrl) {
      if (!LiteEditorSecurity.isValidUrl(url)) {
        return false;
      }
    }
    
    // 2. 동영상 도메인 허용 목록 검사 (security-manager.js 활용)
    if (typeof LiteEditorSecurity !== 'undefined' && LiteEditorSecurity.isVideoUrlAllowed) {
      return LiteEditorSecurity.isVideoUrlAllowed(url);
    }
    
    // 3. 폴백: videoList.js 직접 참조
    if (typeof window.LiteEditorVideoData !== 'undefined') {
      try {
        const urlObj = new URL(url);
        const allowedDomains = window.LiteEditorVideoData.ALLOWED_VIDEO_DOMAINS || [];
        return allowedDomains.some(domain => 
          urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
        );
      } catch (e) {
        return false;
      }
    }
    
    // 4. 최종 폴백: 기본 YouTube 도메인만 허용
    return /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)/i.test(url);
  }

  /**
   * ✅ 동영상 플랫폼 감지 (security-manager.js 활용)
   * @param {string} url - 분석할 URL
   * @returns {Object|null} 플랫폼 정보 또는 null
   */
  function detectVideoPlatform(url) {
    // security-manager.js의 detectVideoPlatform 활용
    if (typeof LiteEditorSecurity !== 'undefined' && LiteEditorSecurity.detectVideoPlatform) {
      return LiteEditorSecurity.detectVideoPlatform(url);
    }
    
    // 폴백: YouTube만 지원
    const videoId = parseYouTubeID(url);
    if (videoId) {
      return {
        platform: 'youtube',
        id: videoId,
        hash: null,
        originalUrl: url
      };
    }
    
    return null;
  }

  /**
   * ✅ 플랫폼별 임베드 URL 생성 (security-manager.js 활용)
   * @param {string} platform - 플랫폼 이름
   * @param {string} videoId - 비디오 ID
   * @param {Object} options - 추가 옵션
   * @returns {string} 임베드 URL
   */
  function createEmbedUrl(platform, videoId, options = {}) {
    // security-manager.js의 createEmbedUrl 활용
    if (typeof LiteEditorSecurity !== 'undefined' && LiteEditorSecurity.createEmbedUrl) {
      return LiteEditorSecurity.createEmbedUrl(platform, videoId, options);
    }
    
    // 폴백: YouTube만 지원
    if (platform === 'youtube') {
      const params = options.params || 'enablejsapi=0&rel=0&modestbranding=1';
      return `https://www.youtube.com/embed/${videoId}?${params}`;
    }
    
    return '';
  }

  /**
   * YouTube URL에서 video ID 추출 (기존 함수 유지 - 폴백용)
   * @param {string} url - YouTube URL
   * @returns {string|null} - 추출된 video ID 또는 null
   */
  function parseYouTubeID(url) {
    // URL에서 불필요한 @ 기호 제거
    url = url.replace(/^@/, '');
    
    // 다양한 YouTube 링크 패턴 처리
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
    
    return null;
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
   * ✅ 플랫폼별 iframe 요소 생성 (통합 보안 시스템 활용)
   * @param {string} platform - 플랫폼 이름
   * @param {string} videoId - 비디오 ID
   * @returns {HTMLIFrameElement} - 생성된 iframe 요소
   */
  function createVideoIframe(platform, videoId) {
    // 임베드 URL 생성
    const embedUrl = createEmbedUrl(platform, videoId);
    
    if (!embedUrl) {
      throw new Error(`지원되지 않는 플랫폼: ${platform}`);
    }
    
    // security-manager.js의 createSafeIframe 활용
    if (typeof LiteEditorSecurity !== 'undefined' && LiteEditorSecurity.createSafeIframe) {
      const iframe = LiteEditorSecurity.createSafeIframe(embedUrl, {
        width: '100%',
        height: '100%',
        title: `${platform} video player`,
        allow: getVideoAllowAttributes(platform),
        allowFullscreen: true
      });
      
      if (iframe) return iframe;
    }
    
    // 폴백: 직접 생성
    return util.dom.createElement('iframe', {
      width: '100%',
      height: '100%',
      src: embedUrl,
      title: `${platform} video player`,
      frameBorder: '0',
      allow: getVideoAllowAttributes(platform),
      allowFullscreen: true,
      loading: 'lazy',
      referrerPolicy: 'strict-origin-when-cross-origin'
    });
  }

  /**
   * ✅ 플랫폼별 allow 속성 가져오기
   * @param {string} platform - 플랫폼 이름
   * @returns {string} allow 속성 값
   */
  function getVideoAllowAttributes(platform) {
    // security-manager.js의 VIDEO_EMBED_CONFIG 활용
    if (typeof LiteEditorSecurity !== 'undefined' && LiteEditorSecurity.VIDEO_EMBED_CONFIG) {
      const config = LiteEditorSecurity.VIDEO_EMBED_CONFIG[platform];
      return config?.allowAttributes || 'autoplay; fullscreen';
    }
    
    // 폴백: 기본 속성
    const defaultAttributes = {
      youtube: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
      vimeo: 'autoplay; fullscreen; picture-in-picture',
      dailymotion: 'autoplay; fullscreen; picture-in-picture',
      kakao: 'autoplay; fullscreen',
      naver: 'autoplay; fullscreen'
    };
    
    return defaultAttributes[platform] || 'autoplay; fullscreen';
  }

  /**
   * ✅ 동영상 삽입 (통합 보안 시스템 활용)
   * @param {string} url - 동영상 URL
   * @param {HTMLElement} contentArea - 에디터 콘텐츠 영역
   */
  function insertVideo(url, contentArea) {
    try {
      // 1. URL 유효성 검사
      if (!isValidVideoUrl(url)) {
        errorHandler.showUserAlert('P903');
        return;
      }
      
      // 2. 네이버 단축 URL 체크
      if (/naver\.me\//.test(url)) {
        alert('네이버 단축 URL(naver.me)은 지원되지 않습니다.\ntv.naver.com의 전체 URL을 사용해주세요.');
        return;
      }
      
      // 3. 플랫폼 감지
      const platformInfo = detectVideoPlatform(url);
      if (!platformInfo) {
        errorHandler.showUserAlert('P903');
        return;
      }
      
      // 4. 에디터 포커스 설정
      try {
        contentArea.focus({ preventScroll: true });
      } catch (e) {
        contentArea.focus();
      }
      
      // 5. 선택 영역 복원
      restoreSelection();
      
      // 6. iframe 요소 생성
      const iframe = createVideoIframe(platformInfo.platform, platformInfo.id);
      
      // 7. 래퍼 생성
      const wrapper = document.createElement('div');
      wrapper.className = 'video-wrapper';
      wrapper.setAttribute('data-platform', platformInfo.platform);
      wrapper.setAttribute('data-video-id', platformInfo.id);
      
      // 스타일 설정
      wrapper.style.width = '640px';
      wrapper.style.height = '360px';
      wrapper.style.position = 'relative';
      wrapper.style.margin = '10px 0';
      wrapper.style.overflow = 'hidden';
      wrapper.style.border = 'none';
      wrapper.style.boxSizing = 'border-box';
      wrapper.style.maxWidth = '100%';
      
      // 8. 리사이즈 핸들 추가
      const resizeHandle = util.dom.createElement('div', {
        className: 'video-resize-handle'
      });
      

      wrapper.contentEditable = false;
      wrapper.appendChild(iframe);
      wrapper.appendChild(resizeHandle);
      
      // 9. 에디터에 삽입
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
      
      // 10. 리사이즈 핸들 설정
      setupVideoResizeHandle(wrapper, resizeHandle);
      
      // 11. 에디터 이벤트 발생
      if (util.editor && util.editor.dispatchEditorEvent) {
        util.editor.dispatchEditorEvent(contentArea);
      }
      
      // 13. 선택 영역 초기화
      clearSelection();
      
      // 14. 성공 로그
      errorHandler.logInfo('MediaPlugin', `${platformInfo.platform} 동영상 삽입 완료: ${platformInfo.id}`);
      
    } catch (error) {
      errorHandler.logError('MediaPlugin', errorHandler.codes.PLUGINS.MEDIA.INSERT, error);
      errorHandler.showUserAlert('P901');
    }
  }

  /**
   * ✅ YouTube 동영상 삽입 (하위 호환성 유지)
   * @param {string} url - YouTube URL
   * @param {HTMLElement} contentArea - 에디터 콘텐츠 영역
   */
  function insertYouTubeVideo(url, contentArea) {
    // 새로운 통합 함수로 리다이렉트
    insertVideo(url, contentArea);
  }

  // ✅ 개선안: 드롭다운 DOM 재사용 및 cleanup 관리
  let cachedDropdownElements = null;

  function createDropdownElements() {
    if (cachedDropdownElements) {
      return cachedDropdownElements;
    }

    // 드롭다운 메뉴 생성
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
    
    // 헤더 생성
    const header = util.dom.createElement('div', {
      className: 'lite-editor-media-header'
    }, {
      padding: '4px 8px',
      margin: '0',
      height: '32px',
      borderTopLeftRadius: '4px',
      borderTopRightRadius: '4px',
      borderBottom: '1px solid #e0e0e0',
      backgroundColor: '#f8f9fa',
      width: '100%',
      boxSizing: 'border-box'
    });
    
    const title = util.dom.createElement('span', {
      className: 'lite-editor-media-title',
      textContent: 'Enter video URL (YouTube, Vimeo, etc.)'
    }, {
      fontSize: '13px',
      fontWeight: '500',
      color: '#333',
      lineHeight: '1.2'
    });
    
    header.appendChild(title);
    dropdownMenu.appendChild(header);
    
    // 입력 그룹 생성
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
      placeholder: 'https://www.youtube.com/watch?v=... or other video URL'
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
    
    // OK 버튼
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

    // ✅ 캐시에 저장
    cachedDropdownElements = {
      dropdownMenu,
      urlInput,
      submitButton
    };

    // ✅ 드롭다운에 이벤트 리스너 추가
    urlInput.addEventListener('paste', (e) => {
      e.preventDefault();
      e.stopPropagation();
      // 텍스트만 처리하는 로직
    });

    return cachedDropdownElements;
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
      
      // ✅ 개선: 드롭다운 요소 재사용
      const { dropdownMenu, urlInput, submitButton } = createDropdownElements();
      
      // ✅ 드롭다운을 document.body에 추가 (한 번만)
      if (!dropdownMenu.parentNode) {
        document.body.appendChild(dropdownMenu);
      }
      
      // ✅ 처리 함수 정의 (통합 보안 시스템 활용)
      const processVideoUrl = (url) => {
        url = url.trim();
        
        if (!url) {
          errorHandler.showUserAlert('P903');
          return;
        }
        
        if (!isValidVideoUrl(url)) {
          errorHandler.showUserAlert('P903');
          return;
        }
        
        // 드롭다운 닫기
        dropdownMenu.classList.remove('show');
        dropdownMenu.style.display = 'none';
        mediaButton.classList.remove('active');
        isDropdownOpen = false;
        
        util.activeModalManager.unregister(dropdownMenu);
        
        // 동영상 삽입 (동기)
        insertVideo(url, contentArea);
      };
      
      // ✅ 이벤트 설정 (기존 이벤트 제거 후 재등록)
      const clickHandler = () => processVideoUrl(urlInput.value);
      const keydownHandler = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          processVideoUrl(urlInput.value);
        }
      };

      // 기존 이벤트 리스너 제거
      submitButton.removeEventListener('click', clickHandler);
      urlInput.removeEventListener('keydown', keydownHandler);
      
      // 새 이벤트 리스너 등록
      submitButton.addEventListener('click', clickHandler);
      urlInput.addEventListener('keydown', keydownHandler);
      
      // ✅ cleanup 함수 등록
      const dropdownCleanup = () => {
        submitButton.removeEventListener('click', clickHandler);
        urlInput.removeEventListener('keydown', keydownHandler);
      };
      dropdownCleanupMap.set(mediaButton, dropdownCleanup);
      
      // 9. 버튼 클릭 이벤트
      const buttonClickHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // ✅ 스크롤 위치 저장 (즉시)
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;
        
        // 선택 영역 저장
        saveSelection();
        
        // 현재 드롭다운의 상태 확인
        const isVisible = dropdownMenu.classList.contains('show');
        
        // 다른 모든 드롭다운 닫기
        if (!isVisible) {
            util.activeModalManager.closeAll();
        }
        
        if (isVisible) {
            // 닫기
            dropdownMenu.classList.remove('show');
            dropdownMenu.style.display = 'none';
            mediaButton.classList.remove('active');
            isDropdownOpen = false;
            
            util.activeModalManager.unregister(dropdownMenu);
        } else {
            // 열기
            dropdownMenu.classList.add('show');
            dropdownMenu.style.display = 'flex';
            mediaButton.classList.add('active');
            isDropdownOpen = true;
            
            // 위치 설정
            const buttonRect = mediaButton.getBoundingClientRect();
            dropdownMenu.style.top = (buttonRect.bottom + window.scrollY) + 'px';
            dropdownMenu.style.left = buttonRect.left + 'px';
            
            // 입력창 초기화
            urlInput.value = '';
            
            // ✅ preventScroll로 포커스 설정 + 스크롤 즉시 복원
            setTimeout(() => {
                try {
                    urlInput.focus({ preventScroll: true });
                } catch (e) {
                    urlInput.focus();
                }
                // ✅ 즉시 스크롤 복원
                window.scrollTo(scrollX, scrollY);
            }, 10);
            
            // 활성 모달 등록
            dropdownMenu.closeCallback = () => {
                dropdownMenu.classList.remove('show');
                dropdownMenu.style.display = 'none';
                mediaButton.classList.remove('active');
                isDropdownOpen = false;
            };
            
            util.activeModalManager.register(dropdownMenu);
            
            // 외부 클릭 시 닫기 설정
            util.setupOutsideClickHandler(dropdownMenu, () => {
                dropdownMenu.classList.remove('show');
                dropdownMenu.style.display = 'none';
                mediaButton.classList.remove('active');
                isDropdownOpen = false;
                util.activeModalManager.unregister(dropdownMenu);
            }, [mediaButton]);
        }
        
        // ✅ 즉시 스크롤 위치 복원 (지연 없음)
        window.scrollTo(scrollX, scrollY);
    };

    mediaButton.addEventListener('click', buttonClickHandler);
    
    return mediaButton;
  }
});

// ✅ 개선된 리사이즈 핸들 (타이머 메모리 관리 개선)
function setupVideoResizeHandle(wrapper, resizeHandle) {
  let isResizing = false;
  let startX, startY, startWidth, startHeight;
  let rafId = null;

  // ✅ 핵심 개선: handleResize 함수만 최적화
  const handleResize = (e) => {
    if (!isResizing) return;
    
    // ✅ 성능 개선: 직접 스타일 적용
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    
    const newWidth = Math.max(100, startWidth + deltaX);
    const newHeight = Math.max(60, startHeight + deltaY);
    
    // ✅ 핵심 변경: 복잡한 cssText 정규식 → 직접 프로퍼티 설정
    wrapper.style.width = newWidth + 'px';
    wrapper.style.height = newHeight + 'px';
  };

  // ✅ stopResize 함수 (타이머 메모리 관리 개선)
  const stopResize = () => {
    if (!isResizing) return;
    
    // ✅ 상태 초기화
    isResizing = false;
    wrapper.removeAttribute('data-resizing');
    
    // ✅ RAF 정리 코드 유지
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    
    // ✅ 이벤트 리스너 제거
    document.removeEventListener('mousemove', handleResize, { passive: true });
    document.removeEventListener('mouseup', stopResize);
    
    // ✅ 개선: WeakMap 기반 타이머 관리
    const existingTimeout = resizeTimeoutMap.get(wrapper);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    const timeoutId = setTimeout(() => {
      const contentArea = document.querySelector('.lite-editor-content');
      if (contentArea && util.editor?.dispatchEditorEvent) {
        util.editor.dispatchEditorEvent(contentArea);
      }
      resizeTimeoutMap.delete(wrapper);
    }, 100);
    
    resizeTimeoutMap.set(wrapper, timeoutId);
  };

  // ✅ startResize 함수 (기존 로직 100% 유지)
  const startResize = (e) => {
    if (isResizing) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    isResizing = true;
    wrapper.setAttribute('data-resizing', 'true');
    
    startX = e.clientX;
    startY = e.clientY;
    
    const rect = wrapper.getBoundingClientRect();
    startWidth = rect.width;
    startHeight = rect.height;
    
    document.addEventListener('mousemove', handleResize, { passive: true });
    document.addEventListener('mouseup', stopResize);
  };

  // ✅ mousedown 이벤트 등록
  resizeHandle.addEventListener('mousedown', startResize);

  // ✅ cleanup 함수 정의 (타이머 정리 추가)
  const cleanup = () => {
    // RAF 정리
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    
    // ✅ 타이머 정리
    const existingTimeout = resizeTimeoutMap.get(wrapper);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      resizeTimeoutMap.delete(wrapper);
    }
    
    // 이벤트 리스너 제거
    resizeHandle.removeEventListener('mousedown', startResize);
    document.removeEventListener('mousemove', handleResize, { passive: true });
    document.removeEventListener('mouseup', stopResize);
    
    // 상태 초기화
    isResizing = false;
    wrapper.removeAttribute('data-resizing');
  };
  
  // ✅ WeakMap에 cleanup 함수 저장
  resizeCleanupMap.set(wrapper, cleanup);

  // ✅ 래퍼가 DOM에서 제거될 때 자동 정리
  if ('MutationObserver' in window) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.removedNodes.forEach((node) => {
          if (node === wrapper || (node.contains && node.contains(wrapper))) {
            cleanup();
            observer.disconnect();
            resizeCleanupMap.delete(wrapper);
          }
        });
      });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    videoObservers.set(wrapper, observer);
  }
}

// ✅ 전역 cleanup 함수 개선 (타이머 정리 추가)
function cleanup() {
  // ✅ 모든 리사이즈 타이머 정리
  resizeTimeoutMap.forEach((timeoutId, wrapper) => {
    clearTimeout(timeoutId);
  });
  resizeTimeoutMap.clear();

  // ✅ 드롭다운 이벤트 리스너 정리
  dropdownCleanupMap.forEach((cleanup, button) => {
    cleanup();
  });
  dropdownCleanupMap.clear();
  
  // 모든 Observer 정리
  videoObservers.forEach((observer, wrapper) => {
    observer.disconnect();
  });
  videoObservers.clear();
  
  // 모든 리사이즈 핸들 정리
  resizeCleanupMap.forEach((cleanup, wrapper) => {
    cleanup();
  });
  resizeCleanupMap.clear();
  
  // ✅ 캐시된 드롭다운 정리
  if (cachedDropdownElements) {
    const { dropdownMenu } = cachedDropdownElements;
    if (dropdownMenu.parentNode) {
      dropdownMenu.parentNode.removeChild(dropdownMenu);
    }
    cachedDropdownElements = null;
  }
  
  // 전역 변수 초기화
  savedRange = null;
  isDropdownOpen = false;
}

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', cleanup);
})();