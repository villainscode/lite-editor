# 2025-04-18 테이블/링크/서식 기능 개선

## Branch
- feature/2025-04-18
- feature/2025-04-19

## 수정 완료 사항
### 수정 파일 목록 
- js/plugins/table.js
- css/plugins/table.css
- css/plugins/plugins.css
- js/plugins/blockquote.js
- js/plugins/align.js
- js/plugins/bold.js
- js/plugins/italic.js
- js/plugins/line.js
- js/plugins/link.js
- js/plugins/underline.js
- js/plugins/strike.js
- js/plugins/heading.js
- js/plugins/formatRemover.js
- js/plugins/util/plugin-util.js
- js/plugins/util/selection-util.js
- css/plugins/link.css
- css/plugins/align.css




### 1. 테이블 플러그인 리팩토링
- DOM 조작 유틸리티 모듈화 및 코드 구조 개선
- 상태 관리 시스템 개선 (state 객체 도입)
- 이벤트 핸들러 통합 및 최적화
- 불필요한 코드 제거 (addTableIconStyles, setTableLayerDimensions)
- 테이블 생성 로직 모듈화 및 개선
- 테이블 스타일 및 라인 타입 CSS 클래스 기반으로 변경
- 홀수/짝수 행 배경색 스타일 제거 (plugins.css에서 제거)

### 2. 테이블 스타일 개선
- 테이블 스타일 4가지 구현 (Basic, Header, Column, Complex)
  - Basic: 기본 테이블 스타일
  - Header: 첫 번째 행에 #d2d2d2 배경색 적용
  - Column: 첫 번째 열에 #d2d2d2 배경색 적용
  - Complex: 첫 번째 행과 첫 번째 열에 #d2d2d2 배경색 적용
