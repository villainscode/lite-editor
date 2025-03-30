/**
 * Jest 테스트 설정 파일
 * 
 * 모든 테스트가 실행되기 전에 로드됩니다.
 * 전역 모의(mock) 객체 및 설정을 여기에 정의합니다.
 */

// LiteEditor 전역 객체 모의 구현
global.LiteEditor = {
  registerPlugin: jest.fn(),
  getPlugin: jest.fn()
};

// LiteEditorUtils 전역 객체 모의 구현
global.LiteEditorUtils = {
  applyInlineFormat: jest.fn(),
  applyCodeFormat: jest.fn(),
  toggleFormat: jest.fn(),
  isSelectionWithinTag: jest.fn()
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
