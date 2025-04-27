# Lite Editor Worklog - 2025.04.27

## 개요

Lite Editor의 플러그인 관리 시스템을 개선하고, 누락된 플러그인을 복구하는 작업을 진행했습니다. 주요 작업으로는 플러그인 순서 및 on/off 제어 방식 개선, 누락된 line.js 파일 복구, 동영상 삽입(media) 플러그인 추가, 그리고 정렬 기능의 더블클릭 버그 수정이 포함되었습니다. 이러한 변경은 에디터의 유연성과 사용자 경험을 향상시키기 위해 수행되었습니다.

## 작업 내역

### 1. 플러그인 순서 및 on/off 제어 방식 개선

에디터 툴바의 플러그인 순서와 표시 여부를 사용자가 완전히 제어할 수 있도록 개선했습니다:

#### 변경 전:
```javascript
// PLUGIN_ORDER에 정의된 순서대로 플러그인 렌더링
PLUGIN_ORDER.forEach(pluginName => {
  // enabledPlugins에 없으면 스킵 (사용자가 지정한 플러그인만 표시)
  if (!enabledPlugins.includes(pluginName)) {
    return;
  }
  // 플러그인 렌더링...
});
```

#### 변경 후:
```javascript
// 사용자가 지정한 순서대로 플러그인 렌더링
enabledPlugins.forEach(pluginName => {
  // 플러그인 렌더링...
});
```

이 변경으로 다음과 같은 이점이 있습니다:
- 사용자가 `LiteEditor.init()` 호출 시 `plugins` 배열에 지정한 순서대로 툴바에 플러그인이 표시됨
- 플러그인의 on/off와 순서를 완전히 사용자가 제어 가능
- `core.js`의 `PLUGIN_ORDER`는 전체 플러그인 집합 및 기본 순서만 정의하는 역할로 변경

### 2. 누락된 line.js 파일 복구 및 구현

`PLUGIN_ORDER`에 'line' 플러그인이 정의되어 있었으나 실제 파일이 누락되어 있어 이를 복구했습니다:

```javascript
/**
 * LiteEditor line Plugin
 * 라인 삽입 플러그인
 */

(function() {
    // PluginUtil 참조
    const util = window.PluginUtil;
    
    // 스타일 요소 생성 및 추가 - PluginUtil 사용
    util.styles.addInlineStyle('lite-editor-line-style', `
        .lite-editor-hr {
            display: block;
            height: 1px;
            border: 0;
            border-top: 1px solid #c9c9c9;
            margin: 5px 0;
            padding: 0;
        }
    `);
    // ... 추가 구현 예정
});
```

이 변경으로 다음과 같은 이점이 있습니다:
- 수평선 삽입 기능을 위한 기본 구조 마련
- 플러그인 시스템의 일관성 유지
- `loader.js`에 line.js 파일 추가로 자동 로드 지원

### 3. 동영상 삽입(media) 플러그인 추가

동영상 삽입 기능을 위한 기본 구조를 추가했습니다:

```javascript
/**
 * LiteEditor Media Plugin
 * 동영상 삽입 관련 플러그인
 */

(function() {
  // 상수 정의
  const PLUGIN_ID = 'media';
  const MODULE_NAME = 'MEDIA'; // 디버깅 로그용 모듈명
  
  // 팝업 저장 변수
  let popup = null;
  
  /**
   * 선택 영역 저장 (동영상 삽입 후 복원용)
   */
  function saveSelection() {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      return selection.getRangeAt(0).cloneRange();
    }
    return null;
  }
  
  /**
   * 저장된 선택 영역 복원
   */
  function restoreSelection(savedSelection) {
    if (savedSelection) {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(savedSelection);
    }
  }
  
  /**
   * 동영상 삽입 기능 (실제 구현은 나중에 추가 예정)
   */
  function insertMedia(contentArea) {
    // 선택 영역 저장
    const savedSelection = saveSelection();
    
    // 여기에 동영상 삽입 관련 기능 구현 예정
    console.log('동영상 삽입 기능이 호출되었습니다. 실제 구현은 나중에 추가될 예정입니다.');
    
    // 선택 영역 복원
    restoreSelection(savedSelection);
  }
  
  /**
   * 플러그인 등록
   */
  if (typeof LiteEditor !== 'undefined') {
    LiteEditor.registerPlugin(PLUGIN_ID, {
      icon: 'live_tv',
      title: '동영상 삽입',
      action: insertMedia
    });
  }
})();
```

이 변경으로 다음과 같은 이점이 있습니다:
- 동영상 삽입 기능의 기본 구조 마련
- 선택 영역 저장/복원 로직 구현으로 UX 개선
- 향후 확장 가능한 구조 설계

### 4. 정렬 기능의 더블클릭 버그 수정

더블클릭 선택 시 정렬이 다음 줄까지 적용되는 버그를 수정했습니다:

