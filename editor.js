/**
 * LiteEditor - A lightweight, embeddable rich text editor
 * Version 1.0.0
 */

const LiteEditor = (function() {
  // Store editor instances
  const instances = [];
  
  // Plugin registry
  const plugins = {};
  
  // Default configuration
  const defaultConfig = {
    plugins: ['heading', 'fontcolor', 'highlight', 'bold', 'italic', 'underline', 'strike', 'alignleft', 'aligncenter', 'alignright', 'formatindentincrease', 'formatindentdecrease', 'blockquote', 'code', 'codeblock', 'bulletedlist', 'numberlist', 'checklist', 'link', 'image', 'table', 'reset'],
    placeholder: '내용을 입력하세요...'
  };
  
  /**
   * Initialize the editor
   * @param {string|HTMLElement} selector - CSS selector or DOM element
   * @param {Object} customConfig - Custom configuration options
   * @returns {Object} Editor instance
   */
  function init(selector, customConfig = {}) {
    const target = typeof selector === 'string' 
      ? document.querySelector(selector) 
      : selector;
    
    if (!target) {
      console.error('LiteEditor: Target element not found');
      return null;
    }
    
    // Create editor instance
    const instance = createEditorInstance(target, {...defaultConfig, ...customConfig});
    instances.push(instance);
    
    return instance;
  }
  
  /**
   * Create an editor instance
   * @param {HTMLElement} target - Target element
   * @param {Object} config - Configuration options
   * @returns {Object} Editor instance
   */
  function createEditorInstance(target, config) {
    // Create editor container
    const editorContainer = document.createElement('div');
    editorContainer.className = 'lite-editor';
    
    // Create toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'lite-editor-toolbar';
    
    // Create content area
    const contentArea = document.createElement('div');
    contentArea.className = 'lite-editor-content';
    contentArea.contentEditable = true;
    contentArea.setAttribute('spellcheck', 'false');
    contentArea.setAttribute('data-placeholder', config.placeholder);
    
    // If target is already an editable element, copy its content
    if (target.hasAttribute('contenteditable')) {
      contentArea.innerHTML = target.innerHTML;
      target.parentNode.replaceChild(editorContainer, target);
    } else {
      // Insert the editor before the target element
      target.parentNode.insertBefore(editorContainer, target);
      target.style.display = 'none';
    }
    
    // Append toolbar and content area to editor container
    editorContainer.appendChild(toolbar);
    editorContainer.appendChild(contentArea);
    
    // Initialize plugins
    console.log('Available plugins:', config.plugins);
    initializePlugins(toolbar, contentArea, config);
    
    // Set up event listeners
    setupEventListeners(contentArea, target);
    
    return {
      container: editorContainer,
      toolbar: toolbar,
      content: contentArea,
      target: target,
      config: config,
      
      // API methods
      getContent: () => contentArea.innerHTML,
      setContent: (html) => { contentArea.innerHTML = html; },
      focus: () => contentArea.focus(),
      destroy: () => {
        // Remove event listeners
        contentArea.removeEventListener('input', syncContent);
        contentArea.removeEventListener('keydown', handleKeyDown);
        
        // If original element was editable, restore it
        if (target.hasAttribute('contenteditable')) {
          target.innerHTML = contentArea.innerHTML;
          editorContainer.parentNode.replaceChild(target, editorContainer);
        } else {
          // Otherwise just remove the editor
          editorContainer.parentNode.removeChild(editorContainer);
          target.style.display = '';
        }
        
        // Remove from instances array
        const index = instances.findIndex(i => i.container === editorContainer);
        if (index !== -1) {
          instances.splice(index, 1);
        }
      }
    };
  }
  
  /**
   * Initialize plugins for an editor instance
   * @param {HTMLElement} toolbar - Toolbar element
   * @param {HTMLElement} contentArea - Content area element
   * @param {Object} config - Configuration options
   */
  function initializePlugins(toolbar, contentArea, config) {
    const availablePlugins = config.plugins || [];
    // Check if dividers configuration exists
    const dividers = config.dividers || [];
    
    availablePlugins.forEach((pluginName, index) => {
      // 먼저 현재 플러그인이 divider가 필요한지 확인
      if (dividers.includes(pluginName)) {
        const divider = document.createElement('div');
        divider.className = 'lite-editor-divider';
        toolbar.appendChild(divider);
      }
      
      const plugin = plugins[pluginName];
      console.log('Initializing plugin:', pluginName, plugin ? 'found' : 'not found');
      
      if (plugin) {
        // 커스텀 렌더링이 있는 경우 (예: 폰트 선택)
        if (plugin.customRender && typeof plugin.customRender === 'function') {
          const customElement = plugin.customRender(toolbar, contentArea);
          if (customElement) {
            toolbar.appendChild(customElement);
          }
        } else {
          // 기본 버튼 생성
          const buttonElement = document.createElement('button');
          buttonElement.type = 'button';
          buttonElement.className = 'lite-editor-button';
          buttonElement.title = plugin.title;
          
          // Add icon
          const iconElement = document.createElement('span');
          iconElement.className = 'material-icons';
          iconElement.textContent = plugin.icon;
          buttonElement.appendChild(iconElement);
          
          // Add click event
          buttonElement.addEventListener('click', (e) => {
            e.preventDefault();
            plugin.action(contentArea, buttonElement);
            contentArea.focus();
          });
          
          // Add to toolbar
          toolbar.appendChild(buttonElement);
        }
      }
    });
  }
  
  /**
   * Set up event listeners for the editor
   * @param {HTMLElement} contentArea - Content area element
   * @param {HTMLElement} originalElement - Original element
   */
  function setupEventListeners(contentArea, originalElement) {
    // Function to sync content with original element
    const syncContent = () => {
      if (originalElement.tagName === 'TEXTAREA' || originalElement.tagName === 'INPUT') {
        originalElement.value = contentArea.innerHTML;
      } else {
        originalElement.innerHTML = contentArea.innerHTML;
      }
      
      // Trigger change event on original element
      const event = new Event('change', { bubbles: true });
      originalElement.dispatchEvent(event);
    };
    
    // Listen for input events
    contentArea.addEventListener('input', syncContent);
    
    // Handle keyboard shortcuts
    contentArea.addEventListener('keydown', (e) => {
      // Implement common keyboard shortcuts here
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'b': // Bold
            e.preventDefault();
            document.execCommand('bold', false, null);
            break;
          case 'i': // Italic
            e.preventDefault();
            document.execCommand('italic', false, null);
            break;
          case 'u': // Underline
            e.preventDefault();
            document.execCommand('underline', false, null);
            break;
        }
      }
    });
  }
  
  /**
   * Register a new plugin
   * @param {string} name - Plugin name
   * @param {Object} pluginDefinition - Plugin definition object
   */
  function registerPlugin(name, pluginDefinition) {
    console.log('Registering plugin:', name);
    plugins[name] = pluginDefinition;
  }
  
  // Register built-in plugins
  
  // 기본 플러그인들 등록
  
  // Undo plugin
  registerPlugin('undo', {
    title: 'undo',
    icon: 'undo',
    action: (contentArea) => {
      document.execCommand('undo', false, null);
    }
  });
  
  // Redo plugin
  registerPlugin('redo', {
    title: 'redo',
    icon: 'redo',
    action: (contentArea) => {
      document.execCommand('redo', false, null);
    }
  });
  
  // Font Family plugin
  registerPlugin('fontFamily', {
    title: 'font family',
    icon: 'text_format',
    action: (contentArea, buttonElement) => {
      // 드롭다운 메뉴 토글 (이미 action 함수가 이벤트에 연결됨)
      const dropdown = buttonElement.querySelector('.lite-editor-dropdown-menu');
      if (dropdown) {
        dropdown.classList.toggle('show');
      }
    },
    customRender: (toolbar, contentArea) => {
      console.log('폰트 플러그인 렌더링');
      // 폰트 그룹 정의
      const fontGroups = [
        {
          label: 'Basic',
          fonts: [
            { value: 'Arial, sans-serif', label: 'Arial' },
            { value: 'Comic Sans MS, cursive', label: 'Comic Sans MS' },
            { value: 'Helvetica, sans-serif', label: 'Helvetica' },
            { value: 'Tahoma, sans-serif', label: 'Tahoma' },
            { value: 'Trebuchet MS, sans-serif', label: 'Trebuchet MS' },
            { value: 'Verdana, sans-serif', label: 'Verdana' }
          ]
        },
        {
          label: 'Korean',
          fonts: [
            { value: "'Noto Sans KR', sans-serif", label: 'Noto Sans KR' },
            { value: "'Nanum Gothic', sans-serif", label: 'Nanum Gothic' },
            { value: "'굴림체', '굴림', 'Gulim', sans-serif", label: '굴림체' },
            { value: "'바탕체', '바탕', 'Batang', serif", label: '바탕체' }
          ]
        },
        {
          label: 'Coding',
          fonts: [
            { value: "'IBM Plex Mono', monospace", label: 'IBM Plex Mono' },
            { value: "'Hack', monospace", label: 'Hack' },
            { value: "'JetBrains Mono', monospace", label: 'JetBrains Mono' },
            { value: 'Consolas, monospace', label: 'Consolas' }
          ]
        }
      ];
      
      // 현재 선택된 폰트 표시용 컨테이너
      const fontContainer = document.createElement('div');
      fontContainer.className = 'lite-editor-button lite-editor-font-button';
      fontContainer.title = 'Font Family';
      
      // 아이콘 추가
      const iconElement = document.createElement('span');
      iconElement.className = 'material-icons';
      iconElement.textContent = 'text_format';
      fontContainer.appendChild(iconElement);
      
      // 드롭다운 메뉴 생성 (문서 최상단에 배치)
      const dropdownMenu = document.createElement('div');
      dropdownMenu.className = 'lite-editor-dropdown-menu';
      dropdownMenu.style.position = 'fixed'; // 고정 포지션으로 변경
      
      // 드롭다운 헤더 생성
      const dropdownHeader = document.createElement('div');
      dropdownHeader.className = 'lite-editor-dropdown-header';
      dropdownHeader.textContent = 'Font Family';
      dropdownMenu.appendChild(dropdownHeader);
      
      // 드롭다운 리스트 생성
      const menuList = document.createElement('ul');
      menuList.className = 'lite-editor-dropdown-menu-list';
      
      // 그룹별로 폰트 아이템 추가
      fontGroups.forEach(group => {
        // 그룹 레이블 추가
        const groupLabel = document.createElement('div');
        groupLabel.className = 'lite-editor-dropdown-group';
        groupLabel.textContent = group.label;
        menuList.appendChild(groupLabel);
        
        // 해당 그룹의 폰트 추가
        group.fonts.forEach(font => {
          const listItem = document.createElement('li');
          listItem.setAttribute('data-value', font.value);
          
          const link = document.createElement('a');
          link.href = '#';
          
          // 폰트 이름 설정
          link.textContent = font.label;
          link.style.fontFamily = font.value; // 해당 폰트로 표시
          
          // 폰트 선택 이벤트
          link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // 이전 선택 상태 제거
            const prevSelected = menuList.querySelector('li.selected');
            if (prevSelected) {
              prevSelected.classList.remove('selected');
            }
            
            // 현재 선택 항목 표시
            listItem.classList.add('selected');
            
            // 폰트 적용
            document.execCommand('fontName', false, font.value);
            
            // 드롭다운 닫기
            dropdownMenu.classList.remove('show');
            
            // 컨텐츠 영역에 포커스
            contentArea.focus();
          });
          
          listItem.appendChild(link);
          menuList.appendChild(listItem);
        });
      });
      
      dropdownMenu.appendChild(menuList);
      
      // 드롭다운을 문서 body에 직접 추가하여 z-index 문제 해결
      document.body.appendChild(dropdownMenu);
      
      // 드롭다운과 버튼 연결을 위해 버튼에 레퍼런스 저장
      fontContainer.dropdownMenu = dropdownMenu;
      
      // 클릭 이벤트 수정 - 기본 액션 대신 여기서 처리
      fontContainer.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation(); // 이벤트 버블링 방지
        console.log('폰트 버튼 클릭됨');
        
        // 다른 모든 드롭다운 먼저 닫기
        document.querySelectorAll('.lite-editor-dropdown-menu.show').forEach(menu => {
          if (menu !== fontContainer.dropdownMenu) menu.classList.remove('show');
        });
        
        // 이 드롭다운 토글
        const dropdownMenu = fontContainer.dropdownMenu;
        dropdownMenu.classList.toggle('show');
        
        // 드롭다운 메뉴 위치 조정
        if (dropdownMenu.classList.contains('show')) {
          const buttonRect = fontContainer.getBoundingClientRect();
          
          // 절대 위치로 계산
          dropdownMenu.style.top = (buttonRect.bottom + window.scrollY) + 'px';
          dropdownMenu.style.left = buttonRect.left + 'px';
          
          // 콘솔로 디버그 정보 추가
          console.log('버튼 위치:', buttonRect.top, buttonRect.bottom);
          console.log('드롭다운 위치:', dropdownMenu.style.top, dropdownMenu.style.left);
          
          // 가시성 강제 확인
          dropdownMenu.style.visibility = 'visible';
          dropdownMenu.style.opacity = '1';
        }
        
        console.log('드롭다운 상태:', dropdownMenu.classList.contains('show') ? '열림' : '닫힘');
      });
      
      // 드롭다운 외부 클릭 시 닫기 (전역 핸들러)
      // 기존 핸들러가 중복 등록되는 것을 방지하기 위해 한 번만 등록
      if (!window.fontDropdownInitialized) {
        document.addEventListener('click', (e) => {
          // 클릭된 요소가 드롭다운이나 폰트 버튼이 아니면 모든 드롭다운 닫기
          if (!e.target.closest('.lite-editor-dropdown-menu') && 
              !e.target.closest('.lite-editor-font-button')) {
            document.querySelectorAll('.lite-editor-dropdown-menu.show').forEach(dropdown => {
              dropdown.classList.remove('show');
            });
          }
        });
        window.fontDropdownInitialized = true;
      }
      
      return fontContainer;
    }
  });
  
  // Font Color plugin
  registerPlugin('fontcolor', {
    title: 'Font Color',
    icon: 'palette',
    customRender: (toolbar, contentArea) => {
      // 컨테이너 생성
      const colorContainer = document.createElement('div');
      colorContainer.className = 'lite-editor-button lite-editor-color-container';
      colorContainer.setAttribute('title', 'Font Color');
      
      // 아이콘 추가
      const icon = document.createElement('i');
      icon.className = 'material-icons';
      icon.textContent = 'palette';
      icon.style.fontSize = '20px';
      colorContainer.appendChild(icon);
      
      // 드롭다운 메뉴 생성
      const dropdownMenu = document.createElement('div');
      dropdownMenu.className = 'lite-editor-dropdown-menu';
      
      // 드롭다운 헤더 생성
      const dropdownHeader = document.createElement('div');
      dropdownHeader.className = 'lite-editor-dropdown-header';
      dropdownHeader.textContent = 'Color';
      dropdownMenu.appendChild(dropdownHeader);
      
      // 색상 그리드 생성
      const colorGrid = document.createElement('div');
      colorGrid.className = 'lite-editor-color-grid';
      dropdownMenu.appendChild(colorGrid);
      
      // 색상 목록
      const colors = [
        '#ffffff', '#efefef', '#d2d2d2', '#aaaaaa', '#919191', '#525252', '#000000',
        '#ffe2e2', '#ffaea7', '#ff4141', '#ff0000', '#b10000', '#b205d0', '#defffb', 
        '#5cecff', '#49c5ff', '#549eff', '#005dfd', '#aaffb8', '#8aff6f', '#2dff34', 
        '#09e809', '#02b711', '#fdffd0', '#fff6a2', '#ffef0e', '#edf101', '#dcd100'
      ];
      
      // 색상 셀 생성
      colors.forEach(color => {
        const colorCell = document.createElement('div');
        colorCell.className = 'lite-editor-color-cell';
        colorCell.style.backgroundColor = color;
        colorCell.setAttribute('data-color', color);
        
        // 셀 클릭 이벤트
        colorCell.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const selectedColor = e.target.getAttribute('data-color');
          document.execCommand('foreColor', false, selectedColor);
          dropdownMenu.classList.remove('show');
          contentArea.focus();
        });
        
        colorGrid.appendChild(colorCell);
      });
      
      // 드롭다운을 문서 body에 직접 추가
      document.body.appendChild(dropdownMenu);
      
      // 드롭다운과 버튼 연결
      colorContainer.dropdownMenu = dropdownMenu;
      
      // 클릭 이벤트 추가
      colorContainer.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation(); // 이벤트 버블링 방지
        console.log('커러 버튼 클릭됨');
        
        // 다른 모든 드롭다운 먼저 닫기
        document.querySelectorAll('.lite-editor-dropdown-menu.show').forEach(menu => {
          if (menu !== colorContainer.dropdownMenu) menu.classList.remove('show');
        });
        
        // 이 드롭다운 토글
        const dropdownMenu = colorContainer.dropdownMenu;
        dropdownMenu.classList.toggle('show');
        
        // 드롭다운 메뉴 위치 조정
        if (dropdownMenu.classList.contains('show')) {
          const buttonRect = colorContainer.getBoundingClientRect();
          
          // 절대 위치로 계산
          dropdownMenu.style.top = (buttonRect.bottom + window.scrollY) + 'px';
          dropdownMenu.style.left = buttonRect.left + 'px';
          
          // 콘솔로 디버그 정보 추가
          console.log('버튼 위치:', buttonRect.top, buttonRect.bottom);
          console.log('드롭다운 위치:', dropdownMenu.style.top, dropdownMenu.style.left);
          
          // 가시성 강제 확인
          dropdownMenu.style.visibility = 'visible';
          dropdownMenu.style.opacity = '1';
        }
        
        console.log('드롭다운 상태:', dropdownMenu.classList.contains('show') ? '열림' : '닫힘');
      });
      
      // 드롭다운 외부 클릭 시 닫기 (전역 핸들러)
      if (!window.colorDropdownInitialized) {
        document.addEventListener('click', (e) => {
          if (!e.target.closest('.lite-editor-dropdown-menu') &&
              !e.target.closest('.lite-editor-color-container')) {
            document.querySelectorAll('.lite-editor-dropdown-menu.show').forEach(menu => {
              menu.classList.remove('show');
            });
          }
        });
        window.colorDropdownInitialized = true;
      }
      
      return colorContainer;
    }
  });
  
  // Heading plugin
  registerPlugin('heading', {
    title: 'Format',
    icon: 'format_size',
    customRender: (toolbar, contentArea) => {
      // 헤딩 버튼 생성
      const headingContainer = document.createElement('div');
      headingContainer.className = 'lite-editor-button lite-editor-heading-container';
      headingContainer.setAttribute('title', 'Format');
      
      // 아이콘 추가
      const icon = document.createElement('i');
      icon.className = 'material-icons';
      icon.textContent = 'format_size';
      icon.style.fontSize = '20px';
      headingContainer.appendChild(icon);
      
      // 드롭다운 메뉴 생성
      const dropdownMenu = document.createElement('div');
      dropdownMenu.className = 'lite-editor-dropdown-menu';
      
      // 드롭다운 헤더 생성
      const dropdownHeader = document.createElement('div');
      dropdownHeader.className = 'lite-editor-dropdown-header';
      dropdownHeader.textContent = 'Format';
      dropdownMenu.appendChild(dropdownHeader);
      
      // 드롭다운 리스트 생성
      const menuList = document.createElement('ul');
      menuList.className = 'lite-editor-dropdown-menu-list';
      
      // 드롭다운 항목 정의
      const headingOptions = [
        { format: 'h1', label: 'Heading 1', style: 'font-size: 2em; font-weight: bold;' },
        { format: 'h2', label: 'Heading 2', style: 'font-size: 1.5em; font-weight: bold;' },
        { format: 'h3', label: 'Heading 3', style: 'font-size: 1.17em; font-weight: bold;' },
        { format: 'p', label: 'Text', style: 'font-size: 1em;' }
      ];
      
      // 항목 추가
      headingOptions.forEach(option => {
        const listItem = document.createElement('li');
        listItem.setAttribute('data-format', option.format);
        
        const link = document.createElement('a');
        link.href = '#';
        link.textContent = option.label;
        
        // 포맷 스타일 미리보기 적용
        if (option.style) {
          link.style.cssText = option.style;
        }
        
        // 클릭 이벤트 추가
        link.addEventListener('click', (e) => {
          e.preventDefault();
          
          // 이전 선택 상태 제거
          const prevSelected = menuList.querySelector('li.selected');
          if (prevSelected) {
            prevSelected.classList.remove('selected');
          }
          
          // 현재 선택 항목 표시
          listItem.classList.add('selected');
          
          // 헤딩 적용
          document.execCommand('formatBlock', false, `<${option.format}>`);
          
          // 드롭다운 닫기
          dropdownMenu.classList.remove('show');
          
          // 컨텐츠 영역에 포커스
          contentArea.focus();
        });
        
        listItem.appendChild(link);
        menuList.appendChild(listItem);
      });
      
      dropdownMenu.appendChild(menuList);
      
      // 드롭다운을 문서 body에 직접 추가
      document.body.appendChild(dropdownMenu);
      
      // 드롭다운과 버튼 연결을 위해 버튼에 레퍼런스 저장
      headingContainer.dropdownMenu = dropdownMenu;
      
      // 클릭 이벤트 추가
      headingContainer.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation(); // 이벤트 버블링 방지
        
        // 다른 모든 드롭다운 먼저 닫기
        document.querySelectorAll('.lite-editor-dropdown-menu').forEach(menu => {
          if (menu !== dropdownMenu) {
            menu.classList.remove('show');
          }
        });
        
        // 토글 드롭다운 표시/숨김
        dropdownMenu.classList.toggle('show');
        
        // 드롭다운 메뉴 위치 조정
        if (dropdownMenu.classList.contains('show')) {
          const buttonRect = headingContainer.getBoundingClientRect();
          
          // 절대 위치로 계산
          dropdownMenu.style.top = (buttonRect.bottom + window.scrollY) + 'px';
          dropdownMenu.style.left = buttonRect.left + 'px';
          
          // 가시성 확인
          dropdownMenu.style.visibility = 'visible';
          dropdownMenu.style.opacity = '1';
        }
      });
      
      // 다른 곳 클릭 시 드롭다운 닫기
      document.addEventListener('click', (e) => {
        if (!headingContainer.contains(e.target) && !dropdownMenu.contains(e.target)) {
          dropdownMenu.classList.remove('show');
        }
      });
      
      return headingContainer;
    }
  });

  // Highlight plugin
  registerPlugin('highlight', {
    title: 'Highlight Text',
    icon: 'border_color',
    customRender: (toolbar, contentArea) => {
      // 컨테이너 생성
      const highlightContainer = document.createElement('div');
      highlightContainer.className = 'lite-editor-button';
      highlightContainer.setAttribute('title', 'Highlight Text');
      
      // 아이콘 추가
      const icon = document.createElement('i');
      icon.className = 'material-icons';
      icon.textContent = 'border_color';
      icon.style.fontSize = '18px'; // 여기서 원하는 크기로 조정 (다른 아이콘보다 작게)
      
      highlightContainer.appendChild(icon);
      
      // 클릭 이벤트 추가
      highlightContainer.addEventListener('click', (e) => {
        e.preventDefault();
        document.execCommand('backColor', false, 'yellow'); // 'mark' 대신 'backColor'로 변경하여 더 나은 호환성
        contentArea.focus();
      });
      
      return highlightContainer;
    }
  });
  
  // Bold plugin
  registerPlugin('bold', {
    title: 'bold',
    icon: 'format_bold',
    action: (contentArea) => {
      document.execCommand('bold', false, null);
    }
  });
  
  // Italic plugin
  registerPlugin('italic', {
    title: 'italic',
    icon: 'format_italic',
    action: (contentArea) => {
      document.execCommand('italic', false, null);
    }
  });
  
  // Underline plugin
  registerPlugin('underline', {
    title: 'underline',
    icon: 'format_underlined',
    action: (contentArea) => {
      document.execCommand('underline', false, null);
    }
  });
  
  // Strike plugin
  registerPlugin('strike', {
    title: 'strike',
    icon: 'format_strikethrough',
    action: (contentArea) => {
      document.execCommand('strikeThrough', false, null);
    }
  });
  
  // Text Align plugin - 통합된 정렬 플러그인
  registerPlugin('textalign', {
    title: 'Alignment',
    icon: 'format_align_center',
    customRender: (toolbar, contentArea) => {
      // 컨테이너 생성
      const alignContainer = document.createElement('div');
      alignContainer.className = 'lite-editor-button lite-editor-align-container';
      alignContainer.setAttribute('title', 'Alignment');
      
      // 아이콘 추가
      const icon = document.createElement('i');
      icon.className = 'material-icons';
      icon.textContent = 'format_align_center';
      icon.style.fontSize = '20px';
      alignContainer.appendChild(icon);
      
      // 아이콘 드롭다운 메뉴 생성
      const alignPopup = document.createElement('div');
      alignPopup.className = 'lite-editor-align-popup';
      
      // 정렬 옵션 생성
      const alignOptions = [
        { command: 'justifyLeft', icon: 'format_align_left' },
        { command: 'justifyCenter', icon: 'format_align_center' },
        { command: 'justifyRight', icon: 'format_align_right' }
      ];
      
      // 아이콘 버튼들 추가
      alignOptions.forEach(option => {
        const button = document.createElement('button');
        button.className = 'lite-editor-align-button';
        button.setAttribute('title', option.command);
        button.setAttribute('data-command', option.command);
        
        // 아이콘 추가
        const optionIcon = document.createElement('i');
        optionIcon.className = 'material-icons';
        optionIcon.textContent = option.icon;
        optionIcon.style.fontSize = '18px';
        button.appendChild(optionIcon);
        
        // 클릭 이벤트 추가
        button.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          document.execCommand(option.command, false, null);
          alignPopup.classList.remove('show');
          contentArea.focus();
        });
        
        alignPopup.appendChild(button);
      });
      
      // 드롭다운을 문서 body에 직접 추가
      document.body.appendChild(alignPopup);
      
      // 드롭다운과 버튼 연결
      alignContainer.alignPopup = alignPopup;
      
      // 클릭 이벤트 추가
      alignContainer.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation(); // 이벤트 버블링 방지
        
        // 다른 모든 드롭다운 닫기
        document.querySelectorAll('.lite-editor-dropdown-menu.show').forEach(menu => {
          menu.classList.remove('show');
        });
        
        document.querySelectorAll('.lite-editor-align-popup.show').forEach(popup => {
          if (popup !== alignContainer.alignPopup) popup.classList.remove('show');
        });
        
        // 이 드롭다운 토글
        const alignPopup = alignContainer.alignPopup;
        alignPopup.classList.toggle('show');
        
        // 드롭다운 메뉴 위치 조정
        if (alignPopup.classList.contains('show')) {
          const buttonRect = alignContainer.getBoundingClientRect();
          
          // 절대 위치로 계산
          alignPopup.style.top = (buttonRect.bottom + window.scrollY) + 'px';
          alignPopup.style.left = buttonRect.left + 'px';
          
          // 가시성 강제 확인
          alignPopup.style.visibility = 'visible';
          alignPopup.style.opacity = '1';
        }
      });
      
      // 외부 클릭 시 닫기 (전역 핸들러)
      if (!window.alignPopupInitialized) {
        document.addEventListener('click', (e) => {
          if (!e.target.closest('.lite-editor-align-popup') &&
              !e.target.closest('.lite-editor-align-container')) {
            document.querySelectorAll('.lite-editor-align-popup.show').forEach(popup => {
              popup.classList.remove('show');
            });
          }
        });
        window.alignPopupInitialized = true;
      }
      
      return alignContainer;
    }
  });
  
  // 개별 정렬 플러그인 (index.html에서 참조하지 않도록 변경 필요)
  // 이 플러그인들은 더 이상 사용하지 않지만, 기존 코드와의 호환성을 위해 유지
  registerPlugin('alignleft', {
    title: 'align left',
    icon: 'format_align_left',
    action: (contentArea) => {
      document.execCommand('justifyLeft', false, null);
    }
  });
  
  registerPlugin('aligncenter', {
    title: 'align center',
    icon: 'format_align_center',
    action: (contentArea) => {
      document.execCommand('justifyCenter', false, null);
    }
  });
  
  registerPlugin('alignright', {
    title: 'align right',
    icon: 'format_align_right',
    action: (contentArea) => {
      document.execCommand('justifyRight', false, null);
    }
  });
 
  // Indent increase plugin
  registerPlugin('formatindentincrease', {
    title: 'indent increase',
    icon: 'format_indent_increase',
    action: (contentArea) => {
      document.execCommand('indent', false, null);
    }
  });
  
  // Indent decrease plugin
  registerPlugin('formatindentdecrease', {
    title: 'indent decrease',
    icon: 'format_indent_decrease',
    action: (contentArea) => {
      document.execCommand('outdent', false, null);
    }
  });
  
  // blockquote
  registerPlugin('blockquote', {
    title: 'blockquote',
    icon: 'format_quote',
    action: (contentArea) => {
      document.execCommand('formatBlock', false, '<blockquote>');
    }
  });
  
  // Code plugin
  registerPlugin('code', {
    title: 'code',
    icon: 'code',
    action: (contentArea) => {
      document.execCommand('formatBlock', false, '<pre>');
    }
  });
  
  // Code plugin
  registerPlugin('codeblock', {
    title: 'codeblock',
    icon: 'data_object',
    action: (contentArea) => {
      document.execCommand('formatBlock', false, '<pre>');
    }
  }); 
  
  
  
  // Code plugin
  registerPlugin('bulletedlist', {
    title: 'bulletedlist', 
    icon: 'format_list_bulleted',
    action: (contentArea) => {
      document.execCommand('formatBlock', false, '<pre>');
    }
  }); 


  
  // Code plugin
  registerPlugin('numberlist', {
    title: 'numberlist',
    icon: 'format_list_numbered',
    action: (contentArea) => {
      document.execCommand('formatBlock', false, '<pre>');
    }
  }); 

  // Code plugin
  registerPlugin('checklist', {
    title: 'checklist',
    icon: 'checklist',
    action: (contentArea) => {
      document.execCommand('formatBlock', false, '<pre>');
    }
  }); 

  // Link plugin
  registerPlugin('link', {
    title: 'link',
    icon: 'link',
    action: (contentArea) => {
      const url = prompt('링크 URL을 입력하세요:', 'http://');
      if (url) {
        document.execCommand('createLink', false, url);
      }
    }
  });

  // 이미지 추가 
  registerPlugin('image', {
    title: 'image',
    icon: 'image',
    action: (contentArea) => {
      const url = prompt('이미지 URL을 입력하세요:', 'http://');
      if (url) {
        const img = document.createElement('img');
        img.src = url;
        img.alt = 'Image';
        contentArea.appendChild(img);
      }
    }
  }); 

  // Table plugin
  registerPlugin('table', {
    title: 'table',
    icon: 'table_chart',
    action: (contentArea) => {
      const rows = prompt('행 수를 입력하세요:', '3');
      const cols = prompt('열 수를 입력하세요:', '3');
      if (rows && cols) {
        const table = document.createElement('table');
        for (let i = 0; i < rows; i++) {
          const row = document.createElement('tr');
          for (let j = 0; j < cols; j++) {
            const cell = document.createElement('td');
            cell.textContent = `Row ${i + 1}, Col ${j + 1}`;
            row.appendChild(cell);
          }
          table.appendChild(row);
        }
        contentArea.appendChild(table);
      }
    }
  });
  
  // Reset format plugin
  registerPlugin('reset', {
    title: 'format clear',
    icon: 'format_clear',
    action: (contentArea) => {
      document.execCommand('removeFormat', false, null);
    }
  });
  
  
  /**
   * Create a divider element and insert it before a specific plugin button
   * @param {HTMLElement} toolbar - Toolbar element
   * @param {string} pluginName - Name of the plugin to insert divider before
   * @returns {HTMLElement} The created divider element
   */
  function addDividerBeforePlugin(toolbar, pluginName) {
    const buttons = toolbar.querySelectorAll('.lite-editor-button');
    const plugins = Array.from(buttons).map(button => button.title);
    
    // Find the index of the plugin
    let targetIndex = -1;
    plugins.forEach((title, index) => {
      if (title.includes(pluginName)) {
        targetIndex = index;
      }
    });
    
    if (targetIndex === -1) {
      console.error('LiteEditor: Plugin not found:', pluginName);
      return null;
    }
    
    // Create and insert divider
    const divider = document.createElement('div');
    divider.className = 'lite-editor-divider';
    toolbar.insertBefore(divider, buttons[targetIndex]);
    
    return divider;
  }
  
  // Public API
  return {
    init,
    registerPlugin,
    addDividerBeforePlugin,
    getInstances: () => instances
  };
})();

// Add to global scope
window.LiteEditor = LiteEditor;
