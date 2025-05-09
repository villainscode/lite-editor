/**
 * Unit Tests for Reset Plugin (Format Clearing)
 */

const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const path = require('path');
const fs = require('fs');

describe('Reset Plugin', () => {
  let window, document, contentArea, mockExecCommand;
  let resetPlugin; // 플러그인 객체를 저장할 변수

  beforeEach(() => {
    // Set up our document body
    const dom = new JSDOM(`
      <html>
        <body>
          <div id="editor" contenteditable="true">
            <p><strong>서식</strong> <em>초기화</em> <u>테스트</u>입니다.</p>
            <h2>제목 태그도 초기화</h2>
            <blockquote>인용구 초기화 테스트</blockquote>
          </div>
        </body>
      </html>
    `, { url: 'http://localhost/' });

    window = dom.window;
    document = window.document;
    contentArea = document.getElementById('editor');

    // Mock the document.execCommand
    mockExecCommand = jest.fn().mockReturnValue(true);
    document.execCommand = mockExecCommand;

    // Create range and selection mocks
    const mockRange = {
      collapsed: false,
      commonAncestorContainer: contentArea,
      startContainer: contentArea.querySelector('p').firstChild,
      endContainer: contentArea.querySelector('p').lastChild,
      startOffset: 0,
      endOffset: 10,
      toString: jest.fn().mockReturnValue('서식 초기화 테스트입니다'),
      cloneRange: jest.fn().mockReturnThis(),
      selectNodeContents: jest.fn(),
      deleteContents: jest.fn(),
      insertNode: jest.fn(),
      setStart: jest.fn(),
      setEnd: jest.fn(),
      extractContents: jest.fn().mockReturnValue(document.createTextNode('서식 초기화 테스트입니다'))
    };

    // 선택 객체 설정 (window.getSelection)
    window.getSelection = jest.fn().mockReturnValue({
      rangeCount: 1,
      getRangeAt: jest.fn().mockReturnValue(mockRange),
      removeAllRanges: jest.fn(),
      addRange: jest.fn(),
      toString: jest.fn().mockReturnValue('서식 초기화 테스트입니다')
    });

    // getSafeSelection 구현
    window.getSafeSelection = function() {
      try {
        return window.getSelection();
      } catch (e) {
        console.warn('Selection 객체를 가져오는 중 오류 발생:', e);
        return null;
      }
    };

    // document.createRange 설정
    document.createRange = jest.fn().mockReturnValue(mockRange);

    // LiteEditor 객체 설정
    window.LiteEditor = {
      registerPlugin: jest.fn((name, config) => {
        if (name === 'reset') {
          resetPlugin = config;
        }
        return config;
      })
    };

    // Reset 플러그인 파일 직접 로드
    const resetJsPath = path.resolve(__dirname, '../../js/plugins/reset.js');
    const resetJsContent = fs.readFileSync(resetJsPath, 'utf8');
    
    // Eval 전에 console.log 모킹
    window.console = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      debug: jest.fn()
    };

    // errorHandler 모킹 추가
    window.errorHandler = {
      logError: jest.fn(),
      codes: {
        PLUGINS: {
          RESET: {
            NO_SELECTION: 'RESET_NO_SELECTION',
            NO_TEXT: 'RESET_NO_TEXT',
            FORMAT: 'RESET_FORMAT'
          }
        }
      }
    };

    // 스크립트 실행
    const script = new Function('window', 'document', `
      with (window) { 
        ${resetJsContent}
      }
    `);
    script(window, document);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should register the plugin with LiteEditor', () => {
    // 플러그인 등록 여부 확인
    expect(window.LiteEditor.registerPlugin).toHaveBeenCalledWith('reset', expect.objectContaining({
      title: 'Clear Formatting',
      icon: 'format_clear',
      action: expect.any(Function)
    }));
    
    // resetPlugin 객체 확인
    expect(resetPlugin).toBeDefined();
  });

  test('should handle case where there is no selection', () => {
    // 빈 선택 객체 모킹
    window.getSelection = jest.fn().mockReturnValue({
      rangeCount: 0,
      getRangeAt: jest.fn(),
      toString: jest.fn().mockReturnValue('')
    });

    // PluginUtil.editor.getSelectedText 모킹
    window.PluginUtil = {
      editor: {
        getSelectedText: jest.fn().mockReturnValue('')
      },
      selection: {
        getSafeSelection: jest.fn().mockReturnValue({
          rangeCount: 0
        })
      }
    };

    // resetPlugin 객체 확인
    expect(resetPlugin).toBeDefined();
    
    // action 함수 실행
    const result = resetPlugin.action(contentArea);
    
    // 기대 결과 확인 - 선택 영역이 없을 때는 false를 반환해야 함
    expect(result).toBe(false);
    
    // errorHandler.logError가 호출되었는지 확인
    expect(window.errorHandler.logError).toHaveBeenCalledWith(
      'ResetPlugin',
      window.errorHandler.codes.PLUGINS.RESET.NO_SELECTION,
      expect.any(Error)
    );
  });
}); 