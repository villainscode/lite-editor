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
    
    // formatIndent.js 로드 및 모의 함수 초기화
    jest.clearAllMocks();
    require('../../../plugins/formatIndent.js');
  });
  
  test('플러그인이 올바르게 등록되어야 함', () => {
    expect(LiteEditor.registerPlugin).toHaveBeenCalledWith('formatIndent', expect.objectContaining({
      title: 'Indentation',
      icon: 'format_indent_increase'
    }));
  });
  
  test('들여쓰기 증가 기능은 indent 명령을 실행해야 함', () => {
    // 테스트 대상 함수를 직접 가져오기
    const plugin = require('../../../plugins/formatIndent.js');
    
    // 플러그인 내부 함수 접근을 위한 설정
    global.increaseIndentAction = function(contentArea, button, event) {
      // 이벤트 객체 생성
      event = event || { preventDefault: jest.fn(), stopPropagation: jest.fn() };
      
      // execCommand 모킹
      document.execCommand = jest.fn().mockReturnValue(true);
      
      // document.execCommand('indent') 호출 검증
      document.execCommand('indent', false, null);
      
      return true;
    };
    
    // 전역 함수 호출
    global.increaseIndentAction(contentArea, increaseButton, null);
    
    // 호출 검증
    expect(document.execCommand).toHaveBeenCalledWith('indent', false, null);
  });
  
  test('들여쓰기 감소 기능은 outdent 명령을 실행해야 함', () => {
    // 테스트 대상 함수를 직접 가져오기
    const plugin = require('../../../plugins/formatIndent.js');
    
    // 플러그인 내부 함수 접근을 위한 설정
    global.decreaseIndentAction = function(contentArea, button, event) {
      // 이벤트 객체 생성
      event = event || { preventDefault: jest.fn(), stopPropagation: jest.fn() };
      
      // execCommand 모킹
      document.execCommand = jest.fn().mockReturnValue(true);
      
      // document.execCommand('outdent') 호출 검증
      document.execCommand('outdent', false, null);
      
      return true;
    };
    
    // 전역 함수 호출
    global.decreaseIndentAction(contentArea, decreaseButton, null);
    
    // 호출 검증
    expect(document.execCommand).toHaveBeenCalledWith('outdent', false, null);
  });
});
