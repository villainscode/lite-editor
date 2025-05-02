# Lite Editor Bugfix Worklog - 2025.05.01

## 개요

Lite Editor의 UI 및 기능 개선을 위한 버그 수정 작업을 진행했습니다. 주요 작업으로는 에디터 툴바 레이아웃 최적화, 콘텐츠 영역 스크롤 기능 개선, 체크리스트 UI 버그 수정 등이 포함되었습니다. 이러한 변경은 사용자 경험을 개선하고 에디터의 시각적 일관성을 유지하기 위해 수행되었습니다.

## 작업 내역

### 1. 에디터 툴바 레이아웃 개선

에디터 툴바의 레이아웃 문제를 해결했습니다:
- 툴바가 너비가 줄어들 때 두 줄로 나눠지는 문제 수정
- 너비가 충분하지 않을 때 초과된 아이콘들은 스크롤 대신 숨김 처리 적용
- 일관된 툴바 높이 유지를 위한 CSS 속성 추가

이러한 변경으로 사용자가 설정한 플러그인 개수에 맞게 툴바 아이콘이 표시되며, 레이아웃이 깨지지 않게 되었습니다.

### 2. 콘텐츠 영역 스크롤 기능 개선

에디터 콘텐츠 영역의 스크롤 동작을 개선했습니다:
- 고정 높이 설정 시 내용이 넘치면 자동으로 스크롤 표시
- `overflow: auto` 속성을 통해 필요할 때만 스크롤바 표시
- 에디터 컨테이너 내부 오버플로우 제어 최적화

이 개선을 통해 콘텐츠 높이가 설정된 영역보다 커지더라도 사용자가 모든 내용에 쉽게 접근할 수 있게 되었습니다.

### 3. 체크리스트 UI 버그 수정

체크리스트 기능의 UI 버그를 수정했습니다:
- 체크박스 상단 여백(`margin-top: 2px`) 추가로 수직 정렬 개선
- 빈 체크리스트 항목에서 `&nbsp;` 대신 `<br>` 태그를 사용하여 레이블 간격 일관성 유지
- 텍스트 입력 시와 빈 항목 간의 체크박스-레이블 간격 불일치 문제 해결
- 빈 체크리스트 항목 탐지 로직 개선 (`isEmptyChecklistItem` 함수 수정)

이러한 변경으로 체크리스트 항목 간의 시각적 일관성이 향상되었습니다.

## 코드 변경 상세 내역

### 에디터 툴바 레이아웃 개선 (core.css)
```css
/* 변경 전 */
.lite-editor-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  min-height: 36px;
  padding: 4px 6px;
  border-bottom: 1px solid #eee;
  background-color: #f8f9fa;
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  width: 100%;
}

/* 변경 후 */
.lite-editor-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: nowrap; /* Changed from wrap to nowrap to prevent wrapping */
  min-height: 36px;
  padding: 4px 6px;
  border-bottom: 1px solid #eee;
  background-color: #f8f9fa;
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
  overflow: hidden; /* Hide overflowing content instead of scrolling */
  width: 100%;
  box-sizing: border-box;
  white-space: nowrap; /* Prevent items from wrapping */
}
```

### 툴바 초기화 코드 개선 (core.js)
```javascript
/* 변경 전 */
if (config.dimensions.toolbar.height) {
  toolbar.style.height = config.dimensions.toolbar.height;
  toolbar.style.overflowY = 'hidden'; // 툴바 세로 스크롤 방지
}

/* 변경 후 */
if (config.dimensions.toolbar.height) {
  toolbar.style.height = config.dimensions.toolbar.height;
  toolbar.style.minHeight = config.dimensions.toolbar.height;
  toolbar.style.maxHeight = config.dimensions.toolbar.height;
  toolbar.style.overflow = 'hidden'; // 툴바 내용이 넘칠 경우 숨김 처리
}
```

