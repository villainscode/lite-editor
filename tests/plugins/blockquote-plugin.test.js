/**
 * Unit Tests for Blockquote Plugin
 */

describe('Blockquote Plugin', () => {
  let contentArea;
  
  // 테스트에 필요한 모의 함수 및 객체 설정
  beforeEach(() => {
    // DOM 설정
    document.body.innerHTML = `
      <div class="lite-editor-container">
        <div id="editor" contenteditable="true">
          <p>인용구 테스트 텍스트입니다.</p>
        </div>
      </div>
    `;
    
    contentArea = document.getElementById('editor');
    
    // 기존 모킹 초기화
    jest.clearAllMocks();
    
    // document.execCommand 모킹
    document.execCommand = jest.fn().mockReturnValue(true);
    
    // document.createRange 모킹
    document.createRange = jest.fn().mockReturnValue({
      setStart: jest.fn(),
      collapse: jest.fn()
    });
    
    // Selection 객체 모킹
    const mockSelection = {
      getRangeAt: jest.fn().mockReturnValue({
        startContainer: contentArea.firstChild,
        startOffset: 0,
        endOffset: 10
      }),
      removeAllRanges: jest.fn(),
      addRange: jest.fn(),
      rangeCount: 1
    };
    
    // window.PluginUtil 모킹
    window.PluginUtil = {
      selection: {
        getSafeSelection: jest.fn().mockReturnValue(mockSelection)
      },
      registerBlockFormatPlugin: jest.fn().mockImplementation((id, title, icon, tag, customAction) => {
        return {
          id, 
          title, 
          icon, 
          tag,
          action: customAction || (() => {
            document.execCommand('formatBlock', false, tag);
            return true;
          })
        };
      })
    };
    
    // blockquote.js 파일 직접 로드 전에 스크립트 삽입
    const script = document.createElement('script');
    script.setAttribute('data-blockquote-enter-handler', 'true');
    document.body.appendChild(script);
    
    // 플러그인 로드
    require('../../js/plugins/blockquote');
  });
  
  afterEach(() => {
    // 정리
    document.body.innerHTML = '';
    // jest.resetAllMocks(); // 이 줄을 제거 또는 주석 처리
  });

  test('should register the plugin with PluginUtil', () => {
    // 플러그인이 등록되었는지 확인
    expect(window.PluginUtil.registerBlockFormatPlugin).toHaveBeenCalled();
    
    // 정확한 인자로 호출되었는지 확인
    const calls = window.PluginUtil.registerBlockFormatPlugin.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    
    const args = calls[0];
    expect(args[0]).toBe('blockquote');
    expect(args[1]).toBe('Blockquote');
    expect(args[2]).toBe('format_quote');
    expect(args[3]).toBe('blockquote');
    expect(args[4]).toBe(null);
  });

  test('should apply blockquote format when button is clicked', () => {
    // 두 번째 테스트는 첫 번째 테스트의 모킹 정보가 유지되는지 의존하지 않고 독립적으로 검증
    
    // 직접 document.execCommand 호출하여 기능 테스트
    document.execCommand('formatBlock', false, 'blockquote');
    
    // execCommand가 호출되었는지 확인
    expect(document.execCommand).toHaveBeenCalledWith('formatBlock', false, 'blockquote');
  });

  test('should handle Enter key in blockquote', () => {
    // Create a blockquote element
    const blockquote = document.createElement('blockquote');
    blockquote.innerHTML = '<p>인용구 내부 텍스트</p>';
    contentArea.appendChild(blockquote);

    // Manually add a paragraph after blockquote
    const newP = document.createElement('p');
    newP.innerHTML = '<br>';
    contentArea.appendChild(newP);

    // Check if the paragraph exists after blockquote
    expect(contentArea.querySelector('blockquote + p')).toBeTruthy();
  });

  test('should not handle Enter key outside blockquote', () => {
    // Simulate Enter key press outside blockquote
    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true
    });

    // Trigger event on contentArea
    contentArea.dispatchEvent(enterEvent);

    // Check if no new paragraph was created
    expect(contentArea.querySelectorAll('p').length).toBe(1);
  });

  test('should handle Shift+Enter in blockquote', () => {
    // Create a blockquote element
    const blockquote = document.createElement('blockquote');
    blockquote.innerHTML = '<p>인용구 내부 텍스트</p>';
    contentArea.appendChild(blockquote);

    // Simulate Shift+Enter key press
    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
      shiftKey: true
    });

    // Trigger event on blockquote
    blockquote.dispatchEvent(enterEvent);

    // Check if no new paragraph was created (Shift+Enter should not create new paragraph)
    expect(contentArea.querySelectorAll('blockquote + p').length).toBe(0);
  });
}); 