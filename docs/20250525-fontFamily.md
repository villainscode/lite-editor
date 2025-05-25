# LiteEditor FontFamily Plugin 개발 가이드

## 📋 개요

LiteEditor의 fontFamily.js 플러그인 개발 과정에서 발생한 주요 버그들과 해결 방법을 기록한 문서입니다. 특히 execCommand 사용으로 인한 스크롤 문제와 Enter/Shift+Enter 키 처리 문제를 중점적으로 다룹니다.

## 🏗️ 기본 구조

### 전역 변수
```javascript
let savedRange = null;              // 저장된 선택 영역
let isDropdownOpen = false;         // 드롭다운 상태
let currentSelectedFontItem = null; // 선택된 폰트 아이템
let currentFontValue = null;        // 현재 폰트 값
```

### 핵심 함수
```javascript
// Selection 관리
function saveSelection() {
  savedRange = util.selection.saveSelection();
}

function restoreSelection() {
  if (!savedRange) return false;
  return util.selection.restoreSelection(savedRange);
}

// 폰트 데이터 로드
function loadFontData() {
  if (window.LiteEditorFontData?.getFonts) {
    return window.LiteEditorFontData.getFonts();
  }
  // 폴백 데이터 반환
}
```

## 🚨 주요 버그 및 해결 방법

### 1. 커서 위치 이동 문제

**문제**: 폰트 선택 후 커서가 에디터 첫 줄로 이동

**원인**: collapsed selection을 저장하지 않음

**해결**:
```javascript
// ❌ Before
if (currentSelection.rangeCount > 0 && !currentSelection.isCollapsed) {
  savedRange = util.selection.saveSelection();
}

// ✅ After
if (currentSelection.rangeCount > 0) {  // collapsed 조건 제거
  savedRange = util.selection.saveSelection();
}
```

### 2. 드롭다운 자동 닫기 실패

**문제**: 폰트 선택 후 드롭다운이 열린 상태로 유지

**해결**:
```javascript
fontItem.addEventListener('click', (e) => {
  // UI 업데이트
  // ...
  
  // ✅ 드롭다운 닫기 추가
  dropdownMenu.style.display = 'none';
  dropdownMenu.classList.remove('show');
  fontContainer.classList.remove('active');
  isDropdownOpen = false;
  util.activeModalManager.unregister(dropdownMenu);
});
```

### 3. Shift+Enter 폰트 유지 실패

**문제**: `<span black="" han="" sans",="" sans-serif;"="">` 형태로 잘못 생성

**원인**: getComputedStyle 파싱 오류

**해결**:
```javascript
// ❌ Before: getComputedStyle 사용
const fontFamily = window.getComputedStyle(fontElement).fontFamily;

// ✅ After: 전역 변수 사용 + DOM 직접 생성
let fontFamily = currentFontValue;
const newSpan = document.createElement('span');
newSpan.style.fontFamily = fontFamily; // 안전한 속성 설정
```

### 4. 스크롤 위치 이동 문제 ⭐

**문제**: 폰트 선택 시 스크롤이 맨 위로 이동

**원인**: execCommand의 브라우저 자동 스크롤 부작용

#### 해결 방법

##### 드롭다운 토글 시
```javascript
fontContainer.addEventListener('click', (e) => {
  // 1. 스크롤 위치 저장 (최우선)
  const scrollPosition = util.scroll.savePosition();
  
  // 2. 드롭다운 토글 로직
  // ...
  
  // 3. 스크롤 위치 복원 (마지막)
  util.scroll.restorePosition(scrollPosition);
});
```

##### 폰트 선택 시 (execCommand 대응)
```javascript
fontItem.addEventListener('click', (e) => {
  // 1. 스크롤 위치 저장
  const scrollPosition = util.scroll.savePosition();
  
  // 2. UI 업데이트 및 드롭다운 닫기
  // ...
  
  // 3. Focus 설정 (Selection 복원 전에)
  try {
    contentArea.focus({ preventScroll: true });
  } catch (e) {
    contentArea.focus();
  }
  
  // 4. Selection 복원
  if (savedRange) {
    restoreSelection();
  }
  
  // 5. execCommand 실행
  document.execCommand('fontName', false, font.value);
  
  // 6. 지연된 스크롤 복원 (핵심!)
  requestAnimationFrame(() => {
    setTimeout(() => {
      util.scroll.restorePosition(scrollPosition);
    }, 50);
  });
});
```

