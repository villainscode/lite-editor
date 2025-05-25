# LiteEditor FontFamily Plugin 개발 및 버그 수정 기록

## 📋 개요

LiteEditor의 fontFamily.js 플러그인 개발 과정에서 발생한 주요 버그들과 해결 방법을 상세히 기록한 문서입니다. 커서 위치 보존, 드롭다운 자동 닫기, Enter/Shift+Enter 키 동작 등의 핵심 기능 구현과 관련 버그 수정 사항을 포함합니다.

## 🎯 기능 요구사항

### 1. 기본 기능
- 외부 데이터 파일(`fontList.js`)에서 폰트 목록 로드
- 드롭다운 방식의 폰트 선택 UI
- 선택된 텍스트 또는 커서 위치에 폰트 적용
- 다국어 지원 및 폰트 그룹 분류

### 2. 고급 기능
- **커서 위치 보존**: 폰트 선택 후 원래 위치 유지
- **드롭다운 자동 닫기**: 폰트 선택 시 자동으로 레이어 닫힘
- **Enter 키 동작**: 폰트 영역 벗어나서 새 문단 생성
- **Shift+Enter 동작**: 폰트 유지하면서 줄바꿈

## 🏗️ 아키텍처 설계

### 파일 구조
js/
├── data/
│ └── fontList.js # 폰트 목록 데이터
├── plugins/
│ └── fontFamily.js # 폰트 플러그인 (메인)
└── plugin-util.js # 공통 유틸리티
```

### 핵심 컴포넌트
1. **폰트 데이터 로더**: 외부 데이터 파일 동적 로드
2. **드롭다운 UI**: 폰트 목록 표시 및 선택
3. **Selection 관리**: 커서/선택 영역 저장 및 복원
4. **키보드 이벤트**: Enter/Shift+Enter 처리

## 📝 상세 구현

### 1. 기본 구조 및 전역 변수

```javascript
(function() {
  // PluginUtil 참조
  const util = window.PluginUtil || {};
  
  // 전역 상태 변수
  let savedRange = null;          // 임시로 저장된 선택 영역
  let isDropdownOpen = false;     // 드롭다운 열림 상태
  let currentSelectedFontItem = null; // 현재 선택된 폰트 아이템
  let currentFontValue = null;    // 현재 선택된 폰트 값 저장
  
  // Selection 관리 함수들
  function saveSelection() {
    savedRange = util.selection.saveSelection();
  }

  function restoreSelection() {
    if (!savedRange) return false;
    return util.selection.restoreSelection(savedRange);
  }
})();
```

### 2. 폰트 데이터 로드 시스템

```javascript
/**
 * 글꼴 데이터 로드 함수
 * 다국어 지원이 포함된 외부 데이터 파일에서 글꼴 목록 가져오기
 */
function loadFontData() {
  // 외부 데이터 파일이 로드되었는지 확인
  if (window.LiteEditorFontData && typeof window.LiteEditorFontData.getFonts === 'function') {
    return window.LiteEditorFontData.getFonts();
  } else {
    // 폴백: 기본 글꼴 목록
    return [
      { type: 'group_header', name: '기본 글꼴' },
      { type: 'divider' },
      { name: 'Arial', value: 'Arial, sans-serif' },
      { name: 'Times New Roman', value: 'Times New Roman, serif' },
      { name: 'Courier New', value: 'Courier New, monospace' }, 
      { name: 'Gulim', value: 'Gulim, sans-serif' },
    ];
  }
}

/**
 * 글꼴 데이터 스크립트 동적 로드
 */
function loadFontScript(callback) {
  if (window.LiteEditorFontData) {
    if (callback) callback();
    return;
  }
  
  const script = document.createElement('script');
  script.src = 'js/data/fontList.js';
  script.onload = function() {
    if (callback) callback();
  };
  script.onerror = function() {
    errorHandler.logError('FontFamilyPlugin', errorHandler.codes.PLUGINS.FONT.LOAD, e);
    if (callback) callback();
  };
  
  document.head.appendChild(script);
}
```

### 3. 드롭다운 UI 생성

```javascript
// 1. 폰트 버튼 컨테이너 생성
const fontContainer = util.dom.createElement('div', {
  className: 'lite-editor-font-button',
  title: 'Font Family'
}, {
  position: 'relative'
});

