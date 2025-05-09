/**
 * Jest 테스트 환경 설정 후 실행될 설정
 */

// JSDOM 환경에서 필요한 추가 설정
require('@testing-library/jest-dom');

// TextEncoder/TextDecoder polyfill 추가
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// JSDOM 환경 설정
const { JSDOM } = require('jsdom');

// 전역 DOM 환경 설정
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost/',
  pretendToBeVisual: true,
  runScripts: 'dangerously'
});

global.document = dom.window.document;
global.window = dom.window;
global.navigator = dom.window.navigator;

// window.getSelection 모의 함수 설정
global.window.getSelection = jest.fn().mockReturnValue({
  removeAllRanges: jest.fn(),
  addRange: jest.fn(),
  getRangeAt: jest.fn().mockReturnValue({
    cloneContents: jest.fn().mockReturnValue(document.createDocumentFragment()),
    deleteContents: jest.fn(),
    insertNode: jest.fn(),
    setStart: jest.fn(),
    setEnd: jest.fn(),
    startContainer: document.body,
    endContainer: document.body,
    startOffset: 0,
    endOffset: 0
  }),
  rangeCount: 1
});

// console 메서드 모킹
global.console = {
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

// 테스트에 필요한 전역 객체 설정
global.PluginUtil = {
  registerPlugin: jest.fn(),
  styles: {
    addInlineStyle: jest.fn()
  },
  dom: {
    createElement: jest.fn((tag, attributes, styles) => {
      const element = document.createElement(tag);
      if (attributes) {
        Object.entries(attributes).forEach(([key, value]) => {
          if (key === 'className') {
            element.className = value;
          } else if (key === 'textContent') {
            element.textContent = value;
          } else {
            element.setAttribute(key, value);
          }
        });
      }
      if (styles) {
        Object.entries(styles).forEach(([key, value]) => {
          element.style[key] = value;
        });
      }
      return element;
    })
  },
  selection: {
    saveSelection: jest.fn(),
    restoreSelection: jest.fn()
  },
  editor: {
    dispatchEditorEvent: jest.fn()
  }
};

// Event 관련 모킹
global.Event = class Event {
  constructor(type, options) {
    this.type = type;
    this.bubbles = options?.bubbles || false;
    this.cancelable = options?.cancelable || false;
    this.composed = options?.composed || false;
  }
};

// document.execCommand 모킹
document.execCommand = jest.fn().mockReturnValue(true);

// errorHandler 모킹 추가
global.errorHandler = {
  logError: jest.fn(),
  codes: {
    PLUGINS: {
      RESET: {
        NO_SELECTION: 'RESET_NO_SELECTION',
        NO_TEXT: 'RESET_NO_TEXT',
        FORMAT: 'RESET_FORMAT'
      }
    }
  }
};

// 테스트 전에 모든 모의 함수 초기화
beforeEach(() => {
  // DOM 초기화
  document.body.innerHTML = '<div id="editor-content"></div>';
  
  // 모킹 초기화
  jest.clearAllMocks();
  
  // 전역 객체 초기화
  if (global.LiteEditor) {
    global.LiteEditor.plugins = {};
  }
  
  // 이미 존재하는 mocks만 clear (try-catch로 방어)
  try {
    if (global.PluginUtil && global.PluginUtil.selection) {
      if (global.PluginUtil.selection.saveSelection) 
        global.PluginUtil.selection.saveSelection.mockClear();
      if (global.PluginUtil.selection.restoreSelection) 
        global.PluginUtil.selection.restoreSelection.mockClear();
    }
    
    if (global.PluginUtil && global.PluginUtil.editor) {
      if (global.PluginUtil.editor.dispatchEditorEvent) 
        global.PluginUtil.editor.dispatchEditorEvent.mockClear();
    }
    
    if (global.PluginUtil && global.PluginUtil.dom) {
      if (global.PluginUtil.dom.createElement) 
        global.PluginUtil.dom.createElement.mockClear();
    }
    
    if (global.PluginUtil && global.PluginUtil.layerManager) {
      if (global.PluginUtil.layerManager.register) 
        global.PluginUtil.layerManager.register.mockClear();
      if (global.PluginUtil.layerManager.unregister) 
        global.PluginUtil.layerManager.unregister.mockClear();
      if (global.PluginUtil.layerManager.closeAll) 
        global.PluginUtil.layerManager.closeAll.mockClear();
      if (global.PluginUtil.layerManager.toggle) 
        global.PluginUtil.layerManager.toggle.mockClear();
    }
    
    if (global.PluginUtil && global.PluginUtil.activeModalManager) {
      if (global.PluginUtil.activeModalManager.register) 
        global.PluginUtil.activeModalManager.register.mockClear();
      if (global.PluginUtil.activeModalManager.unregister) 
        global.PluginUtil.activeModalManager.unregister.mockClear();
      if (global.PluginUtil.activeModalManager.closeAll) 
        global.PluginUtil.activeModalManager.closeAll.mockClear();
      if (global.PluginUtil.activeModalManager.registerButton) 
        global.PluginUtil.activeModalManager.registerButton.mockClear();
    }
    
    if (global.PluginUtil && global.PluginUtil.setupOutsideClickHandler) {
      global.PluginUtil.setupOutsideClickHandler.mockClear();
    }
  } catch (e) {
    console.error('테스트 설정 중 오류 발생:', e);
  }
  
  // console 메서드 초기화
  if (console.error) console.error.mockClear();
  if (console.warn) console.warn.mockClear();
  if (console.log) console.log.mockClear();
});

// 테스트 후 정리
afterEach(() => {
  // DOM 정리
  document.body.innerHTML = '';
  
  // 모킹 초기화
  jest.clearAllMocks();
  
  // 이벤트 리스너 정리 (추가된 경우)
  try {
    const oldListeners = window._eventListeners || [];
    oldListeners.forEach(({ type, listener }) => {
      document.removeEventListener(type, listener);
    });
  } catch (e) {
    // 이벤트 리스너 정리 중 에러는 무시
  }
}); 