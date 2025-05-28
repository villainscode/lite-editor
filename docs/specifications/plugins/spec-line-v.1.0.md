# LiteEditor Line Plugin Specification v1.0
## HR(수평선) 삽입 플러그인 기능정의서

### 📋 개요
사용자가 클릭하거나 커서를 위치시킨 **정확한 위치**에 HR(수평선) 요소를 삽입하는 플러그인

### 🎯 핵심 기능

#### 1. 툴바 버튼
- **아이콘**: `horizontal_rule` (Material Icons)
- **제목**: "Insert Line"
- **클래스**: `lite-editor-button lite-editor-line-button`
- **동작**: 클릭 시 현재 커서 위치에 HR 삽입

#### 2. HR 요소 스타일
```css
.lite-editor-hr {
    display: block !important;
    height: 2px !important;
    border: 0 !important;
    border-top: 2px solid #c9c9c9 !important;
    margin: 10px 0 !important;
    padding: 0 !important;
    width: 100% !important;
}
```

### 🔧 삽입 알고리즘

#### 1. 우선순위 기반 삽입 전략

##### 1.1 Range API 직접 삽입 (최우선)
```javascript
// 가장 정확한 방법
range.insertNode(hr);
range.setStartAfter(hr);
```

**적용 조건:**
- 유효한 선택 영역이 존재
- Range API 지원 브라우저
- DOM 구조가 정상적인 경우

**장점:**
- 텍스트 중간, BR 태그 사이 등 모든 위치에 정확 삽입
- 브라우저 네이티브 API 활용으로 안정성 보장

##### 1.2 DOM 직접 조작 (대안)
```javascript
// Range API 실패 시 대안
contentArea.insertBefore(hr, targetElement);
```

**적용 조건:**
- Range API 삽입 실패 시
- contentArea 직접 클릭인 경우
- 요소 내부 클릭인 경우

##### 1.3 맨 끝 추가 (폴백)
```javascript
// 최후 수단
contentArea.appendChild(hr);
```

**적용 조건:**
- 선택 영역이 없는 경우
- 모든 삽입 방법 실패 시

#### 2. 상세 삽입 로직

##### 2.1 선택 영역 분석
```javascript
const selection = window.getSelection();
const range = selection.getRangeAt(0);
```

##### 2.2 텍스트 선택 처리
- **선택된 텍스트 존재**: `range.deleteContents()` 후 HR 삽입
- **커서만 위치**: 해당 위치에 직접 HR 삽입

##### 2.3 커서 위치 이동
- HR 삽입 후 자동으로 HR 다음 위치로 커서 이동
- `range.setStartAfter(hr)` 사용

### 🧪 테스트 케이스

#### 1. 기본 삽입 테스트
- [ ] **빈 공간 클릭** → HR 해당 위치 삽입
- [ ] **P 태그 사이 클릭** → HR 정확한 위치 삽입
- [ ] **BR 태그 사이 클릭** → HR 정확한 위치 삽입
- [ ] **H1~H6 태그 사이 클릭** → HR 정확한 위치 삽입

#### 2. 텍스트 처리 테스트
- [ ] **텍스트 중간 클릭** → 텍스트 분할 후 HR 삽입
- [ ] **텍스트 선택 후 삽입** → 선택 텍스트 삭제 후 HR 삽입
- [ ] **여러 줄 텍스트 선택** → 선택 영역 삭제 후 HR 삽입

#### 3. 특수 상황 테스트
- [ ] **선택 영역 없이 버튼 클릭** → 맨 끝에 HR 추가
- [ ] **중첩된 요소 내부 클릭** → 적절한 위치에 HR 삽입
- [ ] **contenteditable 경계 클릭** → 안전한 위치에 HR 삽입

#### 4. 브라우저 호환성 테스트
- [ ] **Chrome/Edge** → Range API 정상 동작
- [ ] **Firefox** → Range API 정상 동작
- [ ] **Safari** → Range API 정상 동작
- [ ] **구형 브라우저** → 대안 방법 동작

### 🔍 디버깅 및 로깅

#### 1. 성공 로그
```javascript
errorHandler.colorLog('LINE', '✅ HR 삽입 성공', {
    위치: 'Range API 직접 삽입'
}, '#4caf50');
```

#### 2. 대안 방법 로그
```javascript
errorHandler.colorLog('LINE', '✅ HR 삽입 성공 (대안)', {
    위치: 'DOM 직접 삽입'
}, '#ff9800');
```

#### 3. 폴백 로그
```javascript
errorHandler.colorLog('LINE', '✅ HR 삽입 성공 (끝)', {
    위치: '맨 끝에 추가'
}, '#2196f3');
```

### 🚀 성능 최적화

#### 1. 메모리 관리
- 이벤트 리스너 적절한 해제
- DOM 참조 최소화
- 불필요한 객체 생성 방지

#### 2. 실행 속도
- Range API 우선 사용으로 빠른 삽입
- 최소한의 DOM 조작
- 조건문 최적화

### 🛡️ 에러 처리

#### 1. Range API 에러
```javascript
try {
    range.insertNode(hr);
} catch (error) {
    insertHrFallback(range, hr, contentArea);
}
```

#### 2. DOM 조작 에러
- 안전한 요소 확인
- null/undefined 체크
- 적절한 폴백 제공

### 📊 품질 기준

#### 1. 정확도
- **위치 정확도**: 95% 이상 정확한 위치 삽입
- **텍스트 분할**: 100% 정확한 텍스트 분할
- **커서 이동**: 100% 정확한 커서 위치

#### 2. 안정성
- **에러율**: 0.1% 미만
- **브라우저 호환성**: 주요 브라우저 100% 지원
- **DOM 무결성**: 삽입 후 DOM 구조 유지

#### 3. 사용성
- **응답 시간**: 100ms 이내 삽입 완료
- **시각적 피드백**: 즉시 HR 표시
- **커서 위치**: 자연스러운 다음 위치 이동

### 🔄 버전 히스토리

#### v1.0 (현재)
- **Range API 기반 정확한 삽입**
- **3단계 폴백 시스템**
- **자동 커서 위치 이동**
- **상세 디버깅 로그**
- **브라우저 호환성 보장**

### 🎯 향후 개선 계획

#### v1.1 (예정)
- [ ] 키보드 단축키 지원 (Alt+H)
- [ ] 다양한 HR 스타일 옵션
- [ ] 실행 취소/재실행 지원

#### v1.2 (예정)
- [ ] 커스텀 HR 스타일 설정
- [ ] 삽입 위치 미리보기
- [ ] 접근성 개선

### 📝 사용 예시

```javascript
// 기본 사용
const editor = LiteEditor.init('#editor', {
    plugins: ['line']
});

// 프로그래밍 방식 HR 삽입
const contentArea = document.querySelector('#lite-editor-content');
insertLine(contentArea);
```

### 🔗 관련 문서
- [LiteEditor 플러그인 개발 가이드](../development/plugin-guide.md)
- [Range API 사용법](../development/range-api.md)
- [에러 처리 가이드](../development/error-handling.md)
