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
    const processCode = (code) => {
      if (!code.trim()) return;
      
      contentArea.focus();
      setTimeout(() => insertCodeBlock(code, contentArea, SpeedHighlight), 0);
    };
    
    // 버튼 클릭 이벤트
    insertButton.addEventListener('click', () => {
      processCode(codeInput.value);
    });
    
    // 레이어 내부 클릭 시 이벤트 전파 중단
    activeLayer.addEventListener('click', e => e.stopPropagation());
    
    // 모달 닫기 이벤트 설정
    if (util.modal && util.modal.setupModalCloseEvents) {
      layerCleanupFn = util.modal.setupModalCloseEvents(activeLayer, () => {
        clearSelection();
        closeCodeBlockLayer();
      });
    } else {
      // 간단한 외부 클릭 닫기 이벤트
      const closeOnOutsideClick = (e) => {
        if (!activeLayer.contains(e.target) && e.target !== buttonElement) {
          clearSelection();
          closeCodeBlockLayer();
          document.removeEventListener('click', closeOnOutsideClick);
        }
      };
      
      document.addEventListener('click', closeOnOutsideClick);
      layerCleanupFn = () => document.removeEventListener('click', closeOnOutsideClick);
    }
    
    // 텍스트 영역에 포커스
    setTimeout(() => codeInput.focus(), 0);
    
    return activeLayer;
  }
  
  /**
   * 코드 블록 삽입
   */
  function insertCodeBlock(code, contentArea, SpeedHighlight) {
    if (!code.trim()) return;
    
    try {
      // 코드 언어 자동 감지
      const detectedLang = SpeedHighlight.detectLanguage(code);
      
      // 저장된 선택 영역 복원
      restoreSelection();
      
      // 코드 블록 생성
      const codeBlockHTML = `
        <div class="lite-editor-code-block">
          <div class="shj-lang-${detectedLang || 'plain'}">${code}</div>
        </div>
      `;
      
      // 에디터에 삽입
      document.execCommand('insertHTML', false, codeBlockHTML);
      
      // 방금 삽입된 코드 블록 찾고 하이라이팅 적용
      const codeBlocks = contentArea.querySelectorAll('.lite-editor-code-block .shj-lang-' + (detectedLang || 'plain'));
      const newBlock = codeBlocks[codeBlocks.length - 1];
      
      if (newBlock) {
        // 코드 하이라이팅 적용
        SpeedHighlight.highlightElement(newBlock, detectedLang || 'plain');
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
