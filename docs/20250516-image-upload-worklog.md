# Lite Editor Worklog - 2025.05.16

## 개요

Lite Editor의 이미지 관련 기능을 개선하는 작업을 진행했습니다. 주요 작업으로는 이미지 선택 기능 구현, 키보드 제어 기능 추가, 정렬 기능 연동 등이 포함되었습니다. 이러한 변경은 사용자가 에디터 내에서 이미지를 더 효과적으로 조작할 수 있도록 하기 위해 수행되었습니다.

## 작업 내역

### 1. 이미지 선택 기능 구현

이미지 클릭으로 선택/해제할 수 있는 시스템을 구현했습니다:
- `data-selectable="true"` 속성으로 선택 가능한 이미지 지정
- `data-selected="true"` 속성으로 선택 상태 관리
- 선택된 이미지에 시각적 피드백 적용 (파란색 테두리, 반투명 오버레이)
- 이미지 외부 클릭 시 자동 선택 해제

이러한 변경으로 사용자가 이미지를 명확히 선택하고 작업할 수 있게 되었습니다.

### 2. 키보드 제어 기능 추가

키보드를 통한 이미지 조작 기능을 구현했습니다:
- 방향키 입력 시 이미지 선택 해제 (일반 텍스트 편집 모드로 전환)
- Delete/Backspace 키로 선택된 이미지 삭제
- 이미지 삭제 후 적절한 커서 위치 처리

이 기능을 통해 키보드만으로도 이미지를 효과적으로 관리할 수 있게 되었습니다.

### 3. 정렬 기능 연동

align.js 플러그인과의 연동을 통해 이미지 정렬 기능을 구현했습니다:
- `window.LiteImageHandlers` 인터페이스 구현
- `hasSelectedImage()`: 현재 선택된 이미지가 있는지 확인하는 함수
- `alignSelectedImage(alignType)`: 선택된 이미지에 정렬 속성 적용하는 함수
- 부모 P 태그의 텍스트 정렬을 활용한 이미지 정렬 처리

이 기능으로 사용자가 에디터 내에서 이미지의 정렬 상태를 쉽게 변경할 수 있게 되었습니다.

### 4. 코드 최적화 및 정리

불필요한 코드를 제거하고 최적화했습니다:
- 사용되지 않는 `selectedImage` 변수 제거
- 기능이 구현되지 않은 더블클릭 이벤트 핸들러 제거
- 불필요한 DOM 탐색 최소화
- 이미지 선택/해제 로직 최적화

## 코드 변경 상세 내역

### 이미지 선택 시스템 CSS
```css
.image-wrapper {
    transition: outline 0.2s ease, box-shadow 0.2s ease;
    cursor: pointer;
    position: relative;
}

.image-wrapper:hover {
    outline: 1px solid rgba(66, 133, 244, 0.3);
}

.image-wrapper[data-selected="true"] {
    outline: 2px solid #4285f4;
    box-shadow: 0 0 5px rgba(66, 133, 244, 0.5);
}

.image-wrapper[data-selected="true"]::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(66, 133, 244, 0.1);
    pointer-events: none;
    z-index: 1;
}
```

### 이미지 선택 기능 구현
```javascript
// 이미지 컨테이너 찾기
const imageWrapper = findClosestElement(event.target, '.image-wrapper[data-selectable="true"]');

// 기존 선택된 이미지 찾기
const prevSelected = editor.querySelector('.image-wrapper[data-selected="true"]');

// 이미지 외부 클릭 시 선택 해제
if (!imageWrapper) {
    if (prevSelected) {
        prevSelected.removeAttribute('data-selected');
    }
    return;
}

// 현재 이미지 선택
imageWrapper.setAttribute('data-selected', 'true');
```