- 테이블 라인 스타일 3가지 구현 (Solid, Dotted, No border)
  - Solid: 기본 실선 테두리
  - Dotted: 진한 점선 테두리 (2px dotted #666)
  - No border: 편집 중에는 흐린 점선으로 표시, 출력 시 테두리 제거

### 3. 링크 기능 개선 및 버그 수정 (link.js)
- 링크 선택 시 에디터 선택 블록 원복 문제 해결
- URL 입력값 검증 시 중복 경고창 출력 버그 수정
- 스크롤 이동 시 링크 레이어 위치 고정 문제 해결
- 링크 삽입 후 커서 위치 개선
- 링크 모달 토글 기능 개선 (링크 아이콘 재클릭 시 모달 닫힘)
- 링크 모달 외부 클릭 이벤트 처리 개선
- URL 유효성 검사 로직 개선 및 사용자 피드백 강화

### 4. Blockquote 기능 버그 수정 (blockquote.js)
- blockquote 내에서 엔터 키를 눌렀을 때 blockquote가 중복 생성되는 버그 수정
- 텍스트가 없거나 커서가 끝에 있을 때 엔터 키를 누르면 blockquote 밖으로 나가도록 개선
- blockquote 내부에서 줄바꿈과 blockquote 벗어나기 동작을 자연스럽게 구현
- 커스텀 키 이벤트 핸들러 추가로 사용자 경험 개선

### 5. 정렬 기능 리팩토링 및 버그 수정 (align.js)
- 정렬 플러그인(align.js) 전면 리팩토링
- 모듈화된 함수 구조로 코드 가독성 및 유지보수성 향상
- 더블 클릭 후 정렬 적용 시 불필요한 영역까지 정렬되는 버그 수정
- 드롭다운 레이어가 버튼 중앙에 위치하도록 개선
- 다른 에디터 아이콘 클릭 시 드롭다운 자동 닫힘 기능 추가
- 선택 영역 기반 정렬 로직 개선으로 정확한 블록 요소에 정렬 적용
- 화면 크기 변경 시 드롭다운 위치 자동 조정 기능 추가

### 6. 텍스트 서식 플러그인 개선 (bold.js, italic.js, underline.js, strike.js)
- 선택 영역 저장/복원 기능 개선으로 서식 적용 후 선택 상태 유지
- 토글 기능 개선 (동일 서식 반복 적용 시 서식 제거)
- 단축키 지원 기능 추가 (Ctrl+B, Ctrl+I, Ctrl+U 등)
- 버튼 상태 표시 기능 개선 (현재 선택 영역의 서식 상태 반영)
- 서식 충돌 처리 로직 개선 (중복 서식 적용 시 정상 동작 보장)
- PluginUtil을 활용한 코드 중복 제거 및 표준화

### 7. 구분선 기능 개선 (line.js)
- 구분선 삽입 시 커서 위치 조정 버그 수정
- 구분선 스타일 개선 및 CSS 클래스 적용
- 구분선 삽입 후 에디터 상태 업데이트 로직 개선
- 다중 구분선 삽입 시 간격 문제 해결

### 8. 제목 스타일 개선 (heading.js)
- 제목 스타일 드롭다운 UI 개선
- 제목 적용 후 선택 영역 복원 기능 개선
- 제목 레벨별 스타일 일관성 확보
- 드롭다운 닫힘 이벤트 처리 개선

### 9. 서식 제거 기능 추가 (formatRemover.js)
- 텍스트 서식 제거 버튼 추가
- 선택 영역 내 모든 스타일 속성 제거 기능 구현
- 기본 텍스트 스타일로 복원 기능 추가
- 복잡한 중첩 서식 제거 로직 구현
- 서식 제거 후 선택 영역 유지 기능 추가

### 10. 유틸리티 기능 개선 (plugin-util.js, selection-util.js)
- 플러그인 등록 및 관리 유틸리티 기능 확장
- 선택 영역 저장/복원 로직 강화
- DOM 요소 생성 및 스타일 적용 유틸리티 개선
- 모달 및 레이어 관리 시스템 도입
- 이벤트 핸들러 관리 기능 개선
- 다중 모달 충돌 방지 로직 추가 (activeModalManager)
- 블록 요소 탐색 및 조작 유틸리티 추가
- CSS 스타일 관리 유틸리티 기능 확장

### 11. CSS 스타일 개선 (*.css)
- 링크 모달 스타일 개선 (link.css)
- 정렬 드롭다운 스타일 개선 (align.css)
- 테이블 스타일 및 라인 타입 CSS 클래스 추가 (table.css)
- 플러그인 공통 스타일 정리 및 중복 제거 (plugins.css)
- 반응형 디자인 지원 개선
- 모바일 환경 UI 최적화
- 다크 모드 지원을 위한 색상 변수 도입
- 접근성 향상을 위한 컨트라스트 및 포커스 표시 개선

## 추가 개발 사항

### 테이블 관련
1. 테이블 셀 크기 조절 기능 추가 필요
2. 테이블 병합/분할 기능 구현 필요
3. 테이블 스타일 프리셋 추가 필요

### 링크 관련
1. 링크 미리보기 기능 추가 필요
2. 외부/내부 링크 구분 UI 개선 필요
3. 링크 유효성 실시간 검사 기능 추가 필요

### 서식 관련
1. 서식 제거 실행 취소/다시 실행 기능 추가 필요
2. 선택적 서식 제거 옵션 추가 필요
3. 서식 제거 단축키 지원 필요

### 정렬 관련
1. 정렬 상태 시각적 피드백 개선 필요
2. 정렬 단축키 지원 추가 필요
3. 복합 정렬 옵션(텍스트 및 이미지 정렬 구분) 추가 필요

## 유의사항
1. 테이블 생성 시 에디터 상태 업데이트 필수 (dispatchEditorEvent 호출)
2. DOM 조작 시 domUtils 유틸리티 함수 사용 권장
3. 링크 삽입 시 선택 영역 저장/복원 로직 주의
4. 서식 제거 시 에디터 컨텐츠 구조 변경에 주의
5. 드롭다운 메뉴 스타일 적용 시 `!important` 속성 필수 (CSS 우선순위 충돌 방지)
6. 테이블 스타일 CSS 클래스는 table.css에서 관리 (plugins.css에서 제거)
7. blockquote에서 엔터 키 처리는 사용자 정의 핸들러로 구현
8. 모달 및 드롭다운 표시 시 activeModalManager 사용 필수
9. 서식 적용 시 선택 영역 저장/복원 로직 활용
10. 플러그인 간 일관된 코드 스타일 유지 (PluginUtil 활용)

## 주요 소스 설명

### 1. 테이블 관련 코드

#### 1.1 테이블 스타일 CSS 클래스
```css
/* 테이블 타입별 스타일 */
/* 1. Basic 타입 - 추가 스타일 없음 */

/* 2. Header 타입 - 첫 번째 행에 배경색 적용 */
.lite-table-header tr:first-child th,
.lite-table-header tr:first-child td {
  background-color: #d2d2d2;
}

/* 3. Column 타입 - 첫 번째 열에 배경색 적용 */
.lite-table-column tr td:first-child,
.lite-table-column tr th:first-child {
  background-color: #d2d2d2;
}

/* 4. Complex 타입 - 첫 번째 행과 첫 번째 열에 배경색 적용 */
.lite-table-complex tr:first-child td,
.lite-table-complex tr:first-child th,
.lite-table-complex tr td:first-child,
.lite-table-complex tr th:first-child {
  background-color: #d2d2d2;
}

/* Dotted 테두리 스타일 - 더 진하게 처리 */
.lite-table-dotted,
.lite-table-dotted td,
.lite-table-dotted th {
  border-style: dotted !important;
  border-width: 2px !important;
  border-color: #666 !important;
}

/* No border 스타일 - 에디터에서만 보이는 점선 */
.lite-table-no-border {
  border: 1px dashed #aaaaaa !important;
}

.lite-table-no-border td,
.lite-table-no-border th {
  border: 1px dashed #aaaaaa !important;
}

/* HTML 출력 시 테두리 제거 */
@media print {
  .lite-table-no-border,
  .lite-table-no-border td,
  .lite-table-no-border th {
    border: none !important;
  }
}
```

#### 1.2 테이블 생성 코드
```javascript
insertTable(rows, cols, tableOptions = {}) {
    // ... 기존 코드 ...
    
    // 스타일에 따른 클래스 설정
    let tableClass = '';
    if (style === 'header') {
        tableClass = 'lite-table-header';
    } else if (style === 'column') {
        tableClass = 'lite-table-column';
    } else if (style === 'complex') {
        tableClass = 'lite-table-complex';
    }
    
    // 라인 스타일에 따른 클래스 추가
    if (line === 'dotted') {
        tableClass += ' lite-table-dotted';
    } else if (line === 'no-border') {
        tableClass += ' lite-table-no-border';
    }
    
    // 테이블 생성
    const table = util.dom.createElement('table', {
        className: tableClass
    }, {
        width: '100%',
        borderCollapse: 'collapse'
    });
    
    // ... 기존 코드 ...
}
```

### 2. Blockquote 엔터 키 핸들링
```javascript
// 엔터 키 핸들러 설정
const setupBlockquoteEnterHandler = function(contentArea) {
  // 이미 설정된 경우 중복 추가하지 않음
  if (contentArea.getAttribute('data-blockquote-handler') === 'true') {
    return;
  }
  
  contentArea.setAttribute('data-blockquote-handler', 'true');
  
  contentArea.addEventListener('keydown', function(e) {
    // 엔터 키 감지
    if (e.key === 'Enter') {
      // ... 선택 범위 확인 및 blockquote 부모 찾기 ...
      
      // blockquote 내부에서 엔터를 눌렀을 때 기본 동작 대체
      if (blockquoteParent) {
        // 기본 동작 방지
        e.preventDefault();
        
        // 텍스트 노드 내용이 비어있거나 커서가 끝에 있는 경우 blockquote 벗어나기
        if ((startNode.nodeType === 3 && startNode.nodeValue.trim() === '') || 
            (startNode.nodeType === 3 && range.startOffset === startNode.nodeValue.length) ||
            (startNode.nodeType === 1 && startNode.innerHTML === '<br>')) {
          
          // blockquote 다음에 새 p 요소 추가
          const newP = document.createElement('p');
          newP.innerHTML = '<br>';
          
          // blockquote 다음에 삽입
          if (blockquoteParent.nextSibling) {
            blockquoteParent.parentNode.insertBefore(newP, blockquoteParent.nextSibling);
          } else {
            blockquoteParent.parentNode.appendChild(newP);
          }
          
          // 커서를 새 p 요소로 이동
          const newRange = document.createRange();
          newRange.setStart(newP, 0);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        } else {
          // 일반 엔터 처리 - blockquote 내부에서 줄바꿈
          document.execCommand('insertHTML', false, '<br>');
        }
      }
    }
  });
};
```

### 3. 링크 기능 개선
```javascript
// 링크 모달 토글 함수
function toggleLinkModal(buttonElement) {
  // 이미 활성화된 모달인지 확인
  const isAlreadyActive = util.activeModalManager.isActive(linkModal);
  
  if (isAlreadyActive) {
    // 이미 활성화된 경우 모달 닫기
    closeLinkModal();
    return;
  }
  
  // 다른 모달 모두 닫기
  util.activeModalManager.closeAll();
  
  // 링크 모달 표시
  showLinkModal(buttonElement);
}

// URL 유효성 검사 함수
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    // 상대 경로 URL도 허용
    const relativeUrlPattern = /^[\/]?[a-zA-Z0-9-._~:/?#[\]@!$&'()*+,;=%]+$/;
    return relativeUrlPattern.test(url);
  }
}
```

### 4. 정렬 기능 리팩토링
```javascript
// 정렬 명령 실행 함수
function applyAlignment(command, contentArea, iconEl, iconName) {
  // 선택 영역 복원
  if (window.liteEditorSelection) {
    window.liteEditorSelection.restore();
    
    // 선택 범위에서 블록 요소 찾기
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      let node = range.commonAncestorContainer;
      
      // 텍스트 노드면 부모 요소로 변경
      if (node.nodeType === 3) node = node.parentNode;
      
      // 가장 가까운 블록 요소 찾기 (p, div, h1-h6 등)
      const block = util.dom.findClosestBlock(node, contentArea);
      
      // 해당 블록 요소를 선택 범위로 설정
      if (block) {
        sel.removeAllRanges();
        const newRange = document.createRange();
        newRange.selectNodeContents(block);
        sel.addRange(newRange);
      }
    }
  }
  
  // 정렬 명령 실행
  document.execCommand(command, false, null);
  
  // UI 업데이트 및 후속 처리
  iconEl.textContent = iconName;
  contentArea.focus();
  
  if (window.liteEditorSelection) {
    window.liteEditorSelection.save();
  }
}
```

### 5. 서식 플러그인 공통 개선 (Bold, Italic, Underline, Strike)
```javascript
// 텍스트 서식 적용 함수 (bold.js, italic.js, underline.js, strike.js에서 공통 사용)
function applyFormatting(commandName, contentArea, button) {
  // 선택 영역 저장
  if (window.liteEditorSelection) {
    window.liteEditorSelection.save();
  }
  
  // 서식 명령 실행
  document.execCommand(commandName, false, null);
  
  // 버튼 활성 상태 토글
  button.classList.toggle('active');
  
  // 에디터에 포커스 복원
  contentArea.focus();
  
  // 선택 영역 복원
  if (window.liteEditorSelection) {
    window.liteEditorSelection.restore();
  }
  
  // 에디터 상태 업데이트
  util.editor.dispatchEditorEvent(contentArea);
}
```

### 6. 서식 제거 기능
```javascript
// 선택 영역의 모든 서식 제거 함수
function removeFormatting(contentArea) {
  // 선택 영역 저장
  const selection = window.getSelection();
  if (!selection.rangeCount) return;
  
  const range = selection.getRangeAt(0);
  const fragment = range.extractContents();
  
  // 모든 서식 태그 제거
  const cleanedFragment = cleanNode(fragment);
  
  // 정리된 내용 삽입
  range.insertNode(cleanedFragment);
  
  // 에디터 상태 업데이트
  util.editor.dispatchEditorEvent(contentArea);
}

// 노드 정리 (서식 제거) 헬퍼 함수
function cleanNode(node) {
  // 텍스트 노드는 그대로 반환
  if (node.nodeType === 3) return node;
  
  // 문서 조각인 경우 처리
  if (node.nodeType === 11) {
    const cleanFragment = document.createDocumentFragment();
    Array.from(node.childNodes).forEach(child => {
      cleanFragment.appendChild(cleanNode(child));
    });
    return cleanFragment;
  }
  
  // 일반 텍스트로 변환
  const newNode = document.createElement('span');
  newNode.textContent = node.textContent;
  return newNode;
}
```
