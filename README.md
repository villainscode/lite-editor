# LiteEditor

<div align="center">
  <img src="https://via.placeholder.com/1200x600/1a73e8/ffffff?text=LiteEditor" alt="LiteEditor Logo" width="600">
  <p><em>경량화된 오픈소스 웹 에디터. 직관적이고 사용이 간편합니다.</em></p>
</div>

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## 개요

LiteEditor는 웹 페이지에 쉽게 통합할 수 있는 고정형 리치 텍스트 에디터 플러그인입니다. 사용자가 다양한 서식을 적용할 수 있는 직관적인 도구 모음을 제공합니다. JavaScript와 CSS만으로 구현되어 다양한 웹 환경에서 높은 호환성을 보장합니다.

## 기능

### 텍스트 서식
- **기본 서식**: 굵게(Bold), 기울임(Italic), 밑줄(Underline), 취소선(Strike)
- **폰트 설정**: 다양한 폰트 및 크기 지원
- **텍스트 색상**: 폰트 색상 및 배경 색상(하이라이트) 변경
- **제목 스타일**: H1부터 H6까지의 제목 태그

### 블록 요소
- **정렬**: 왼쪽, 가운데, 오른쪽, 양쪽 정렬
- **인용구**: 블록쿼트 지원
- **리스트**: 순서 있는 리스트, 순서 없는 리스트, 체크리스트
- **들여쓰기**: 들여쓰기 및 내어쓰기 기능

### 미디어 및 객체
- **링크**: 하이퍼링크 삽입 및 수정
- **이미지**: 이미지 업로드 및 삽입
- **테이블**: 테이블 생성 및 관리
- **미디어**: 미디어 파일 관리 및 플레이어 통합

### 코드 관련
- **인라인 코드**: 코드 서식 적용
- **코드 블록**: 코드 블록 생성 및 구문 강조

### 기타
- **실행 취소/다시 실행**: 작업 이력 관리(Undo/Redo)
- **서식 제거**: 적용된 모든 서식 제거 기능

## 설치 및 사용 방법

### 기본 설치

1. CSS와 JS 파일을 프로젝트에 추가합니다:

```html
<!-- CSS 통합 로더 -->
<link rel="stylesheet" href="css/loader.css">

<!-- 에디터가 표시될 영역 정의 -->
<div id="lite-editor" contenteditable="true">
    <!-- 초기 콘텐츠 (선택 사항) -->
    <h2>초기 콘텐츠</h2>
    <p>여기에 기본 내용을 넣을 수 있습니다.</p>
</div>

<!-- 통합 스크립트 로더 -->
<script src="js/loader.js"></script>
```

2. 디버그 모드를 설정하고 에디터를 초기화합니다:

```html
<script>
    // 디버그 모드를 활성화 (선택 사항)
    window.DEBUG_MODE = true;
    
    // 모든 스크립트 로드 완료 후 에디터 초기화
    document.addEventListener('lite-editor-loaded', function() {
        // 에디터 초기화
        const editor = LiteEditor.init('#lite-editor', {
            // 사용할 플러그인 목록 지정
            plugins: [
                'fontFamily', 'heading', 'fontColor', 'emphasis',        // 폰트서식 
                'bold', 'italic', 'underline', 'strike',                 // 폰트포맷 
                'link', 'imageUpload', 'table', 'media',                 // 오브젝트 삽입 
                'line','blockquote', 'code', 'codeBlock',                // 인용 및 코드 
                'unorderedList', 'orderedList', 'checkList',             // 목록 
                'align', 'formatIndent',                                 // 정렬과 인덴트
                'historyInit', 'undo', 'redo', 'reset',                  // 실행 취소/되돌리기  
            ],
            // 구분선 위치 정의
            dividers: [4, 8, 12, 16, 19, 22],
            // 에디터 크기 설정 (너비와 높이)
            dimensions: {
                editor: {
                    width: '1020px',    // 에디터 전체 너비 (최대 아이콘시 920px 이상 권장)
                    maxWidth: '100%',   // 최대 너비 (뷰포트보다 크지 않도록)
                    height: '650px'     // 에디터 전체 높이 (고정)
                },
                toolbar: {
                    height: '42px'      // 툴바 높이 (고정)
                },
                content: {
                    height: '608px',    // 콘텐츠 영역 높이 (650px - 42px)
                    minHeight: '608px'  // 콘텐츠 영역 최소 높이
                }
            }
        });
    });
</script>
```

### 간소화된 설치 (최소 기능)

필요한 기능만 선택하여 설치할 수도 있습니다:

```html
<!-- CSS 통합 로더 -->
<link rel="stylesheet" href="css/loader.css">

<!-- 에디터가 표시될 영역 -->
<div id="simple-editor" contenteditable="true"></div>

<!-- 통합 스크립트 로더 -->
<script src="js/loader.js"></script>

<script>
    document.addEventListener('lite-editor-loaded', function() {
        // 간소화된 에디터 초기화
        const editor = LiteEditor.init('#simple-editor', {
            plugins: ['bold', 'italic', 'underline', 'link', 'reset'],
            dividers: [3]
        });
    });
</script>
```

### 플러그인 선택 가이드

에디터 기능에 따라 필요한 플러그인을 선택하여 사용할 수 있습니다:

- **텍스트 서식**: `bold`, `italic`, `underline`, `strike`
- **폰트 관련**: `fontFamily`, `fontColor`, `emphasis`
- **제목 및 구조**: `heading`, `align`, `formatIndent`
- **리스트**: `unorderedList`, `orderedList`, `checkList`
- **삽입 요소**: `link`, `imageUpload`, `table`, `media`, `line`
- **코드 관련**: `code`, `codeBlock`
- **기타**: `blockquote`, `historyInit`, `undo`, `redo`, `reset`

## 옵션 설명

LiteEditor는 다양한 설정 옵션을 제공합니다:

| 옵션 | 타입 | 설명 |
|------|------|------|
| `plugins` | Array | 사용할 플러그인 목록 |
| `dividers` | Array | 툴바에 구분선을 넣을 위치 (플러그인 인덱스) |
| `dimensions` | Object | 에디터 크기 설정 |
| `debug` | Boolean | 디버그 모드 활성화 여부 (개발용) |

## 플러그인 목록

LiteEditor는 다음 플러그인을 제공합니다:

| 플러그인 | 기능 | 설명 |
|---------|------|------|
| `bold` | 굵게 | 텍스트를 굵게 표시 |
| `italic` | 기울임 | 텍스트를 기울임꼴로 표시 |
| `underline` | 밑줄 | 텍스트에 밑줄 추가 |
| `strike` | 취소선 | 텍스트에 취소선 추가 |
| `fontFamily` | 폰트 | 텍스트 폰트 변경 |
| `fontColor` | 폰트 색상 | 텍스트 색상 변경 |
| `emphasis` | 하이라이트 | 텍스트 배경색 변경 |
| `heading` | 제목 | H1-H6 제목 스타일 적용 |
| `align` | 정렬 | 텍스트 정렬 (왼쪽, 가운데, 오른쪽, 양쪽) |
| `formatIndent` | 들여쓰기 | 들여쓰기 및 내어쓰기 |
| `unorderedList` | 순서 없는 목록 | 불릿 리스트 생성 |
| `orderedList` | 순서 있는 목록 | 넘버링 리스트 생성 |
| `checkList` | 체크리스트 | 체크박스 리스트 생성 |
| `link` | 링크 | 하이퍼링크 삽입 |
| `imageUpload` | 이미지 | 이미지 업로드 및 삽입 |
| `table` | 테이블 | 테이블 생성 및 관리 |
| `media` | 미디어 | 미디어 파일 관리 |
| `blockquote` | 인용구 | 인용구 블록 생성 |
| `code` | 코드 | 인라인 코드 서식 적용 |
| `codeBlock` | 코드 블록 | 코드 블록 생성 및 구문 강조 |
| `line` | 수평선 | 수평선 삽입 |
| `historyInit` | 히스토리 초기화 | 작업 이력 관리 초기화 |
| `undo` | 실행 취소 | 작업 되돌리기 |
| `redo` | 다시 실행 | 취소한 작업 다시 실행 |
| `reset` | 서식 제거 | 모든 서식 제거 |

## API 참조

개발중

## 브라우저 호환성

- Chrome (최신 버전)
- Firefox (최신 버전)
- Safari (최신 버전)
- Edge (최신 버전)
- Opera (최신 버전)
- IE는 지원하지 않습니다.

## 기여하기

LiteEditor 프로젝트에 기여하는 방법:

1. 이 저장소를 포크하세요.
2. 새 기능 브랜치를 만드세요 (`git checkout -b feature/amazing-feature`).
3. 변경사항을 커밋하세요 (`git commit -m 'Add some amazing feature'`).
4. 브랜치에 푸시하세요 (`git push origin feature/amazing-feature`).
5. Pull Request를 생성하세요. 기능의 변경사항에 대해서 자세히 기술해주십시오.

## 로드맵
- [ ] HTML/Rich 모드 전환
- [ ] HTML/Markdown 가져오기/내보내기
- [ ] 수학 수식 편집기
- [ ] 차트 생성 도구
- [ ] 코드 하이라이팅 개선

## 라이센스

이 프로젝트는 BSL 라이센스에 따라 배포됩니다. 자세한 내용은 [LICENSE](./LICENSE) 파일을 참조하세요.

## 문의

질문이나 제안사항이 있으시면 이슈를 남겨주세요.