// 2. 버튼 아이콘 및 텍스트
const icon = util.dom.createElement('i', {
  className: 'material-icons',
  textContent: 'font_download'
});

const fontText = util.dom.createElement('span', {
  textContent: 'Font Family'
});

// 3. 드롭다운 메뉴 생성
const dropdownMenu = util.dom.createElement('div', {
  id: 'font-family-dropdown',
  className: 'lite-editor-font-dropdown lite-editor-dropdown-menu'
}, {
  position: 'absolute',
  zIndex: '2147483647',
  backgroundColor: '#fff',
  border: '1px solid #ccc',
  borderRadius: '4px',
  boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
  maxHeight: '300px',
  minWidth: '180px',
  overflowY: 'auto',
  padding: '8px 0',
  display: 'none'
});
```

### 4. 폰트 목록 동적 생성

```javascript
loadFontScript(function() {
  const fonts = loadFontData();
  
  fonts.forEach(font => {
    // 구분선 처리
    if (font.type === 'divider') {
      const divider = util.dom.createElement('hr', {
        className: 'lite-editor-font-divider'
      });
      dropdownMenu.appendChild(divider);
      return;
    }
    
    // 그룹 헤더 처리
    if (font.type === 'group_header') {
      const header = util.dom.createElement('div', {
        textContent: font.name
      }, {
        fontWeight: 'bold',
        padding: '5px 10px',
        color: '#2f67ff',
        fontSize: '11px',
        backgroundColor: '#f5f5f5'
      });
      dropdownMenu.appendChild(header);
      return;
    }
    
    // 폰트 항목 생성
    const fontItem = util.dom.createElement('div', {
      textContent: font.name
    }, {
      padding: '5px 10px',
      cursor: 'pointer',
      fontFamily: font.value,
      fontSize: '13px'
    });
    
    // 호버 이벤트
    fontItem.addEventListener('mouseover', () => {
      fontItem.style.backgroundColor = '#e9e9e9';
    });
    
    fontItem.addEventListener('mouseout', () => {
      if (fontItem !== currentSelectedFontItem) {
        fontItem.style.backgroundColor = '';
      }
    });
    
    // 클릭 이벤트 (핵심 로직)
    fontItem.addEventListener('click', (e) => {
      // 폰트 적용 로직 (아래 상세 설명)
    });
    
    dropdownMenu.appendChild(fontItem);
  });
});
```

## 🚨 주요 버그 및 해결 과정

### 버그 1: 커서 위치 이동 문제

#### 문제 상황
폰트 선택 후 커서가 에디터 첫 줄 첫 번째 위치로 이동하는 현상

#### 원인 분석
1. **Selection 저장 시점 문제**: collapsed selection(커서만 있는 상태)을 저장하지 않음
2. **execCommand의 부작용**: `execCommand('fontName')`이 selection을 변경시킴
3. **Focus 타이밍 문제**: selection 복원 전에 focus를 호출
4. **Scroll 중복 처리**: `util.scroll.preservePosition` 래퍼 안에서 또 scroll 저장/복원

#### 해결 방법

**Before (문제 코드):**
```javascript
// ❌ 문제: collapsed selection 제외
fontContainer.addEventListener('mousedown', (e) => {
  const currentSelection = window.getSelection();
  if (currentSelection.rangeCount > 0 && !currentSelection.isCollapsed) {  // 🚨 collapsed 제외
    savedRange = util.selection.saveSelection();
  }
});

// ❌ 문제: selection 복원 전에 focus
contentArea.focus({ preventScroll: true });
// ... 그 후에 selection 복원