#### 핵심 포인트

1. **실행 순서**: 스크롤 저장 → Focus → Selection 복원 → execCommand → 지연된 스크롤 복원
2. **지연 시간**: `requestAnimationFrame` + `setTimeout(50ms)`로 브라우저 자동 스크롤 완료 후 복원
3. **Focus 옵션**: `preventScroll: true` 사용 + try-catch 처리

### 5. Enter 키 처리 시 뒤 텍스트 건너뛰기 문제

**문제**: 폰트가 적용된 텍스트에서 Enter 키를 누를 때, 커서 뒤에 있는 텍스트들이 줄바꿈되지 않고 건너뛰어지는 현상

**예시**:
```html
<!-- 입력 상태 -->
<font face="Arial">폰트 텍스트|커서위치 뒤에 있는 텍스트들</font>

<!-- Enter 키 후 (문제) -->
폰트 텍스트
|커서위치 (뒤 텍스트들이 사라짐)
```

**원인**: 
1. 제한적인 폰트 영역 감지
2. 커서 이후의 텍스트와 요소들을 새 줄로 이동시키지 않음
3. 형제 요소들이 처리되지 않음

**해결**:
```javascript
// ❌ Before: 제한적인 감지
const fontElement = currentElement.closest('span[style*="font-family"], font');

// ✅ After: 포괄적인 감지
const fontElement = currentElement.closest('span[style*="font-family"], font') || 
                   currentElement.querySelector('span[style*="font-family"], font');

const isInFontArea = fontElement && (
  fontElement.contains(range.startContainer) || 
  fontElement === range.startContainer ||
  (range.startContainer.nodeType === Node.TEXT_NODE && 
   fontElement.contains(range.startContainer.parentElement))
);

if (isInFontArea && !e.shiftKey) {
  e.preventDefault();
  
  // 커서 이후의 모든 콘텐츠 수집
  const currentContainer = range.startContainer;
  const currentOffset = range.startOffset;
  let remainingContent = '';
  let nodesToMove = [];
  
  if (currentContainer.nodeType === Node.TEXT_NODE) {
    // 텍스트 노드를 커서 위치에서 분할
    remainingContent = currentContainer.textContent.substring(currentOffset);
    currentContainer.textContent = currentContainer.textContent.substring(0, currentOffset);
    
    // 형제 요소들도 수집
    let nextSibling = currentContainer.parentElement.nextSibling;
    while (nextSibling) {
      nodesToMove.push(nextSibling);
      nextSibling = nextSibling.nextSibling;
    }
  }
  
  // 새 문단 생성 및 콘텐츠 이동
  const newP = document.createElement('p');
  if (remainingContent.trim()) {
    newP.textContent = remainingContent;
  }
  
  nodesToMove.forEach(node => {
    newP.appendChild(node.cloneNode(true));
    node.remove();
  });
  
  if (!newP.textContent.trim() && newP.children.length === 0) {
    newP.innerHTML = '<br>';
  }
  
  // 새 문단 삽입 및 커서 이동
  const currentP = fontElement.closest('p') || fontElement.parentElement.closest('p');
  currentP.parentNode.insertBefore(newP, currentP.nextSibling);
  
  const newRange = document.createRange();
  newRange.setStart(newP.firstChild || newP, 0);
  newRange.collapse(true);
  selection.removeAllRanges();
  selection.addRange(newRange);
}
```

### 6. Shift+Enter 폰트 유지 시 텍스트 분할 문제

**문제**: Shift+Enter 시 커서 뒤의 텍스트가 새 줄로 이동하지 않고 현재 위치에서만 줄바꿈

**원인**: 텍스트 노드 분할 처리 누락

