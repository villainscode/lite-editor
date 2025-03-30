/**
 * reset.js 플러그인 테스트
 */

describe('Reset 플러그인', () => {
  let contentArea;
  let resetAction;
  
  beforeEach(() => {
    // 테스트 DOM 환경 설정
    document.body.innerHTML = `
      <div id="editor" contenteditable="true">
        <p>일반 텍스트</p>
        <p><b>볼드 텍스트</b></p>
        <p><i>이탤릭 텍스트</i></p>
        <p><code>코드 텍스트</code></p>
        <blockquote>인용구 텍스트</blockquote>
      </div>
    `;
    contentArea = document.getElementById('editor');
    
    // LiteEditor.registerPlugin 모의 함수 초기화
    jest.clearAllMocks();
    
    // reset.js 로드 및 액션 함수 가져오기
    require('../../../plugins/reset.js');
    const registerCalls = LiteEditor.registerPlugin.mock.calls;
    const resetPluginCall = registerCalls.find(call => call[0] === 'reset');
    resetAction = resetPluginCall ? resetPluginCall[1].action : null;
  });
  
  test('플러그인이 올바르게 등록되어야 함', () => {
    expect(LiteEditor.registerPlugin).toHaveBeenCalledWith('reset', expect.objectContaining({
      title: 'Clear Formatting',
      icon: 'format_clear',
      action: expect.any(Function)
    }));
  });
  
  test('선택 영역의 볼드 서식이 제거되어야 함', () => {
    // 볼드 텍스트 선택 상태 모의 설정
    const boldTextPara = contentArea.querySelector('p:nth-child(2)');
    const mockRange = global.createMockRange('볼드 텍스트');
    mockRange.commonAncestorContainer = boldTextPara;
    const mockSelection = global.createMockSelection('볼드 텍스트');
    window.getSelection = jest.fn().mockReturnValue(mockSelection);
    
    // 서식 제거 실행
    resetAction(contentArea);
    
    // document.execCommand가 호출되어 서식이 제거되었는지 확인
    expect(document.execCommand).toHaveBeenCalledWith('removeFormat', false, null);
  });
  
  test('선택 영역의 blockquote 태그가 p 태그로 변환되어야 함', () => {
    // blockquote 선택 상태 모의 설정
    const blockquote = contentArea.querySelector('blockquote');
    const mockRange = global.createMockRange('인용구 텍스트');
    mockRange.commonAncestorContainer = blockquote;
    const mockSelection = global.createMockSelection('인용구 텍스트');
    window.getSelection = jest.fn().mockReturnValue(mockSelection);
    
    // handleBlockquote 함수가 호출되는 방식을 모의
    document.execCommand = jest.fn().mockImplementation((cmd, ui, val) => {
      if (cmd === 'formatBlock' && val === '<P>') {
        // blockquote를 p로 변환하는 것을 모의
        const p = document.createElement('p');
        p.textContent = blockquote.textContent;
        blockquote.parentNode.replaceChild(p, blockquote);
      }
      return true;
    });
    
    // 서식 제거 실행
    resetAction(contentArea);
    
    // blockquote가 p로 변환되었는지 확인
    expect(contentArea.querySelector('blockquote')).toBeNull();
    expect(contentArea.querySelector('p:nth-child(5)')).not.toBeNull();
  });
  
  test('서식 제거 시 텍스트 내용은 보존되어야 함', () => {
    // 코드 텍스트 선택 상태 모의 설정
    const codeTextPara = contentArea.querySelector('p:nth-child(4)');
    const mockRange = global.createMockRange('코드 텍스트');
    mockRange.commonAncestorContainer = codeTextPara;
    const mockSelection = global.createMockSelection('코드 텍스트');
    window.getSelection = jest.fn().mockReturnValue(mockSelection);
    
    // insertHTML을 모의하여 텍스트만 남기도록 함
    document.execCommand = jest.fn().mockImplementation((cmd, ui, val) => {
      if (cmd === 'insertHTML') {
        codeTextPara.innerHTML = val; // HTML 삽입 모의
      }
      return true;
    });
    
    // 서식 제거 실행
    resetAction(contentArea);
    
    // 텍스트 내용이 보존되었는지 확인
    const textContent = codeTextPara.textContent.trim();
    expect(textContent).toBe('코드 텍스트');
  });
  
  test('유효하지 않은 선택 영역에 대해서는 처리하지 않아야 함', () => {
    // 유효하지 않은 선택 상태 모의 설정
    window.getSelection = jest.fn().mockReturnValue({
      rangeCount: 0,
      getRangeAt: jest.fn()
    });
    
    // 서식 제거 실행
    resetAction(contentArea);
    
    // document.execCommand가 호출되지 않아야 함
    expect(document.execCommand).not.toHaveBeenCalled();
  });
});
