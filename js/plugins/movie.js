/**
 * LiteEditor Media Plugin
 * 동영상 삽입 관련 플러그인
 */

(function() {
  // 상수 정의
  const PLUGIN_ID = 'media';
  const MODULE_NAME = 'MEDIA'; // 디버깅 로그용 모듈명
  const STYLE_ID = 'mediaStyles';
  
  // PluginUtil 참조
  const util = window.PluginUtil;
  
  // 전역 상태 변수
  let savedRange = null;          // 임시로 저장된 선택 영역
  let activeModal = null;         // 현재 활성화된 동영상 입력 모달
  let modalCleanupFn = null;      // 모달 이벤트 정리 함수

  // 스타일 요소 생성 및 추가
  util.styles.addInlineStyle(STYLE_ID, `
    .lite-editor-media-popup {
      position: absolute;
      z-index: 1000;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-width: 300px;
    }
    .lite-editor-media-input {
      padding: 6px 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      width: 100%;
    }
    .lite-editor-media-buttons {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .lite-editor-media-button {
      padding: 4px 12px;
      background: #2196F3;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }
    .lite-editor-media-button:hover {
      background: #1976D2;
    }
    .lite-editor-media-button.cancel {
      background: #f5f5f5;
      color: #333;
    }
    .lite-editor-media-button.cancel:hover {
      background: #e0e0e0;
    }
    .video-wrapper {
      position: relative;
      width: 100%;
      max-width: 480px;
      margin: 10px 0;
    }
    .video-wrapper iframe {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border: none;
    }
    .video-wrapper::before {
      content: "";
      display: block;
      padding-top: 56.25%; /* 16:9 비율 */
    }
  `);

  /**
   * 디버깅 로그 출력
   */
  function debugLog(action, data) {
    console.log(
      `%c[MEDIA MODAL] ${action}`,
      'color:#e91e63;font-weight:bold;',
      data
    );
  }

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
   * 현재 선택 영역을 저장
   */
  function saveSelection() {
    savedRange = util.selection.saveSelection();
  }
  
  /**
   * 저장된 선택 영역을 복원
   */
  function restoreSelection() {
    if (savedRange) {
      util.selection.restoreSelection(savedRange);
      return true;
    }
    return false;
  }
  
  /**
   * 선택 영역 초기화
   */
  function clearSelection() {
    savedRange = null;
  }

  /**
   * 동영상 삽입 모달을 생성하고 표시
   * @param {HTMLElement} buttonElement - 동영상 버튼 요소
   * @param {HTMLElement} contentArea - 에디터 콘텐츠 영역
   */
  function showMediaModal(buttonElement, contentArea) {
    debugLog('SHOWING MODAL', { 
      buttonElement: !!buttonElement,
      contentArea: !!contentArea,
      activeModalBefore: !!activeModal
    });
    
    // 선택 영역 저장
    saveSelection();
    
    // 기존 모달 닫기
    closeMediaModal();
    
    // 다른 활성화된 모달 모두 닫기
    util.activeModalManager.closeAll();
    
    // 모달 생성
    activeModal = document.createElement('div');
    activeModal.className = 'lite-editor-media-popup';
    activeModal.innerHTML = `
      <div style="margin-bottom: 8px;">YouTube 동영상 URL을 입력하세요</div>
      <input type="text" placeholder="https://www.youtube.com/watch?v=..." class="lite-editor-media-input">
      <div class="lite-editor-media-buttons">
        <button class="lite-editor-media-button cancel">Cancel</button>
        <button class="lite-editor-media-button insert">OK</button>
      </div>
    `;
    
    // 모달 위치 설정 및 등록
    document.body.appendChild(activeModal);
    util.layer.setLayerPosition(activeModal, buttonElement);
    
    activeModal.closeCallback = closeMediaModal;
    util.activeModalManager.register(activeModal);
    
    // 이벤트 설정
    const urlInput = activeModal.querySelector('input');
    const insertButton = activeModal.querySelector('.insert');
    const cancelButton = activeModal.querySelector('.cancel');
    
    const processUrl = (url) => {
      if (!isValidYouTubeUrl(url)) {
        if (typeof LiteEditorModal !== 'undefined') {
          LiteEditorModal.alert('올바른 YouTube URL을 입력해주세요.<BR>예: https://www.youtube.com/watch?v=82UUYNEu2iM');
        } else {
          alert('올바른 YouTube URL을 입력해주세요.\n예: https://www.youtube.com/watch?v=82UUYNEu2iM');
        }
        return;
      }
      
      contentArea.focus();
      setTimeout(() => insertYouTubeVideo(url, contentArea), 0);
    };
    
    insertButton.addEventListener('click', () => processUrl(urlInput.value.trim()));
    cancelButton.addEventListener('click', () => closeMediaModal());
    
    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        processUrl(urlInput.value.trim());
      }
    });

    activeModal.addEventListener('click', e => e.stopPropagation());
    
    modalCleanupFn = util.modal.setupModalCloseEvents(activeModal, () => {
      clearSelection();
      closeMediaModal();
    });
    
    setTimeout(() => urlInput.focus({ preventScroll: true }), 0);
    
    debugLog('MODAL SHOWN', { activeModal: !!activeModal });
    
    return activeModal;
  }
  
  /**
   * 활성화된 모달을 닫고 정리
   */
  function closeMediaModal() {
    debugLog('CLOSING MODAL', { 
      activeModal: !!activeModal,
      hasParent: activeModal && !!activeModal.parentNode,
      modalCleanupFn: !!modalCleanupFn
    });
    
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
      
      debugLog('MODAL CLOSED', { activeModal: null });
    }
  }
  
  /**
   * YouTube 동영상 삽입
   * @param {string} url - YouTube URL
   * @param {HTMLElement} contentArea - 에디터 콘텐츠 영역
   */
  function insertYouTubeVideo(url, contentArea) {
    url = url.trim();
    if (!url) return;
    
    const videoId = parseYouTubeID(url);
    if (!videoId) return;
    
    try {
      // 모달 닫기
      closeMediaModal();
      
      // 선택 영역 복원
      restoreSelection();
      
      debugLog('VIDEO INSERTION START', { videoId, contentArea: !!contentArea });
      
      // iframe 생성
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube.com/embed/${videoId}`;
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.allowFullscreen = true;
      
      // 래퍼 생성 및 기본 크기 설정
      const wrapper = document.createElement('div');
      wrapper.className = 'video-wrapper';
      wrapper.style.width = '480px';
      wrapper.style.height = '270px';
      wrapper.appendChild(iframe);
      
      // 에디터에 삽입
      // 커서 위치에 삽입하기 위해 Range API 사용
      const sel = window.getSelection();
      let range;
      
      if (sel.rangeCount > 0) {
        range = sel.getRangeAt(0);
      } else {
        range = document.createRange();
        range.selectNodeContents(contentArea);
        range.collapse(false);
      }
      
      // 동영상 삽입
      range.insertNode(wrapper);
      
      // 삽입 후 커서 이동
      range.setStartAfter(wrapper);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      
      // 줄바꿈 추가
      const br = document.createElement('br');
      range.insertNode(br);
      range.setStartAfter(br);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      
      debugLog('VIDEO INSERTED', { videoId, wrapper: !!wrapper });
    } catch (error) {
      console.error('동영상 삽입 중 오류 발생:', error);
      debugLog('VIDEO INSERTION ERROR', { error: error.message });
    }
  }
  
  /**
   * 동영상 삽입 기능
   * @param {HTMLElement} contentArea - 에디터 콘텐츠 영역
   * @param {HTMLElement} buttonElement - 버튼 요소
   */
  function insertMedia(contentArea, buttonElement) {
    showMediaModal(buttonElement, contentArea);
  }
  
  /**
   * 플러그인 등록
   */
  if (typeof LiteEditor !== 'undefined') {
    LiteEditor.registerPlugin(PLUGIN_ID, {
      icon: 'live_tv',
      title: 'Insert Movie',
      action: insertMedia
    });
  }
})();