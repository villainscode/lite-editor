# FontFamily 플러그인 기능정의서 v1.0

## 핵심 요구사항

### A. Enter 키 동작
- **A1**: 일반 텍스트에서 Enter → 새 문단 생성 (폰트 스타일 없음)
- **A2**: 폰트 영역에서 Enter → 폰트 영역 밖으로 나가서 새 문단 생성
- **A3**: 폰트 영역에서 Shift+Enter → 폰트 스타일 유지하며 줄바꿈

### B. 폰트 적용 동작
- **B1**: 폰트 선택 시 선택된 텍스트에만 적용 (`document.execCommand('fontName')` 사용)
- **B2**: 폰트 버튼 상태가 현재 커서 위치의 폰트 반영 (`updateFontButtonState` 함수)
- **B3**: Enter로 폰트 영역 밖으로 벗어나면 Font Family 레이어는 기본값 유지 (`fontText.textContent = 'Font Family'`)
- **B4**: 사용자가 명시적으로 설정한 폰트만 "폰트 영역"으로 간주 (`currentFontValue` 변수로 추적)
- **B5**: 폰트 태그가 적용된 영역에 커서가 위치하면 폰트 레이어에 선택자로 적용한 폰트를 매치해서 자동으로 변경 (`closest('span[style*="font-family"], font')` 감지)

### C. 드롭다운 UI 동작
- **C1**: 폰트 버튼 클릭 시 드롭다운 메뉴 토글 (`fontContainer.addEventListener('click')`)
- **C2**: 외부 클릭 시 드롭다운 자동 닫기 (`util.setupOutsideClickHandler`)
- **C3**: 키보드 네비게이션 지원 (Tab, Escape, Arrow 키)
- **C4**: 폰트 선택 시 드롭다운 닫기 및 UI 상태 업데이트

### D. 선택 영역 관리
- **D1**: 드롭다운 열기 전 선택 영역 저장 (`savedRange = util.selection.saveSelection()`)
- **D2**: 폰트 적용 후 선택 영역 복원 (`restoreSelection()`)
- **D3**: 포커스 관리 및 스크롤 위치 유지 (`util.scroll.savePosition/restorePosition`)

### E. 폰트 데이터 관리
- **E1**: 외부 폰트 데이터 파일 동적 로드 (`loadFontScript` 함수)
- **E2**: 폰트 데이터 캐싱 (`cachedFontData` 변수)
- **E3**: 폰트명 파싱 및 매칭 (`parseFontFamily`, `getFirstFontName` 함수)

### F. 예외 상황 및 최적화
- **F1**: 시스템 기본 폰트는 "폰트 영역"이 아님 (명시적으로 설정된 폰트만 인식)
- **F2**: 다른 플러그인과의 충돌 방지 (`activeModalManager` 사용)
- **F3**: 메모리 누수 방지 (`outsideClickCleanup` 정리)
- **F4**: 성능 최적화 (정규식 캐싱, DOM 쿼리 캐싱, 디바운스 적용)

## 구현 세부사항

### 핵심 함수
```javascript
// 폰트 버튼 상태 업데이트 (B2, B5 요구사항)
function updateFontButtonState(fontContainer, fontText, icon) {
  // 🔧 수정 필요: 사용자 설정 폰트와 시스템 폰트 구분
  const isUserSetFont = fontElement && currentFontValue && (
    fontElement.tagName === 'FONT' ||
    (fontElement.tagName === 'SPAN' && currentFontValue.includes(getFirstFontName(fontElement.style.fontFamily)))
  );
}

// 폰트 적용 (B1 요구사항)
document.execCommand('fontName', false, font.value);

// 선택 영역 관리 (D1, D2 요구사항)
savedRange = util.selection.saveSelection();
restoreSelection();
```

### 상태 변수
```javascript
let savedRange = null;          // 저장된 선택 영역
let isDropdownOpen = false;     // 드롭다운 열림 상태
let currentSelectedFontItem = null;  // 현재 선택된 폰트 아이템
let currentFontValue = null;    // 현재 적용된 폰트 값 (B4 요구사항)
```

### 이벤트 처리
- **드롭다운 토글**: `fontContainer.addEventListener('click')`
- **폰트 선택**: `fontItem.addEventListener('click')`
- **키보드 네비게이션**: `dropdownMenu.addEventListener('keydown')`
- **상태 업데이트**: `contentArea.addEventListener('keyup/click')`

## 🚨 현재 발견된 주요 버그

### 시스템 기본 폰트 자동 적용 문제

#### **문제 현상**
```html
<!-- 사용자가 폰트를 선택하지 않았는데도 시스템 폰트가 자동 적용됨 -->
<p><span style="font-family: -apple-system, BlinkMacSystemFont, &quot;Apple SD Gothic Neo&quot;, &quot;Segoe UI&quot;, Roboto, Oxygen, Ubuntu, Cantarell, &quot;Open Sans&quot;, &quot;Helvetica Neue&quot;, sans-serif; display: inline !important;">첫 번째 항목</span></p>
```

#### **발생 조건**
1. 일반 텍스트 입력 후 Enter 키
2. Shift+백스페이스로 첫 번째 캐럿 위치로 이동
3. 시스템 기본 폰트가 폰트 버튼에 자동 선택됨

