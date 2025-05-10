# Lite Editor 테스트 가이드

## 1. 개요

이 디렉토리에는 Lite Editor의 다양한 기능에 대한 단위 테스트가 포함되어 있습니다. 테스트는 Jest와 JSDOM을 사용하여 구현되었으며, 코드의 안정성과 품질을 유지하는 데 도움이 됩니다.

## 2. 테스트 구조

### 2.1 디렉토리 구조
```
tests/
├── mocks/              # 테스트용 모의 객체
│   ├── editor.js      # 에디터 모의 객체
│   ├── selection.js   # 선택 영역 모의 객체
│   └── toolbar.js     # 툴바 모의 객체
├── plugins/           # 플러그인 테스트
│   ├── basic/        # 기본 서식 플러그인 테스트
│   ├── block/        # 블록 레벨 플러그인 테스트
│   ├── media/        # 미디어 관련 플러그인 테스트
│   └── utils/        # 유틸리티 플러그인 테스트
└── integration/      # 통합 테스트
```

### 2.2 테스트 범주
1. **단위 테스트**
   - 개별 플러그인 기능 테스트
   - 유틸리티 함수 테스트
   - 이벤트 핸들러 테스트

2. **통합 테스트**
   - 플러그인 간 상호작용 테스트
   - 에디터-플러그인 통합 테스트
   - 사용자 인터랙션 시나리오 테스트

## 3. 테스트 우선순위

### 3.1 1단계: 기본 서식 플러그인
- [ ] bold.js
- [ ] italic.js
- [ ] underline.js
- [ ] strike.js
- [ ] code.js

### 3.2 2단계: 블록 레벨 플러그인
- [ ] heading.js
- [ ] blockquote.js
- [ ] codeBlock.js
- [ ] bulletList.js
- [ ] numberedList.js
- [ ] checkList.js

### 3.3 3단계: 스타일 관련 플러그인
- [ ] fontFamily.js
- [ ] fontColor.js
- [ ] emphasis.js
- [ ] align.js
- [ ] formatIndent.js

### 3.4 4단계: 미디어 관련 플러그인
- [ ] imageUpload.js
- [ ] media.js
- [ ] table.js
- [ ] line.js

### 3.5 5단계: 유틸리티 플러그인
- [ ] plugin-util.js
- [ ] format-utils.js
- [ ] format.js
- [ ] history.js
- [ ] reset.js

## 4. 테스트 케이스 작성 가이드

### 4.1 기본 구조
```javascript
describe('PluginName', () => {
  let editor;
  let plugin;

  beforeEach(() => {
    // 테스트 환경 설정
  });

  afterEach(() => {
    // 테스트 환경 정리
  });

  describe('기능 테스트', () => {
    it('should apply format correctly', () => {
      // 테스트 케이스
    });
  });
});
```

### 4.2 공통 테스트 항목
1. **초기화 테스트**
   - 플러그인 로드 확인
   - 이벤트 리스너 등록 확인
   - 초기 상태 확인

2. **기능 테스트**
   - 기본 기능 동작 확인
   - 단축키 동작 확인
   - 에러 처리 확인

3. **UI 테스트**
   - 버튼 클릭 동작 확인
   - 드롭다운 메뉴 동작 확인
   - 스타일 적용 확인

4. **상태 관리 테스트**
   - 토글 상태 확인
   - 선택 영역 유지 확인
   - 실행 취소/재실행 확인

## 5. 모의 객체(Mock) 작성 가이드

### 5.1 에디터 모의 객체
```javascript
const mockEditor = {
  getSelection: jest.fn(),
  setSelection: jest.fn(),
  execCommand: jest.fn(),
  // ... 기타 필요한 메서드
};
```

### 5.2 선택 영역 모의 객체
```javascript
const mockSelection = {
  getRangeAt: jest.fn(),
  removeAllRanges: jest.fn(),
  addRange: jest.fn(),
  // ... 기타 필요한 메서드
};
```

## 6. 테스트 실행 및 보고

### 6.1 실행 명령어
```bash
# 전체 테스트 실행
npm test

# 특정 플러그인 테스트 실행
npm test -- plugins/basic/bold-plugin.test.js

# 커버리지 리포트 생성
npm test -- --coverage

# 특정 플러그인 테스트 실행
npm test -- tests/plugins/align-plugin.test.js
```

### 6.2 테스트 결과 분석
- 테스트 커버리지 확인
- 실패한 테스트 케이스 분석
- 성능 메트릭 수집
- 비슷한 역할을 하는 코드의 검출과 리팩토링 방안 제안 (리팩토링은 수행하지 않음)
- 코드 구조의 일관성이 깨지거나 다소 부족한 경우 코드 구조의 개선 제안 (리팩토링은 수행하지 않음)

## 7. 추가 리소스

- [Jest 문서](https://jestjs.io/docs/getting-started)
- [JSDOM 문서](https://github.com/jsdom/jsdom)
- [Testing Library 문서](https://testing-library.com/docs/) 