// ❌ 문제: 중복 scroll 처리
fontItem.addEventListener('click', util.scroll.preservePosition((e) => {
  const scrollPosition = util.scroll.savePosition();  // 🚨 중복
  util.scroll.restorePosition(scrollPosition, 50);   // 🚨 중복
}));
```

**After (해결 코드):**
```javascript
// ✅ 해결: collapsed selection도 저장
fontContainer.addEventListener('mousedown', (e) => {
  const currentSelection = window.getSelection();
  if (currentSelection.rangeCount > 0) {  // collapsed 조건 제거
    savedRange = util.selection.saveSelection();
    errorHandler.logInfo('FontFamilyPlugin', `mousedown에서 selection 저장됨: collapsed=${currentSelection.isCollapsed}`);
  }
});

// ✅ 해결: selection 복원 후 execCommand 실행
fontItem.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  
  // 1. UI 업데이트
  // ... UI 관련 코드
  
  // 2. Scroll 위치 저장 (한 번만)
  const scrollPosition = util.scroll.savePosition();
  
  // 3. Selection 복원 (한 번만)
  if (savedRange) {
    const restored = restoreSelection();
    if (!restored) {
      console.warn('Selection 복원 실패');
    }
  }
  
  // 4. Focus 설정 (selection 복원 후)
  if (!contentArea.contains(document.activeElement)) {
    contentArea.focus({ preventScroll: true });
  }
  
  // 5. 폰트 값 저장
  currentFontValue = font.value;
  
  // 6. execCommand 실행
  try {
    document.execCommand('fontName', false, font.value);
  } catch (error) {
    errorHandler.logError('FontFamilyPlugin', 'execCommand 실행 중 오류:', error);
  }
  
  // 7. Scroll 위치 복원
  util.scroll.restorePosition(scrollPosition);
  
  // 8. UI 업데이트
  fontText.textContent = font.name;
});
```

### 버그 2: 드롭다운 자동 닫기 실패

#### 문제 상황
폰트 선택 후 드롭다운이 자동으로 닫히지 않고 계속 열려있는 상태

#### 원인 분석
코드 리팩토링 과정에서 드롭다운 닫기 로직이 제거됨

#### 해결 방법

**Before (문제 코드):**
```javascript
fontItem.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  
  // 1. UI 업데이트
  // ... UI 코드만 있음
  
  // ❌ 문제: 드롭다운 닫기 코드가 없음!
  
  // 2. Scroll 위치 저장
  // ... 나머지 로직
});
```

**After (해결 코드):**
```javascript
fontItem.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  
  // 1. UI 업데이트
  if (currentSelectedFontItem) {
    currentSelectedFontItem.style.backgroundColor = '';
  }
  currentSelectedFontItem = fontItem;
  fontItem.style.backgroundColor = '#e9e9e9';
  
  // CSS 호버 효과 적용
  fontContainer.style.backgroundColor = '#e9e9e9';  
  fontContainer.style.color = '#1a73e8';            
  icon.style.color = '#1a73e8';                     
  
  // ✅ 추가: 드롭다운 닫기
  dropdownMenu.style.display = 'none';
  dropdownMenu.classList.remove('show');
  fontContainer.classList.remove('active');
  isDropdownOpen = false;
  
  // ✅ 추가: 모달 관리 시스템에서 제거
  util.activeModalManager.unregister(dropdownMenu);
  
  // ... 나머지 로직
});
```

### 버그 3: Shift+Enter 폰트 유지 실패

#### 문제 상황
Shift+Enter 시 폰트가 유지되지 않고 `<span black="" han="" sans",="" sans-serif;"="">​ㅁㅇㄹ</span>` 형태로 잘못 생성됨

#### 원인 분석
1. **getComputedStyle 파싱 오류**: `getComputedStyle().fontFamily`가 `"Noto Sans KR", "Apple SD Gothic Neo", sans-serif` 형태로 반환되어 HTML 속성에 직접 삽입 시 따옴표와 쉼표가 HTML 속성으로 잘못 파싱됨
2. **원본 폰트 정보 손실**: `execCommand('fontName')`으로 적용된 폰트를 `getComputedStyle()`로 다시 읽어오는 과정에서 원본 정보 변질

#### 해결 방법

**Before (문제 코드):**
```javascript
if (e.shiftKey) {
  // Shift+Enter: 폰트 유지하면서 줄바꿈
  e.preventDefault();
  
  // ❌ 문제: getComputedStyle 파싱 오류
  const fontFamily = window.getComputedStyle(fontElement).fontFamily;
  const htmlToInsert = `<br><span style="font-family: ${fontFamily};">&#8203;</span>`;
  
  document.execCommand('insertHTML', false, htmlToInsert);
}
```

**After (해결 코드):**
```javascript
// 전역 변수에 폰트 값 저장
let currentFontValue = null;

