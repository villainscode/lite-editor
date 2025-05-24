/**
 * LiteEditor Code Block Plugin
 * Speed Highlight 기반 코드 하이라이팅 기능
 * 통합 레이어 관리 방식으로 변경
 */

(function() {
  // 플러그인 상수 정의
  const PLUGIN_ID = 'codeBlock';
  const STYLE_ID = 'codeBlockStyles';
  const CSS_PATH = 'css/plugins/codeBlock.css';
  
  // CDN 주소
  const CDN_SCRIPT = 'https://unpkg.com/@speed-highlight/core/dist/index.js';
  const CDN_STYLE = 'https://unpkg.com/@speed-highlight/core/dist/themes/default.css';
  const CDN_DETECT = '/js/plugins/customDetect.js';  // 루트에서부터의 경로
  
  // 지원 언어 목록
  const LANGUAGES = [
    { value: "auto", label: "Auto Detect" },
    { value: "bash", label: "Bash" },
    { value: "c", label: "C" },
    { value: "css", label: "CSS" },
    { value: "docker", label: "Docker" },
    { value: "go", label: "Go" },
    { value: "html", label: "HTML" },
    { value: "http", label: "HTTP" },
    { value: "java", label: "Java" },
    { value: "js", label: "JavaScript" },
    { value: "json", label: "JSON" },
    { value: "md", label: "Markdown" },
    { value: "plain", label: "Plain Text" },
    { value: "py", label: "Python" },
    { value: "rs", label: "Rust" },
    { value: "sql", label: "SQL" },
    { value: "ts", label: "TypeScript" },
    { value: "xml", label: "XML" },
    { value: "yaml", label: "YAML" }
  ];
  
  // PluginUtil 참조 및 검증
  const util = window.PluginUtil || {};
  if (!util.selection) {
    console.error('CodeBlockPlugin: PluginUtil.selection이 필요합니다.');
  }
  
  // 전역 상태 변수
  let activeLayer = null;
  let savedRange = null;
  let codeBlockButton = null;
  
  /**
   * SpeedHighlight 스타일 로드
   */
  function loadSpeedHighlightStyle() {
    if (document.getElementById('speed-highlight-css')) return;
    
    const link = document.createElement('link');
    link.id = 'speed-highlight-css';
    link.rel = 'stylesheet';
    link.href = CDN_STYLE;
    document.head.appendChild(link);
  }
  
  /**
   * SpeedHighlight 스크립트 로드
   */
  async function loadScripts() {
    if (window.SpeedHighlight) return window.SpeedHighlight;
    
    try {
      // 모듈 로드 및 전역으로 저장
      const { highlightElement } = await import(CDN_SCRIPT);
      const { detectLanguage } = await import(CDN_DETECT);
      
      window.SpeedHighlight = { 
        highlightElement, 
        detectLanguage 
      };
      
      return window.SpeedHighlight;
    } catch (error) {
      errorHandler.logError('CodeBlockPlugin', errorHandler.codes.PLUGINS.CODE.LOAD, error);
      return null;
    }
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
   * 레이어 닫기
   */
  function closeCodeBlockLayer() {
    if (!activeLayer) return;
    
    // 버튼 상태 업데이트
    if (codeBlockButton) {
      codeBlockButton.classList.remove('active');
    }
    
    // 활성 모달에서 제거
    if (util.activeModalManager) {
      util.activeModalManager.unregister(activeLayer);
    }
    
    // 레이어 제거
    if (activeLayer.parentNode) {
      activeLayer.parentNode.removeChild(activeLayer);
    }
    
    activeLayer = null;
  }
  
  /**
   * 언어 드롭다운 생성
   */
  function createLanguageDropdown() {
    const dropdownContainer = document.createElement('div');
    dropdownContainer.className = 'lite-editor-code-dropdown';
    
    // 선택된 언어를 표시할 버튼
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'lite-editor-code-dropdown-button';
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-haspopup', 'true');
    
    // 선택된 텍스트 표시 영역
    const selectedText = document.createElement('span');
    selectedText.className = 'lite-editor-code-dropdown-text';
    selectedText.textContent = 'Auto Detect';
    
    // 화살표 아이콘
    const arrowIcon = document.createElement('span');
    arrowIcon.className = 'lite-editor-code-dropdown-icon material-icons';
    arrowIcon.textContent = 'arrow_drop_down';
    arrowIcon.style.fontSize = '16px';
    
    button.appendChild(selectedText);
    button.appendChild(arrowIcon);
    
    // 드롭다운 메뉴
    const dropdownMenu = document.createElement('div');
    dropdownMenu.className = 'lite-editor-code-dropdown-menu hidden';
    dropdownMenu.role = 'menu';
    dropdownMenu.setAttribute('aria-orientation', 'vertical');
    dropdownMenu.tabIndex = -1;
    
    // 메뉴 아이템 생성
    LANGUAGES.forEach(lang => {
      const item = document.createElement('div');
      item.className = 'lite-editor-code-dropdown-item';
      item.setAttribute('role', 'menuitem');
      item.tabIndex = -1;
      item.dataset.value = lang.value;
      item.textContent = lang.label;
      
      // 첫 번째 항목(Auto Detect)을 기본 선택으로 표시
      if (lang.value === 'auto') {
        item.classList.add('active');
      }
      
      // 클릭 이벤트 설정
      item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 선택 텍스트 업데이트
        selectedText.textContent = lang.label;
        
        // 활성 클래스 업데이트
        dropdownMenu.querySelectorAll('.lite-editor-code-dropdown-item').forEach(el => {
          el.classList.remove('active');
        });
        item.classList.add('active');
        
        // 드롭다운 닫기
        dropdownMenu.classList.add('hidden');
        button.setAttribute('aria-expanded', 'false');
      });
      
      dropdownMenu.appendChild(item);
    });
    
    // 토글 이벤트 추가
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // 드롭다운 토글
      const isHidden = dropdownMenu.classList.contains('hidden');
      
      if (isHidden) {
        dropdownMenu.classList.remove('hidden');
        button.setAttribute('aria-expanded', 'true');
      } else {
        dropdownMenu.classList.add('hidden');
        button.setAttribute('aria-expanded', 'false');
      }
    });
    
    dropdownContainer.appendChild(button);
    dropdownContainer.appendChild(dropdownMenu);
    
    return {
      container: dropdownContainer,
      button,
      menu: dropdownMenu,
      getValue: () => {
        const activeItem = dropdownMenu.querySelector('.lite-editor-code-dropdown-item.active');
        return activeItem ? activeItem.dataset.value : 'auto';
      }
    };
  }
  
  /**
   * HTML 특수 문자 이스케이프 처리
   */
  function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;")
         .replace(/`/g, "&#96;");
  }
  
  /**
   * 코드 블록 레이어 표시
   */
  function showCodeBlockLayer(buttonElement, contentArea, SpeedHighlight) {
    // 선택 영역 저장
    saveSelection();
    
    // 다른 활성화된 모달 모두 닫기
    if (util.activeModalManager) {
      util.activeModalManager.closeAll();
    }
    
    // 레이어 생성
    activeLayer = document.createElement('div');
    activeLayer.className = 'lite-editor-code-block-layer';
    activeLayer.innerHTML = `
      <div class="lite-editor-code-block-form">
        <textarea placeholder="Please insert your code here" class="lite-editor-code-input"></textarea>
        <div class="lite-editor-code-block-actions">
          <button class="lite-editor-code-insert-btn">
            <span class="material-icons" style="font-size: 18px; color: #5f6368;">add_circle</span>
          </button>
        </div>
      </div>
    `;
    
    // 스타일 설정
    activeLayer.style.position = 'absolute';
    activeLayer.style.zIndex = '9999';
    activeLayer.style.backgroundColor = '#fff';
    activeLayer.style.border = '1px solid #ccc';
    activeLayer.style.borderRadius = '4px';
    activeLayer.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    activeLayer.style.width = '400px';
    
    // 레이어를 DOM에 추가
    document.body.appendChild(activeLayer);
    
    // 드롭다운 추가
    const actionsDiv = activeLayer.querySelector('.lite-editor-code-block-actions');
    const languageDropdown = createLanguageDropdown();
    actionsDiv.insertBefore(languageDropdown.container, actionsDiv.firstChild);
    
    // 레이어 위치 설정
    const buttonRect = buttonElement.getBoundingClientRect();
    activeLayer.style.top = (buttonRect.bottom + window.scrollY) + 'px';
    activeLayer.style.left = buttonRect.left + 'px';
    
    // 버튼 상태 업데이트
    buttonElement.classList.add('active');
    
    // 활성 모달 등록
    activeLayer.closeCallback = closeCodeBlockLayer;
    util.activeModalManager.register(activeLayer);
    
    // 이벤트 설정
    const codeInput = activeLayer.querySelector('.lite-editor-code-input');
    const insertButton = activeLayer.querySelector('.lite-editor-code-insert-btn');
    
    // 코드 삽입 처리 함수
    const processCode = (code, language) => {
      console.log('🔧 processCode 호출됨:', { code: code?.substring(0, 50) + '...', language, codeLength: code?.length });
      
      if (!code.trim()) {
        console.log('⚠️ 코드가 비어있음 - 알림 표시');
        errorHandler.showUserAlert('P405');
        return;
      }
      
      try {
        contentArea.focus({ preventScroll: true });
      } catch (e) {
        contentArea.focus();
      }
      
      console.log('🚀 insertCodeBlock 호출 예정');
      setTimeout(() => {
        insertCodeBlock(code, language, contentArea, SpeedHighlight);
      }, 0);
    };
    
    // 버튼 클릭 이벤트
    insertButton.addEventListener('click', () => {
      const selectedLanguage = languageDropdown.getValue();
      const codeValue = codeInput.value;
      console.log('🖱️ 삽입 버튼 클릭됨:', { 
        language: selectedLanguage, 
        codeLength: codeValue?.length,
        codePreview: codeValue?.substring(0, 30) + '...'
      });
      processCode(codeValue, selectedLanguage);
    });
    
    // 레이어 내부 클릭 시 이벤트 전파 중단
    activeLayer.addEventListener('click', e => e.stopPropagation());
    
    // 외부 클릭 시 닫기 설정
    util.setupOutsideClickHandler(activeLayer, closeCodeBlockLayer, [buttonElement]);
    
    // 텍스트 영역에 포커스
    setTimeout(() => {
      try {
        codeInput.focus({ preventScroll: true });
      } catch (e) {
        codeInput.focus();
      }
    }, 0);
  }
  
  /**
   * 코드 블록 삽입
   */
  function insertCodeBlock(code, language, contentArea, SpeedHighlight) {
    console.log('📝 insertCodeBlock 함수 시작:', { 
      code: code?.substring(0, 50) + '...', 
      language, 
      contentArea: !!contentArea, 
      SpeedHighlight: !!SpeedHighlight 
    });
    
    if (!code.trim()) {
      console.log('⚠️ insertCodeBlock: 코드가 비어있음');
      return;
    }
    
    try {
      // 언어 결정
      let finalLanguage = language;
      if (!language) {
        finalLanguage = 'plain';
      } else if (language === 'auto') {
        finalLanguage = SpeedHighlight.detectLanguage(code) || 'plain';
      }
      
      try {
        contentArea.focus({ preventScroll: true });
      } catch (e) {
        contentArea.focus();
      }
      
      // 저장된 선택 영역 복원
      restoreSelection();
      
      // HTML 특수 문자 이스케이프 처리
      const escapedCode = escapeHtml(code);
      
      // 코드 블록 생성
      const codeBlockHTML = `
        <div class="lite-editor-code-block">
          <div class="shj-lang-${finalLanguage}">${escapedCode}</div>
        </div>
      `;
      
      // 에디터에 삽입
      document.execCommand('insertHTML', false, codeBlockHTML);
      
      // 방금 삽입된 코드 블록 찾고 하이라이팅 적용
      const codeBlocks = contentArea.querySelectorAll('.lite-editor-code-block .shj-lang-' + finalLanguage);
      const newBlock = codeBlocks[codeBlocks.length - 1];
      
      if (newBlock) {
        SpeedHighlight.highlightElement(newBlock, finalLanguage);
      }
      
      // 에디터 변경 이벤트 발생
      if (util.editor && util.editor.dispatchEditorEvent) {
        util.editor.dispatchEditorEvent(contentArea);
      } else {
        contentArea.dispatchEvent(new Event('input', { bubbles: true }));
      }
    } catch (error) {
      errorHandler.logError('CodeBlockPlugin', errorHandler.codes.PLUGINS.CODE.INSERT, error);
      // 디버깅: errorHandler 확인
      console.log('errorHandler 존재:', typeof errorHandler !== 'undefined');
      console.log('showUserAlert 함수:', typeof errorHandler?.showUserAlert);
      console.log('P404 메시지:', errorHandler?.messages?.P404);
      errorHandler.showUserAlert('P404');
    } finally {
      // 레이어 닫기 및 선택 영역 초기화
      clearSelection();
      closeCodeBlockLayer();
      
      // 스크롤 위치 복원
      util.scroll.restorePosition();
    }
  }
  
  // 플러그인 등록
  LiteEditor.registerPlugin(PLUGIN_ID, {
    title: 'Code Block',
    icon: 'code_blocks',
    customRender: function(toolbar, contentArea) {
      // CSS 파일 로드
      if (util.styles && util.styles.loadCssFile) {
        util.styles.loadCssFile(STYLE_ID, CSS_PATH);
      }
      
      // SpeedHighlight 스타일 로드
      loadSpeedHighlightStyle();
      
      // 버튼 생성
      const button = util.dom && util.dom.createElement 
        ? util.dom.createElement('button', {
            className: 'lite-editor-button lite-editor-code-block-button',
            title: 'Code Block'
          })
        : document.createElement('button');
      
      if (!util.dom || !util.dom.createElement) {
        button.className = 'lite-editor-button lite-editor-code-block-button';
        button.title = 'Code Block';
      }
      
      // 아이콘 추가
      const icon = util.dom && util.dom.createElement
        ? util.dom.createElement('i', {
            className: 'material-icons',
            textContent: 'data_object'
          })
        : document.createElement('i');
      
      if (!util.dom || !util.dom.createElement) {
        icon.className = 'material-icons';
        icon.textContent = 'data_object';
      }
      
      button.appendChild(icon);
      
      // 버튼 참조 저장
      codeBlockButton = button;
      
      // 클릭 이벤트
      button.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 스크롤 위치 저장
        const scrollPosition = util.scroll.savePosition();
        
        // 레이어가 이미 열려있다면 닫기
        if (activeLayer && document.body.contains(activeLayer)) {
          closeCodeBlockLayer();
          return;
        }
        
        // 스크립트 로드
        const SpeedHighlight = await loadScripts();
        if (!SpeedHighlight) {
          // 디버깅: errorHandler 확인
          console.log('errorHandler 존재:', typeof errorHandler !== 'undefined');
          console.log('showUserAlert 함수:', typeof errorHandler?.showUserAlert);
          console.log('P403 메시지:', errorHandler?.messages?.P403);
          errorHandler.showUserAlert('P403');
          return;
        }
        
        // 코드 블록 레이어 표시
        showCodeBlockLayer(button, contentArea, SpeedHighlight);
      });
      
      return button;
    }
  });
})();
