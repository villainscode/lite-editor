/**
 * Jest 테스트 설정 파일
 * 
 * 모든 테스트가 실행되기 전에 로드됩니다.
 * 전역 모의(mock) 객체 및 설정을 여기에 정의합니다.
 */

// TextEncoder 및 TextDecoder가 Node.js 환경에서 정의되지 않은 경우를 대비한 폴리필
const util = require('util');
global.TextEncoder = util.TextEncoder;
global.TextDecoder = util.TextDecoder;

// JSDOM에서 console이 정의되지 않은 문제 해결을 위한 모의 구현
global.console = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  trace: jest.fn()
};

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
  registerPlugin: jest.fn(),
  getPlugins: jest.fn(() => ({})),
  actions: {
    saveSelection: jest.fn(),
    restoreSelection: jest.fn(),
    getSelection: jest.fn(() => ({
      range: createMockRange(),
      text: 'test'
    })),
    isSelectionActive: jest.fn(() => true),
  }
};

// LiteEditorUtils 전역 객체 모의 구현
global.LiteEditorUtils = {
  applyInlineFormat: jest.fn(),
  applyCodeFormat: jest.fn(),
  isSelectionWithinTag: jest.fn(() => false),
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

// getSafeSelection 모의 구현
global.getSafeSelection = jest.fn(() => global.getSelection());

// window 객체에 MouseEvent 클래스 추가
global.window = {
  ...global.window,
  MouseEvent: jest.requireActual('jsdom').MouseEvent,
  getSelection: global.getSelection,
  getSafeSelection: global.getSafeSelection
};

// JSDOM VirtualConsole 설정 헬퍼 함수 추가
global.setupVirtualConsole = () => {
  const { VirtualConsole } = require('jsdom');
  const virtualConsole = new VirtualConsole();
  // 콘솔로 메시지 전달 (에러 무시 옵션 포함)
  virtualConsole.on('error', () => { /* 에러 무시 */ });
  virtualConsole.on('warn', () => { /* 경고 무시 */ });
  virtualConsole.on('info', () => { /* 정보 무시 */ });
  virtualConsole.on('dir', () => { /* 디렉토리 무시 */ });
  return virtualConsole;
};

// window 객체에 함수 추가
Object.defineProperty(window, 'LiteEditor', {
  value: global.LiteEditor,
  writable: true
});

Object.defineProperty(window, 'LiteEditorUtils', {
  value: global.LiteEditorUtils,
  writable: true
});

// LiteEditor 객체에 getSafeSelection 함수 추가
if (global.LiteEditor) {
  global.LiteEditor.getSafeSelection = global.getSafeSelection;
}

// JSDOM 환경에서 모의 객체를 쉽게 설정할 수 있는 헬퍼 함수
global.setupJSDOM = (dom) => {
  const window = dom.window;
  const document = window.document;
  
  // getSafeSelection 구현
  window.getSafeSelection = jest.fn(() => window.getSelection());
  
  // LiteEditor 초기화
  if (!window.LiteEditor && global.LiteEditor) {
    window.LiteEditor = {
      ...global.LiteEditor,
      getSafeSelection: window.getSafeSelection
    };
  } else if (window.LiteEditor) {
    window.LiteEditor.getSafeSelection = window.getSafeSelection;
  }
  
  return { window, document };
};