// 폰트 클릭 시 값 저장
fontItem.addEventListener('click', (e) => {
  // ... 기존 코드 ...
  
  // ✅ 폰트 값 저장
  currentFontValue = font.value;
  
  // execCommand 실행
  document.execCommand('fontName', false, font.value);
});

// Shift+Enter 처리
if (e.shiftKey) {
  // Shift+Enter: 폰트 유지하면서 줄바꿈
  e.preventDefault();
  
  // ✅ 가장 안전한 방법: DOM 요소 직접 생성
  let fontFamily = currentFontValue;
  
  if (!fontFamily) {
    // 폴백: 현재 요소에서 추출
    const styleAttr = fontElement.getAttribute('style');
    const fontFamilyMatch = styleAttr?.match(/font-family:\s*([^;]+)/);
    fontFamily = fontFamilyMatch ? fontFamilyMatch[1].trim() : 'inherit';
  }
  
  // DOM 요소 직접 생성 (HTML 파싱 오류 방지)
  const br = document.createElement('br');
  const newSpan = document.createElement('span');
  newSpan.style.fontFamily = fontFamily; // 안전한 속성 설정
  newSpan.innerHTML = '&#8203;'; // 제로폭 공백
  
  // 현재 위치에 삽입
  range.deleteContents();
  range.insertNode(br);
  range.setStartAfter(br);
  range.insertNode(newSpan);
  
  // 커서를 새 span 내부로 이동
  range.setStart(newSpan, 1);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
  
  errorHandler.logInfo('FontFamilyPlugin', `Shift+Enter: 폰트 유지 줄바꿈 (${fontFamily})`);
}
```

## 🔧 키보드 이벤트 처리

### Enter/Shift+Enter 동작 구현

```javascript
function setupFontKeyboardEvents(contentArea) {
  contentArea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const currentElement = range.startContainer.nodeType === Node.TEXT_NODE 
          ? range.startContainer.parentElement 
          : range.startContainer;
        
        // 폰트 스타일이 적용된 요소 찾기
        const fontElement = currentElement.closest('span[style*="font-family"], font');
        
        if (fontElement) {
          if (e.shiftKey) {
            // Shift+Enter: 폰트 유지하면서 줄바꿈
            e.preventDefault();
            
            let fontFamily = currentFontValue;
            
            if (!fontFamily) {
              // 폴백: 현재 요소에서 추출
              const styleAttr = fontElement.getAttribute('style');
              const fontFamilyMatch = styleAttr?.match(/font-family:\s*([^;]+)/);
              fontFamily = fontFamilyMatch ? fontFamilyMatch[1].trim() : 'inherit';
            }
            
            // DOM 요소 직접 생성
            const br = document.createElement('br');
            const newSpan = document.createElement('span');
            newSpan.style.fontFamily = fontFamily;
            newSpan.innerHTML = '&#8203;';
            
            // 현재 위치에 삽입
            range.deleteContents();
            range.insertNode(br);
            range.setStartAfter(br);
            range.insertNode(newSpan);
            
            // 커서를 새 span 내부로 이동
            range.setStart(newSpan, 1);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
            
            errorHandler.logInfo('FontFamilyPlugin', `Shift+Enter: 폰트 유지 줄바꿈 (${fontFamily})`);
          } else {
            // Enter: 폰트 영역 벗어나서 새 문단
            e.preventDefault();
            
            // 새 문단 생성
            const newP = document.createElement('p');
            newP.innerHTML = '<br>';
            
            // 현재 문단 다음에 삽입
            const currentP = fontElement.closest('p') || fontElement.parentElement;
            currentP.parentNode.insertBefore(newP, currentP.nextSibling);
            
            // 커서를 새 문단으로 이동
            const newRange = document.createRange();
            newRange.setStart(newP, 0);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
            
            errorHandler.logInfo('FontFamilyPlugin', 'Enter: 폰트 영역 벗어남');
          }
        }
      }
    }
  });
}
```

## 🎨 드롭다운 토글 로직

### 모달 관리 시스템 통합

```javascript
fontContainer.addEventListener('click', util.scroll.preservePosition((e) => {
  e.preventDefault();
  e.stopPropagation();
  
  // 클릭 시 selection 저장
  const currentSelection = window.getSelection();
  if (currentSelection.rangeCount > 0 && !currentSelection.isCollapsed && !savedRange) {
    savedRange = util.selection.saveSelection();
    errorHandler.logInfo('FontFamilyPlugin', `click에서 추가 selection 저장됨: "${currentSelection.toString()}"`);
  }
  
  // 현재 드롭다운의 상태 확인
  const isVisible = dropdownMenu.classList.contains('show');
  
  // 다른 모든 드롭다운 닫기
  if (!isVisible) {
    util.activeModalManager.closeAll();
  }
  
  if (isVisible) {
    // 닫기
    dropdownMenu.classList.remove('show');
    dropdownMenu.style.display = 'none';
    fontContainer.classList.remove('active');
    isDropdownOpen = false;
    
    util.activeModalManager.unregister(dropdownMenu);
  } else {
    // 열기
    dropdownMenu.classList.add('show');
    dropdownMenu.style.display = 'block';
    fontContainer.classList.add('active');
    isDropdownOpen = true;
    
    // 드롭다운 위치 설정
    const buttonRect = fontContainer.getBoundingClientRect();
    dropdownMenu.style.top = (buttonRect.bottom + window.scrollY) + 'px';
    dropdownMenu.style.left = (buttonRect.left - 3) + 'px';
    
    // 활성 모달 등록
    dropdownMenu.closeCallback = () => {
      dropdownMenu.classList.remove('show');
      dropdownMenu.style.display = 'none';
      fontContainer.classList.remove('active');
      isDropdownOpen = false;
    };
    
    util.activeModalManager.register(dropdownMenu);
    
    // 외부 클릭 시 닫기 설정
    util.setupOutsideClickHandler(dropdownMenu, () => {
      dropdownMenu.classList.remove('show');
      dropdownMenu.style.display = 'none';
      fontContainer.classList.remove('active');
      isDropdownOpen = false;
      util.activeModalManager.unregister(dropdownMenu);
    }, [fontContainer]);
  }
}));
```

## 📊 성능 최적화

### 1. 이벤트 리스너 중복 방지
```javascript
// 키보드 이벤트 설정 (한 번만 실행)
if (!contentArea.hasAttribute('data-font-events-setup')) {
  setupFontKeyboardEvents(contentArea);
  contentArea.setAttribute('data-font-events-setup', 'true');
}
```

### 2. 스크롤 위치 보존
```javascript
// util.scroll.preservePosition 래퍼 사용
fontContainer.addEventListener('click', util.scroll.preservePosition((e) => {
  // 드롭다운 토글 로직
}));