#### **근본 원인**
1. **브라우저 기본 동작**: `contenteditable` 영역에서 브라우저가 자동으로 CSS 스타일을 인라인으로 적용
2. **잘못된 폰트 영역 감지**: `updateFontButtonState`에서 시스템 폰트도 "사용자 설정 폰트"로 인식
3. **폰트 매칭 로직 문제**: 시스템 기본 폰트가 fontList.js의 "시스템 기본 폰트"와 매칭됨

#### **문제 코드**
```javascript
// 🔴 문제: 모든 폰트 요소를 "폰트 영역"으로 인식
const fontElement = currentElement.closest('span[style*="font-family"], font');
if (fontElement) {
  fontContainer.classList.add('active'); // 시스템 폰트도 활성화됨
}

// 🔴 문제: 시스템 폰트도 매칭되어 버튼 활성화
const matchedFont = fonts.find(f => f.value && f.value.includes(firstFontName));
if (matchedFont) {
  fontText.textContent = matchedFont.name; // "시스템 기본 폰트"로 표시
}
```

#### **해결 방안**
```javascript
// ✅ 수정: 사용자가 명시적으로 설정한 폰트만 인식
const isUserSetFont = fontElement && currentFontValue && (
  // font 태그는 항상 사용자 설정으로 간주
  fontElement.tagName === 'FONT' ||
  // span 태그는 currentFontValue와 일치할 때만 사용자 설정으로 간주
  (fontElement.tagName === 'SPAN' && 
   fontElement.style.fontFamily && 
   currentFontValue.includes(getFirstFontName(fontElement.style.fontFamily)))
);

if (isUserSetFont) {
  // 활성 상태 설정
} else {
  // 🔧 시스템 폰트는 기본 상태 유지
  fontContainer.classList.remove('active');
  fontText.textContent = 'Font Family';
  currentSelectedFontItem = null;
}
```

## 검증 체크리스트

### Enter 키 동작
- [x] A1: 일반 텍스트에서 Enter → 새 문단, 폰트 스타일 없음
- [x] A2: 폰트 영역에서 Enter → 폰트 밖으로 나가서 새 문단
- [x] A3: 폰트 영역에서 Shift+Enter → 폰트 스타일 유지하며 줄바꿈

### 폰트 적용 동작
- [x] B1: 텍스트 선택 후 폰트 선택 → 선택된 텍스트에만 적용
- [x] B2: 폰트 영역에 커서 위치 → 버튼에 해당 폰트명 표시
- [x] B3: 폰트 영역에서 Enter로 나가기 → 버튼이 "Font Family"로 초기화
- [ ] **B4: 시스템 기본 폰트 → "폰트 영역"으로 인식하지 않음** ❌ **버그 발견**
- [x] B5: 폰트 영역에 커서 이동 → 자동으로 폰트명 매칭 및 표시

### 드롭다운 UI
- [x] C1: 폰트 버튼 클릭 → 드롭다운 토글
- [x] C2: 외부 영역 클릭 → 드롭다운 자동 닫기
- [x] C3: Tab/Escape/Arrow 키 → 키보드 네비게이션 동작
- [x] C4: 폰트 선택 → 드롭다운 닫기 및 UI 업데이트

### 선택 영역 관리
- [x] D1: 드롭다운 열기 전 → 선택 영역 저장
- [x] D2: 폰트 적용 후 → 선택 영역 복원
- [x] D3: 폰트 적용 후 → 스크롤 위치 유지

### 폰트 데이터 관리
- [x] E1: 외부 폰트 데이터 파일 → 정상 로드
- [x] E2: 폰트 데이터 → 캐싱 동작
- [x] E3: 복합 폰트명 → 첫 번째 폰트명 추출

### 예외 상황
- [ ] **F1: 시스템 폰트 → 폰트 영역으로 인식하지 않음** ❌ **주요 버그**
- [x] F2: 다른 드롭다운과 → 충돌 없음
- [x] F3: 메모리 누수 → 없음 (개발자 도구 확인)
- [x] F4: 성능 → 최적화 동작 (캐싱, 디바운스)

## 현재 구현 상태

### ✅ 완전 구현됨
- A1-A3: Enter 키 동작 (모두 구현됨)
- B1, B2, B3, B5: 폰트 적용 동작 (대부분 구현됨)
- C1-C4: 드롭다운 UI 동작
- D1-D3: 선택 영역 관리
- E1-E3: 폰트 데이터 관리
- F2-F4: 예외 상황 및 최적화

### ❌ 미구현 또는 문제 있음
- **B4, F1: 시스템 기본 폰트 감지 문제** (🚨 **주요 버그**)
  - 브라우저가 자동 생성한 시스템 폰트 스타일을 사용자 설정으로 잘못 인식
  - `updateFontButtonState` 함수의 폰트 영역 감지 로직 수정 필요

## 우선순위 수정 사항

### 🔴 **High Priority (즉시 수정 필요)**
1. **시스템 폰트 감지 문제 해결** (B4, F1)
   - `updateFontButtonState` 함수 수정
   - `currentFontValue` 기반 사용자 설정 폰트 구분

### 🟡 **Medium Priority**
- 현재 없음 (모든 핵심 기능 구현 완료)

### 🟢 **Low Priority**
- 성능 최적화 및 코드 정리

## 변경 이력
- v1.0: 초기 버전 작성
- v1.0.1: 시스템 기본 폰트 자동 적용 버그 발견 및 문서화