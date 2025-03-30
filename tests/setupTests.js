/**
 * Jest 테스트 설정 파일
 * 
 * 모든 테스트가 실행되기 전에 로드됩니다.
 * 전역 모의(mock) 객체 및 설정을 여기에 정의합니다.
 */

// 기본 액션 함수들을 Jest 모의 함수로 정의
global.resetAction = jest.fn();
global.codeAction = jest.fn();
global.blockquoteAction = jest.fn();
global.boldAction = jest.fn();
global.italicAction = jest.fn();
global.underlineAction = jest.fn();
global.increaseIndentAction = jest.fn();
global.decreaseIndentAction = jest.fn();

// LiteEditor 전역 객체 모의 구현
global.LiteEditor = {
  registerPlugin: jest.fn((name, config) => {
    // 플러그인 이름에 따라 해당 액션 함수 저장
    switch(name) {
      case 'reset':
        if (config.action) global.resetAction = config.action;
        break;
      case 'code':
        if (config.action) global.codeAction = config.action;
        break;
      case 'blockquote':
        if (config.action) global.blockquoteAction = config.action;
        break;
      case 'bold':
        if (config.action) global.boldAction = config.action;
        break;
      case 'italic':
        if (config.action) global.italicAction = config.action;
        break;
      case 'underline':
        if (config.action) global.underlineAction = config.action;
        break;
      case 'formatIndent':
        if (config.buttons && Array.isArray(config.buttons)) {
          if (config.buttons[0]?.action) global.increaseIndentAction = config.buttons[0].action;
          if (config.buttons[1]?.action) global.decreaseIndentAction = config.buttons[1].action;
        }
        break;
    }
    return config;
  }),
  getPlugin: jest.fn((name) => {
    switch(name) {
      case 'reset': return { action: global.resetAction };
      case 'code': return { action: global.codeAction };
      case 'blockquote': return { action: global.blockquoteAction };
      case 'bold': return { action: global.boldAction };
      case 'italic': return { action: global.italicAction };
      case 'underline': return { action: global.underlineAction };
      case 'formatIndent': return { 
        buttons: [
          { action: global.increaseIndentAction },
          { action: global.decreaseIndentAction }
        ]
      };
      default: return null;
    }
  })
};

// LiteEditorUtils 전역 객체 모의 구현
global.LiteEditorUtils = {
  applyInlineFormat: jest.fn(),
  applyCodeFormat: jest.fn(),
  toggleFormat: jest.fn(),
  // isSelectionWithinTag는 jest.fn()으로 정의하여 테스트에서 mockReturnValueOnce 등을 사용할 수 있어야 함
  isSelectionWithinTag: jest.fn().mockReturnValue(false)
};

// 선택 관련 모의 객체
global.liteEditorSelection = {
  save: jest.fn(),
  restore: jest.fn()
};

// document.execCommand 모의 구현
document.execCommand = jest.fn().mockReturnValue(true);

// Range 객체 모의 구현을 위한 헬퍼 함수
global.createMockRange = (content = '') => ({
  collapsed: false,
  commonAncestorContainer: document.createElement('div'),
  startContainer: document.createElement('div'),
  endContainer: document.createElement('div'),
  startOffset: 0,
  endOffset: content.length,
  selectNodeContents: jest.fn(),
  setStart: jest.fn(),
  setEnd: jest.fn(),
  selectNode: jest.fn(),
  cloneContents: jest.fn(() => {
    const fragment = document.createDocumentFragment();
    const div = document.createElement('div');
    div.innerHTML = content;
    fragment.appendChild(div);
    return fragment;
  }),
  extractContents: jest.fn(),
  toString: jest.fn(() => content),
  deleteContents: jest.fn(),
  insertNode: jest.fn(),
  cloneRange: jest.fn(function() { return this; })
});

// 선택 객체 모의 구현을 위한 헬퍼 함수
global.createMockSelection = (content = '') => {
  const range = global.createMockRange(content);
  return {
    rangeCount: 1,
    isCollapsed: false,
    getRangeAt: jest.fn().mockReturnValue(range),
    removeAllRanges: jest.fn(),
    addRange: jest.fn(),
    anchorNode: document.createTextNode(content),
    focusNode: document.createTextNode(content),
    anchorOffset: 0,
    focusOffset: content.length,
    toString: jest.fn(() => content)
  };
};

// window.getSelection 모의 구현
global.getSelection = jest.fn().mockImplementation(() => global.createMockSelection());
