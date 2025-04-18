# 2025-04-18 테이블/링크/서식 기능 개선

## Branch
- feature/editor-enhancement

## 수정 완료 사항

### 1. 테이블 플러그인 리팩토링
- DOM 조작 유틸리티 모듈화 및 코드 구조 개선
- 상태 관리 시스템 개선 (state 객체 도입)
- 이벤트 핸들러 통합 및 최적화
- 불필요한 코드 제거 (addTableIconStyles, setTableLayerDimensions)
- 테이블 생성 로직 모듈화 및 개선

### 2. 링크 기능 버그 수정
- 링크 선택 시 에디터 선택 블록 원복 문제 해결
- URL 입력값 검증 시 중복 경고창 출력 버그 수정
- 스크롤 이동 시 링크 레이어 위치 고정 문제 해결
- 링크 삽입 후 커서 위치 개선

### 3. 서식 제거 기능 추가
- 텍스트 서식 제거 버튼 추가
- 선택 영역 내 모든 스타일 속성 제거 기능 구현
- 기본 텍스트 스타일로 복원 기능 추가

### 4. 정렬 기능 리팩토링 및 버그 수정
- 정렬 플러그인(align.js) 전면 리팩토링
- 모듈화된 함수 구조로 코드 가독성 및 유지보수성 향상
- 더블 클릭 후 정렬 적용 시 불필요한 영역까지 정렬되는 버그 수정
- 드롭다운 레이어가 버튼 중앙에 위치하도록 개선
- 다른 에디터 아이콘 클릭 시 드롭다운 자동 닫힘 기능 추가

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

## 주요 소스 설명

### 1. 테이블 관련 코드
```javascript
const tableManager = {
    createHeaderTable(tbody, rows, cols, borderStyle) {
        // 헤더가 있는 테이블 생성 로직
    },
    createColumnTable(tbody, rows, cols, borderStyle) {
        // 첫 열이 헤더인 테이블 생성 로직
    }
    // ... 기타 테이블 관련 메서드
};
```

### 2. 링크 기능 개선
```javascript
const linkManager = {
    saveSelection() {
        // 선택 영역 저장
        const sel = window.getSelection();
        if (sel.rangeCount > 0) {
            return sel.getRangeAt(0).cloneRange();
        }
        return null;
    },
    
    validateUrl(url) {
        // URL 유효성 검사 로직
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    },
    
    updateLinkLayer() {
        // 링크 레이어 위치 업데이트
        const layer = document.querySelector('.link-layer');
        if (layer && this.lastButtonRect) {
            layer.style.top = `${this.lastButtonRect.bottom + window.scrollY}px`;
            layer.style.left = `${this.lastButtonRect.left + window.scrollX}px`;
        }
    }
};
```

### 3. 서식 제거 기능
```javascript
const formatCleaner = {
    removeAllFormatting(element) {
        // 모든 서식 제거 로직
        const cleanText = element.textContent;
        element.innerHTML = cleanText;
    },
    
    removeSelectedFormatting() {
        // 선택 영역 서식 제거
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        const fragment = range.extractContents();
        const cleanFragment = this.cleanNode(fragment);
        range.insertNode(cleanFragment);
    },
    
    cleanNode(node) {
        // 노드 정리 및 기본 스타일 적용
        if (node.nodeType === 3) return node;
        
        const newNode = document.createElement('span');
        newNode.textContent = node.textContent;
        return newNode;
    }
};
```

### 4. 정렬 기능 리팩토링

#### 4.1 리팩토링 전략

텍스트 정렬 기능(align.js)의 리팩토링은 다음과 같은 전략으로 진행되었습니다:

1. **UI 생성 분리**
   - 버튼(createAlignButton)과 드롭다운(createAlignDropdown) 생성 코드를 분리
   - PluginUtil.dom.createElement를 활용하여 반복 코드 제거

2. **정렬 명령 실행 분리**
   - 정렬 적용 로직을 별도 함수(applyAlignment)로 분리
   - 블록 요소 선택 및 조정 로직 모듈화

3. **레이어 위치 계산 분리**
   - 드롭다운 위치 조정 로직을 toggleDropdown 함수로 캡슐화
   - 화면 경계 체크 로직 강화

4. **이벤트 바인딩 분리**
   - 클릭 이벤트, 외부 클릭 감지, 다른 버튼 클릭 감지 등의 이벤트 로직을 setupAlignEvents 함수로 분리

#### 4.2 코드 비교 (리팩토링 전/후)

**리팩토링 전 코드 (문제점)**:
- 모든 기능이 하나의 큰 함수 안에 혼재
- 같은 코드 패턴이 여러 곳에서 반복
- DOM 요소 생성과 이벤트 처리 로직이 혼합
- 유지보수와 디버깅이 어려운 구조

