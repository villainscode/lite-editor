/**
 * code.js 플러그인 테스트
 */

describe('Code 플러그인', () => {
  let contentArea;
  let codeAction;
  
  beforeEach(() => {
    // 테스트 DOM 환경 설정
    document.body.innerHTML = `
      <div id="editor" contenteditable="true">
        <p>일반 텍스트</p>
        <p><b>볼드 텍스트</b></p>
        <p>코드로 변환할 텍스트</p>
        <p><code>이미 코드 서식이 적용된 텍스트</code></p>
      </div>
      <div class="lite-editor-toolbar">
        <button id="code-button" class="lite-editor-button" title="Code">
          <i class="material-icons">code</i>
        </button>
      </div>
    `;
    contentArea = document.getElementById('editor');
    const codeButton = document.getElementById('code-button');
    
    // LiteEditorUtils.applyCodeFormat 모의 구현
    LiteEditorUtils.applyCodeFormat = jest.fn();
    
    // code.js 로드 및 액션 함수 가져오기
    jest.clearAllMocks();
    require('../../../plugins/code.js');
    const registerCalls = LiteEditor.registerPlugin.mock.calls;
    const codePluginCall = registerCalls.find(call => call[0] === 'code');
    codeAction = codePluginCall ? codePluginCall[1].action : null;
  });
  
  test('플러그인이 올바르게 등록되어야 함', () => {
    expect(LiteEditor.registerPlugin).toHaveBeenCalledWith('code', expect.objectContaining({
      title: 'Code',
      icon: 'code',
      action: expect.any(Function)
    }));
  });
  
  test('액션 함수는 LiteEditorUtils.applyCodeFormat를 호출해야 함', () => {
    const buttonElement = document.getElementById('code-button');
    const mockEvent = { preventDefault: jest.fn(), stopPropagation: jest.fn() };
    
    // 코드 서식 적용 실행
    codeAction(contentArea, buttonElement, mockEvent);
    
    // applyCodeFormat 함수가 호출되었는지 확인
    expect(LiteEditorUtils.applyCodeFormat).toHaveBeenCalledWith(
      contentArea,
      buttonElement,
      mockEvent
    );
  });
});
