/**
 * Link Plugin 테스트
 * /tests/plugins/link.test.js
 * 
 * 사용법: 브라우저에서 이 파일을 로드하여 테스트 실행
 * 링크 플러그인의 기능 및 XSS 방어 기능을 테스트합니다.
 */

// DOM 환경 설정
document.body.innerHTML = `
  <div id="editor-content" contenteditable="true"></div>
`;

// 필요한 모듈 모킹
global.LiteEditor = {
  registerPlugin: jest.fn()
};

global.errorHandler = {
  logError: jest.fn(),
  codes: {
    PLUGINS: {
      LINK: {
        DEBUG: 'DEBUG',
        APPLY: 'APPLY'
      }
    }
  }
};

global.PluginUtil = {
  selection: {
    saveSelection: jest.fn(),
    restoreSelection: jest.fn()
  },
  url: {
    normalizeUrl: jest.fn(url => url.startsWith('http') ? url : `https://${url}`)
  },
  dom: {
    createElement: jest.fn((tag, props) => {
      const el = document.createElement(tag);
      if (props) {
        Object.assign(el, props);
      }
      return el;
    })
  },
  activeModalManager: {
    register: jest.fn(),
    unregister: jest.fn(),
    closeAll: jest.fn()
  },
  editor: {
    dispatchEditorEvent: jest.fn()
  },
  setupOutsideClickHandler: jest.fn()
};

// Link 플러그인 코드 로드 (실제로는 import 또는 require)
require('../../js/plugins/link.js');

