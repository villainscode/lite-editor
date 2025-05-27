# FormatIndent 플러그인 기능정의서 v1.0

## 핵심 요구사항

### A. 키보드 단축키 동작
- **A1**: 일반 텍스트에서 Tab → 들여쓰기 (4칸 공백 추가)
- **A2**: 일반 텍스트에서 Shift+Tab → 내어쓰기 (4칸 공백 제거)
- **A3**: 리스트 내부에서는 Tab 키 처리하지 않음 (각 리스트 플러그인에서 처리)

### B. 버튼 클릭 동작
- **B1**: 들여쓰기 증가 버튼 클릭 → 현재 커서 위치에 들여쓰기 적용
- **B2**: 들여쓰기 감소 버튼 클릭 → 현재 줄의 선행 공백 제거
- **B3**: 버튼들이 Tab 키로 포커스 이동 가능해야 함 (`button` 요소 사용)

### C. 커서 위치 정확성
- **C1**: 들여쓰기 후 커서가 추가된 공백만큼 뒤로 이동
- **C2**: 내어쓰기 후 커서가 제거된 공백만큼 앞으로 이동 (줄 시작보다 앞으로 가지 않음)
- **C3**: 내어쓰기 시 제거할 공백이 없으면 커서 위치 유지

### D. 들여쓰기 설정 및 정규화
- **D1**: 들여쓰기 간격 설정 가능 (`setIndentSize` 함수)
- **D2**: 기존 마진 스타일을 공백 기반으로 정규화 (`normalizeIndent` 함수)
- **D3**: blockquote 요소의 들여쓰기 자동 적용

### E. 예외 상황 및 충돌 방지
- **E1**: 리스트 플러그인과의 충돌 방지 (UL, OL, 체크리스트 감지)
- **E2**: 선택 영역 관리 (`liteEditorSelection` 사용)
- **E3**: 포커스 유지 및 복원

## 구현 세부사항

### 핵심 함수
```javascript
// Tab 키 이벤트 처리 (A1, A2, A3 요구사항)
function handleTabKey(event) {
  // 리스트 내부 감지 및 충돌 방지
  // 들여쓰기/내어쓰기 실행
}

// 들여쓰기/내어쓰기 공통 처리 (B1, B2, C1-C3 요구사항)
function handleIndentation(contentArea, command) {
  if (command === 'indent') {
    document.execCommand('insertHTML', false, INDENT_CHAR.repeat(INDENT_SIZE));
  } else {
    // 정확한 커서 위치 계산
    const newOffset = Math.max(lineStart, originalOffset - spacesToRemove);
  }
}

// 버튼 생성 (B3 요구사항)
function createButton(icon, title) {
  const container = document.createElement('button'); // button 요소 사용
  container.type = 'button';
}

// 들여쓰기 설정 (D1 요구사항)
function setIndentSize(size) {
  INDENT_SIZE = size;
  document.querySelectorAll('[contenteditable="true"]').forEach(normalizeIndent);
}

// 들여쓰기 정규화 (D2, D3 요구사항)
function normalizeIndent(contentArea) {
  // blockquote 처리
  // 마진 스타일을 공백으로 변환
}
```

### 상수 및 변수
```javascript
let INDENT_SIZE = 4;                    // 들여쓰기 간격
const INDENT_CHAR = '\u00A0';          // non-breaking space 사용
```

### 충돌 방지 로직 (E1 요구사항)
```javascript
// 리스트 내부 감지
if (node.tagName === 'LI' || 
    (node.tagName === 'UL' && node.hasAttribute('data-lite-editor-bullet')) ||
    (node.tagName === 'OL' && node.hasAttribute('data-lite-editor-number')) ||
    node.classList.contains('checklist-item')) {
  return; // 리스트 플러그인에서 처리하도록 함
}
```

### 이벤트 처리
- **전역 키보드 이벤트**: `document.addEventListener('keydown', handleTabKey)`
- **버튼 클릭 이벤트**: `increaseButton.addEventListener('click', ...)`
- **선택 영역 관리**: `window.liteEditorSelection.save/restore()`

## 검증 체크리스트

### 키보드 단축키
- [x] A1: 일반 텍스트에서 Tab 키 → 4칸 들여쓰기
- [x] A2: 일반 텍스트에서 Shift+Tab 키 → 4칸 내어쓰기
- [x] A3: 불릿 리스트 내부에서 Tab 키 → 처리하지 않음
- [x] A3: 숫자 리스트 내부에서 Tab 키 → 처리하지 않음
- [x] A3: 체크리스트 내부에서 Tab 키 → 처리하지 않음

