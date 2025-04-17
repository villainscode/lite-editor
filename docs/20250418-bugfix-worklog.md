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

## 유의사항
1. 테이블 생성 시 에디터 상태 업데이트 필수 (dispatchEditorEvent 호출)
2. DOM 조작 시 domUtils 유틸리티 함수 사용 권장
3. 링크 삽입 시 선택 영역 저장/복원 로직 주의
4. 서식 제거 시 에디터 컨텐츠 구조 변경에 주의

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

### 4. 이벤트 관리 시스템
```javascript
const eventManager = {
    setupEventListeners() {
        // 이벤트 리스너 설정
        document.addEventListener('scroll', this.handleScroll.bind(this));
        document.addEventListener('click', this.handleOutsideClick.bind(this));
        document.addEventListener('keydown', this.handleKeyPress.bind(this));
    },
    
    handleScroll() {
        // 스크롤 이벤트 처리
        linkManager.updateLinkLayer();
        tableManager.updateGridLayer();
    },
    
    handleKeyPress(e) {
        // 키 이벤트 처리
        if (e.key === 'Escape') {
            this.closeAllLayers();
        }
    }
};
```

### 5. 유틸리티 함수
```javascript
const utils = {
    debounce(func, wait) {
        // 디바운스 처리
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    getSelectionText() {
        // 선택된 텍스트 반환
        const selection = window.getSelection();
        return selection.toString();
    }
};
```