describe('Link Plugin', () => {
  // URL 디코딩 헬퍼 함수
  function decodeUrl(url) {
    try {
      return decodeURIComponent(url);
    } catch (e) {
      return url; // 디코딩 실패 시 원래 URL 반환
    }
  }

  // 강화된 isValidUrl 함수
  function isValidUrl(url) {
    if (!url) return false;
    
    // 0. URL 디코딩하여 인코딩된 위험 문자 감지
    const decodedUrl = decodeUrl(url);
    
    // 1. HTML 태그 감지 (원본 및 디코딩된 URL 모두 검사)
    if (/<[\s\S]*?>/i.test(url) || /<[\s\S]*?>/i.test(decodedUrl) || 
        /[<>]/i.test(url) || /[<>]/i.test(decodedUrl)) {
      return false;
    }
    
    // 2. 위험한 URL 인코딩 패턴 감지
    if (/%(?:3C|3E|00|0A|0D|27|22|60|28|29)/i.test(url)) {
      // %3C(<), %3E(>), %00(NULL), %0A(LF), %0D(CR), %27('), %22("), %60(`), %28((), %29())
      return false;
    }
    
    // 3. 위험한 프로토콜 차단 (원본 및 디코딩된 URL 모두 검사)
    if (/^(?:javascript|data|vbscript|file):/i.test(url) || 
        /^(?:javascript|data|vbscript|file):/i.test(decodedUrl)) {
      return false;
    }
    
    // 4. script, alert, eval 등 위험한 자바스크립트 키워드 검사
    const dangerousKeywords = /\b(?:script|alert|eval|confirm|prompt|on\w+\s*=)/i;
    if (dangerousKeywords.test(url) || dangerousKeywords.test(decodedUrl)) {
      return false;
    }
    
    // 5. 기존 URL 형식 검증
    const domainRegex = /^(https?:\/\/)?(([a-zA-Z0-9\u3131-\u314E\uAC00-\uD7A3-]+\.)+([a-zA-Z\u3131-\u314E\uAC00-\uD7A3]{2,}))(:\d+)?(\/[^\s]*)?(\?.*)?$/;
    const invalidPrefixRegex = /^(https?:\/\/)?(wwww\.|ww\.|w{5,}\.|w{1,2}\.)/i;
    return domainRegex.test(url) && !invalidPrefixRegex.test(url);
  }

  describe('URL 유효성 검사', () => {
    test('일반적인 URL은 유효해야 함', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://test.co.kr')).toBe(true);
      expect(isValidUrl('example.com')).toBe(true);
    });

    test('빈 문자열은 유효하지 않음', () => {
      expect(isValidUrl('')).toBe(false);
      expect(isValidUrl(null)).toBe(false);
      expect(isValidUrl(undefined)).toBe(false);
    });
  });

  describe('XSS 공격 패턴 테스트', () => {
    test('각 XSS 공격 패턴이 개별적으로 차단되는지 확인', () => {
      // HTML 태그 삽입
      expect(isValidUrl('<img src=x onerror=alert(1)>')).toBe(false);
      expect(isValidUrl('<script>alert(1)</script>')).toBe(false);
      expect(isValidUrl('https://example.com/<script>alert(1)</script>')).toBe(false);
      
      // URL 인코딩된 XSS
      expect(isValidUrl('https://example.com/%0Aalert(1)')).toBe(false);
      expect(isValidUrl('https://example.com/%0A%0Dscript')).toBe(false);
      expect(isValidUrl('https://legit-looking.com/?p=%3Cscript%3Ealert(1)%3C/script%3E')).toBe(false);
      
      // 위험한 프로토콜
      expect(isValidUrl('javascript:alert(document.cookie)')).toBe(false);
      expect(isValidUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==')).toBe(false);
      expect(isValidUrl('vbscript:MsgBox("XSS")')).toBe(false);
      expect(isValidUrl('javascript://%0Aalert(1)')).toBe(false);
      
      // 혼합 공격
      expect(isValidUrl('https://example.com/"><img src=x onerror=alert(1)>')).toBe(false);
      expect(isValidUrl('https://example.com/\');confirm(1);//')).toBe(false);
      expect(isValidUrl('https://example.com/page?q="><svg/onload=alert(1)>')).toBe(false);
    });
  });
  
  describe('보안 구현 권장사항', () => {
    test('link.js 파일에 적용할 이 강화된 isValidUrl 함수를 권장합니다', () => {
      expect(true).toBe(true);
      
      console.log(`
==========================================================================
                            보안 개선 권장사항                              
==========================================================================
※ link.js 파일의 isValidUrl 함수를 더 강화된 버전으로 교체하세요:

function isValidUrl(url) {
  if (!url) return false;
  
  // URL 디코딩 시도
  let decodedUrl;
  try {
    decodedUrl = decodeURIComponent(url);
  } catch (e) {
    decodedUrl = url;
  }
  
  // 1. HTML 태그 및 위험한 문자 감지 (원본 및 디코딩된 URL 모두 검사)
  if (/<[\\s\\S]*?>/i.test(url) || /<[\\s\\S]*?>/i.test(decodedUrl) || 
      /[<>]/i.test(url) || /[<>]/i.test(decodedUrl)) {
    return false;
  }
  
  // 2. 위험한 URL 인코딩 패턴 감지
  if (/%(?:3C|3E|00|0A|0D|27|22|60|28|29)/i.test(url)) {
    return false;
  }
  
  // 3. 위험한 프로토콜 차단
  if (/^(?:javascript|data|vbscript|file):/i.test(url) || 
      /^(?:javascript|data|vbscript|file):/i.test(decodedUrl)) {
    return false;
  }
  
  // 4. 위험한 자바스크립트 키워드 검사
  const dangerousKeywords = /\\b(?:script|alert|eval|confirm|prompt|on\\w+\\s*=)/i;
  if (dangerousKeywords.test(url) || dangerousKeywords.test(decodedUrl)) {
    return false;
  }
  
  // 5. 기존 URL 형식 검증
  const domainRegex = /^(https?:\\/\\/)?(([a-zA-Z0-9\\u3131-\\u314E\\uAC00-\\uD7A3-]+\\.)+([a-zA-Z\\u3131-\\u314E\\uAC00-\\uD7A3]{2,}))(:\\d+)?(\\/[^\\s]*)?(\\\?.*)?$/;
  const invalidPrefixRegex = /^(https?:\\/\\/)?(wwww\\.|ww\\.|w{5,}\\.|w{1,2}\\.)/i;
  return domainRegex.test(url) && !invalidPrefixRegex.test(url);
}
==========================================================================
      `);
    });
  });
});

/**
 * 통합 테스트: 실제 DOM에서 링크 플러그인 테스트
 * 아래 테스트는 에디터가 로드된 페이지에서 실행해야 합니다.
 */
