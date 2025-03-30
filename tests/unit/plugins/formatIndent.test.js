/**
 * formatIndent.js 플러그인 테스트
 */

describe('Format Indent 플러그인', () => {
  let contentArea;
  let increaseButton;
  let decreaseButton;
  
  beforeEach(() => {
    // 테스트 DOM 환경 설정
    document.body.innerHTML = `
      <div id="editor" contenteditable="true">
        <p>들여쓰기 테스트 텍스트</p>
        <p style="margin-left: 20px;">이미 들여쓰기가 적용된 텍스트</p>
        <p style="margin-left: 40px;">깊은 들여쓰기가 적용된 텍스트</p>
      </div>
      <div class="lite-editor-toolbar">
        <button id="increase-indent" class="lite-editor-button" title="Increase Indent">
          <i class="material-icons">format_indent_increase</i>
        </button>
        <button id="decrease-indent" class="lite-editor-button" title="Decrease Indent">
          <i class="material-icons">format_indent_decrease</i>
        </button>
      </div>
    `;
    contentArea = document.getElementById('editor');
    increaseButton = document.getElementById('increase-indent');
    decreaseButton = document.getElementById('decrease-indent');
    
    // formatIndent.js 로드
    jest.clearAllMocks();
    require('../../../plugins/formatIndent.js');
    
    // 플러그인 등록 호출 확인
    const registerCalls = LiteEditor.registerPlugin.mock.calls;
    const indentPluginCall = registerCalls.find(call => call[0] === 'formatIndent');
  });
  
  test('플러그인이 올바르게 등록되어야 함', () => {
    expect(LiteEditor.registerPlugin).toHaveBeenCalledWith('formatIndent', expect.objectContaining({
      title: 'Indentation',
      buttons: expect.arrayContaining([
        expect.objectContaining({
          title: 'Increase Indent',
          icon: 'format_indent_increase'
        }),
        expect.objectContaining({
          title: 'Decrease Indent',
          icon: 'format_indent_decrease'
        })
      ])
    }));
  });
  
  test('들여쓰기 증가 버튼은 indent 명령을 실행해야 함', () => {
    // 플러그인의 버튼 액션 가져오기
    const registerCalls = LiteEditor.registerPlugin.mock.calls;
    const indentPluginCall = registerCalls.find(call => call[0] === 'formatIndent');
    const buttonsConfig = indentPluginCall[1].buttons;
    const increaseAction = buttonsConfig[0].action;
    
    // 선택 설정
    const paragraph = contentArea.querySelector('p:first-child');
    const mockRange = global.createMockRange('들여쓰기 테스트 텍스트');
    mockRange.commonAncestorContainer = paragraph;
    window.getSelection = jest.fn().mockReturnValue(global.createMockSelection('들여쓰기 테스트 텍스트'));
    
    // document.execCommand 모의 구현
    document.execCommand = jest.fn().mockImplementation((cmd) => {
      if (cmd === 'indent') {
        paragraph.style.marginLeft = '20px';
      }
      return true;
    });
    
    // 들여쓰기 증가 액션 실행
    const mockEvent = { preventDefault: jest.fn(), stopPropagation: jest.fn() };
    increaseAction(contentArea, increaseButton, mockEvent);
    
    // indent 명령이 실행되었는지 확인
    expect(document.execCommand).toHaveBeenCalledWith('indent', false, null);
  });
  
  test('들여쓰기 감소 버튼은 outdent 명령을 실행해야 함', () => {
    // 플러그인의 버튼 액션 가져오기
    const registerCalls = LiteEditor.registerPlugin.mock.calls;
    const indentPluginCall = registerCalls.find(call => call[0] === 'formatIndent');
    const buttonsConfig = indentPluginCall[1].buttons;
    const decreaseAction = buttonsConfig[1].action;
    
    // 이미 들여쓰기가 적용된 텍스트 선택
    const paragraph = contentArea.querySelector('p:nth-child(2)');
    const mockRange = global.createMockRange('이미 들여쓰기가 적용된 텍스트');
    mockRange.commonAncestorContainer = paragraph;
    window.getSelection = jest.fn().mockReturnValue(global.createMockSelection('이미 들여쓰기가 적용된 텍스트'));
    
    // document.execCommand 모의 구현
    document.execCommand = jest.fn().mockImplementation((cmd) => {
      if (cmd === 'outdent') {
        paragraph.style.marginLeft = '0px';
      }
      return true;
    });
    
    // 들여쓰기 감소 액션 실행
    const mockEvent = { preventDefault: jest.fn(), stopPropagation: jest.fn() };
    decreaseAction(contentArea, decreaseButton, mockEvent);
    
    // outdent 명령이 실행되었는지 확인
    expect(document.execCommand).toHaveBeenCalledWith('outdent', false, null);
  });
});
