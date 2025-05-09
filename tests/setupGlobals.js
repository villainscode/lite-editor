/**
 * Jest 테스트를 위한 전역 설정
 */

// JSDOM 환경에 필요한 전역 객체 추가
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// URL 객체 추가
const { URL, URLSearchParams } = require('url');
global.URL = URL;
global.URLSearchParams = URLSearchParams;

// 전역 LiteEditor 객체 모의 구현
global.LiteEditor = {
  registerPlugin: jest.fn((id, config) => {
    return config;
  }),
  plugins: {},
  getSafeSelection: jest.fn()
};

// 전역 window 객체에 LiteEditor 추가
window.LiteEditor = global.LiteEditor;

// 전역 window 객체에 필요한 속성 추가
Object.defineProperty(window, 'getSelection', {
  value: jest.fn()
});

// 전역 document 객체에 필요한 메서드 추가
Object.defineProperty(document, 'execCommand', {
  value: jest.fn()
});

// 전역 PluginUtil 객체 모의 구현
const mockPluginUtil = {
  selection: {
    saveSelection: jest.fn(),
    restoreSelection: jest.fn(),
    getSafeSelection: jest.fn(() => {
      return {
        getRangeAt: jest.fn(() => ({
          startContainer: document.createElement('p'),
          startOffset: 0,
          endOffset: 0,
          commonAncestorContainer: document.createElement('div')
        })),
        removeAllRanges: jest.fn(),
        addRange: jest.fn(),
        rangeCount: 1,
        toString: jest.fn().mockReturnValue('테스트 텍스트')
      };
    }),
    moveCursorTo: jest.fn(),
    moveCursorToEnd: jest.fn(),
    isAtStartOfBlock: jest.fn()
  },
  editor: {
    dispatchEditorEvent: jest.fn(),
    getSelectedText: jest.fn().mockReturnValue('테스트 텍스트')
  },
  dom: {
    createElement: jest.fn((tag, attrs, styles) => {
      const element = document.createElement(tag);
      if (attrs) Object.assign(element, attrs);
      if (styles) Object.assign(element.style, styles);
      return element;
    }),
    findClosestBlock: jest.fn(),
    isBlockElement: jest.fn()
  },
  layerManager: {
    register: jest.fn(),
    unregister: jest.fn(),
    closeAll: jest.fn(),
    toggle: jest.fn()
  },
  activeModalManager: {
    register: jest.fn(),
    unregister: jest.fn(),
    closeAll: jest.fn(),
    registerButton: jest.fn()
  },
  setupOutsideClickHandler: jest.fn(),
  
  // 블록 포맷 플러그인 등록 함수 추가 - 목킹으로 action 함수 반환하도록 설정
  registerBlockFormatPlugin: jest.fn((id, title, icon, tag, customAction) => {
    const action = customAction || ((contentArea) => {
      document.execCommand('formatBlock', false, tag);
    });
    
    return LiteEditor.registerPlugin(id, {
      title: title,
      icon: icon,
      tag: tag,
      action: action
    });
  }),
  
  // 인라인 포맷 플러그인 등록 함수 추가
  registerInlineFormatPlugin: jest.fn((id, title, icon, command) => {
    return LiteEditor.registerPlugin(id, {
      title: title,
      icon: icon,
      action: jest.fn(() => {
        document.execCommand(command, false, null);
      })
    });
  }),
  
  // 기타 유틸리티 함수들 추가
  createDropdown: jest.fn(),
  createPopupLayer: jest.fn(),
  setupToolbarButtonEvents: jest.fn(),
  setupToolbarModalEvents: jest.fn(),
  setLayerPosition: jest.fn(),
  setupDropdownButton: jest.fn()
};

// window 전역 객체에도 PluginUtil 설정 (중요!)
window.PluginUtil = mockPluginUtil;

// errorHandler 모의 구현
const mockErrorHandler = {
  logError: jest.fn(),
  logInfo: jest.fn(),
  logDebug: jest.fn(),
  codes: {
    PLUGINS: {
      ALIGN: {
        APPLY: 'P4001'
      },
      BLOCKQUOTE: {
        APPLY: 'P5001',
        ENTER: 'P5002'
      },
      RESET: {
        FORMAT: 'P1001',
        BLOCK: 'P1002',
        REMOVE: 'P1003',
        NO_SELECTION: 'P1004',
        NO_TEXT: 'P1005',
        CURSOR: 'P1006'
      }
    },
    COMMON: {
      SELECTION_GET: 'C1001',
      ELEMENT_NOT_FOUND: 'C1002'
    }
  },
  messages: {
    'P4001': '정렬 적용 실패',
    'P5001': '인용구 적용 실패',
    'P5002': '인용구 내 엔터 처리 실패',
    'P1001': '서식 초기화 실패',
    'P1002': '블록 요소 처리 실패',
    'P1003': '노드 제거 오류',
    'P1004': '선택 영역 없음',
    'P1005': '선택된 텍스트 없음',
    'P1006': '커서 위치 설정 실패',
    'C1001': '선택 영역 가져오기 실패',
    'C1002': '요소를 찾을 수 없음'
  }
};

// window 전역 객체에도 errorHandler 설정
window.errorHandler = mockErrorHandler;

// 전역 console 객체에 필요한 메서드 추가
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn()
}; 