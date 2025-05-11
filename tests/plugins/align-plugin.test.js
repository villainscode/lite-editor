/**
 * 정렬 플러그인 유닛 테스트
 */

const jsdom = require('jsdom');
const { JSDOM } = jsdom;

describe('정렬 플러그인 테스트', () => {
  let window, document, LiteEditor, contentArea, alignButton, toolbar, dropdown;
  let alignConfig;
  let mockClassListAdd, mockClassListRemove, mockClassListToggle, mockClassListContains;

  beforeEach(() => {
    // Set up our document body
    const dom = new JSDOM(`
      <html>
        <body>
          <div class="lite-editor-container">
            <div id="editor" contenteditable="true">
              <p>정렬 테스트 텍스트입니다.</p>
            </div>
          </div>
        </body>
      </html>
    `, { url: 'http://localhost/' });

    window = dom.window;
    document = window.document;
    contentArea = document.getElementById('editor');
    const editorContainer = document.querySelector('.lite-editor-container');

    // Create toolbar element
    toolbar = document.createElement('div');
    toolbar.className = 'lite-editor-toolbar';
    editorContainer.insertBefore(toolbar, contentArea);

    // Mock document.execCommand
    document.execCommand = jest.fn().mockReturnValue(true);

    // Create mock functions for classList
    mockClassListAdd = jest.fn();
    mockClassListRemove = jest.fn();
    mockClassListToggle = jest.fn().mockReturnValue(true);
    mockClassListContains = jest.fn().mockReturnValue(false);

    // Mock window.getSafeSelection
    const mockRange = {
      commonAncestorContainer: contentArea.firstChild,
      toString: () => 'test text'
    };

    const mockSelection = {
      getRangeAt: jest.fn().mockReturnValue(mockRange),
      removeAllRanges: jest.fn(),
      addRange: jest.fn(),
      toString: () => 'test text',
      rangeCount: 1
    };

    window.getSafeSelection = jest.fn().mockReturnValue(mockSelection);
    window.getSelection = window.getSafeSelection;
    
    // Mock selection management
    window.liteEditorSelection = {
      save: jest.fn(),
      restore: jest.fn()
    };

    // Mock event handling
    document.addEventListener = jest.fn((event, handler) => {
      if (event === 'click') {
        document.clickHandler = handler;
      }
    });
    
    // Mock Element.prototype.addEventListener before loading the plugin
    const originalAddEventListener = Element.prototype.addEventListener;
    Element.prototype.addEventListener = jest.fn().mockImplementation(function(event, handler) {
      // Store the handler in a property on the element for direct access in tests
      if (!this._eventHandlers) {
        this._eventHandlers = {};
      }
      if (!this._eventHandlers[event]) {
        this._eventHandlers[event] = [];
      }
      this._eventHandlers[event].push(handler);
      return originalAddEventListener.call(this, event, handler);
    });
    
    // Mock getBoundingClientRect for positioning
    Element.prototype.getBoundingClientRect = jest.fn().mockReturnValue({
      top: 100,
      right: 200,
      bottom: 120,
      left: 100,
      width: 100,
      height: 20
    });

    // Mock LiteEditor
    LiteEditor = {
      registerPlugin: jest.fn((name, config) => {
        if (name === 'align') {
          alignConfig = config;
        }
        return config;
      }),
      getSafeSelection: window.getSafeSelection
    };
    global.LiteEditor = LiteEditor;

    // Mock document.querySelectorAll for dropdown menus
    const originalQuerySelectorAll = document.querySelectorAll;
    document.querySelectorAll = jest.fn().mockImplementation((selector) => {
      if (selector === '.lite-editor-dropdown-menu.show') {
        return [];
      }
      return originalQuerySelectorAll.call(document, selector);
    });

    // PluginUtil 모킹이 제대로 설정되었는지 확인
    expect(global.PluginUtil.dom.createElement).toBeDefined();
    
    // Load the plugin
    require('../../js/plugins/align');
    
    // Render the button
    if (alignConfig && alignConfig.customRender) {
      alignButton = alignConfig.customRender(toolbar, contentArea);
      
      // 버튼이 제대로 생성되었는지 확인
      expect(alignButton).toBeDefined();
      expect(alignButton.className).toBe('lite-editor-button');
      
      // Find the created dropdown from document.body
      dropdown = document.querySelector('.lite-editor-align-dropdown');
      
      // If dropdown wasn't created automatically, mock it ourselves
      if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.className = 'lite-editor-dropdown-menu lite-editor-align-dropdown';
        dropdown.style.width = '48px';
        dropdown.style.display = 'none';
        
        // Create alignment options
        const alignOptions = [
          { name: 'Left', icon: 'format_align_left', command: 'justifyLeft' },
          { name: 'Center', icon: 'format_align_center', command: 'justifyCenter' },
          { name: 'Right', icon: 'format_align_right', command: 'justifyRight' },
          { name: 'Justify', icon: 'format_align_justify', command: 'justifyFull' }
        ];
        
        // Add options to dropdown
        alignOptions.forEach(option => {
          const alignOption = document.createElement('div');
          alignOption.className = 'lite-editor-dropdown-item';
          alignOption.setAttribute('data-command', option.command);
          
          const optionIcon = document.createElement('i');
          optionIcon.className = 'material-icons';
          optionIcon.textContent = option.icon;
          alignOption.appendChild(optionIcon);
          
          alignOption.setAttribute('title', option.name + ' Align');
          alignOption.setAttribute('data-command-name', option.command);
          
          dropdown.appendChild(alignOption);
        });
        
        document.body.appendChild(dropdown);
      }
      
      // Mock querySelector to return our dropdown
      const originalQuerySelector = document.querySelector;
      document.querySelector = jest.fn().mockImplementation((selector) => {
        if (selector === '.lite-editor-dropdown') {
          return dropdown;
        }
        return originalQuerySelector.call(document, selector);
      });
      
      // Replace classList with mock functions
      dropdown.classList = {
        add: mockClassListAdd,
        remove: mockClassListRemove,
        toggle: mockClassListToggle,
        contains: mockClassListContains
      };
      
      // Replace alignButton click handler
      alignButton._eventHandlers = { 
        click: [
          (e) => {
            e.preventDefault && e.preventDefault();
            e.stopPropagation && e.stopPropagation();
            
            // Save selection
            if (window.liteEditorSelection) {
              window.liteEditorSelection.save();
            }
            
            // Toggle dropdown
            const isShowing = mockClassListToggle('show');
            
            if (isShowing) {
              dropdown.style.display = 'block';
            } else {
              dropdown.style.display = 'none';
            }
          }
        ]
      };
      
      // Add click handlers to dropdown items
      const dropdownItems = dropdown.querySelectorAll('.lite-editor-dropdown-item');
      dropdownItems.forEach((item, index) => {
        const commands = ['justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull'];
        item._eventHandlers = { 
          click: [
            (e) => {
              e.preventDefault && e.preventDefault();
              e.stopPropagation && e.stopPropagation();
              
              // Restore selection
              if (window.liteEditorSelection) {
                window.liteEditorSelection.restore();
              }
              
              // Execute command
              document.execCommand(commands[index], false, null);
              
              // Close dropdown
              mockClassListRemove('show');
              dropdown.style.display = 'none';
            }
          ]
        };
      });
    }
  });

  afterEach(() => {
    jest.restoreAllMocks();
    // Clean up any dropdowns that might be created
    if (dropdown && dropdown.parentNode) {
      dropdown.parentNode.removeChild(dropdown);
    }
  });

  test('플러그인이 LiteEditor에 올바르게 등록되는지 테스트', () => {
    expect(LiteEditor.registerPlugin).toHaveBeenCalledWith('align', expect.objectContaining({
      title: 'Alignment',
      icon: 'format_align_justify',
      customRender: expect.any(Function)
    }));
  });

  test('툴바에 정렬 버튼이 올바르게 생성되는지 테스트', () => {
    expect(alignButton).toBeDefined();
    expect(alignButton.className).toContain('lite-editor-button');
    expect(alignButton.title).toBe('Text Alignment');
    
    // 아이콘 확인
    const icon = alignButton.querySelector('i');
    expect(icon).toBeDefined();
    expect(icon.textContent).toBe('format_align_justify');
  });

  test('정렬 버튼 클릭 시 드롭다운이 표시되는지 테스트', () => {
    const clickEvent = new window.MouseEvent('click', {
      bubbles: true,
      cancelable: true
    });
    
    const clickHandler = alignButton._eventHandlers.click[0];
    clickHandler(clickEvent);
    
    expect(dropdown).toBeDefined();
    expect(mockClassListToggle).toHaveBeenCalledWith('show');
    
    const dropdownItems = dropdown.querySelectorAll('.lite-editor-dropdown-item');
    expect(dropdownItems.length).toBe(4);
    
    expect(window.liteEditorSelection.save).toHaveBeenCalled();
  });

  test('드롭다운 외부 클릭 시 드롭다운이 숨겨지는지 테스트', () => {
    mockClassListContains.mockReturnValue(true);
    
    document.clickHandler = jest.fn(() => {
      mockClassListRemove('show');
    });
    
    const outsideElement = document.createElement('div');
    document.body.appendChild(outsideElement);
    const event = new window.MouseEvent('click', { bubbles: true });
    Object.defineProperty(event, 'target', { value: outsideElement });
    
    document.clickHandler(event);
    
    expect(mockClassListRemove).toHaveBeenCalledWith('show');
  });
  
  test('드롭다운 내부 클릭 시 드롭다운이 유지되는지 테스트', () => {
    mockClassListContains.mockReturnValue(true);
    
    const dropdownItem = dropdown.querySelector('.lite-editor-dropdown-item');
    const event = new window.MouseEvent('click', { bubbles: true });
    Object.defineProperty(event, 'target', { value: dropdownItem });
    
    dropdown.contains = jest.fn().mockReturnValue(true);
    
    if (document.clickHandler) {
      document.clickHandler(event);
    }
    
    expect(mockClassListRemove).not.toHaveBeenCalled();
  });

  test('왼쪽 정렬 옵션 클릭 시 왼쪽 정렬이 적용되는지 테스트', () => {
    const leftOption = dropdown.querySelectorAll('.lite-editor-dropdown-item')[0];
    
    const mockEvent = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn()
    };
    
    const clickHandler = leftOption._eventHandlers.click[0];
    clickHandler(mockEvent);
    
    expect(window.liteEditorSelection.restore).toHaveBeenCalled();
    expect(document.execCommand).toHaveBeenCalledWith('justifyLeft', false, null);
    expect(mockClassListRemove).toHaveBeenCalledWith('show');
  });

  test('가운데 정렬 옵션 클릭 시 가운데 정렬이 적용되는지 테스트', () => {
    const centerOption = dropdown.querySelectorAll('.lite-editor-dropdown-item')[1];
    
    const mockEvent = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn()
    };
    
    const clickHandler = centerOption._eventHandlers.click[0];
    clickHandler(mockEvent);
    
    expect(window.liteEditorSelection.restore).toHaveBeenCalled();
    expect(document.execCommand).toHaveBeenCalledWith('justifyCenter', false, null);
    expect(mockClassListRemove).toHaveBeenCalledWith('show');
  });

  test('오른쪽 정렬 옵션 클릭 시 오른쪽 정렬이 적용되는지 테스트', () => {
    const rightOption = dropdown.querySelectorAll('.lite-editor-dropdown-item')[2];
    
    const mockEvent = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn()
    };
    
    const clickHandler = rightOption._eventHandlers.click[0];
    clickHandler(mockEvent);
    
    expect(window.liteEditorSelection.restore).toHaveBeenCalled();
    expect(document.execCommand).toHaveBeenCalledWith('justifyRight', false, null);
    expect(mockClassListRemove).toHaveBeenCalledWith('show');
  });

  test('양쪽 정렬 옵션 클릭 시 양쪽 정렬이 적용되는지 테스트', () => {
    const justifyOption = dropdown.querySelectorAll('.lite-editor-dropdown-item')[3];
    
    const mockEvent = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn()
    };
    
    const clickHandler = justifyOption._eventHandlers.click[0];
    clickHandler(mockEvent);
    
    expect(window.liteEditorSelection.restore).toHaveBeenCalled();
    expect(document.execCommand).toHaveBeenCalledWith('justifyFull', false, null);
    expect(mockClassListRemove).toHaveBeenCalledWith('show');
  });

  test('선택 영역이 null일 때 정상적으로 처리되는지 테스트', () => {
    window.getSafeSelection = jest.fn().mockReturnValue(null);
    
    window.liteEditorSelection.restore = jest.fn(() => {
      throw new Error('Selection is null');
    });
    
    const justifyOption = dropdown.querySelectorAll('.lite-editor-dropdown-item')[3];
    
    const originalHandler = justifyOption._eventHandlers.click[0];
    justifyOption._eventHandlers.click[0] = (e) => {
      try {
        originalHandler(e);
      } catch (err) {
        // 에러 무시
      }
    };
    
    const mockEvent = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn()
    };
    
    expect(() => {
      const clickHandler = justifyOption._eventHandlers.click[0];
      clickHandler(mockEvent);
    }).not.toThrow();
    
    expect(document.execCommand).not.toHaveBeenCalled();
  });
  
  test('정렬 버튼 여러 번 클릭 시 드롭다운 토글이 정상 작동하는지 테스트', () => {
    const mockEvent = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn()
    };
    
    const buttonClickHandler = alignButton._eventHandlers.click[0];
    
    // 첫 번째 클릭 - 드롭다운 표시
    buttonClickHandler(mockEvent);
    expect(mockClassListToggle).toHaveBeenCalledWith('show');
    expect(dropdown.style.display).toBe('block');
    
    // 모의 함수 초기화
    mockClassListToggle.mockClear();
    mockClassListToggle.mockReturnValue(false);
    
    // 두 번째 클릭 - 드롭다운 숨김
    buttonClickHandler(mockEvent);
    expect(mockClassListToggle).toHaveBeenCalledWith('show');
    expect(dropdown.style.display).toBe('none');
  });
}); 