### 버튼 동작
- [x] B1: 들여쓰기 증가 버튼 클릭 → 정상 동작
- [x] B2: 들여쓰기 감소 버튼 클릭 → 정상 동작
- [x] B3: Tab 키로 버튼 포커스 이동 → 정상 동작

### 커서 위치
- [x] C1: 들여쓰기 후 커서 위치 → 추가된 공백만큼 뒤로 이동
- [x] C2: 내어쓰기 후 커서 위치 → 제거된 공백만큼 앞으로 이동 (줄 시작 이후)
- [x] C3: 제거할 공백 없을 때 → 커서 위치 유지

### 설정 및 정규화
- [x] D1: `setIndentSize(6)` 호출 → 들여쓰기 간격 변경
- [x] D2: 기존 마진 스타일 → 공백으로 정규화
- [x] D3: blockquote 요소 → 자동 들여쓰기 적용

### 예외 상황
- [x] E1: 다른 리스트 플러그인과 충돌 없음
- [x] E2: 선택 영역 저장/복원 정상 동작
- [x] E3: 포커스 유지 및 복원 정상 동작

## 현재 구현 상태

### ✅ 완전 구현됨
- **A1-A3**: 키보드 단축키 동작 (모두 구현됨)
- **B1-B3**: 버튼 클릭 동작 (모두 구현됨)
- **C1-C3**: 커서 위치 정확성 (모두 구현됨)
- **D1-D3**: 설정 및 정규화 (모두 구현됨)
- **E1-E3**: 예외 상황 및 충돌 방지 (모두 구현됨)

### 🔧 구현 특징
1. **non-breaking space 사용**: 일반 공백 대신 `\u00A0` 사용으로 안정성 확보
2. **리스트 충돌 방지**: 세밀한 DOM 검사로 리스트 플러그인과 충돌 방지
3. **정확한 커서 위치**: `Math.max(lineStart, originalOffset - spacesToRemove)` 로직으로 커서 위치 정확성 보장
4. **접근성 고려**: `button` 요소 사용으로 키보드 네비게이션 지원
5. **성능 최적화**: 간단한 구조로 메모리 사용량 최소화

## 기술적 세부사항

### 들여쓰기 처리 방식
```javascript
// 들여쓰기: insertHTML 사용
document.execCommand('insertHTML', false, INDENT_CHAR.repeat(INDENT_SIZE));

// 내어쓰기: 텍스트 조작 사용
const newText = text.substring(0, lineStart) + text.substring(lineStart + spacesToRemove);
range.startContainer.textContent = newText;
```

### 커서 위치 계산
```javascript
// 내어쓰기 시 커서 위치 보정
const originalOffset = range.startOffset;
const newOffset = Math.max(lineStart, originalOffset - spacesToRemove);
range.setStart(range.startContainer, newOffset);
```

### 충돌 방지 알고리즘
```javascript
// DOM 트리 순회로 리스트 요소 감지
while (node && node !== contentArea) {
  if (node.nodeType === Node.ELEMENT_NODE) {
    if (isListElement(node)) {
      return; // 리스트 플러그인에 위임
    }
  }
  node = node.parentNode;
}
```

## 메모리 관리

### 메모리 사용량 분석
- **전역 이벤트 리스너**: ~1KB 미만
- **함수 정의**: ~2KB 미만
- **총 메모리 사용량**: ~3KB 미만

### 메모리 누수 위험도
- **위험도**: 낮음 🟡
- **이유**: 단순한 함수 구조, 외부 참조 최소화
- **권장사항**: 현재 상태 유지 (복잡한 메모리 관리 불필요)

## API 문서

### 공개 함수
```javascript
// 들여쓰기 간격 설정
window.LiteEditor.formatIndent.setIndentSize(size);

// 들여쓰기 정규화 실행
window.LiteEditor.formatIndent.normalizeIndent(contentArea);
```

### 사용 예시
```javascript
// 들여쓰기 간격을 6칸으로 변경
LiteEditor.formatIndent.setIndentSize(6);

// 특정 에디터 영역 정규화
const contentArea = document.querySelector('.lite-editor-content');
LiteEditor.formatIndent.normalizeIndent(contentArea);
```

## 변경 이력
- v1.0: 초기 버전 작성
  - Tab/Shift+Tab 키보드 단축키 지원
  - 들여쓰기/내어쓰기 버튼 기능
  - 커서 위치 정확성 보장
  - 리스트 플러그인 충돌 방지
  - 접근성 및 성능 최적화 완료