### 툴바 버튼 개선 (plugins.css)
```css
/* 변경 전 */
.lite-editor-button {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  width: 28px;
  margin: 0 2px;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: #5f6368;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s, box-shadow 0.1s;
  position: relative;
  padding: 0;
  min-width: 28px;
}

/* 변경 후 */
.lite-editor-button {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  width: 28px;
  margin: 0 2px;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: #5f6368;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s, box-shadow 0.1s;
  position: relative;
  padding: 0;
  min-width: 28px;
  flex-shrink: 0; /* Prevent buttons from shrinking */
}
```

### 콘텐츠 영역 스크롤 개선 (core.css)
```css
/* 변경 전 */
.lite-editor-content {
  padding: 12px;
  min-height: 120px;
  outline: none;
  font-size: 14px;
  line-height: 1.5;
  color: #333;
  overflow: auto;
  flex: 1;
  width: 100%;
}

/* 변경 후 */
.lite-editor-content {
  padding: 12px;
  min-height: 120px;
  outline: none;
  font-size: 14px;
  line-height: 1.5;
  color: #333;
  overflow: auto; /* Enable scrolling in all directions */
  flex: 1;
  width: 100%;
  box-sizing: border-box;
  max-height: 100%; /* Respect the container's height */
}
```

### 콘텐츠 높이 설정 로직 개선 (core.js)
```javascript
/* 변경 전 */
if (config.dimensions.content.height) {
  contentArea.style.height = config.dimensions.content.height;
}

/* 변경 후 */
if (config.dimensions.content.height) {
  contentArea.style.height = config.dimensions.content.height;
  contentArea.style.maxHeight = config.dimensions.content.height;
  contentArea.style.overflowY = 'auto'; // 내용이 넘칠 경우 스크롤 표시
}

// 자동 높이 계산이 아닌 경우 컨테이너 내부 요소 조정
if (config.dimensions.editor.height && config.dimensions.editor.height !== 'auto') {
  editorContainer.style.overflow = 'hidden'; // 컨테이너 넘침 방지
}
```

### 체크리스트 체크박스 스타일 개선 (checkList.js)
```javascript
/* 변경 전 */
const checkbox = PluginUtil.dom.createElement('input', {
  type: 'checkbox',
  id: itemId,
  className: 'form-checkbox h-4 w-4 text-primary transition'
});

/* 변경 후 */
const checkbox = PluginUtil.dom.createElement('input', {
  type: 'checkbox',
  id: itemId,
  className: 'form-checkbox h-4 w-4 text-primary transition',
  style: 'margin-top: 2px;'
});
```

### 체크리스트 빈 항목 처리 개선 (checkList.js)
```javascript
/* 변경 전 */
// 빈 텍스트일 경우 &nbsp; 추가 (커서 위치 보이게)
const labelContent = text.trim() ? text : NBSP_CHAR;

const label = PluginUtil.dom.createElement('label', {
  className: 'text-gray-800',
  textContent: labelContent,
  style: getLabelGapStyle(),
  htmlFor: itemId
});

/* 변경 후 */
const label = PluginUtil.dom.createElement('label', {
  className: 'text-gray-800',
  style: getLabelGapStyle(),
  htmlFor: itemId
});

// 빈 텍스트일 경우 브라우저가 표시할 수 있는 빈 컨텐츠로 설정
if (text.trim()) {
  label.textContent = text;
} else {
  // 빈 라벨에는 <br> 태그 사용 (textContent 대신 innerHTML)
  label.innerHTML = '<br>';
}
```

### 체크리스트 빈 항목 확인 로직 개선 (checkList.js)
```javascript
/* 변경 전 */
function isEmptyChecklistItem(item) {
  if (!item) return true;
  
  const label = item.querySelector('label');
  if (!label) return true;
  
  const content = label.textContent || '';
  return !content.trim() || content === NBSP_CHAR;
}

/* 변경 후 */
function isEmptyChecklistItem(item) {
  if (!item) return true;
  
  const label = item.querySelector('label');
  if (!label) return true;
  
  // 내용이 없거나, <br> 태그만 있는 경우 빈 것으로 간주
  const content = label.textContent || '';
  if (content.trim()) return false;
  
  // innerHTML도 확인 - <br> 태그만 있는 경우도 빈 것으로 간주
  const html = label.innerHTML.trim();
  return !html || html === '<br>' || html === '<br/>' || html === NBSP_CHAR;
}
```

