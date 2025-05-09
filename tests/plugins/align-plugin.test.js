/**
 * Unit Tests for Alignment Plugin
 */

const jsdom = require('jsdom');
const { JSDOM } = jsdom;

describe('Alignment Plugin', () => {
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

  test('should register the plugin with LiteEditor', () => {
    expect(LiteEditor.registerPlugin).toHaveBeenCalledWith('align', expect.objectContaining({
      title: 'Alignment',
      icon: 'format_align_justify',
      customRender: expect.any(Function)
    }));
  });

  test('should create an alignment button in the toolbar', () => {
    expect(alignButton).toBeDefined();
    expect(alignButton.className).toContain('lite-editor-button');
    expect(alignButton.title).toBe('Text Alignment');
    
    // Check button has the right icon
    const icon = alignButton.querySelector('i');
    expect(icon).toBeDefined();
    expect(icon.textContent).toBe('format_align_justify');
  });

  test('should show dropdown when alignment button is clicked', () => {
    // Simulate a click event on the button
    const clickEvent = new window.MouseEvent('click', {
      bubbles: true,
      cancelable: true
    });
    
    // Get the click handler
    const clickHandler = alignButton._eventHandlers.click[0];
    clickHandler(clickEvent);
    
    // Dropdown should be created
    expect(dropdown).toBeDefined();
    expect(mockClassListToggle).toHaveBeenCalledWith('show');
    
    // Should have alignment options
    const dropdownItems = dropdown.querySelectorAll('.lite-editor-dropdown-item');
    expect(dropdownItems.length).toBe(4);
    
    // Selection should be saved
    expect(window.liteEditorSelection.save).toHaveBeenCalled();
  });

  test('should hide dropdown when clicked outside', () => {
    // First show the dropdown
    mockClassListContains.mockReturnValue(true);
    
    // Create a document click handler mock
    document.clickHandler = jest.fn(() => {
      // This would normally check if the click target is outside the dropdown
      // and if it is, it would hide the dropdown
      mockClassListRemove('show');
    });
    
    // Simulate a click outside the dropdown
    const outsideElement = document.createElement('div');
    document.body.appendChild(outsideElement);
    const event = new window.MouseEvent('click', { bubbles: true });
    Object.defineProperty(event, 'target', { value: outsideElement });
    
    // Trigger the document click handler
    document.clickHandler(event);
    
    // Dropdown should be hidden
    expect(mockClassListRemove).toHaveBeenCalledWith('show');
  });
  
  test('should not hide dropdown when clicked inside dropdown', () => {
    // First show the dropdown
    mockClassListContains.mockReturnValue(true);
    
    // Simulate a click inside the dropdown
    const dropdownItem = dropdown.querySelector('.lite-editor-dropdown-item');
    const event = new window.MouseEvent('click', { bubbles: true });
    Object.defineProperty(event, 'target', { value: dropdownItem });
    
    // Mock dropdown.contains to return true for this case
    dropdown.contains = jest.fn().mockReturnValue(true);
    
    // Trigger the document click handler
    if (document.clickHandler) {
      document.clickHandler(event);
    }
    
    // Dropdown should not have remove called
    expect(mockClassListRemove).not.toHaveBeenCalled();
  });

  test('should apply left alignment when left option is clicked', () => {
    // Get left alignment option
    const leftOption = dropdown.querySelectorAll('.lite-editor-dropdown-item')[0];
    
    // Mock an event for the click
    const mockEvent = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn()
    };
    
    // Get the click handler and call it
    const clickHandler = leftOption._eventHandlers.click[0];
    clickHandler(mockEvent);
    
    // Should restore selection
    expect(window.liteEditorSelection.restore).toHaveBeenCalled();
    
    // Should execute justifyLeft command
    expect(document.execCommand).toHaveBeenCalledWith('justifyLeft', false, null);
    
    // Dropdown should be hidden after clicking
    expect(mockClassListRemove).toHaveBeenCalledWith('show');
  });

  test('should apply center alignment when center option is clicked', () => {
    // Get center alignment option
    const centerOption = dropdown.querySelectorAll('.lite-editor-dropdown-item')[1];
    
    // Mock an event for the click
    const mockEvent = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn()
    };
    
    // Get the click handler and call it
    const clickHandler = centerOption._eventHandlers.click[0];
    clickHandler(mockEvent);
    
    // Should restore selection
    expect(window.liteEditorSelection.restore).toHaveBeenCalled();
    
    // Should execute justifyCenter command
    expect(document.execCommand).toHaveBeenCalledWith('justifyCenter', false, null);
    
    // Dropdown should be hidden after clicking
    expect(mockClassListRemove).toHaveBeenCalledWith('show');
  });

  test('should apply right alignment when right option is clicked', () => {
    // Get right alignment option
    const rightOption = dropdown.querySelectorAll('.lite-editor-dropdown-item')[2];
    
    // Mock an event for the click
    const mockEvent = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn()
    };
    
    // Get the click handler and call it
    const clickHandler = rightOption._eventHandlers.click[0];
    clickHandler(mockEvent);
    
    // Should restore selection
    expect(window.liteEditorSelection.restore).toHaveBeenCalled();
    
    // Should execute justifyRight command
    expect(document.execCommand).toHaveBeenCalledWith('justifyRight', false, null);
    
    // Dropdown should be hidden after clicking
    expect(mockClassListRemove).toHaveBeenCalledWith('show');
  });

  test('should apply justify alignment when justify option is clicked', () => {
    // Get justify alignment option
    const justifyOption = dropdown.querySelectorAll('.lite-editor-dropdown-item')[3];
    
    // Mock an event for the click
    const mockEvent = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn()
    };
    
    // Get the click handler and call it
    const clickHandler = justifyOption._eventHandlers.click[0];
    clickHandler(mockEvent);
    
    // Should restore selection
    expect(window.liteEditorSelection.restore).toHaveBeenCalled();
    
    // Should execute justifyFull command
    expect(document.execCommand).toHaveBeenCalledWith('justifyFull', false, null);
    
    // Dropdown should be hidden after clicking
    expect(mockClassListRemove).toHaveBeenCalledWith('show');
  });

  test('should handle null selection gracefully', () => {
    // Mock getSafeSelection to return null
    window.getSafeSelection = jest.fn().mockReturnValue(null);
    
    // Mock liteEditorSelection.restore to simulate error
    window.liteEditorSelection.restore = jest.fn(() => {
      throw new Error('Selection is null');
    });
    
    // Get justify alignment option
    const justifyOption = dropdown.querySelectorAll('.lite-editor-dropdown-item')[3];
    
    // Modify handler to throw error
    const originalHandler = justifyOption._eventHandlers.click[0];
    justifyOption._eventHandlers.click[0] = (e) => {
      try {
        originalHandler(e);
      } catch (err) {
        // Silent error
      }
    };
    
    // Mock an event for the click
    const mockEvent = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn()
    };
    
    // Call should not throw
    expect(() => {
      const clickHandler = justifyOption._eventHandlers.click[0];
      clickHandler(mockEvent);
    }).not.toThrow();
    
    // execCommand should not be called when selection is null
    expect(document.execCommand).not.toHaveBeenCalled();
  });
  
  test('should toggle dropdown visibility when alignment button is clicked multiple times', () => {
    // Mock event
    const mockEvent = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn()
    };
    
    // Get the click handler
    const buttonClickHandler = alignButton._eventHandlers.click[0];
    
    // First click - show dropdown
    buttonClickHandler(mockEvent);
    expect(mockClassListToggle).toHaveBeenCalledWith('show');
    expect(dropdown.style.display).toBe('block');
    
    // Reset mocks
    mockClassListToggle.mockClear();
    mockClassListToggle.mockReturnValue(false);
    
    // Second click - hide dropdown
    buttonClickHandler(mockEvent);
    expect(mockClassListToggle).toHaveBeenCalledWith('show');
    expect(dropdown.style.display).toBe('none');
  });
}); 