// 폰트 적용 시 개별 스크롤 관리
const scrollPosition = util.scroll.savePosition();
// ... 폰트 적용 로직
util.scroll.restorePosition(scrollPosition);
```

### 3. 메모리 관리
```javascript
// 전역 변수 초기화
let savedRange = null;
let isDropdownOpen = false;
let currentSelectedFontItem = null;
let currentFontValue = null;

// 필요 시 정리 함수 구현
function cleanup() {
  savedRange = null;
  currentSelectedFontItem = null;
  currentFontValue = null;
  isDropdownOpen = false;
}
```

## 🧪 테스트 시나리오

### 1. 기본 기능 테스트
- [ ] 폰트 드롭다운 열기/닫기
- [ ] 폰트 선택 시 텍스트에 적용
- [ ] 커서 위치에서 폰트 설정
- [ ] 선택된 텍스트에 폰트 적용

### 2. 커서 위치 보존 테스트
- [ ] 텍스트 중간에 커서 위치 후 폰트 선택
- [ ] 여러 줄 텍스트에서 특정 위치 선택 후 폰트 적용
- [ ] 스크롤된 상태에서 폰트 선택 후 위치 확인

### 3. 키보드 이벤트 테스트
- [ ] 폰트 적용된 텍스트에서 Enter 키 (새 문단 생성)
- [ ] 폰트 적용된 텍스트에서 Shift+Enter (폰트 유지 줄바꿈)
- [ ] 일반 텍스트에서 Enter/Shift+Enter (기본 동작)

### 4. 드롭다운 UI 테스트
- [ ] 외부 클릭 시 드롭다운 닫기
- [ ] 폰트 선택 시 자동 닫기
- [ ] 다른 플러그인 드롭다운과의 상호작용

## 🔍 디버깅 가이드

### 1. 커서 위치 문제 디버깅
```javascript
// Selection 상태 확인
console.log('Selection saved:', !!savedRange);
console.log('Current selection:', window.getSelection().toString());
console.log('Selection collapsed:', window.getSelection().isCollapsed);