## 코드 리뷰

### 에디터 툴바 개선

에디터 툴바는 더 예측 가능하고 일관된 동작을 제공하도록 개선되었습니다:

1. **레이아웃 안정성**: `flex-wrap: nowrap`과 `white-space: nowrap`을 적용하여 툴바 아이콘이 두 줄로 나뉘지 않도록 했습니다.
2. **오버플로우 처리**: `overflow: hidden`을 적용하여 초과된 아이콘은 스크롤 없이 자연스럽게 숨김 처리되도록 했습니다.
3. **일관된 높이**: 모든 경우에 툴바 높이가 일정하게 유지되도록 `minHeight`와 `maxHeight` 속성을 추가했습니다.
4. **버튼 크기 유지**: 각 버튼에 `flex-shrink: 0`을 적용하여 화면 크기가 줄어들어도 버튼이 작아지지 않도록 했습니다.

이러한 개선으로 사용자는 자신이 추가한 플러그인 개수에 따라 툴바 UI를 예측할 수 있게 되었습니다.

### 콘텐츠 영역 스크롤 개선

콘텐츠 영역의 스크롤 기능은 사용자 경험을 크게 향상시켰습니다:

1. **적절한 스크롤**: 필요한 경우에만 스크롤바가 나타나도록 `overflow: auto` 속성을 적용했습니다.
2. **높이 제한 존중**: 사용자가 설정한 높이를 존중하면서도 콘텐츠가 모두 접근 가능하도록 했습니다.
3. **박스 모델 일관성**: `box-sizing: border-box`를 적용하여 패딩과 테두리가 설정된 너비와 높이에 포함되도록 했습니다.
4. **내부 오버플로우 제어**: 에디터 컨테이너의 `overflow: hidden` 설정으로 내부 요소들이 컨테이너를 벗어나지 않도록 했습니다.

이러한 변경으로 에디터는 다양한 사용 사례와 화면 크기에서 더 일관된 시각적 표현을 제공합니다.

### 체크리스트 UI 개선

체크리스트 UI는 다음과 같은 방향으로 개선되었습니다:

1. **수직 정렬**: 체크박스에 적절한 상단 여백(`margin-top: 2px`)을 추가하여 레이블 텍스트와의 수직 정렬을 개선했습니다.
2. **일관된 간격**: `&nbsp;` 문자 대신 `<br>` 태그를 사용하여 빈 레이블에서도 간격이 일정하게 유지되도록 했습니다.
3. **개선된 탐지 로직**: 빈 체크리스트 항목을 더 정확하게 탐지하도록 로직을 개선했습니다.
4. **커서 가시성 유지**: 빈 항목에서도 커서 위치가 명확하게 보이도록 했습니다.

이러한 개선으로 텍스트 내용 유무에 관계없이 체크리스트 UI가 일관되게 표시됩니다.

## 향후 과제

1. **브라우저 호환성 테스트**: 다양한 브라우저에서 개선된 기능들의 호환성 확인
2. **반응형 테스트**: 다양한 화면 크기와 해상도에서의 UI 테스트
3. **사용자 테스트**: 개선된 UI에 대한 사용자 피드백 수집
4. **성능 최적화**: 대량의 체크리스트 항목이 있을 때의 성능 테스트 및 최적화

## 결론

이번 버그 수정 작업을 통해 Lite Editor의 UI 일관성과 사용자 경험이 크게 향상되었습니다. 에디터 툴바의 레이아웃 문제를 해결하고, 콘텐츠 영역의 스크롤 기능을 개선하며, 체크리스트 UI의 일관성을 높임으로써 사용자가 더 직관적이고 예측 가능한 방식으로 에디터를 사용할 수 있게 되었습니다. 특히 체크리스트 기능의 UI 버그 수정은 문서 작성 시 체크리스트를 활용하는 사용자에게 더 나은 경험을 제공할 것입니다.

