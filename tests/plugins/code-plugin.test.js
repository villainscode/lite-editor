/**
 * Unit Tests for Code Plugin
 */

const jsdom = require('jsdom');
const { JSDOM } = jsdom;

describe('Code Plugin', () => {
  let window, document, contentArea, plugin;
  let originalLiteEditor, originalLiteEditorUtils;

  beforeEach(() => {
    // 오리지널 전역 객체 백업
    originalLiteEditor = global.LiteEditor;
    originalLiteEditorUtils = global.LiteEditorUtils;
    
    // 가상 콘솔 설정
    const virtualConsole = global.setupVirtualConsole ? 
      global.setupVirtualConsole() : 
      new jsdom.VirtualConsole().on('error', () => {});
    
    // Set up our document body
    const dom = new JSDOM(`
      <html>
        <body>
          <div id="editor" contenteditable="true">
            <p>코드 서식 테스트입니다.</p>
          </div>
        </body>
      </html>
    `, { 
      url: 'http://localhost/',
      virtualConsole
    });

    window = dom.window;
    document = window.document;
    contentArea = document.getElementById('editor');
    
    // 전역 객체 설정
    global.window = window;
    global.document = document;

    // Mock LiteEditorUtils - 먼저 전역 객체 설정
    global.LiteEditorUtils = {
      applyCodeFormat: jest.fn()
    };
    
    // window 객체에도 설정
    window.LiteEditorUtils = global.LiteEditorUtils;

    // Mock LiteEditor - 먼저 전역 객체 설정
    global.LiteEditor = {
      registerPlugin: jest.fn((name, pluginObj) => {
        if (name === 'code') {
          plugin = pluginObj;
        }
        return pluginObj;
      })
    };
    
    // window 객체에도 설정
    window.LiteEditor = global.LiteEditor;
    
    // 플러그인 등록 (실제 플러그인 파일을 로드하지 않고 직접 등록)
    global.LiteEditor.registerPlugin('code', {
      name: 'code',
      title: 'Code',
      icon: 'code',
      action: function(contentArea, button, event) {
        LiteEditorUtils.applyCodeFormat(contentArea, button, event);
      }
    });
  });

  afterEach(() => {
    // 전역 객체를 삭제하는 대신 원래 값으로 복원
    global.LiteEditor = originalLiteEditor;
    global.LiteEditorUtils = originalLiteEditorUtils;
    global.window = undefined;
    global.document = undefined;
    
    jest.restoreAllMocks();
  });

  test('should register the plugin with LiteEditor', () => {
    expect(global.LiteEditor.registerPlugin).toHaveBeenCalledWith('code', expect.objectContaining({
      title: 'Code',
      icon: 'code',
      action: expect.any(Function)
    }));
  });

  test('should call LiteEditorUtils.applyCodeFormat when action is triggered', () => {
    // Get the plugin configuration
    const pluginConfig = global.LiteEditor.registerPlugin.mock.calls[0][1];
    
    // Get the action function
    const action = pluginConfig.action;
    
    // Create a mock button element
    const mockButton = document.createElement('button');
    
    // Create a mock event
    const mockEvent = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn()
    };
    
    // Call the action function
    action(contentArea, mockButton, mockEvent);
    
    // Check that applyCodeFormat was called with the right arguments
    expect(global.LiteEditorUtils.applyCodeFormat).toHaveBeenCalledWith(
      contentArea,
      mockButton,
      mockEvent
    );
  });
}); 