/**
 * LiteEditor Code Block Plugin
 * Speed Highlight 기반 코드 하이라이팅 기능
 */

(function() {
  // 플러그인 상수 정의
  const PLUGIN_ID = 'codeBlock';
  const STYLE_ID = 'codeBlockStyles';
  const CSS_PATH = 'css/plugins/codeBlock.css';
  
  // CDN 주소
  const CDN_SCRIPT = 'https://unpkg.com/@speed-highlight/core/dist/index.js';
  const CDN_STYLE = 'https://unpkg.com/@speed-highlight/core/dist/themes/default.css';
  const CDN_DETECT = 'https://unpkg.com/@speed-highlight/core/dist/detect.js';
  
  // 지원 언어 목록
  const LANGUAGES = [
    { value: "auto", label: "자동 감지" },
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
  
  // PluginUtil 참조
  const util = window.PluginUtil || {};
  
  // 전역 상태 변수
  let activeLayer = null;
  let layerCleanupFn = null;
  let savedRange = null;
  
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
      console.error('Speed Highlight 로드 실패:', error);
      return null;
    }
  }
  
  /**
   * 현재 선택 영역을 저장
   */
  function saveSelection() {
    if (util.selection && util.selection.saveSelection) {
      savedRange = util.selection.saveSelection();
    } else {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        savedRange = selection.getRangeAt(0).cloneRange();
      }
    }
  }
  
  /**
   * 저장된 선택 영역을 복원
   */
  function restoreSelection() {
    if (!savedRange) return false;
    
    if (util.selection && util.selection.restoreSelection) {
      util.selection.restoreSelection(savedRange);
    } else {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(savedRange);
    }
    
    return true;
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
    if (layerCleanupFn) {
      layerCleanupFn();
      layerCleanupFn = null;
    }
    
    if (activeLayer && activeLayer.parentNode) {
      if (util.activeModalManager) {
        util.activeModalManager.unregister(activeLayer);
      }
      
      activeLayer.parentNode.removeChild(activeLayer);
      activeLayer = null;
    }
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
    selectedText.textContent = '자동 감지';
    
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
      
      // 자동 감지 옵션을 기본 선택으로 표시
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
    
    // 기존 레이어 닫기
    closeCodeBlockLayer();
    
    // 다른 활성화된 모달 모두 닫기
    if (util.activeModalManager) {
      util.activeModalManager.closeAll();
    }
    
    // 레이어 생성
    activeLayer = document.createElement('div');
    activeLayer.className = 'lite-editor-code-block-layer';
    activeLayer.innerHTML = `
      <div class="lite-editor-code-block-form">
        <textarea placeholder="코드를 입력하세요..." class="lite-editor-code-input"></textarea>
        <div class="lite-editor-code-block-actions">
          <button class="lite-editor-code-insert-btn">
            <span class="material-icons" style="font-size: 18px; color: #5f6368;">add_circle</span>
          </button>
        </div>
      </div>
    `;
    
    // 레이어를 DOM에 추가
    document.body.appendChild(activeLayer);
    
    // 드롭다운 추가
    const actionsDiv = activeLayer.querySelector('.lite-editor-code-block-actions');
    const languageDropdown = createLanguageDropdown();
    actionsDiv.insertBefore(languageDropdown.container, actionsDiv.firstChild);
    
    // 레이어 위치 설정
    if (util.layer && util.layer.setLayerPosition) {
      util.layer.setLayerPosition(activeLayer, buttonElement);
    } else {
      // 버튼 위치 기준으로 레이어 위치 설정
      const buttonRect = buttonElement.getBoundingClientRect();
      activeLayer.style.position = 'fixed';
      activeLayer.style.left = buttonRect.left + 'px';
      activeLayer.style.top = (buttonRect.bottom + 5) + 'px';
      activeLayer.style.width = '400px';
      activeLayer.style.zIndex = '1000';
    }
    
    if (util.activeModalManager) {
      activeLayer.closeCallback = closeCodeBlockLayer;
      util.activeModalManager.register(activeLayer);
    }
    
    // 이벤트 설정
    const codeInput = activeLayer.querySelector('.lite-editor-code-input');
    const insertButton = activeLayer.querySelector('.lite-editor-code-insert-btn');
    
    // 코드 삽입 처리 함수
    const processCode = (code, language) => {
      if (!code.trim()) return;
      
      contentArea.focus();
      setTimeout(() => insertCodeBlock(code, language, contentArea, SpeedHighlight), 0);
    };
    
    // 버튼 클릭 이벤트
    insertButton.addEventListener('click', () => {
      const selectedLanguage = languageDropdown.getValue();
      processCode(codeInput.value, selectedLanguage);
    });
    
    // 레이어 내부 클릭 시 이벤트 전파 중단
    activeLayer.addEventListener('click', e => e.stopPropagation());
    
    // 모든 외부 클릭 및 드롭다운 이벤트 통합 관리
    if (util.modal && util.modal.setupModalCloseEvents) {
      // PluginUtil의 모달 클로즈 이벤트 사용
      layerCleanupFn = util.modal.setupModalCloseEvents(activeLayer, () => {
        clearSelection();
        closeCodeBlockLayer();
      });
    } else {
      // 수동 이벤트 처리 - 외부 클릭과 드롭다운 클릭 통합
      const handleOutsideClick = (e) => {
        // 레이어 외부 클릭 시 레이어 닫기
        if (!activeLayer.contains(e.target) && e.target !== buttonElement) {
          clearSelection();
          closeCodeBlockLayer();
        } 
        // 드롭다운 외부 클릭 시 드롭다운만 닫기
        else if (activeLayer.contains(e.target) && !languageDropdown.container.contains(e.target)) {
          languageDropdown.menu.classList.add('hidden');
          languageDropdown.button.setAttribute('aria-expanded', 'false');
        }
      };
      
      document.addEventListener('click', handleOutsideClick);
      layerCleanupFn = () => document.removeEventListener('click', handleOutsideClick);
    }
    
    // 텍스트 영역에 포커스
    setTimeout(() => codeInput.focus(), 0);
    
    return activeLayer;
  }
  
  /**
   * 코드 블록 삽입
   */
  function insertCodeBlock(code, language, contentArea, SpeedHighlight) {
    if (!code.trim()) return;
    
    try {
      // 언어 결정: 자동 감지 또는 선택된 언어 사용
      let finalLanguage = language;
      if (language === 'auto' || !language) {
        finalLanguage = SpeedHighlight.detectLanguage(code) || 'plain';
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
        // 코드 하이라이팅 적용
        SpeedHighlight.highlightElement(newBlock, finalLanguage);
      }
      
      // 에디터 변경 이벤트 발생
      if (util.editor && util.editor.dispatchEditorEvent) {
        util.editor.dispatchEditorEvent(contentArea);
      } else {
        contentArea.dispatchEvent(new Event('input', { bubbles: true }));
      }
    } catch (error) {
      console.error('코드 블록 삽입 오류:', error);
      alert('코드 블록을 삽입하는 중 오류가 발생했습니다.');
    } finally {
      // 레이어 닫기 및 선택 영역 초기화
      clearSelection();
      closeCodeBlockLayer();
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
      
      // 활성 모달 관리자에 등록
      if (util.activeModalManager) {
        util.activeModalManager.registerButton(button);
      }
      
      // 클릭 이벤트
      button.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 레이어가 이미 열려있다면 닫기
        if (activeLayer && document.body.contains(activeLayer)) {
          closeCodeBlockLayer();
          return;
        }
        
        // 스크립트 로드
        const SpeedHighlight = await loadScripts();
        if (!SpeedHighlight) {
          alert('Speed Highlight 라이브러리를 로드할 수 없습니다.');
          return;
        }
        
        // 코드 블록 레이어 표시
        showCodeBlockLayer(button, contentArea, SpeedHighlight);
      });
      
      // 버튼을 툴바에 추가
      toolbar.appendChild(button);
    }
  });
})();
