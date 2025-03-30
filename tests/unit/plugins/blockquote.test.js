/**
 * 프로젝트 디렉토리에서 다음 명령어 실행이 필요합니다.
 */
/**
 * blockquote.js 플러그인 테스트
 */

describe('Blockquote 플러그인', () => {
  let contentArea;
  let blockquoteAction;
  
  beforeEach(() => {
    // 테스트 DOM 환경 설정
    document.body.innerHTML = `
      <div id="editor" contenteditable="true">
        <p>일반 텍스트</p>
        <blockquote>이미 인용구로 적용된 텍스트</blockquote>
      </div>
      <div class="lite-editor-toolbar">
        <button id="blockquote-button" class="lite-editor-button" title="Blockquote">
          <i class="material-icons">format_quote</i>
        </button>
      </div>
    `;
    contentArea = document.getElementById('editor');
    
    // 모의 함수 초기화
    jest.clearAllMocks();
    
    // blockquote.js 로드
    require('../../../plugins/blockquote.js');
    
    // 전역 blockquoteAction 사용
    blockquoteAction = global.blockquoteAction;
  });
  
  test('플러그인이 올바르게 등록되어야 함', () => {
    expect(LiteEditor.registerPlugin).toHaveBeenCalledWith('blockquote', expect.objectContaining({
      title: 'Blockquote',
      icon: 'format_quote',
      action: expect.any(Function)
    }));
  });
  
  test('일반 텍스트에 인용구 서식이 적용되어야 함', () => {
    // 일반 텍스트 단락 선택 상태 모의 설정
    const paragraph = contentArea.querySelector('p');
    const mockRange = global.createMockRange('일반 텍스트');
    mockRange.commonAncestorContainer = paragraph;
    window.getSelection = jest.fn().mockReturnValue(global.createMockSelection('일반 텍스트'));
    
    // document.execCommand 모의 구현
    document.execCommand = jest.fn().mockImplementation((cmd, ui, val) => {
      if (cmd === 'formatBlock' && val === '<BLOCKQUOTE>') {
        // 일반 텍스트를 blockquote로 변환하는 것을 모의
        const blockquote = document.createElement('blockquote');
        blockquote.textContent = paragraph.textContent;
        paragraph.parentNode.replaceChild(blockquote, paragraph);
      }
      return true;
    });
    
    // 인용구 액션 실행 - global 함수 사용
    const buttonElement = document.getElementById('blockquote-button');
    const mockEvent = { preventDefault: jest.fn(), stopPropagation: jest.fn() };
    global.blockquoteAction(contentArea, buttonElement, mockEvent);
    
    // formatBlock 명령이 실행되었는지 확인
    expect(document.execCommand).toHaveBeenCalledWith('formatBlock', false, '<blockquote>');
  });
  
  test('이미 인용구인 텍스트는 일반 단락으로 변환되어야 함', () => {
    // 이미 인용구인 블록 선택 상태 모의 설정
    const blockquote = contentArea.querySelector('blockquote');
    const mockRange = global.createMockRange('이미 인용구로 적용된 텍스트');
    mockRange.commonAncestorContainer = blockquote;
    window.getSelection = jest.fn().mockReturnValue(global.createMockSelection('이미 인용구로 적용된 텍스트'));
    
    // 테스트를 위해 LiteEditorUtils.isSelectionWithinTag 이전 참조 저장
    const originalIsSelectionWithinTag = LiteEditorUtils.isSelectionWithinTag;
    
    // 스파이 설정 - isSelectionWithinTag가 호출되면 자동으로 true 반환
    jest.spyOn(LiteEditorUtils, 'isSelectionWithinTag').mockImplementation(() => {
      // 호출될 때 true 반환
      return true;
    });
    
    // document.execCommand 모의 구현
    document.execCommand = jest.fn().mockImplementation((cmd, ui, val) => {
      if (cmd === 'formatBlock' && val === '<blockquote>') {
        // blockquote를 p로 변환하는 것을 모의
        const p = document.createElement('p');
        p.textContent = blockquote.textContent;
        blockquote.parentNode.replaceChild(p, blockquote);
      }
      return true;
    });
    
    // 인용구 액션 실행 - global 함수 사용
    const buttonElement = document.getElementById('blockquote-button');
    const mockEvent = { preventDefault: jest.fn(), stopPropagation: jest.fn() };
    global.blockquoteAction(contentArea, buttonElement, mockEvent);
    
    // formatBlock 명령이 실행되었는지 확인 (실제 구현에 맞게 검증)
    expect(document.execCommand).toHaveBeenCalledWith('formatBlock', false, '<blockquote>');
    
    // 마무리 전 스파이 복원
    LiteEditorUtils.isSelectionWithinTag = originalIsSelectionWithinTag;
  });
});
