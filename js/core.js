/**
 * LiteEditor Core - 핵심 기능 모듈
 * Version 1.0.0
 */

const LiteEditor = (function() {
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
    
    // 에디터 크기 설정 (사용자 정의 dimensions 적용)
    if (config.dimensions) {
      // 에디터 컨테이너 크기 적용
      if (config.dimensions.editor) {
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
          toolbar.style.overflow = 'hidden'; // 툴바 내용이 넘칠 경우 숨김 처리
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
          contentArea.style.overflowY = 'auto'; // 내용이 넘칠 경우 스크롤 표시
        }
        if (config.dimensions.content.minHeight) {
          contentArea.style.minHeight = config.dimensions.content.minHeight;
        }
      }
      
      // 자동 높이 계산이 아닌 경우 컨테이너 내부 요소 조정
      if (config.dimensions.editor.height && config.dimensions.editor.height !== 'auto') {
        editorContainer.style.overflow = 'hidden'; // 컨테이너 넘침 방지
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
      getContent: () => contentArea.innerHTML,
      setContent: (html) => {
        contentArea.innerHTML = html;
        if (isTextarea) {
          originalElement.value = html;
        }
      },
      destroy: () => {
        // 이벤트 리스너 제거, DOM 요소 정리 등
        if (isTextarea) {
          originalElement.style.display = '';
          editorContainer.remove();
        } else {
          originalElement.innerHTML = contentArea.innerHTML;
          editorContainer.remove();
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
            // 기본 기능 적용
            if (['bold', 'italic', 'underline', 'strike'].includes(pluginName)) {
              document.execCommand(pluginName, false, null);
            } else if (pluginName === 'bulletList') {
              document.execCommand('insertUnorderedList', false, null);
            } else if (pluginName === 'numberList') {
              document.execCommand('insertOrderedList', false, null);
            } else if (pluginName === 'indent') {
              document.execCommand('indent', false, null);
            } else if (pluginName === 'outdent') {
              document.execCommand('outdent', false, null);
            } else if (pluginName === 'undo') {
              document.execCommand('undo', false, null);
            } else if (pluginName === 'redo') {
              document.execCommand('redo', false, null);
            } else if (pluginName === 'heading') {
              // 제목 기능 구현 - h1~h3 전환
              const headingLevel = prompt('Select heading level (1-3):', '2');
              if (headingLevel && ['1', '2', '3'].includes(headingLevel)) {
                document.execCommand('formatBlock', false, 'h' + headingLevel);
              }
            } else if (pluginName === 'emphasis') {
              // 배경색 기능 구현
              document.execCommand('hiliteColor', false, 'yellow');
            } else if (pluginName === 'align') {
              // 정렬 목록 표시
              const alignElement = document.createElement('div');
              alignElement.className = 'lite-editor-dropdown-menu lite-editor-align-menu';
              alignElement.style.position = 'absolute';
              
              // 버튼 클릭 위치에 드롭다운 위치 설정
              const buttonRect = buttonElement.getBoundingClientRect();
              alignElement.style.top = (buttonRect.bottom + window.scrollY) + 'px';
              alignElement.style.left = (buttonRect.left + window.scrollX) + 'px';
              alignElement.style.backgroundColor = 'white';
              alignElement.style.border = '1px solid #ccc';
              alignElement.style.borderRadius = '3px';
              alignElement.style.zIndex = '1000';
              alignElement.style.display = 'flex';
              alignElement.style.flexDirection = 'column';
              alignElement.style.padding = '5px';
              
              // 정렬 옵션 추가
              const options = [
                { icon: 'format_align_left', text: 'Left Align', command: 'justifyleft' },
                { icon: 'format_align_center', text: 'Center Align', command: 'justifycenter' },
                { icon: 'format_align_right', text: 'Right Align', command: 'justifyright' },
                { icon: 'format_align_justify', text: 'Justify', command: 'justifyfull' }
              ];
              
              options.forEach(option => {
                const optionBtn = document.createElement('button');
                optionBtn.className = 'lite-editor-button lite-editor-align-option';
                optionBtn.title = option.text;
                optionBtn.style.display = 'flex';
                optionBtn.style.alignItems = 'center';
                optionBtn.style.padding = '5px';
                optionBtn.style.marginBottom = '3px';
                optionBtn.style.backgroundColor = 'transparent';
                optionBtn.style.border = 'none';
                optionBtn.style.cursor = 'pointer';
                optionBtn.style.width = '100%';
                optionBtn.style.textAlign = 'left';
                
                // 아이콘 추가
                const iconEl = document.createElement('span');
                iconEl.className = 'material-icons';
                iconEl.textContent = option.icon;
                iconEl.style.marginRight = '5px';
                optionBtn.appendChild(iconEl);
                
                // 텍스트 추가
                const textEl = document.createElement('span');
                textEl.textContent = option.text;
                optionBtn.appendChild(textEl);
                
                // 클릭 이벤트
                optionBtn.addEventListener('click', (e) => {
                  e.stopPropagation();
                  document.execCommand(option.command, false, null);
                  alignElement.remove(); // 옵션 선택 후 드롭다운 삭제
                  contentArea.focus(); // 에디터에 포커스 돌리기
                });
                
                alignElement.appendChild(optionBtn);
              });
              
              // 드롭다운 추가
              document.body.appendChild(alignElement);
              
              // body 클릭 시 드롭다운 삭제
              setTimeout(() => {
                const clickOutsideHandler = (e) => {
                  if (!alignElement.contains(e.target) && e.target !== buttonElement) {
                    alignElement.remove();
                    document.removeEventListener('click', clickOutsideHandler);
                  }
                };
                document.addEventListener('click', clickOutsideHandler);
              }, 0);
              
              // 기본 동작 방지
              return false;
            } else if (pluginName === 'blockquote') {
              document.execCommand('formatBlock', false, 'blockquote');
            } else if (pluginName === 'code') {
              document.execCommand('formatBlock', false, 'pre');
            } else if (pluginName === 'codeBlock') {
              document.execCommand('formatBlock', false, 'pre');
            } else if (pluginName === 'image') {
              const imageUrl = prompt('Enter image URL:', 'https://example.com/image.jpg');
              if (imageUrl) {
                document.execCommand('insertImage', false, imageUrl);
              }
            } else if (pluginName === 'table') {
              // 행과 열 수를 입력받음
              const rows = prompt('Enter number of rows:', '3');
              const cols = prompt('Enter number of columns:', '3');
              
              if (rows && cols) {
                let tableHtml = '<table border="1" style="width:100%;border-collapse:collapse;">';
                for (let i = 0; i < parseInt(rows); i++) {
                  tableHtml += '<tr>';
                  for (let j = 0; j < parseInt(cols); j++) {
                    tableHtml += '<td style="padding:8px;">Cell</td>';
                  }
                  tableHtml += '</tr>';
                }
                tableHtml += '</table>';
                document.execCommand('insertHTML', false, tableHtml);
              }
            } else if (pluginName === 'reset') {
              document.execCommand('removeFormat', false, null);
            } else {
              // 기본 기능이 없는 경우, 아직 구현되지 않았음을 알림
              errorHandler.logError('Core', errorHandler.codes.PLUGINS.REGISTER, e);
            }
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
          
          // active 클래스를 토글하지 않음 - 시각적 상태는 mousedown/mouseup 이벤트만으로 처리
          
          // 선택 영역 저장
          if (window.liteEditorSelection) {
            window.liteEditorSelection.save();
          }
          
          // 이벤트 객체 전달!
          if (currentPlugin && typeof currentPlugin.action === 'function') {
            currentPlugin.action(contentArea, buttonElement, e);
          }
          
          // 처리 중 플래그가 없는 경우에만 복원 (인라인 태그와 그 외 플러그인 구분)
          if (!buttonElement.hasAttribute('data-processing')) {
            // 일반 플러그인 - 코어에서 선택 영역 복원
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
    
    // 키 입력 이벤트
    contentArea.addEventListener('keyup', (e) => {
      // TextArea인 경우 원본 요소 업데이트
      if (originalElement.tagName === 'TEXTAREA') {
        originalElement.value = contentArea.innerHTML;
      }
      
      // 현재 선택 영역 저장
      saveSelection();
    });
    
    // 마우스 업 이벤트 (텍스트 선택 완료 시)
    contentArea.addEventListener('mouseup', () => {
      // 현재 선택 영역 저장
      saveSelection();
    });
    
    // 포커스 이벤트
    contentArea.addEventListener('focus', () => {
      if (savedSelection) {
        // 이전에 저장된 선택 영역이 있으면 복원 시도
        setTimeout(() => {
          restoreSelection();
        }, 0);
      }
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
    
    // 링크 클릭 이벤트 핸들러 (추가할 코드)
    contentArea.addEventListener('mousedown', (e) => {
      // 클릭된 요소가 링크인지 확인
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
      }
    });
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
    getPlugin,
    getAllPlugins
  };
})();

// 노출된 API
window.LiteEditor = LiteEditor;
