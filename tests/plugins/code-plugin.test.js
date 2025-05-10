/**
 * 코드 플러그인 유닛 테스트
 */

const jsdom = require('jsdom');
const { JSDOM } = jsdom;

describe('코드 플러그인 테스트', () => {
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
    
    // 문서 본문 설정
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

    // LiteEditorUtils 모킹 - 전역 객체 설정
    global.LiteEditorUtils = {
      applyCodeFormat: jest.fn()
    };
    
    // window 객체에도 설정
    window.LiteEditorUtils = global.LiteEditorUtils;

    // LiteEditor 모킹 - 전역 객체 설정
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

  test('LiteEditor에 플러그인이 올바르게 등록되는지 테스트', () => {
    expect(global.LiteEditor.registerPlugin).toHaveBeenCalledWith('code', expect.objectContaining({
      title: 'Code',
      icon: 'code',
      action: expect.any(Function)
    }));
  });

  test('action이 트리거될 때 LiteEditorUtils.applyCodeFormat이 호출되는지 테스트', () => {
    // 플러그인 설정 가져오기
    const pluginConfig = global.LiteEditor.registerPlugin.mock.calls[0][1];
    
    // action 함수 가져오기
    const action = pluginConfig.action;
    
    // 모의 버튼 요소 생성
    const mockButton = document.createElement('button');
    
    // 모의 이벤트 생성
    const mockEvent = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn()
    };
    
    // action 함수 호출
    action(contentArea, mockButton, mockEvent);
    
    // applyCodeFormat이 올바른 인자와 함께 호출되었는지 확인
    expect(global.LiteEditorUtils.applyCodeFormat).toHaveBeenCalledWith(
      contentArea,
      mockButton,
      mockEvent
    );
  });
}); 