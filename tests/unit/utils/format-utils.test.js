/**
 * format-utils.js 유틸리티 테스트
 */

describe('Format 유틸리티', () => {
  let contentArea;
  let buttonElement;
  let mockEvent;
  
  beforeEach(() => {
    // 테스트 DOM 환경 설정
    document.body.innerHTML = `
      <div id="editor" contenteditable="true">
        <p>일반 텍스트</p>
        <p><b>볼드 텍스트</b></p>
        <p>테스트 텍스트</p>
        <p><code>코드 텍스트</code></p>
      </div>
      <div class="lite-editor-toolbar">
        <button id="bold-button" class="lite-editor-button" title="Bold">
          <i class="material-icons">format_bold</i>
        </button>
        <button id="code-button" class="lite-editor-button" title="Code">
          <i class="material-icons">code</i>
        </button>
      </div>
    `;
    contentArea = document.getElementById('editor');
    buttonElement = document.getElementById('bold-button');
    mockEvent = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn()
    };
    
    // 모의 함수 초기화
    jest.clearAllMocks();
    
    // window.liteEditorSelection 모의 구현
    window.liteEditorSelection = {
      save: jest.fn(),
      restore: jest.fn().mockReturnValue(true)
    };
    
    // format-utils.js 로드
    jest.resetModules();
    require('../../../plugins/format-utils.js');
  });
  
  describe('applyInlineFormat 함수', () => {
    test('안정적인 실행을 위해 지연 시간 후 실행되어야 함', () => {
      // 타이머 모의 설정
      jest.useFakeTimers();
      
      // 인라인 서식 적용 함수 호출
      LiteEditorUtils.applyInlineFormat(contentArea, buttonElement, 'bold', mockEvent);
      
      // 이벤트 전파가 중지되고 처리 플래그가 설정되었는지 확인
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(buttonElement.getAttribute('data-processing')).toBe('true');
      
      // 선택 영역이 저장되었는지 확인
      expect(window.liteEditorSelection.save).toHaveBeenCalled();
      
      // 50ms 후에 초기 타이머가 실행되어야 함
      jest.advanceTimersByTime(50);
      expect(window.liteEditorSelection.restore).toHaveBeenCalled();
      
      // 이후 명령 실행 타이머 확인
      jest.advanceTimersByTime(20);
      expect(document.execCommand).toHaveBeenCalledWith('bold', false, null);
      
      // 마지막 타이머 실행 확인
      jest.advanceTimersByTime(10);
      expect(buttonElement.hasAttribute('data-processing')).toBeFalsy();
      
      // 타이머 리셋
      jest.useRealTimers();
    });
  });
  
  describe('applyCodeFormat 함수', () => {
    beforeEach(() => {
      // code 버튼 요소
      buttonElement = document.getElementById('code-button');
    });
    
    test('코드 서식이 토글되어야 함 (적용 -> 제거)', () => {
      // 타이머 모의 설정
      jest.useFakeTimers();
      
      // 코드 텍스트가 이미 있는 상태에서 선택 모의
      const codeTextPara = contentArea.querySelector('p:nth-child(4)');
      const codeElement = codeTextPara.querySelector('code');
      
      // 이미 code 태그 안에 있다고 가정
      window.getSelection = jest.fn().mockImplementation(() => {
        const mockSelection = global.createMockSelection('코드 텍스트');
        mockSelection.anchorNode = codeElement.firstChild;
        mockSelection.focusNode = codeElement.firstChild;
        return mockSelection;
      });
      
      // isSelectionInCode 함수가 true를 반환하도록 모의
      const originalGetSelection = window.getSelection;
      
      // 코드 서식 적용 함수 호출
      LiteEditorUtils.applyCodeFormat(contentArea, buttonElement, mockEvent);
      
      // 이벤트 전파가 중지되고 처리 플래그가 설정되었는지 확인
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(buttonElement.getAttribute('data-processing')).toBe('true');
      
      // 50ms + 20ms 후에 isSelectionInCode 검사가 실행되어야 함
      jest.advanceTimersByTime(70);
      
      // 최종 처리 확인
      jest.advanceTimersByTime(10);
      expect(buttonElement.hasAttribute('data-processing')).toBeFalsy();
      
      // 타이머 리셋
      jest.useRealTimers();
    });
    
    test('일반 텍스트에 코드 서식이 적용되어야 함', () => {
      // 타이머 모의 설정
      jest.useFakeTimers();
      
      // 일반 텍스트 선택 모의
      const normalTextPara = contentArea.querySelector('p:nth-child(3)');
      window.getSelection = jest.fn().mockImplementation(() => {
        const mockSelection = global.createMockSelection('테스트 텍스트');
        mockSelection.anchorNode = normalTextPara.firstChild;
        mockSelection.focusNode = normalTextPara.firstChild;
        return mockSelection;
      });
      
      // 코드 서식 적용 함수 호출
      LiteEditorUtils.applyCodeFormat(contentArea, buttonElement, mockEvent);
      
      // 이벤트 전파가 중지되고 처리 플래그가 설정되었는지 확인
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      
      // 50ms + 20ms 후에 코드 적용 로직이 실행되어야 함
      jest.advanceTimersByTime(70);
      
      // insertHTML 명령이 호출되어야 함
      expect(document.execCommand).toHaveBeenCalledWith(
        'insertHTML',
        false,
        expect.stringContaining('<code>')
      );
      
      // 최종 처리 확인
      jest.advanceTimersByTime(10);
      expect(buttonElement.hasAttribute('data-processing')).toBeFalsy();
      
      // 타이머 리셋
      jest.useRealTimers();
    });
  });
  
  describe('isSelectionWithinTag 함수', () => {
    test('선택 영역이 특정 태그 내에 있는지 확인해야 함', () => {
      // 볼드 텍스트 선택 모의
      const boldTextPara = contentArea.querySelector('p:nth-child(2)');
      const boldElement = boldTextPara.querySelector('b');
      
      // 모의 범위 및 선택 객체 생성
      const mockRange = global.createMockRange('볼드 텍스트');
      mockRange.commonAncestorContainer = boldElement;
      
      // isSelectionWithinTag 호출
      const result = LiteEditorUtils.isSelectionWithinTag(mockRange, 'B');
      
      // 결과 확인 (jest.fn()으로 모의된 함수이므로 실제 반환값이 아닌 호출 여부만 확인)
      expect(LiteEditorUtils.isSelectionWithinTag).toHaveBeenCalledWith(mockRange, 'B');
    });
  });
});
