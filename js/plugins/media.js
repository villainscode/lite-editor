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
    savedRange = util.selection.saveSelection();
  }
  
  /**
   * 저장된 선택 영역 복원
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
    // 기존 모달 닫기
    closeMediaModal();
    
    // 다른 활성화된 모달 모두 닫기
    util.activeModalManager.closeAll();
    
    // 모달 생성
    activeModal = document.createElement('div');
    activeModal.className = 'lite-editor-media-popup';
    activeModal.innerHTML = `
      <div class="lite-editor-media-header">
        <span class="lite-editor-media-title">Enter the video URL to insert</span>
      </div>
      <div class="lite-editor-media-input-group">
        <input type="text" class="lite-editor-media-input" placeholder="https://www.youtube.com/watch?v=...">
        <button type="submit" class="lite-editor-media-insert" title="Insert">
          <span class="material-icons">add_circle</span>
        </button>
      </div>
    `;
    
    // 현재 스크롤 위치 저장 (추가 코드)
    const currentScrollY = window.scrollY;
    
    // 모달 위치 설정 및 등록
    document.body.appendChild(activeModal);
    util.layer.setLayerPosition(activeModal, buttonElement);
    
    // 스크롤 위치 복원 (추가 코드)
    window.scrollTo(window.scrollX, currentScrollY);
    
    activeModal.closeCallback = closeMediaModal;
    util.activeModalManager.register(activeModal);
    
    // 이벤트 설정
    // 요소 참조 가져오기 (querySelector 사용)
    const urlInput = activeModal.querySelector('.lite-editor-media-input');
    const insertButton = activeModal.querySelector('.lite-editor-media-insert');
    
    // URL 처리 함수 정의
    const processVideoUrl = (url) => {
      if (!isValidYouTubeUrl(url)) {
        if (typeof LiteEditorModal !== 'undefined') {
          LiteEditorModal.alert('Please enter a valid URL.<BR>Example: https://www.youtube.com/watch?v=...');
        } else {
          alert('Please enter a valid URL.<BR>Example: https://www.youtube.com/watch?v=...');
        }
        return;
      }
      
      setTimeout(() => insertYouTubeVideo(url, contentArea), 0);
    };
    
    // 삽입 버튼 클릭 이벤트
    insertButton.addEventListener('click', () => processVideoUrl(urlInput.value.trim()));
    
    // 엔터키 이벤트
    urlInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        processVideoUrl(urlInput.value.trim());
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
          if (!e.target.closest('.lite-editor-media-popup')) {
            clearSelection();
            closeMediaModal();
          }
        }
      }, { capture: true });
      documentClickListenerAdded = true;
    }
    
    // 클릭 이벤트가 모달 내부에서 발생하는 경우 버블링 방지
    activeModal.addEventListener('click', function(e) {
      e.stopPropagation();
    });
    
    // 모달 정리 함수 설정 - link.js와 동일한 방식으로 간소화
    if (util.modal && util.modal.setupModalCloseEvents) {
      modalCleanupFn = util.modal.setupModalCloseEvents(activeModal, () => {
        clearSelection();
        closeMediaModal();
      });
    } else {
      // 대체 정리 함수 (효율성을 위해 이벤트 리스너 제거 생략)
      modalCleanupFn = function() {
        // 이벤트 리스너는 모달이 제거될 때 자동으로 정리됨
      };
    }
    
    // 포커스 설정 - 즉시 시도
    urlInput.focus();
    
    // 지연 후 포커스 시도 (link.js와 동일한 방식)
    setTimeout(() => {
      if (document.activeElement) {
        document.activeElement.blur();
      }
      urlInput.focus();
      urlInput.select();
    }, 50);
    
    return activeModal;
  }
  
  /**
   * 활성화된 모달을 닫고 정리
   */
  function closeMediaModal() {
    // 이미 닫는 중이면 중복 실행 방지
    if (isClosingModal) return;
    
    isClosingModal = true;
    
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
      // 현재 스크롤 위치 저장
      const currentScrollY = window.scrollY;
      
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
        
        // 포커스는 이미 selection 조작으로 처리됨
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
      setTimeout(() => {
        window.scrollTo(window.scrollX, currentScrollY);
      }, 0);
      
    } catch (error) {
      console.error('동영상 삽입 중 오류 발생:', error);
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
    
    // 모달 닫기 진행 중이면 무시
    if (isClosingModal) {
      return;
    }
    
    // 모달이 열려있는 경우 닫기 (토글 동작)
    if (activeModal && activeModal.parentNode) {
      closeMediaModal();
      return;
    }
    
    // 현재 선택 영역 저장 (추가 코드)
    saveSelection();
    
    // 모달이 닫혀있는 경우 열기 (토글 동작)
    showMediaModal(buttonElement, contentArea);
    
    // 이벤트 전파 중지를 위한 추가 코드
    return false;
  }
  
  /**
   * 플러그인 등록
   */
  if (typeof LiteEditor !== 'undefined') {
    LiteEditor.registerPlugin(PLUGIN_ID, {
      icon: 'live_tv',
      title: 'Insert Media',
      customRender: function(toolbar, contentArea) {
        // 버튼 생성
        const button = util.dom.createElement('button', {
          className: 'lite-editor-button lite-editor-media-button',
          title: 'Insert Media'
        });
        
        // 아이콘 추가
        const icon = util.dom.createElement('i', {
          className: 'material-icons',
          textContent: 'live_tv'
        });
        
        button.appendChild(icon);
        
        // 버튼을 활성 모달 관리자에 등록
        util.activeModalManager.registerButton(button);
        
        // 클릭 이벤트 추가
        button.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          
          // 모달 닫기 진행 중이면 무시
          if (isClosingModal) {
            return;
          }
          
          // 모달이 열려있는 경우 닫기 (토글 동작)
          if (activeModal && activeModal.parentNode) {
            closeMediaModal();
            return;
          }
          
          // 선택 영역 저장
          saveSelection();
          
          // 모달 표시
          showMediaModal(button, contentArea);
        });
        
        // 버튼을 툴바에 추가
        toolbar.appendChild(button);
        
        return button;
      }
    });
  }
})();