// Range 정보 확인
if (savedRange) {
  console.log('Saved range:', savedRange);
}
```

### 2. 폰트 적용 문제 디버깅
```javascript
// 폰트 값 확인
console.log('Current font value:', currentFontValue);
console.log('Applied font:', document.queryCommandValue('fontName'));

// DOM 구조 확인
const selection = window.getSelection();
if (selection.rangeCount > 0) {
  const range = selection.getRangeAt(0);
  console.log('Current element:', range.startContainer.parentElement);
  console.log('Font element:', range.startContainer.parentElement.closest('span[style*="font-family"], font'));
}
```

### 3. 키보드 이벤트 디버깅
```javascript
// 이벤트 리스너 등록 확인
console.log('Font events setup:', contentArea.hasAttribute('data-font-events-setup'));

// Enter 키 처리 확인
contentArea.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    console.log('Enter key pressed, shiftKey:', e.shiftKey);
    console.log('Font element found:', !!currentElement.closest('span[style*="font-family"], font'));
  }
});
```

## 🚀 배포 체크리스트

- [ ] fontList.js 데이터 파일 로드 확인
- [ ] CSS 파일 로드 확인 (fontFamily.css)
- [ ] PluginUtil 의존성 확인
- [ ] errorHandler 로깅 시스템 연동
- [ ] 브라우저 호환성 테스트
- [ ] 모바일 환경 테스트
- [ ] 성능 테스트 (대용량 텍스트)

## 🔮 향후 개선 사항

### 1. 기능 확장
- 폰트 크기 조절 기능 추가
- 폰트 미리보기 기능
- 최근 사용 폰트 기록
- 즐겨찾기 폰트 기능

### 2. 성능 최적화
- 폰트 목록 가상화 (대량 폰트 지원)
- 폰트 로딩 지연 처리
- 메모리 사용량 최적화

### 3. 사용성 개선
- 키보드 네비게이션 지원
- 폰트 검색 기능
- 폰트 카테고리 필터링

## 📝 참고 사항

### 브라우저 호환성
- **execCommand**: 모든 주요 브라우저 지원 (deprecated이지만 대안 없음)
- **Selection API**: IE9+ 지원
- **DOM Range API**: 모든 현대 브라우저 지원

### 성능 고려사항
- 폰트 목록이 많을 경우 렌더링 성능 저하 가능
- 키보드 이벤트 리스너는 contentArea당 한 번만 등록
- Selection 저장/복원은 비용이 높은 작업

### 알려진 제한사항
- execCommand는 W3C에서 deprecated 상태
- 일부 브라우저에서 폰트 적용 방식이 다를 수 있음
- 복잡한 HTML 구조에서 폰트 영역 감지 어려움

---

**작성일**: 2025-05-25  
**작성자**: LiteEditor 개발팀  
**버전**: 1.0.0  
**최종 수정**: 2025-05-25