### 정렬 기능 연동
```javascript
// align.js와 연동 (전역 함수로 선택된 이미지에 정렬 적용)
if (!window.LiteImageHandlers) {
    window.LiteImageHandlers = {};
}

// 이미지 정렬 함수 (align.js에서 호출)
window.LiteImageHandlers.alignSelectedImage = function(alignType) {
    const selectedImg = editor.querySelector('.image-wrapper[data-selected="true"]');
    if (!selectedImg) return false;
    
    // 부모 p 태그 찾기 또는 생성
    let parentP = selectedImg.parentElement;
    if (parentP.tagName !== 'P') {
        // 부모가 P가 아니면 P로 감싸기
        parentP = document.createElement('p');
        selectedImg.parentNode.insertBefore(parentP, selectedImg);
        parentP.appendChild(selectedImg);
    }
    
    // 부모 P 태그에 텍스트 정렬 적용
    parentP.style.textAlign = alignType;
    
    // 에디터 변경 이벤트 발생
    const inputEvent = new Event('input', { bubbles: true });
    editor.dispatchEvent(inputEvent);
    
    return true;
};
```

## 코드 리뷰

### 이미지 선택 시스템

이미지 선택 시스템은 직관적인 사용자 인터페이스를 제공합니다:

1. **명확한 시각적 피드백**: 선택된 이미지는 파란색 테두리와 반투명 오버레이로 구분됩니다.
2. **DOM 속성 기반 상태 관리**: `data-selected` 속성을 통해 선택 상태를 명확히 표시합니다.
3. **일관된 사용자 경험**: 다른 요소 클릭 시 자동으로 선택이 해제됩니다.
4. **최적화된 이벤트 처리**: 이벤트 위임을 통해 성능을 최적화했습니다.

### 키보드 제어

키보드 제어는 접근성과 사용성을 향상시킵니다:

1. **일관된 키보드 동작**: 표준 키보드 동작(삭제, 방향키)을 그대로 유지합니다.
2. **커서 위치 관리**: 삭제 후 커서 위치를 적절히 조정합니다.
3. **에디터 상태 동기화**: 변경 사항이 발생하면 에디터 이벤트를 발생시켜 상태를 동기화합니다.

### 플러그인 연동

align.js 플러그인과의 연동은 모듈 간의 결합도를 낮추는 방식으로 구현되었습니다:

1. **전역 인터페이스**: `window.LiteImageHandlers`를 통해 플러그인 간 인터페이스를 제공합니다.
2. **기능 캡슐화**: 각 기능이 명확한 책임을 가진 함수로 캡슐화되었습니다.
3. **DOM 구조 유지**: 기존 에디터의 DOM 구조를 존중하며 정렬 기능을 통합했습니다.

## 향후 과제

1. **CSS 클래스 활용**: 현재는 인라인 스타일(textAlign)을 사용하고 있지만, 정의된 CSS 클래스(`align-left`, `align-center` 등)를 활용하도록 개선
2. **리사이즈 핸들 개선**: 이미지 선택 상태에서 리사이즈 핸들의 UX 개선
3. **다중 이미지 선택**: Shift 키를 이용한 다중 이미지 선택 기능 구현
4. **드래그 앤 드롭**: 이미지 드래그 앤 드롭으로 위치 이동 기능 추가
5. **이미지 속성 편집**: 선택한 이미지의 alt, title 등의 속성을 편집할 수 있는 UI 추가
6. **크로스 브라우저 호환성**: 다양한 브라우저에서의 테스트 및 호환성 보장

## 결론

이번 개선을 통해 Lite Editor의 이미지 관련 기능이 크게 향상되었습니다. 특히 이미지 선택 기능과 키보드 제어 기능 추가로 사용자가 에디터 내에서 이미지를 보다 직관적으로 조작할 수 있게 되었습니다. 또한 align.js 플러그인과의 연동을 통해 이미지 정렬 기능도 원활하게 작동하게 되었습니다. 코드 최적화와 불필요한 부분 제거를 통해 전체적인 코드 품질과 유지보수성도 향상되었습니다.
