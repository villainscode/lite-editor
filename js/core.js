/**
 * LiteEditor Core - 핵심 기능 모듈
 * Version 1.0.0
 */

const LiteEditor = (function() {
  // 버전 정보 확인 및 출력
  console.log('LiteEditor 현재 버전:', window.LiteEditorVersion ? window.LiteEditorVersion.version : '로딩 전');
  
  // 에디터 인스턴스 저장
  const instances = [];
  
  // 플러그인 레지스트리
  const plugins = {};
  
  // 플러그인 순서 - 한 곳에서만 정의 (중복 제거)
  const PLUGIN_ORDER = [
    'historyInit', 'undo', 'redo', 'reset',                   // 실행 취소/되돌리기  
    'fontFamily', 'heading', 'fontColor', 'emphasis',         // 폰트서식 
    'bold', 'italic', 'underline', 'strike',                  // 폰트포맷 
    'link', 'imageUpload', 'table', 'media',                  // 오브젝트 삽입 
    'line', 'blockquote', 'code', 'codeBlock',                // 인용 및 코드 
    'unorderedList', 'orderedList', 'checkList',              // 목록 
    'align', 'formatIndent',                                  // 정렬과 인덴트 
  ];
  
  // 기본 설정
  const defaultConfig = {
    plugins: PLUGIN_ORDER,  // 플러그인 순서 상수 참조
    placeholder: '내용을 입력하세요...',
    dividers: [4, 8, 12, 16, 19], // 구분선 위치 정의
    dimensions: {
      editor: {
        width: '100%',
        height: 'auto'
      },
      toolbar: {
        width: '100%',
        height: 'auto'
      },
      content: {
        width: '100%',
        minHeight: '120px'
      }
    }
  };
  
  // 단축키 관리
  const shortcuts = {};
  
  /**
   * 단축키 등록
   * @param {string} id - 플러그인 ID
   * @param {Object} shortcutDef - 단축키 정의
   */
  function registerShortcut(id, shortcutDef) {
    if (!shortcuts[id]) {
      shortcuts[id] = [];
    }
    shortcuts[id].push(shortcutDef);
  }
  
  /**
   * 단축키 이벤트 처리
   * @param {Element} contentArea - 에디터 콘텐츠 영역
   */
  function setupShortcutListener(contentArea) {
    contentArea.addEventListener('keydown', (e) => {
      // 현재 입력된 키 확인
      const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const isCtrlPressed = isMac ? e.metaKey : e.ctrlKey;
      
      // 모든 단축키 순회
      for (const id in shortcuts) {
        const shortcutList = shortcuts[id];
        
        for (const shortcut of shortcutList) {
          const { key, ctrl, alt, shift, meta, action } = shortcut;
          
          const keyMatches = e.key.toLowerCase() === key.toLowerCase();
          const ctrlMatches = ctrl ? isCtrlPressed : !isCtrlPressed;
          const altMatches = alt ? e.altKey : !e.altKey;
          const shiftMatches = shift ? e.shiftKey : !e.shiftKey;
          const metaMatches = meta ? e.metaKey : !e.metaKey;
          
          // 모든 조건이 일치하면 해당 액션 실행
          if (keyMatches && ctrlMatches && altMatches && shiftMatches && metaMatches) {
            e.preventDefault();
            
            // 플러그인 액션 실행
            const plugin = getPlugin(id);
            if (plugin && typeof action === 'function') {
              action(contentArea);
            } else if (plugin && typeof plugin.action === 'function') {
              plugin.action(contentArea);
            }
            
            return false;
          }
        }
      }
    });
  }
  
  /**
   * 안전하게 Selection 객체 가져오기
   * @returns {Selection|null} Selection 객체 또는 null
   */
  function getSafeSelection() {
    try {
      return window.getSelection();
    } catch (e) {
      errorHandler.logError('Core', errorHandler.codes.COMMON.SELECTION_GET, e);
      return null;
    }
  }
  
  /**
   * 에디터 초기화
   * @param {string|HTMLElement} selector - CSS 선택자 또는 DOM 요소
   * @param {Object} customConfig - 사용자 설정 옵션
   * @returns {Object} 에디터 인스턴스
   */
  function init(selector, customConfig = {}) {
    const target = typeof selector === 'string' 
      ? document.querySelector(selector) 
      : selector;
    
    if (!target) {
      errorHandler.logError('LiteEditor', errorHandler.codes.COMMON.ELEMENT_NOT_FOUND, error);
      return null;
    }
    
    // 기본 설정과 사용자 설정 병합
    const config = { ...defaultConfig, ...customConfig };
    
    // B모드: 분리 모드 지원
    if (config.separatedMode && config.toolbarTarget) {
      return initSeparatedMode(target, config);
    }
    
    // 기존 통합 모드 (기본값)
    return initIntegratedMode(target, config);
  }
  
  /**
   * 통합 모드 초기화 (기존 방식)
   * @param {HTMLElement} target - 대상 요소
   * @param {Object} config - 설정 옵션
   * @returns {Object} 에디터 인스턴스
   */
  function initIntegratedMode(target, config) {
    // 원본 요소 저장 및 숨기기
    const originalElement = target;
    const isTextarea = originalElement.tagName === 'TEXTAREA';
    if (isTextarea) {
      originalElement.style.display = 'none';
    }
    
    // 에디터 컨테이너 생성
    const editorContainer = document.createElement('div');
    editorContainer.className = 'lite-editor';
    
    // 도구 모음 생성
    const toolbar = document.createElement('div');
    toolbar.className = 'lite-editor-toolbar';
    
    // 콘텐츠 영역 생성
    const contentArea = document.createElement('div');
    contentArea.className = 'lite-editor-content';
    contentArea.setAttribute('contenteditable', 'true');
    contentArea.setAttribute('data-placeholder', config.placeholder);
    
    // 외부 확장 프로그램 간섭 방지 속성 추가
    contentArea.setAttribute('data-editor', 'lite-editor');
    contentArea.setAttribute('data-exclude-from-extensions', 'true');
    contentArea.setAttribute('autocomplete', 'off');
    contentArea.setAttribute('autocorrect', 'off');
    contentArea.setAttribute('autocapitalize', 'off');
    contentArea.setAttribute('spellcheck', 'false');
    
    // 초기 콘텐츠 설정
    if (isTextarea && originalElement.value) {
      contentArea.innerHTML = originalElement.value;
    } else if (!isTextarea && originalElement.innerHTML) {
      contentArea.innerHTML = originalElement.innerHTML;
    }
    
    // 도구 모음과 콘텐츠 영역을 에디터 컨테이너에 추가
    editorContainer.appendChild(toolbar);
    editorContainer.appendChild(contentArea);
    
    // 에디터 컨테이너를 DOM에 삽입
    if (isTextarea) {
      // textarea인 경우 옆에 삽입하고 원본은 숨김
      originalElement.parentNode.insertBefore(editorContainer, originalElement);
    } else {
      // div 같은 일반 요소인 경우, 원본을 완전히 대체
      // 원본 요소의 id와 class를 저장
      const originalId = originalElement.id;
      const originalClasses = originalElement.className;
      const originalParent = originalElement.parentNode;
      
      // 원본 요소를 에디터 컨테이너로 대체
      if (originalParent) {
        // 원본 요소의 ID가 있으면 컨테이너에 적용
        if (originalId) {
          editorContainer.id = originalId;
        }
        
        // 원본 요소의 클래스를 컨테이너에 추가 (lite-editor 클래스는 유지)
        if (originalClasses) {
          // originalClasses에서 필요한 클래스만 추가
          originalClasses.split(' ').forEach(cls => {
            if (cls && cls !== 'lite-editor') {
              editorContainer.classList.add(cls);
            }
          });
        }
        
        // 원본 요소를 에디터 컨테이너로 교체
        originalParent.replaceChild(editorContainer, originalElement);
      }
    }
    
    // 공통 초기화 호출
    return completeInitialization({
      config,
      originalElement,
      editorContainer,
      toolbar,
      contentArea,
      mode: 'integrated'
    });
  }
  
  /**
   * 분리 모드 초기화 (B모드)
   * @param {HTMLElement} contentTarget - 콘텐츠 대상 요소
   * @param {Object} config - 설정 옵션
   * @returns {Object} 에디터 인스턴스
   */
  function initSeparatedMode(contentTarget, config) {
    // 툴바 대상 요소 찾기
    const toolbarTarget = typeof config.toolbarTarget === 'string'
      ? document.querySelector(config.toolbarTarget)
      : config.toolbarTarget;
    
    if (!toolbarTarget) {
      errorHandler.logError('LiteEditor', 'TOOLBAR_TARGET_NOT_FOUND', new Error('툴바 대상 요소를 찾을 수 없습니다.'));
      return null;
    }
    
    // 원본 요소 저장
    const originalElement = contentTarget;
    const isTextarea = originalElement.tagName === 'TEXTAREA';
    
    // 콘텐츠 영역 설정
    let contentArea;
    if (isTextarea) {
      // textarea인 경우 새로운 div 생성
      contentArea = document.createElement('div');
      contentArea.className = 'lite-editor-content';
      contentArea.setAttribute('contenteditable', 'true');
      contentArea.innerHTML = originalElement.value || '';
      originalElement.style.display = 'none';
      originalElement.parentNode.insertBefore(contentArea, originalElement);
    } else {
      // 기존 요소를 콘텐츠 영역으로 사용
      contentArea = originalElement;
      contentArea.className = 'lite-editor-content';
      contentArea.setAttribute('contenteditable', 'true');
    }
    
    // 콘텐츠 영역 속성 설정
    contentArea.setAttribute('data-placeholder', config.placeholder);
    contentArea.setAttribute('data-editor', 'lite-editor');
    contentArea.setAttribute('data-exclude-from-extensions', 'true');
    contentArea.setAttribute('autocomplete', 'off');
    contentArea.setAttribute('autocorrect', 'off');
    contentArea.setAttribute('autocapitalize', 'off');
    contentArea.setAttribute('spellcheck', 'false');
    
    // 툴바 영역 설정
    const toolbar = toolbarTarget;
    toolbar.className = 'lite-editor-toolbar';
    
    // 가상의 에디터 컨테이너 (분리 모드에서는 실제로 DOM에 추가되지 않음)
    const editorContainer = {
      separated: true,
      toolbar: toolbar,
      contentArea: contentArea
    };
    
    // 공통 초기화 호출
    return completeInitialization({
      config,
      originalElement,
      editorContainer,
      toolbar,
      contentArea,
      mode: 'separated'
    });
  }
  
  /**
   * 공통 초기화 완료 처리
   * @param {Object} initData - 초기화 데이터
   * @returns {Object} 에디터 인스턴스
   */
  function completeInitialization(initData) {
    const { config, originalElement, editorContainer, toolbar, contentArea, mode } = initData;
    const isTextarea = originalElement.tagName === 'TEXTAREA';
    
    // 에디터 크기 설정 (사용자 정의 dimensions 적용)
    if (config.dimensions) {
      // 통합 모드에서만 에디터 컨테이너 크기 적용
      if (mode === 'integrated' && config.dimensions.editor) {
        if (config.dimensions.editor.width) {
          editorContainer.style.width = config.dimensions.editor.width;
        }
        if (config.dimensions.editor.height) {
          editorContainer.style.height = config.dimensions.editor.height;
        }
        if (config.dimensions.editor.maxWidth) {
          editorContainer.style.maxWidth = config.dimensions.editor.maxWidth;
        }
      }
      
      // 툴바 크기 적용
      if (config.dimensions.toolbar) {
        if (config.dimensions.toolbar.width) {
          toolbar.style.width = config.dimensions.toolbar.width;
        }
        if (config.dimensions.toolbar.height) {
          toolbar.style.height = config.dimensions.toolbar.height;
          toolbar.style.minHeight = config.dimensions.toolbar.height;
          toolbar.style.maxHeight = config.dimensions.toolbar.height;
          toolbar.style.overflow = 'hidden';
        }
      }
      
      // 콘텐츠 영역 크기 적용
      if (config.dimensions.content) {
        if (config.dimensions.content.width) {
          contentArea.style.width = config.dimensions.content.width;
        }
        if (config.dimensions.content.height) {
          contentArea.style.height = config.dimensions.content.height;
          contentArea.style.maxHeight = config.dimensions.content.height;
          contentArea.style.overflowY = 'auto';
        }
        if (config.dimensions.content.minHeight) {
          contentArea.style.minHeight = config.dimensions.content.minHeight;
        }
      }
      
      // 통합 모드에서 자동 높이 계산이 아닌 경우 컨테이너 내부 요소 조정
      if (mode === 'integrated' && config.dimensions.editor && config.dimensions.editor.height && config.dimensions.editor.height !== 'auto') {
        editorContainer.style.overflow = 'hidden';
      }
    }
    
    // 이벤트 리스너 설정
    setupEventListeners(contentArea, originalElement);
    
    // 플러그인 및 구분선 초기화
    initToolbar(toolbar, contentArea, config);
    
    // 인스턴스 생성 및 저장
    const instance = {
      config,
      originalElement,
      editorContainer,
      toolbar,
      contentArea,
      mode,
      getContent: () => contentArea.innerHTML,
      setContent: (html) => {
        contentArea.innerHTML = html;
        if (isTextarea) {
          originalElement.value = html;
        }
      },
      destroy: () => {
        // 이벤트 리스너 제거, DOM 요소 정리 등
        if (mode === 'integrated') {
          if (isTextarea) {
            originalElement.style.display = '';
            editorContainer.remove();
          } else {
            originalElement.innerHTML = contentArea.innerHTML;
            editorContainer.remove();
          }
        } else {
          // 분리 모드에서는 개별 정리
          toolbar.innerHTML = '';
          if (isTextarea) {
            originalElement.style.display = '';
            contentArea.remove();
          }
        }
        // 인스턴스 제거
        const index = instances.indexOf(instance);
        if (index !== -1) {
          instances.splice(index, 1);
        }
      }
    };
    
    instances.push(instance);
    return instance;
  }
  
  /**
   * 도구 모음 초기화 및 플러그인 생성
   * @param {HTMLElement} toolbar - 도구 모음 요소
   * @param {HTMLElement} contentArea - 콘텐츠 영역 요소
   * @param {Object} config - 에디터 설정
   */
  function initToolbar(toolbar, contentArea, config) {
    // 사용자가 지정한 플러그인 목록 또는 기본 플러그인 목록 사용
    const enabledPlugins = config.plugins || PLUGIN_ORDER;
    const { dividers } = config;
    let pluginCount = 0;
    
    // 사용자가 지정한 순서대로 플러그인 렌더링
    enabledPlugins.forEach(pluginName => {
      // 구분선 추가 로직
      if (dividers && dividers.includes(pluginCount)) {
        const divider = document.createElement('div');
        divider.className = 'lite-editor-divider';
        toolbar.appendChild(divider);
      }
      
      // 플러그인 객체 가져오기
      let currentPlugin = plugins[pluginName];
      
      // 플러그인이 없는 경우, 임시 플러그인 생성
      if (!currentPlugin) {
        // 기존 코드와 동일한 플러그인 생성 로직 유지
        // 플러그인 이름에 맞는 기본 아이콘과 제목 설정
        let defaultIcon = 'edit';
        let defaultTitle = pluginName;
        
        // 플러그인 이름에 따라 아이콘 및 제목 설정
        if (pluginName === 'undo') { defaultIcon = 'undo'; defaultTitle = '실행 취소'; }
        else if (pluginName === 'redo') { defaultIcon = 'redo'; defaultTitle = 'Redo'; }
        else if (pluginName === 'heading') { defaultIcon = 'title'; defaultTitle = 'Heading'; }
        else if (pluginName === 'fontFamily') { defaultIcon = 'font_download'; defaultTitle = 'Font'; }
        else if (pluginName === 'fontSize') { defaultIcon = 'format_size'; defaultTitle = 'Font Size'; }
        else if (pluginName === 'fontColor') { defaultIcon = 'format_color_text'; defaultTitle = 'Font Color'; }
        else if (pluginName === 'emphasis') { defaultIcon = 'emphasis'; defaultTitle = 'Emphasis'; }
        else if (pluginName === 'bold') { defaultIcon = 'format_bold'; defaultTitle = 'Bold'; }
        else if (pluginName === 'italic') { defaultIcon = 'format_italic'; defaultTitle = 'Italic'; }
        else if (pluginName === 'underline') { defaultIcon = 'format_underlined'; defaultTitle = 'Underline'; }
        else if (pluginName === 'strike') { defaultIcon = 'format_strikethrough'; defaultTitle = 'Strikethrough'; }
        else if (pluginName === 'align') { defaultIcon = 'format_align_left'; defaultTitle = 'Alignment'; }
        else if (pluginName === 'indent') { defaultIcon = 'format_indent_increase'; defaultTitle = 'Indent'; }
        else if (pluginName === 'outdent') { defaultIcon = 'format_indent_decrease'; defaultTitle = 'Outdent'; }
        else if (pluginName === 'blockquote') { defaultIcon = 'format_quote'; defaultTitle = 'Blockquote'; }
        else if (pluginName === 'code') { defaultIcon = 'code'; defaultTitle = 'Code'; }
        else if (pluginName === 'codeBlock') { defaultIcon = 'data_object'; defaultTitle = 'Code Block'; }
        else if (pluginName === 'bulletList') { defaultIcon = 'format_list_bulleted'; defaultTitle = 'Bullet List'; }
        else if (pluginName === 'numberList') { defaultIcon = 'format_list_numbered'; defaultTitle = 'Number List'; }
        else if (pluginName === 'checkList') { defaultIcon = 'checklist'; defaultTitle = 'Check List'; }
        else if (pluginName === 'link') { defaultIcon = 'link'; defaultTitle = 'Link'; }
        else if (pluginName === 'image') { defaultIcon = 'image'; defaultTitle = 'Image'; }
        else if (pluginName === 'table') { defaultIcon = 'table_chart'; defaultTitle = 'Table'; }
        else if (pluginName === 'reset') { defaultIcon = 'format_clear'; defaultTitle = 'Clear Format'; }
        
        // 플러그인 생성 및 등록
        plugins[pluginName] = {
          icon: defaultIcon,
          title: defaultTitle,
          action: function(contentArea) {
            contentArea.focus();  // 먼저 포커스 설정
            saveSelection();
            applyAlignment('Left', contentArea);
          }
        };
        
        // 생성된 플러그인 사용
        currentPlugin = plugins[pluginName];
      }
      
      // 커스텀 렌더링이 있는 경우 (예: 폰트 선택)
      if (currentPlugin && currentPlugin.customRender && typeof currentPlugin.customRender === 'function') {
        const customElement = currentPlugin.customRender(toolbar, contentArea);
        if (customElement) {
          // 커스텀 요소의 디스플레이 스타일 확인
          if (customElement.tagName === 'BUTTON' && 
              !customElement.querySelector('.material-icons') && 
              !customElement.querySelector('.material-symbols-outlined')) {
            // 버튼이고 아이콘이 없으면 아이콘 추가
            if (currentPlugin.icon) {
              const iconElement = document.createElement('span');
              iconElement.className = 'material-icons';
              iconElement.textContent = currentPlugin.icon;
              customElement.prepend(iconElement);
            }
          }
          toolbar.appendChild(customElement);
        }
      } else if (currentPlugin) {
        // 기본 버튼 생성
        const buttonElement = document.createElement('button');
        buttonElement.type = 'button';
        buttonElement.className = 'lite-editor-button';
        buttonElement.title = currentPlugin.title || pluginName;
        buttonElement.setAttribute('data-plugin', pluginName); // 플러그인 이름 데이터 속성 추가
        
        // 아이콘 추가
        if (currentPlugin.icon) {
          const iconElement = document.createElement('span');
          iconElement.className = 'material-icons';
          iconElement.textContent = currentPlugin.icon;
          // 아이콘 스타일 강화
          iconElement.style.display = 'inline-flex';
          iconElement.style.alignItems = 'center';
          iconElement.style.justifyContent = 'center';
          iconElement.style.verticalAlign = 'middle';
          buttonElement.appendChild(iconElement);
        }
        
        // 마우스 다운 이벤트 - 버튼 누름 효과
        buttonElement.addEventListener('mousedown', () => {
          // 누름 효과 적용
          buttonElement.style.transform = 'scale(0.95)';
          buttonElement.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
          buttonElement.style.boxShadow = 'inset 0 1px 2px rgba(0, 0, 0, 0.2)';
        });
        
        // 마우스 업/아웃 이벤트 - 버튼 누름 효과 제거
        const resetButtonStyle = () => {
          // 버튼 누름 효과 제거 (active 클래스는 유지)
          buttonElement.style.transform = '';
          buttonElement.style.backgroundColor = '';
          buttonElement.style.boxShadow = '';
        };
        
        // 여러 이벤트에 동일한 핸들러 연결
        buttonElement.addEventListener('mouseup', resetButtonStyle);
        buttonElement.addEventListener('mouseout', resetButtonStyle);
        
        // 클릭 이벤트 - 실제 기능 실행
        buttonElement.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          // 이미 처리 중인 버튼인지 확인
          if (buttonElement.hasAttribute('data-processing')) {
            errorHandler.logError('Core', errorHandler.codes.COMMON.OPERATION_IN_PROGRESS, e);
            return;
          }
          
          // 선택 영역 저장
          if (window.liteEditorSelection) {
            window.liteEditorSelection.save();
          }
          
          // 이벤트 객체 전달
          if (currentPlugin && typeof currentPlugin.action === 'function') {
            currentPlugin.action(contentArea, buttonElement, e);
          }
          
          // 처리 중 플래그가 없는 경우에만 복원
          if (!buttonElement.hasAttribute('data-processing')) {
            contentArea.focus();
            if (window.liteEditorSelection) {
              setTimeout(() => {
                window.liteEditorSelection.restore();
              }, 10);
            }
          }
        });
        
        // 도구 모음에 추가
        toolbar.appendChild(buttonElement);
      }
      
      // 플러그인 카운트 증가
      pluginCount++;
    });
  }
  
  /**
   * 이벤트 리스너 설정
   * @param {HTMLElement} contentArea - 콘텐츠 영역 요소
   * @param {HTMLElement} originalElement - 원본 요소
   */
  function setupEventListeners(contentArea, originalElement) {
    // 현재 선택 영역을 저장하는 변수
    let savedSelection = null;
    let selectionActive = false; // 활성화된 선택 영역이 있는지 추적
    
    // 선택 영역 저장 함수 (MDN Selection API 기반 개선)
    const saveSelection = () => {
      try {
        const sel = getSafeSelection();
        // 유효한 선택이 있는지 확인 (sel 자체가 null일 수 있음 고려)
        if (!sel || sel.rangeCount === 0) {
          selectionActive = false;
          return false;
        }
        
        // Range 가져오기
        const range = sel.getRangeAt(0);
        if (!range || !range.commonAncestorContainer) {
          selectionActive = false;
          return false;
        }
        
        // 선택 영역이 에디터 내부에 있는지 확인
        let node = range.commonAncestorContainer;
        // 텍스트 노드인 경우 부모로 이동
        if (node.nodeType === 3) {
          node = node.parentNode;
        }
        
        // DOM 트래버설로 에디터 내부 여부 확인
        let isInEditor = false;
        while (node) {
          if (node === contentArea) {
            isInEditor = true;
            break;
          }
          if (node === document.body) break;
          node = node.parentNode;
        }
        
        if (isInEditor) {
          // 복제본 저장 (중요!) - DOM 변경에 영향받지 않도록
          savedSelection = range.cloneRange();
          
          // 선택 영역 활성화 상태 확인 (collapsed 속성 + 내용 확인)
          selectionActive = !range.collapsed;
          if (selectionActive) {
            // 추가 검증: 실제 내용이 있는지 확인
            const content = range.cloneContents();
            if (content.textContent.trim() === '') {
              // 텍스트 내용이 없는 경우 - 선택이 없는 것으로 간주
              selectionActive = false;
            }
          }
          
          return selectionActive;
        }
        
        // 에디터 활성화 여부 확인
        if (document.activeElement === contentArea) {
          selectionActive = true;
          return true;
        }
      } catch (e) {
        errorHandler.logError('Core', errorHandler.codes.COMMON.SELECTION_GET, e);
        return false;
      }
    };
    
    // 선택 영역 복원 함수 (MDN Selection API 기반 개선)
    const restoreSelection = () => {
      // savedSelection이 있는지 먼저 확인
      if (!savedSelection) {
        return false;
      }
      
      try {
        // 저장된 Range가 유효한지 확인
        if (!savedSelection.startContainer || !savedSelection.endContainer) {
          errorHandler.logError('Core', errorHandler.codes.COMMON.INVALID_RANGE, new Error('유효하지 않은 Range 객체'));
          return false;
        }
        
        // 포커스 확인 및 설정 (포커스가 없으면 선택이 적용되지 않을 수 있음)
        if (document.activeElement !== contentArea) {
          contentArea.focus();
          
          // iOS와 일부 브라우저에서 포커스 실패 대비 지연
          if (navigator.userAgent.match(/iPad|iPhone|iPod|Android/i)) {
            // 모바일 장치에서는 충분한 지연 필요
            setTimeout(() => applySelection(), 50);
            return true;
          }
        }
        
        // 선택 영역 적용 하기 (함수로 분리하여 지연 실행 용이하게)
        function applySelection() {
          try {
            // Selection 오브젝트 가져오기
            const sel = getSafeSelection();
            if (!sel) {
              errorHandler.logError('Core', errorHandler.codes.COMMON.SELECTION_GET, new Error('Selection 객체를 가져올 수 없음'));
              return false;
            }
            
            // 현재 Range 모두 제거 후 저장된 Range 추가
            // removeAllRanges와 addRange 사이에 지연이 없도록 연속적으로 실행
            sel.removeAllRanges();
            sel.addRange(savedSelection);
            
            // 개선된 선택 상태 확인
            const currentState = !sel.isCollapsed;
            errorHandler.logInfo('Core', `선택 영역 복원됨: ${currentState}`);
            return currentState;
          } catch (e) {
            errorHandler.logError('Core', errorHandler.codes.COMMON.SELECTION_RESTORE, e);
            return false;
          }
        }
        
        // 즉시 실행 (모바일이 아닐 경우)
        return applySelection();
      } catch (e) {
        errorHandler.logError('Core', errorHandler.codes.COMMON.SELECTION_RESTORE, e);
        return false;
      }
    };
    
    // 선택 영역 가져오기 함수
    const getSelection = () => {
      return savedSelection;
    };
    
    // 선택 영역 활성화 여부 확인 함수
    const isSelectionActive = () => {
      return selectionActive;
    };
    
    // 선택 영역 관리 객체 생성 및 전역으로 노출
    window.liteEditorSelection = {
      save: saveSelection,
      restore: restoreSelection,
      get: getSelection,
      isActive: isSelectionActive
    };
    
    // 선택 영역 디바운싱을 위한 타이머 변수
    let selectionDebounceTimer = null;
    let lastSelectionText = '';

    // 선택 시작 감지 (mousedown)
    contentArea.addEventListener('mousedown', (e) => {
      // 링크 클릭 처리 (기존 코드 유지)
      const clickedLink = e.target.closest('a');
      if (clickedLink) {
        // 단순 클릭인 경우(선택하려는 것이 아닌 경우)에만 링크 열기
        // 선택 기능을 방해하지 않기 위해 mousedown에서 처리
        const href = clickedLink.getAttribute('href');
        if (href && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
          // 이벤트를 즉시 처리하고 기본 동작 방지
          e.preventDefault();
          e.stopPropagation();
          
          // 약간의 지연을 두고 링크 열기 (선택 작업과 충돌 방지)
          setTimeout(() => {
            window.open(href, '_blank');
          }, 10);
        }
      } else {
        // 새로운 선택이 시작될 때 이전 선택 정보 초기화
        lastSelectionText = '';
        
        // 마우스 버튼을 좌클릭으로 누른 경우에만 선택 시작으로 간주
        if (e.button === 0) {
          // 선택 시작 메시지 출력 (텍스트가 비어있는 상태)
          if (window.DEBUG_MODE) {
            errorHandler.colorLog(
              'SELECTION', 
              '📝 선택 시작됨', 
              null, 
              '#ff9800'
            );
          }
        }
      }
    });

    // 선택 종료 감지 (mouseup)
    contentArea.addEventListener('mouseup', (e) => {
      // 링크가 아닌 곳에서 마우스 버튼을 뗀 경우 처리
      if (!e.target.closest('a') && e.button === 0) {
        // 마우스를 뗐을 때 바로 선택 정보 출력하지 않고, 약간의 지연 적용
        // 이렇게 하면 선택 작업이 완전히 완료된 후 정보가 출력됨
        setTimeout(() => {
          const sel = getSafeSelection();
          if (sel && sel.rangeCount > 0) {
            const currentText = sel.toString().trim();
            
            // 선택된 텍스트가 있고, 이전에 출력한 것과 다른 경우에만 출력
            if (currentText !== '' && currentText !== lastSelectionText) {
              lastSelectionText = currentText;
              
              // 선택 영역 정보 계산 및 출력
              const offsets = calculateEditorOffsets(contentArea);
              if (offsets && window.DEBUG_MODE) {
                errorHandler.colorLog(
                  'SELECTION', 
                  `📌 selectionStart: ${offsets.start}, selectionEnd: ${offsets.end}`, 
                  { text: currentText }, 
                  '#4caf50'
                );
              }
            }
          }
        }, 10);
      }
    });

    // 키보드 선택 감지 (shift+화살표 등)
    contentArea.addEventListener('keyup', (e) => {
      // 선택에 영향을 주는 키인지 확인
      const selectionKeys = [
        'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 
        'Home', 'End', 'PageUp', 'PageDown'
      ];
      
      // Shift 키와 함께 사용된 화살표 키나 'a'와 함께 사용된 Ctrl/Cmd 키 검사
      const isSelectionKey = 
        (e.shiftKey && selectionKeys.includes(e.key)) || 
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a');
      
      if (isSelectionKey) {
        // 키보드 선택이 끝난 후 지연 시간을 두고 선택 정보 출력
        clearTimeout(selectionDebounceTimer);
        selectionDebounceTimer = setTimeout(() => {
          const sel = getSafeSelection();
          if (sel && sel.rangeCount > 0) {
            const currentText = sel.toString().trim();
            
            // 선택된 텍스트가 있고, 이전에 출력한 것과 다른 경우에만 출력
            if (currentText !== '' && currentText !== lastSelectionText) {
              lastSelectionText = currentText;
              
              // 선택 영역 정보 계산 및 출력
              const offsets = calculateEditorOffsets(contentArea);
              if (offsets && window.DEBUG_MODE) {
                errorHandler.colorLog(
                  'SELECTION', 
                  `📌 selectionStart: ${offsets.start}, selectionEnd: ${offsets.end}`, 
                  { text: currentText }, 
                  '#4caf50'
                );
              }
            }
          }
        }, 100); // 키보드 입력의 경우 더 긴 지연 시간 적용
      }

      // 기존 코드 (TextArea 업데이트 등) 유지
      if (originalElement.tagName === 'TEXTAREA') {
        originalElement.value = contentArea.innerHTML;
      }
      
      // 현재 선택 영역 저장
      saveSelection();
    });
    
    // 붙여넣기 이벤트 (서식 없는 텍스트만 허용)
    contentArea.addEventListener('paste', (e) => {
      e.preventDefault();
      
      // 클립보드 텍스트만 가져오기
      const text = (e.clipboardData || window.clipboardData).getData('text/plain');
      
      // 선택 영역이 있으면 해당 영역을 대체, 없으면 커서 위치에 삽입
      try {
        const sel = getSafeSelection();
        if (sel && sel.getRangeAt && sel.rangeCount) {
          const range = sel.getRangeAt(0);
          range.deleteContents();
          range.insertNode(document.createTextNode(text));
        }
      } catch (e) {
        errorHandler.logError('Core', errorHandler.codes.COMMON.PASTE, e);
        // 대체 방법으로 삽입
        contentArea.textContent += text;
      }
      
      // TextArea인 경우 원본 요소 업데이트
      if (originalElement.tagName === 'TEXTAREA') {
        originalElement.value = contentArea.innerHTML;
      }
    });
    
    // 단축키 리스너 설정
    setupShortcutListener(contentArea);
  }
  
  // 에디터 내부 기준으로 오프셋 계산 함수 추가
  function calculateEditorOffsets(editor) {
    const sel = getSafeSelection();
    if (!sel || !sel.rangeCount) return null;
    const range = sel.getRangeAt(0);
    
    let charIndex = 0, startOffset = -1, endOffset = -1;
    const treeWalker = document.createTreeWalker(
      editor,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    while (treeWalker.nextNode()) {
      const node = treeWalker.currentNode;
      if (node === range.startContainer) {
        startOffset = charIndex + range.startOffset;
      }
      if (node === range.endContainer) {
        endOffset = charIndex + range.endOffset;
        break;
      }
      charIndex += node.textContent.length;
    }
    
    if (startOffset >= 0 && endOffset < 0) {
      endOffset = startOffset;
    }
    
    return startOffset >= 0 ? { start: startOffset, end: endOffset } : null;
  }
  
  /**
   * 플러그인 등록
   * @param {string} name - 플러그인 이름
   * @param {Object} plugin - 플러그인 객체
   */
  function registerPlugin(name, plugin) {
    plugins[name] = plugin;
  }
  
  /**
   * 플러그인 가져오기
   * @param {string} name - 플러그인 이름
   * @returns {Object|null} 플러그인 객체 또는 null
   */
  function getPlugin(name) {
    return plugins[name] || null;
  }
  
  /**
   * 모든 플러그인 가져오기
   * @returns {Object} 모든 플러그인 객체
   */
  function getAllPlugins() {
    return { ...plugins };
  }
  
  // 공개 API
  return {
    init,
    registerPlugin,
    registerShortcut,
    getPlugin,
    getAllPlugins
  };
})();

// 노출된 API
window.LiteEditor = LiteEditor;
