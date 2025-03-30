/**
 * 기본 서식 플러그인 테스트 (bold, italic, underline 등)
 */

describe('기본 서식 플러그인', () => {
  let contentArea;
  
  beforeEach(() => {
    // 테스트 DOM 환경 설정
    document.body.innerHTML = `
      <div id="editor" contenteditable="true">
        <p>서식 테스트 텍스트</p>
      </div>
      <div class="lite-editor-toolbar">
        <button id="bold-button" class="lite-editor-button" title="Bold">
          <i class="material-icons">format_bold</i>
        </button>
        <button id="italic-button" class="lite-editor-button" title="Italic">
          <i class="material-icons">format_italic</i>
        </button>
        <button id="underline-button" class="lite-editor-button" title="Underline">
          <i class="material-icons">format_underline</i>
        </button>
      </div>
    `;
    contentArea = document.getElementById('editor');
    
    // LiteEditorUtils.applyInlineFormat 모의 구현
    LiteEditorUtils.applyInlineFormat = jest.fn();
    
    // 모의 함수 초기화
    jest.clearAllMocks();
  });
  
  describe('Bold 플러그인', () => {
    beforeEach(() => {
      // bold.js 로드
      require('../../../plugins/bold.js');
    });
    
    test('플러그인이 올바르게 등록되어야 함', () => {
      expect(LiteEditor.registerPlugin).toHaveBeenCalledWith('bold', expect.objectContaining({
        title: 'Bold',
        icon: 'format_bold'
      }));
    });
    
    test('액션 함수는 applyInlineFormat를 호출해야 함', () => {
      // 플러그인 액션 함수 가져오기
      const registerCalls = LiteEditor.registerPlugin.mock.calls;
      const boldPluginCall = registerCalls.find(call => call[0] === 'bold');
      const boldAction = boldPluginCall[1].action;
      
      // 버튼 및 이벤트 설정
      const buttonElement = document.getElementById('bold-button');
      const mockEvent = { preventDefault: jest.fn(), stopPropagation: jest.fn() };
      
      // 볼드 액션 실행
      boldAction(contentArea, buttonElement, mockEvent);
      
      // applyInlineFormat 함수가 호출되었는지 확인
      expect(LiteEditorUtils.applyInlineFormat).toHaveBeenCalledWith(
        contentArea,
        buttonElement,
        'bold',
        mockEvent
      );
    });
  });
  
  describe('Italic 플러그인', () => {
    beforeEach(() => {
      // italic.js 로드
      require('../../../plugins/italic.js');
    });
    
    test('플러그인이 올바르게 등록되어야 함', () => {
      expect(LiteEditor.registerPlugin).toHaveBeenCalledWith('italic', expect.objectContaining({
        title: 'Italic',
        icon: 'format_italic'
      }));
    });
    
    test('액션 함수는 applyInlineFormat를 호출해야 함', () => {
      // 플러그인 액션 함수 가져오기
      const registerCalls = LiteEditor.registerPlugin.mock.calls;
      const italicPluginCall = registerCalls.find(call => call[0] === 'italic');
      const italicAction = italicPluginCall[1].action;
      
      // 버튼 및 이벤트 설정
      const buttonElement = document.getElementById('italic-button');
      const mockEvent = { preventDefault: jest.fn(), stopPropagation: jest.fn() };
      
      // 이탤릭 액션 실행
      italicAction(contentArea, buttonElement, mockEvent);
      
      // applyInlineFormat 함수가 호출되었는지 확인
      expect(LiteEditorUtils.applyInlineFormat).toHaveBeenCalledWith(
        contentArea,
        buttonElement,
        'italic',
        mockEvent
      );
    });
  });
  
  describe('Underline 플러그인', () => {
    beforeEach(() => {
      // underline.js 로드
      require('../../../plugins/underline.js');
    });
    
    test('플러그인이 올바르게 등록되어야 함', () => {
      expect(LiteEditor.registerPlugin).toHaveBeenCalledWith('underline', expect.objectContaining({
        title: 'Underline',
        icon: 'format_underline'
      }));
    });
    
    test('액션 함수는 applyInlineFormat를 호출해야 함', () => {
      // 플러그인 액션 함수 가져오기
      const registerCalls = LiteEditor.registerPlugin.mock.calls;
      const underlinePluginCall = registerCalls.find(call => call[0] === 'underline');
      const underlineAction = underlinePluginCall[1].action;
      
      // 버튼 및 이벤트 설정
      const buttonElement = document.getElementById('underline-button');
      const mockEvent = { preventDefault: jest.fn(), stopPropagation: jest.fn() };
      
      // 밑줄 액션 실행
      underlineAction(contentArea, buttonElement, mockEvent);
      
      // applyInlineFormat 함수가 호출되었는지 확인
      expect(LiteEditorUtils.applyInlineFormat).toHaveBeenCalledWith(
        contentArea,
        buttonElement,
        'underline',
        mockEvent
      );
    });
  });
});
