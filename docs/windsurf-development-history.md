# LiteEditor 개발 히스토리

이 문서는 LiteEditor 프로젝트의 개발 과정에서 이루어진 주요 작업과 변경사항을 시간순으로 기록합니다.

## 2025-04-27

### 플러그인 순서 커스터마이징 기능 개선

- **변경 내용**: core.js의 initToolbar 함수를 수정하여 사용자가 지정한 순서대로 플러그인을 표시하도록 변경
- **변경 파일**: js/core.js
- **주요 개선점**:
  - PLUGIN_ORDER를 기준으로 플러그인을 렌더링하던 방식에서 사용자가 지정한 enabledPlugins 배열의 순서대로 렌더링하도록 변경
  - index.html에서 plugins 배열에 지정한 순서대로 플러그인이 표시됨
  - 사용자가 원하는 순서대로 플러그인을 배치할 수 있게 됨

## 이전 작업

### 동영상 삽입 기능 추가

- **변경 내용**: 동영상 삽입 기능을 위한 기본 구조 추가
- **변경 파일**: core.js, js/plugins/movie.js, index.html, loader.js
- **주요 개선점**:
  - core.js 파일에 media 플러그인 추가 (PLUGIN_ORDER 배열에 'media' 추가)
  - movie.js 파일 생성 (플러그인 기본 구조 작성, 선택 영역 저장/복원 함수 구현)
  - index.html 파일 수정 (LiteEditor.init() 호출 시 plugins 배열에 'media' 추가)
  - loader.js 파일 수정 (스크립트 로드 목록에 'js/plugins/movie.js' 추가)

### 정렬 기능 더블클릭 버그 수정

- **변경 내용**: 더블클릭 선택 시 다음 줄까지 정렬이 적용되는 버그 해결
- **변경 파일**: js/plugins/align.js
- **문제 원인**:
  - 더블클릭으로 선택할 때 Range 객체가 선택된 단어 뿐만 아니라 뒤따르는 공백, 탭, 줄바꿈까지 포함
- **해결 방법**:
  - normalizeDoubleClickSelection() 함수 개선: 선택 영역에서 줄바꿈/공백을 제거하고 정확한 단어 경계만 선택하도록 로직 강화
  - 드래그, 더블클릭, 키보드 등 모든 선택 방식에 대해 일관된 정렬 동작 보장

### 선택 영역 디버깅 UI 추가

- **변경 내용**: 선택 영역 정보를 표시하는 디버깅 UI 추가
- **변경 파일**: demo/selection-demo.html
- **주요 개선점**:
  - 선택 영역의 start/end 값과 선택된 텍스트를 실시간으로 표시하는 div 추가
  - 드래그, 더블클릭, 키보드 등 모든 선택 방식에 대해 정보가 즉시 갱신됨
  - 에디터 개발 및 디버깅에 유용

### 수평선(line) 플러그인 구조 정리

- **변경 내용**: 수평선 플러그인 구조 정리
- **변경 파일**: core.js, js/plugins/line.js, loader.js
- **주요 개선점**:
  - PLUGIN_ORDER에 'line'이 있으나, line.js 파일이 누락되어 있었음
  - line.js 파일을 새로 생성(빈 파일, 실제 기능은 미구현)
  - loader.js에 line.js 추가
  - core.js에 'line' 플러그인 순서 및 구분 위치 조정
