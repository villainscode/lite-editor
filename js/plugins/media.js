/**
 * LiteEditor Media Plugin
 * 동영상 삽입 관련 플러그인
 */

(function() {
  // 상수 정의
  const PLUGIN_ID = 'media';
  const MODULE_NAME = 'MEDIA'; // 디버깅 로그용 모듈명
  const CSS_PATH = 'css/plugins/media.css';
  
  // PluginUtil 참조
  const util = window.PluginUtil;
  
  // 전역 상태 변수
  let savedRange = null;          // 임시로 저장된 선택 영역
  let activeModal = null;         // 현재 활성화된 동영상 입력 모달
  let modalCleanupFn = null;      // 모달 이벤트 정리 함수
  let documentClickListenerAdded = false; // 문서 레벨 클릭 이벤트 리스너 추가 여부 플래그
  let isClosingModal = false;     // 모달 닫기 진행 중 플래그

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
    if (window.liteEditorSelection) {
      savedRange = window.liteEditorSelection.save();
    }
  }
  
  /**
   * 저장된 선택 영역 복원
   */
  function restoreSelection() {
    if (window.liteEditorSelection && savedRange) {
      window.liteEditorSelection.restore(savedRange);
    }
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
   * 동영상 삽입 모달을 생성하고 표시
   * @param {HTMLElement} buttonElement - 동영상 버튼 요소
   * @param {HTMLElement} contentArea - 에디터 콘텐츠 영역
   */
  function showMediaModal(buttonElement, contentArea) {
    DebugUtils.debugLog(MODULE_NAME, 'SHOWING MODAL', { 
      buttonElement: !!buttonElement,
      contentArea: !!contentArea,
      activeModalBefore: !!activeModal
    }, '#e91e63');
    
    // 선택 영역 저장
    saveSelection();
    
    // 기존 모달 닫기
    closeMediaModal();
    
    // 다른 활성화된 모달 모두 닫기
    util.activeModalManager.closeAll();
    
    // 모달 생성 - PluginUtil 활용
    activeModal = util.dom.createElement('div', {
      className: 'lite-editor-media-popup'
    });
    
    // 모달 내용 구성
    const modalContent = `
      <div class="lite-editor-media-header">
        <span class="lite-editor-media-title">Enter the video URL to insert</span>
      </div>
      <div class="lite-editor-media-input-group">
        <input type="text" placeholder="https://www.youtube.com/watch?v=..." class="lite-editor-media-input">
        <button type="submit" class="lite-editor-media-insert" title="Insert">
          <span class="material-icons">add_circle</span>
        </button>
      </div>
    `;
    
    activeModal.innerHTML = modalContent;
    
    // 모달 위치 설정 및 등록
    document.body.appendChild(activeModal);
    util.layer.setLayerPosition(activeModal, buttonElement);
    
    activeModal.closeCallback = closeMediaModal;
    util.activeModalManager.register(activeModal);
    
    // 이벤트 설정
    const urlInput = activeModal.querySelector('input');
    const insertButton = activeModal.querySelector('button');
    
    // 삽입 버튼 클릭 이벤트
    insertButton.addEventListener('click', function() {
      insertYouTubeVideo(urlInput.value, contentArea);
    });
    
    // 엔터키 이벤트
    urlInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        insertYouTubeVideo(urlInput.value, contentArea);
      }
    });
    
    // ESC 키 이벤트
    urlInput.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeMediaModal();
      }
    });
    
    // 문서 레벨 클릭 이벤트 (모달 외부 클릭 시 닫기)
    if (!documentClickListenerAdded) {
      document.addEventListener('click', function(e) {
        if (activeModal && !activeModal.contains(e.target) && e.target !== buttonElement) {
          // 버튼 자체가 아니고 모달 외부 클릭 시 닫기
          if (!e.target.closest('.lite-editor-media-popup')) {
            closeMediaModal();
          }
        }
      }, { capture: true });
      documentClickListenerAdded = true;
      DebugUtils.debugLog(MODULE_NAME, 'DOCUMENT CLICK LISTENER ADDED', null, '#e91e63');
    }
    
    // 클릭 이벤트가 모달 내부에서 발생하는 경우 버블링 방지
    activeModal.addEventListener('click', function(e) {
      e.stopPropagation();
    });
    
    // 모달 정리 함수 설정
    modalCleanupFn = function() {
      if (insertButton) {
        insertButton.removeEventListener('click', function() {
          insertYouTubeVideo(urlInput.value, contentArea);
        });
      }
      
      if (urlInput) {
        urlInput.removeEventListener('keypress', function(e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            insertYouTubeVideo(urlInput.value, contentArea);
          }
        });
        
        urlInput.removeEventListener('keydown', function(e) {
          if (e.key === 'Escape') {
            e.preventDefault();
            closeMediaModal();
          }
        });
      }
    };
    
    setTimeout(() => urlInput.focus({ preventScroll: true }), 0);
    
    DebugUtils.debugLog(MODULE_NAME, 'MODAL SHOWN', { activeModal: !!activeModal }, '#e91e63');
    
    return activeModal;
  }
  
  /**
   * 활성화된 모달을 닫고 정리
   */
  function closeMediaModal() {
    // 이미 닫는 중이면 중복 실행 방지
    if (isClosingModal) return;
    
    isClosingModal = true;
    
    DebugUtils.debugLog(MODULE_NAME, 'CLOSING MODAL', { 
      activeModal: !!activeModal,
      hasParent: activeModal && !!activeModal.parentNode,
      modalCleanupFn: !!modalCleanupFn
    }, '#e91e63');
    
    // 모달 이벤트 정리
    if (modalCleanupFn) {
      modalCleanupFn();
      modalCleanupFn = null;
    }
    
    if (activeModal && activeModal.parentNode) {
      // 활성 모달에서 제거
      util.activeModalManager.unregister(activeModal);
      
      activeModal.parentNode.removeChild(activeModal);
      activeModal = null;
      
      DebugUtils.debugLog(MODULE_NAME, 'MODAL CLOSED', { activeModal: null }, '#e91e63');
    }
    
    // 플래그 초기화 (약간의 지연 후)
    setTimeout(() => {
      isClosingModal = false;
    }, 100);
  }
  
  /**
   * YouTube 동영상 삽입
   * @param {string} url - YouTube URL
   * @param {HTMLElement} contentArea - 에디터 콘텐츠 영역
   */
  function insertYouTubeVideo(url, contentArea) {
    try {
      // URL 유효성 검사
      if (!isValidYouTubeUrl(url)) {
        alert('유효한 YouTube URL을 입력해주세요.');
        return;
      }
      
      // YouTube ID 추출
      const videoId = parseYouTubeID(url);
      
      // 모달 닫기
      closeMediaModal();
      
      // 선택 영역 복원
      restoreSelection();
      
      DebugUtils.debugLog(MODULE_NAME, 'VIDEO INSERTION START', { videoId, contentArea: !!contentArea }, '#e91e63');
      
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
      const wrapper = document.createElement('div');
      wrapper.className = 'video-wrapper';
      wrapper.style.width = '480px';
      wrapper.style.height = '270px';
      wrapper.style.margin = '10px auto';
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
        
        // 포커스 유지
        contentArea.focus();
      } else {
        // 선택 영역이 없는 경우 에디터 끝에 삽입
        contentArea.appendChild(wrapper);
      }
      
      DebugUtils.debugLog(MODULE_NAME, 'VIDEO INSERTED', { videoId, wrapper: !!wrapper }, '#e91e63');
    } catch (error) {
      console.error('동영상 삽입 중 오류 발생:', error);
      DebugUtils.debugLog(MODULE_NAME, 'VIDEO INSERTION ERROR', { error: error.message }, '#e91e63');
    }
  }
  
  /**
   * 동영상 삽입 기능
   * @param {HTMLElement} contentArea - 에디터 콘텐츠 영역
   * @param {HTMLElement} buttonElement - 버튼 요소
   * @param {Event} event - 클릭 이벤트 객체
   */
  function insertMedia(contentArea, buttonElement, event) {
    // 이벤트 전파 중지 (중요: 다른 핸들러 호출 방지)
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    DebugUtils.debugLog(MODULE_NAME, '미디어 버튼 클릭', { 
      activeModal: !!activeModal, 
      buttonElement: !!buttonElement,
      isClosingModal: isClosingModal
    }, '#e91e63');
    
    // 모달 닫기 진행 중이면 무시
    if (isClosingModal) {
      DebugUtils.debugLog(MODULE_NAME, '모달 닫기 진행 중 - 무시', null, '#e91e63');
      return;
    }
    
    // 모달이 열려있는 경우 닫기 (토글 동작)
    if (activeModal && activeModal.parentNode) {
      DebugUtils.debugLog(MODULE_NAME, '모달 닫기 (토글 동작)', null, '#e91e63');
      closeMediaModal();
      return;
    }
    
    // 모달이 닫혀있는 경우 열기 (토글 동작)
    DebugUtils.debugLog(MODULE_NAME, '모달 열기 (토글 동작)', null, '#e91e63');
    showMediaModal(buttonElement, contentArea);
  }
  
  /**
   * 플러그인 등록
   */
  if (typeof LiteEditor !== 'undefined') {
    LiteEditor.registerPlugin(PLUGIN_ID, {
      icon: 'live_tv',
      title: 'Insert Media',
      action: insertMedia
    });
  }
})();