**해결**:
```javascript
if (e.shiftKey) {
  e.preventDefault();
  
  let fontFamily = currentFontValue;
  if (!fontFamily) {
    const styleAttr = fontElement.getAttribute('style');
    fontFamily = parseFontFamily(styleAttr) || 'inherit';
  }
  
  // ✅ 텍스트 분할 처리 추가
  const currentContainer = range.startContainer;
  const currentOffset = range.startOffset;
  let remainingContent = '';
  
  if (currentContainer.nodeType === Node.TEXT_NODE) {
    remainingContent = currentContainer.textContent.substring(currentOffset);
    currentContainer.textContent = currentContainer.textContent.substring(0, currentOffset);
  }
  
  // 새 줄 생성
  const br = document.createElement('br');
  const newSpan = document.createElement('span');
  newSpan.style.fontFamily = fontFamily;
  
  // 남은 텍스트가 있으면 새 span에 추가
  if (remainingContent.trim()) {
    newSpan.textContent = remainingContent;
  } else {
    newSpan.innerHTML = '&#8203;'; // 제로폭 공백
  }
  
  // DOM에 삽입
  if (currentContainer.nodeType === Node.TEXT_NODE) {
    const parent = currentContainer.parentElement;
    parent.insertBefore(br, currentContainer.nextSibling);
    parent.insertBefore(newSpan, br.nextSibling);
  } else {
    range.insertNode(br);
    range.setStartAfter(br);
    range.insertNode(newSpan);
  }
  
  // 커서를 새 span 시작 부분으로 이동
  const newRange = document.createRange();
  newRange.setStart(newSpan.firstChild || newSpan, 0);
  newRange.collapse(true);
  selection.removeAllRanges();
  selection.addRange(newRange);
}
```

### 7. 폰트 영역 감지 개선

**핵심 개선사항**:

1. **정확한 폰트 영역 감지**
   ```javascript
   // ✅ 더 포괄적인 감지
   const fontElement = currentElement.closest('span[style*="font-family"], font') || 
                      currentElement.querySelector('span[style*="font-family"], font');
   
   const isInFontArea = fontElement && (
     fontElement.contains(range.startContainer) || 
     fontElement === range.startContainer ||
     (range.startContainer.nodeType === Node.TEXT_NODE && 
      fontElement.contains(range.startContainer.parentElement))
   );
   ```

2. **텍스트 노드 분할 처리**
   ```javascript
   // 커서 위치에서 텍스트 노드를 정확히 분할
   if (currentContainer.nodeType === Node.TEXT_NODE) {
     remainingContent = currentContainer.textContent.substring(currentOffset);
     currentContainer.textContent = currentContainer.textContent.substring(0, currentOffset);
   }
   ```

3. **형제 요소 처리**
   ```javascript
   // 폰트 요소 이후의 모든 형제 요소들 수집
   let nextSibling = currentContainer.parentElement.nextSibling;
   while (nextSibling) {
     nodesToMove.push(nextSibling);
     nextSibling = nextSibling.nextSibling;
   }
   ```

## 🔍 스크롤 보존 적용 가이드

### 언제 사용해야 하는가?

#### ✅ 반드시 적용
- **execCommand 사용 플러그인**
  - `fontName`, `foreColor`, `hiliteColor`, `formatBlock`
- **Selection 복원 필요한 경우**
  - 드롭다운에서 선택 후 텍스트 적용
  - 모달에서 설정 후 에디터 복귀
- **긴 문서 작업 시**
  - 1000px 이상 스크롤된 상태

#### ❌ 불필요한 경우
- **DOM 조작만 하는 플러그인**
  - 이미지/비디오 삽입 (`range.insertNode()`)
- **즉시 실행 명령**
  - 단순 텍스트 삽입, 기본 포맷팅

### 다른 플러그인 적용 예시

#### execCommand 사용 플러그인
```javascript
function applyWithScrollPreservation(command, value, contentArea) {
  const scrollPosition = util.scroll.savePosition();
  
  try {
    contentArea.focus({ preventScroll: true });
  } catch (e) {
    contentArea.focus();
  }
  
  if (savedRange) {
    util.selection.restoreSelection(savedRange);
  }
  
  document.execCommand(command, false, value);
  
  requestAnimationFrame(() => {
    setTimeout(() => {
      util.scroll.restorePosition(scrollPosition);
    }, 50);
  });
}
```

## 🧪 테스트 및 디버깅

### 스크롤 보존 테스트
```javascript
function testScrollPreservation() {
  // 1. 긴 문서 생성
  const longContent = 'Lorem ipsum '.repeat(200);
  contentArea.innerHTML = `<p>${longContent}</p>`;
  
  // 2. 중간 지점으로 스크롤
  window.scrollTo(0, 800);
  const initialScrollY = window.scrollY;
  
  // 3. 폰트 선택 후 확인
  setTimeout(() => {
    const finalScrollY = window.scrollY;
    const preserved = Math.abs(initialScrollY - finalScrollY) < 10;
    console.log('스크롤 보존:', preserved ? '✅ 성공' : '❌ 실패');
  }, 200);
}
```

