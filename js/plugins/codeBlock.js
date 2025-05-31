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
    // ✅ closeAll 이후에 선택 영역 저장
    // 다른 활성화된 모달 모두 닫기 (현재 레이어 제외)
    if (util.activeModalManager) {
      util.activeModalManager.closeAll(activeLayer);
    }
    
    // ✅ closeAll 완료 후 선택 영역 저장
    setTimeout(() => {
      if (document.activeElement === contentArea) {
        savedRange = util.selection.saveSelection();
      } else {
        savedRange = null;
      }
    }, 60); // closeAll의 선택 영역 복원(50ms) 이후
    
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
      if (!code.trim()) {
        errorHandler.showUserAlert('P405');
        return;
      }
      
      try {
        contentArea.focus({ preventScroll: true });
      } catch (e) {
        contentArea.focus();
      }
      
      setTimeout(() => {
        insertCodeBlock(code, language, contentArea, SpeedHighlight);
      }, 0);
    };
    
    // 버튼 클릭 이벤트
    insertButton.addEventListener('click', () => {
      const selectedLanguage = languageDropdown.getValue();
      const codeValue = codeInput.value;
      processCode(codeValue, selectedLanguage);
    });
    
    // 레이어 내부 클릭 시 이벤트 전파 중단
    activeLayer.addEventListener('click', e => e.stopPropagation());
    
    // 외부 클릭 시 닫기 설정
    requestAnimationFrame(() => {
      // ✅ closeAll의 선택 영역 복원(50ms) 이후에 포커스
      setTimeout(() => {
        codeInput.focus();
        
        // 추가 안전장치
        setTimeout(() => {
          if (document.activeElement !== codeInput) {
            codeInput.focus();
          }
        }, 20);
      }, 80); // closeAll의 50ms + 여유시간
      
      // 외부 클릭 핸들러도 더 늦게
      setTimeout(() => {
        util.setupOutsideClickHandler(activeLayer, closeCodeBlockLayer, [buttonElement]);
      }, 100);
    });
  }
  
  /**
   * 코드 블록 삽입
   */
  function insertCodeBlock(code, language, contentArea, SpeedHighlight) {
    if (!code.trim()) {
      return;
    }
    
    try {
      // 저장된 선택 영역 복원
      restoreSelection();
      
      // 현재 선택 영역 확인
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        selection.getRangeAt(0);
      }
      
      // 언어 결정
      let finalLanguage = language;
      if (!language) {
        finalLanguage = 'plain';
      } else if (language === 'auto') {
        finalLanguage = SpeedHighlight?.detectLanguage(code) || 'plain';
      }
      
      try {
        contentArea.focus({ preventScroll: true });
      } catch (e) {
        contentArea.focus();
      }
      
      // HTML 특수 문자 이스케이프 처리
      const escapedCode = escapeHtml(code);
      
      // 코드 블록 생성
      const codeBlockHTML = `
        <div class="lite-editor-code-block">
          <div class="shj-lang-${finalLanguage}">${escapedCode}</div>
        </div>
      `;
      
      // 에디터에 삽입 + 자동 개행 처리
      const codeBlockWithBreak = codeBlockHTML + '<p><br></p>';
      document.execCommand('insertHTML', false, codeBlockWithBreak);
      
      // 삽입 후 커서를 새로운 P 태그로 이동
      setTimeout(() => {
        const selection = window.getSelection();
        const range = document.createRange();
        
        // 방금 삽입된 코드 블록 다음의 P 태그 찾기
        const codeBlocks = contentArea.querySelectorAll('.lite-editor-code-block');
        const newCodeBlock = codeBlocks[codeBlocks.length - 1];
        
        if (newCodeBlock && newCodeBlock.nextElementSibling && newCodeBlock.nextElementSibling.tagName === 'P') {
          const nextP = newCodeBlock.nextElementSibling;
          const br = nextP.querySelector('br');
          
          if (br) {
            // BR 태그 앞에 커서 위치
            range.setStartBefore(br);
            range.collapse(true);
          } else {
            // P 태그 시작에 커서 위치
            range.setStart(nextP, 0);
            range.collapse(true);
          }
          
          selection.removeAllRanges();
          selection.addRange(range);
          
          // 포커스 설정
          contentArea.focus();
        }
      }, 10);
      

      if (SpeedHighlight) {
        setTimeout(() => {
          const codeBlocks = contentArea.querySelectorAll('.lite-editor-code-block .shj-lang-' + finalLanguage);
          const newBlock = codeBlocks[codeBlocks.length - 1];
          
          if (newBlock) {
            SpeedHighlight.highlightElement(newBlock, finalLanguage);
          } else {
          }
        }, 50); // DOM 렌더링 완료 대기
      } else {
        console.log('❌ [CODEBLOCK DEBUG] SpeedHighlight가 없음');
      }
      
      // 에디터 변경 이벤트 발생
      if (util.editor && util.editor.dispatchEditorEvent) {
        util.editor.dispatchEditorEvent(contentArea);
      } else {
        contentArea.dispatchEvent(new Event('input', { bubbles: true }));
      }
    } catch (error) {
      errorHandler.logError('CodeBlockPlugin', errorHandler.codes.PLUGINS.CODE.INSERT, error);
      errorHandler.showUserAlert('P404');
    } finally {
      // 레이어 닫기 및 선택 영역 초기화
      clearSelection();
      closeCodeBlockLayer();
      
      // 스크롤 위치 복원
      util.scroll.restorePosition();
    }
  }
  
  // ==================== 코드 블록 내 Enter 키 처리 ====================
  
  /**
   * 코드 블록 내에서 새 라인 생성
   */
  function createNewLineInCodeBlock(selection, range) {
    // 현재 커서 위치에 새 라인 생성
    const newLine = document.createTextNode('\n');
    
    // 커서 위치에 새 라인 삽입
    range.deleteContents();
    range.insertNode(newLine);
    
    // 커서를 새 라인 뒤로 이동
    range.setStartAfter(newLine);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  /**
   * 코드 블록 Enter 키 처리 - 단순 새 라인 생성
   */
  document.addEventListener('keydown', function(e) {
    // Enter 키만 처리 (Shift+Enter는 제외)
    if (e.key !== 'Enter' || e.shiftKey) return;
    
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    let element = range.startContainer;
    
    // 텍스트 노드인 경우 부모 요소로
    if (element.nodeType === Node.TEXT_NODE) {
      element = element.parentElement;
    }
    
    // 코드 블록 내부인지 확인
    const codeBlock = element.closest('.lite-editor-code-block');
    if (codeBlock) {
      // ✅ 브라우저 기본 Enter 동작 차단
      e.preventDefault();
      e.stopPropagation();
      
      // ✅ 단순한 새 라인 생성
      createNewLineInCodeBlock(selection, range);
    }
  }, true); // capture 단계에서 처리
  
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
      
      // ✅ 클릭 이벤트 (성능 최적화)
      button.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 스크롤 위치 저장
        util.scroll.savePosition();
        
        // 레이어가 이미 열려있다면 닫기
        if (activeLayer && document.body.contains(activeLayer)) {
          closeCodeBlockLayer();
          return;
        }
        
        // ✅ SpeedHighlight 확실히 로드
        let SpeedHighlight = window.SpeedHighlight;
        if (!SpeedHighlight) {
          SpeedHighlight = await loadScripts();
        }
        
        // 레이어 표시
        showCodeBlockLayer(button, contentArea, SpeedHighlight);
      });
      
      return button;
    }
  });
})();