```javascript
// 리팩토링 전 코드 예시 (일부)
LiteEditor.registerPlugin(PLUGIN_ID, {
  title: 'Alignment',
  icon: 'format_align_left',
  customRender: function(toolbar, contentArea) {
    // 버튼 생성, 아이콘 추가, 드롭다운 생성, 이벤트 처리 등이 
    // 모두 한 함수 내에 혼재되어 있음
    const alignContainer = document.createElement('div');
    alignContainer.className = 'lite-editor-button';
    // ... 수백 줄의 코드 ...
    return alignContainer;
  }
});
```

**리팩토링 후 코드 (개선사항)**:
- 기능별로 분리된 함수 구조
- 공통 유틸리티(PluginUtil) 활용
- 명확한 책임 분리와 재사용 가능한 구조
- 유지보수와 확장이 용이한 구조

```javascript
// 리팩토링 후 코드 구조 (핵심 부분)
const ID = 'align';
const util = window.PluginUtil;
const commands = [
  { cmd: 'justifyLeft', icon: 'format_align_left', title: 'Left Align' },
  // ... 다른 명령들 ...
];

// 1) 버튼 생성
function createAlignButton(contentArea) { /* ... */ }

// 2) 드롭다운 생성
function createAlignDropdown(contentArea, iconElement) { /* ... */ }

// 3) 드롭다운 토글
function toggleDropdown(show, dropdown, anchor) { /* ... */ }

// 4) 정렬 명령 실행
function applyAlignment(command, contentArea, iconEl, iconName) { /* ... */ }

// 5) 이벤트 바인딩
function setupAlignEvents(btn, dropdown, contentArea, toolbar) { /* ... */ }

// 플러그인 등록 - 간결하고 명확한 구조
LiteEditor.registerPlugin(ID, {
  title: 'Alignment',
  icon: commands[0].icon,
  customRender(toolbar, contentArea) {
    const { btn, icon } = createAlignButton(contentArea);
    const dropdown = createAlignDropdown(contentArea, icon);
    setupAlignEvents(btn, dropdown, contentArea, toolbar);
    return btn;
  }
});
```

#### 4.3 정렬 기능의 핵심 로직

정렬 기능의 핵심은 선택된 텍스트가 포함된 블록 요소를 찾아 해당 블록 전체에 정렬을 적용하는 것입니다:

```javascript
function applyAlignment(command, contentArea, iconEl, iconName) {
  // 1. 선택 영역 복원
  if (window.liteEditorSelection) {
    window.liteEditorSelection.restore();
    
    // 2. 선택 범위에서 블록 요소 찾기
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      let node = range.commonAncestorContainer;
      
      // 3. 텍스트 노드면 부모 요소로 변경
      if (node.nodeType === 3) node = node.parentNode;
      
      // 4. 가장 가까운 블록 요소 찾기 (p, div, h1-h6 등)
      const block = util.dom.findClosestBlock(node, contentArea);
      
      // 5. 해당 블록 요소를 선택 범위로 설정
      if (block) {
        sel.removeAllRanges();
        const newRange = document.createRange();
        newRange.selectNodeContents(block);
        sel.addRange(newRange);
      }
    }
  }
  
  // 6. 정렬 명령 실행
  document.execCommand(command, false, null);
  
  // 7. UI 업데이트 및 후속 처리
  iconEl.textContent = iconName;
  contentArea.focus();
  
  if (window.liteEditorSelection) {
    window.liteEditorSelection.save();
  }
}
```

이 로직을 통해 사용자가 텍스트의 일부만 선택해도 해당 텍스트가 포함된 전체 블록에 정렬이 적용되며, 더블 클릭으로 단어를 선택한 후 정렬을 적용할 때 다른 문단까지 영향을 미치는 버그가 해결되었습니다.

#### 4.4 주요 개선 사항

1. **코드 구조 개선**
   - 모놀리식 구조에서 함수 기반의 모듈식 구조로 변경
   - 다섯 가지 주요 함수로 코드 분리 (버튼 생성, 드롭다운 생성, 토글, 정렬 적용, 이벤트 설정)

2. **유지보수성 향상**
   - 명확한 함수 역할 정의와 JSDoc 주석 추가
   - 책임 분리로 인한 버그 수정 및 기능 확장 용이성 증가

3. **재사용성 개선**
   - PluginUtil 유틸리티 활용으로 공통 코드 중복 제거
   - DOM 조작, 레이어 위치 설정 등의 일관된 패턴 적용

4. **버그 수정**
   - 정렬 시 블록 요소 선택 로직 개선으로 정확한 범위에 정렬 적용
   - 드롭다운 스타일 충돌 문제 해결 (`!important` 속성 적용)
   - 다른 버튼 클릭 시 드롭다운 닫힘 기능 추가

5. **사용자 경험 개선**
   - 드롭다운 위치를 버튼 중앙에 표시하여 UI 일관성 향상
   - 화면 경계 체크로 드롭다운이 화면 밖으로 나가는 문제 방지