```javascript
// 선택된 텍스트에서 줄바꿈과 후발 공백 제거
const cleanText = text.split('\n')[0].trim();

// 줄바꿈이나 후발 공백이 있는지 확인
const hasExtraWhitespace = text.length > cleanText.length;

// 더블클릭 선택이거나 공백이 포함된 경우 처리
if ((text.length < 50 || hasExtraWhitespace) && range.startContainer.nodeType === 3) {
  DebugUtils.debugLog(MODULE_NAME, '선택 영역 조정 필요', {
    originalText: text,
    cleanText: cleanText,
    hasExtraWhitespace: hasExtraWhitespace
  }, '#E91E63');
  
  // 텍스트 노드의 전체 내용
  const fullText = range.startContainer.textContent;
  
  // 정확한 위치 찾기 - 시작 위치에서부터 검색
  let startPos = -1;
  let searchStart = Math.max(0, range.startOffset - cleanText.length);
  
  // 정확한 위치를 찾기 위해 여러 방법 시도
  while (startPos === -1 && searchStart <= range.startOffset) {
    startPos = fullText.indexOf(cleanText, searchStart);
    searchStart++;
  }
  
  // 여전히 찾지 못한 경우 전체 텍스트에서 검색
  if (startPos === -1) {
    startPos = fullText.indexOf(cleanText);
  }
  
  // 여전히 찾지 못한 경우 원래 시작점 사용
  if (startPos === -1) {
    startPos = range.startOffset;
  }
  
  // 정확한 끝 위치 계산
  const endPos = startPos + cleanText.length;
  
  // 새 범위 생성
  const newRange = document.createRange();
  newRange.setStart(range.startContainer, startPos);
  newRange.setEnd(range.startContainer, endPos);
  
  // 선택 영역 업데이트
  selection.removeAllRanges();
  selection.addRange(newRange);
}
```

이 변경으로 다음과 같은 이점이 있습니다:
- 더블클릭 선택 시 줄바꿈과 후발 공백을 제거하여 정확한 단어 경계만 선택
- 선택 영역의 정확한 위치를 찾기 위한 강화된 로직 구현
- 드래그, 더블클릭, 키보드 등 모든 선택 방식에 대해 일관된 정렬 동작 보장

### 5. 프로젝트 문서화 개선

프로젝트의 관리와 연속성을 위해 다음 문서 파일들을 생성했습니다:

1. **project-memory.md**: 프로젝트 규칙과 주요 메모리 내역을 정리한 문서
   - 개발 가이드라인
   - 에디터 기능 요구사항
   - 주요 메모리 (플러그인 순서 지원, 동영상 삽입 기능, 정렬 버그 수정 등)

2. **development-history.md**: 개발 과정에서 이루어진 작업과 변경사항을 시간순으로 기록
   - 플러그인 순서 커스터마이징 기능 개선
   - 동영상 삽입 기능 추가
   - 정렬 기능 버그 수정
   - 선택 영역 디버깅 UI 추가
   - 수평선 플러그인 구조 정리

3. **todo-list.md**: 향후 개발 과제와 개선 사항 목록
   - 플러그인 기능 구현 (line.js, movie.js)
   - UI/UX 개선
   - 코드 개선
   - 버그 수정
   - 테스트 및 문서화
   - 배포 및 유지보수

## 변경된 파일 목록

1. **js/core.js**
   - 플러그인 순서 및 on/off 제어 방식 개선
   - 사용자가 지정한 순서대로 플러그인을 표시하도록 변경

2. **js/plugins/line.js**
   - 누락된 수평선 삽입 플러그인 파일 생성
   - 기본 스타일 및 구조 구현

3. **js/plugins/movie.js**
   - 동영상 삽입 플러그인 기본 구조 구현
   - 선택 영역 저장/복원 로직 구현

4. **js/plugins/align.js**
   - 더블클릭 선택 시 정렬 버그 수정
   - 선택 영역 정규화 로직 개선

5. **js/loader.js**
   - line.js, movie.js 파일을 스크립트 로드 목록에 추가

6. **index.html**
   - plugins 배열 및 dividers 배열 업데이트
   - 플러그인 순서 및 구분선 위치 조정

7. **docs/project-memory.md**, **docs/development-history.md**, **docs/todo-list.md**
   - 프로젝트 문서화 파일 생성

## 결론

이번 작업을 통해 Lite Editor의 플러그인 관리 시스템이 크게 개선되었습니다. 사용자는 이제 원하는 플러그인을 원하는 순서로 배치할 수 있으며, 누락된 플러그인이 복구되고 새로운 플러그인이 추가되었습니다. 또한 정렬 기능의 더블클릭 버그가 수정되어 사용자 경험이 향상되었습니다. 프로젝트 문서화도 개선되어 향후 개발의 연속성이 보장되었습니다.

향후 작업으로는 line.js와 movie.js의 실제 기능 구현, UI/UX 개선, 코드 최적화 등이 계획되어 있습니다.