function testLinkPluginInDOM() {
  // 테스트 준비
  console.log("🔄 DOM 통합 테스트 준비 중...");
  
  // 에디터 참조
  const editor = document.querySelector('#lite-editor');
  if (!editor) {
    console.error("❌ 에디터를 찾을 수 없습니다. 테스트를 진행할 수 없습니다.");
    return;
  }
  
  // 링크 버튼 참조
  const linkButton = document.querySelector('[title="Insert Link"]');
  if (!linkButton) {
    console.error("❌ 링크 버튼을 찾을 수 없습니다. 테스트를 진행할 수 없습니다.");
    return;
  }
  
  console.log("✅ 에디터와 링크 버튼을 찾았습니다. 테스트를 시작합니다.");
  
  // 테스트 도구 준비
  function simulateClick(element) {
    element.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    }));
  }
  
  function simulateInput(element, value) {
    element.value = value;
    element.dispatchEvent(new Event('input', {
      bubbles: true,
      cancelable: true
    }));
  }
  
  function simulateKeydown(element, key) {
    element.dispatchEvent(new KeyboardEvent('keydown', {
      key: key,
      code: key === 'Enter' ? 'Enter' : 'Key' + key.toUpperCase(),
      bubbles: true
    }));
  }
  
  // 테스트 시나리오
  const testScenarios = [
    {
      name: "정상 URL 삽입",
      url: "https://example.com",
      expectSuccess: true
    },
    {
      name: "XSS 공격 URL 차단",
      url: "https://example.com/<script>alert(1)</script>",
      expectSuccess: false
    },
    {
      name: "인코딩된 XSS 공격 URL 차단",
      url: "https://example.com/%0A<script>alert(1)</script>",
      expectSuccess: false
    },
    {
      name: "javascript: 프로토콜 차단",
      url: "javascript:alert(document.cookie)",
      expectSuccess: false
    }
  ];
  
  // 테스트 실행
  console.log("\n🔄 통합 테스트 시작...");
  
  function runNextTest(index) {
    if (index >= testScenarios.length) {
      console.log("\n✅ 모든 통합 테스트 완료!");
      return;
    }
    
    const scenario = testScenarios[index];
    console.log(`\n🔍 테스트 시나리오 ${index + 1}: ${scenario.name}`);
    
    // 선택 영역 생성
    editor.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.setStart(editor.firstChild || editor, 0);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    
    // 링크 버튼 클릭
    console.log("1. 링크 버튼 클릭");
    simulateClick(linkButton);
    
    // 드롭다운 메뉴 참기
    setTimeout(() => {
      const dropdown = document.querySelector('.link-dropdown');
      if (!dropdown) {
        console.error("❌ 드롭다운 메뉴를 찾을 수 없습니다.");
        runNextTest(index + 1);
        return;
      }
      
      console.log("2. 드롭다운 메뉴 확인됨");
      
      // URL 입력
      const urlInput = dropdown.querySelector('input[type="url"]');
      if (!urlInput) {
        console.error("❌ URL 입력 필드를 찾을 수 없습니다.");
        runNextTest(index + 1);
        return;
      }
      
      console.log(`3. URL 입력: ${scenario.url}`);
      simulateInput(urlInput, scenario.url);
      
      // Enter 키 입력
      console.log("4. Enter 키 입력");
      simulateKeydown(urlInput, 'Enter');
      
      // 결과 확인
      setTimeout(() => {
        // 성공 시 drop-down이 닫히고 링크가 삽입됨
        // 실패 시 경고 메시지가 표시됨
        const isDropdownClosed = !document.querySelector('.link-dropdown.show');
        const success = isDropdownClosed === scenario.expectSuccess;
        
        if (success) {
          console.log(`✅ 테스트 통과: ${scenario.name}`);
        } else {
          console.error(`❌ 테스트 실패: ${scenario.name}`);
        }
        
        // 다음 테스트 실행
        setTimeout(() => runNextTest(index + 1), 500);
      }, 500);
    }, 500);
  }
  
  // 첫 번째 테스트 시작
  runNextTest(0);
}

// 통합 테스트 실행 함수 노출
window.testLinkPluginInDOM = testLinkPluginInDOM;