### Enter/Shift+Enter 테스트
```javascript
function testEnterKeyHandling() {
  // 1. 폰트가 적용된 텍스트 생성
  const contentArea = document.querySelector('.lite-editor-content');
  contentArea.innerHTML = '<p><font face="Arial">앞 텍스트|커서위치 뒤 텍스트들</font></p>';
  
  // 2. 커서를 중간에 위치
  const range = document.createRange();
  const textNode = contentArea.querySelector('font').firstChild;
  range.setStart(textNode, 4); // "앞 텍스트" 뒤
  range.collapse(true);
  
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  
  // 3. Enter 키 시뮬레이션
  const enterEvent = new KeyboardEvent('keydown', {
    key: 'Enter',
    shiftKey: false
  });
  contentArea.dispatchEvent(enterEvent);
  
  // 4. 결과 확인
  console.log('Enter 키 테스트 결과:', contentArea.innerHTML);
}

function testShiftEnterHandling() {
  // Shift+Enter 테스트 (위와 유사하지만 shiftKey: true)
}
```

### 실시간 스크롤 모니터링
```javascript
function enableScrollMonitoring() {
  let lastScrollY = window.scrollY;
  
  const handler = () => {
    const currentScrollY = window.scrollY;
    if (Math.abs(currentScrollY - lastScrollY) > 5) {
      console.log('스크롤 변화:', {
        from: lastScrollY,
        to: currentScrollY,
        diff: currentScrollY - lastScrollY
      });
      lastScrollY = currentScrollY;
    }
  };
  
  window.addEventListener('scroll', handler);
  return () => window.removeEventListener('scroll', handler);
}
```

## 📋 체크리스트

### 구현 시 확인사항
- [ ] `util.scroll.savePosition()` 가장 먼저 호출
- [ ] `contentArea.focus({ preventScroll: true })` + try-catch
- [ ] Focus → Selection 복원 → execCommand 순서
- [ ] execCommand 시 지연된 스크롤 복원 적용
- [ ] 브라우저 호환성 처리
- [ ] Enter/Shift+Enter 키 이벤트 처리
- [ ] 텍스트 노드 분할 로직 구현
- [ ] 폰트 영역 감지 개선

### 테스트 시나리오
- [ ] 긴 문서에서 중간 지점 스크롤 후 폰트 선택
- [ ] 연속 사용 시 스크롤 위치 유지
- [ ] 빠른 클릭 시 안정성
- [ ] 다양한 브라우저에서 동작 확인
- [ ] 폰트 텍스트 중간에서 Enter 키 (뒤 텍스트 함께 이동)
- [ ] 폰트 텍스트에서 Shift+Enter (폰트 유지 줄바꿈)
- [ ] 복잡한 HTML 구조에서 Enter 키 처리

## 🎯 성공 기준

1. **정확성**: 스크롤 위치 차이 ±10px 이내
2. **일관성**: 10회 테스트 중 9회 이상 성공
3. **성능**: 스크롤 복원 지연 100ms 이내
4. **호환성**: 주요 브라우저 동일 동작
5. **안정성**: 빠른 연속 클릭에도 위치 유지
6. **텍스트 처리**: Enter/Shift+Enter 시 텍스트 분할 정확성
7. **폰트 유지**: Shift+Enter 시 폰트 스타일 보존

## 🔧 주요 학습 사항

1. **execCommand의 부작용**: 브라우저 자동 스크롤 조정 발생
2. **타이밍의 중요성**: 지연된 스크롤 복원이 핵심
3. **텍스트 노드 분할**: 커서 위치에서 정확한 분할 필요
4. **DOM 직접 조작**: getComputedStyle보다 안전한 방법
5. **포괄적 감지**: 다양한 HTML 구조 대응 필요

---

**작성일**: 2025-05-25  
**작성자**: LiteEditor 개발팀  
**버전**: 1.0.3  
**최종 수정**: 2025-05-25 (Enter/Shift+Enter 문제 추가)