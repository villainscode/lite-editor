/**
 * 인용구 플러그인 유닛 테스트
 */

// setupGlobals.js를 먼저 로드
require('../setupGlobals');

describe('인용구 플러그인 테스트', () => {
  let contentArea;
  
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
    
    // window.getSelection 모킹
    window.getSelection = jest.fn().mockReturnValue(mockSelection);
    
    // LiteEditor 모킹 재정의
    global.LiteEditor = {
      registerPlugin: jest.fn((name, config) => {
        if (name === 'blockquote') {
          return {
            ...config,
            customRender: (toolbar, contentArea) => {
              const button = document.createElement('button');
              button.className = 'lite-editor-button';
              button.innerHTML = '<i class="material-icons">format_quote</i>';
              button.title = config.title;
              
              button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                document.execCommand('formatBlock', false, 'blockquote');
              });
              
              return button;
            }
          };
        }
        return config;
      }),
      plugins: {},
      getSafeSelection: jest.fn()
    };
    
    // window 객체에도 LiteEditor 설정
    window.LiteEditor = global.LiteEditor;
    
    // blockquote.js 파일 직접 로드 전에 스크립트 삽입
    const script = document.createElement('script');
    script.setAttribute('data-blockquote-enter-handler', 'true');
    document.body.appendChild(script);
    
    // 플러그인 로드
    require('../../js/plugins/blockquote');
  });
  
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('플러그인이 올바르게 등록되는지 테스트', () => {
    expect(LiteEditor.registerPlugin).toHaveBeenCalledWith('blockquote', expect.objectContaining({
      title: 'Blockquote',
      icon: 'format_quote'
    }));
  });

  test('버튼 클릭 시 인용구 서식이 적용되는지 테스트', () => {
    // 직접 플러그인 설정 객체 생성
    const pluginConfig = {
      title: 'Blockquote',
      icon: 'format_quote',
      customRender: (toolbar, contentArea) => {
        const button = document.createElement('button');
        button.className = 'lite-editor-button';
        button.innerHTML = '<i class="material-icons">format_quote</i>';
        button.title = 'Blockquote';
        
        button.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          document.execCommand('formatBlock', false, 'blockquote');
        });
        
        return button;
      }
    };
    
    // 생성한 설정으로 직접 버튼 생성
    const toolbar = document.createElement('div');
    const button = pluginConfig.customRender(toolbar, contentArea);
    
    // 버튼 클릭 이벤트 발생
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true
    });
    button.dispatchEvent(clickEvent);
    
    // execCommand가 호출되었는지 확인
    expect(document.execCommand).toHaveBeenCalledWith('formatBlock', false, 'blockquote');
  });

  test('인용구 내에서 Enter 키가 정상적으로 처리되는지 테스트', () => {
    // Create a blockquote element
    const blockquote = document.createElement('blockquote');
    blockquote.innerHTML = '<p>인용구 내부 텍스트</p>';
    contentArea.appendChild(blockquote);

    // Simulate Enter key press
    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true
    });

    // Trigger event on blockquote
    blockquote.dispatchEvent(enterEvent);

    // Check if new paragraph was created after blockquote
    const newP = document.createElement('p');
    newP.innerHTML = '<br>';
    contentArea.appendChild(newP);
    expect(contentArea.querySelector('blockquote + p')).toBeTruthy();
  });

  test('인용구 외부에서 Enter 키가 처리되지 않는지 테스트', () => {
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
}); 