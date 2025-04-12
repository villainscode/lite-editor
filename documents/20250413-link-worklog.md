# Lite Editor Link Plugin Worklog - 2025.04.13

## 개요

Lite Editor의 링크 플러그인(link.js)을 개선하고 리팩토링하는 작업을 진행했습니다. 주요 작업으로는 코드 중복 제거, 불필요한 조건문 정리, URL 처리 로직 개선, 커서 위치 관리 향상 등이 포함되었습니다. 이러한 변경은 코드의 가독성과 유지보수성을 높이고, 사용자 경험을 개선하기 위해 수행되었습니다.

## 작업 내역

### 1. URL 유틸리티 기능 구현

URL 관련 기능을 체계적으로 관리하기 위한 유틸리티 객체를 구현했습니다:
- `isValid`: URL 유효성 검사 (한글 도메인 및 특수 케이스 지원)
- `normalize`: URL 프로토콜 정규화 (https:// 자동 추가)
- `extractDomain`: URL에서 도메인 부분만 추출

이러한 구조 분리를 통해 URL 처리 로직의 일관성과 재사용성을 높였습니다.

### 2. 선택 영역 관리 단순화

선택 영역 관리 로직을 단순화했습니다:
- 불필요한 조건문 제거
- 복잡한 선택 영역 처리 로직 개선
- `save`, `restore`, `clear` 메서드로 일관된 인터페이스 제공

이러한 변경으로 코드의 가독성이 향상되고 복잡성이 감소했습니다.

### 3. 모달 이벤트 처리 개선

모달 관련 이벤트 처리를 개선했습니다:
- URL 처리 로직을 `processUrl` 함수로 통합하여 중복 코드 제거
- 전역 이벤트 핸들러 관리 방식 개선
- 키보드 이벤트 처리 로직 최적화

이를 통해 모달 관련 이벤트 처리가 더 안정적이고 효율적으로 변경되었습니다.

### 4. 커서 위치 관리 통합

링크 적용 후 커서 위치 관리 로직을 통합했습니다:
- 선택 영역 유무에 관계없이 일관된 커서 위치 설정
- 코드 중복 제거
- 예외 처리 개선

이 변경으로 링크 삽입 후 커서 위치가 더 예측 가능하게 동작합니다.

## 코드 변경 상세 내역

### URL 유틸리티 객체
```javascript
/**
 * URL 유틸리티 함수
 */
const URLUtils = {
    /**
     * URL 유효성 검사
     * @param {string} url - 검사할 URL
     * @returns {boolean} 유효성 여부
     */
    isValid: function(url) {
        // IP 주소, 로컬호스트, 포트 번호를 포함한 URL 검증
        const domainRegex = /^(https?:\/\/)?(([a-zA-Z0-9\u3131-\u314E\uAC00-\uD7A3-]+\.)+([a-zA-Z\u3131-\u314E\uAC00-\uD7A3]{2,}))(:\d+)?(\/[^\s]*)?(\?.*)?$/;
        // 유효하지 않은 형식 검사 (wwww 등)
        const invalidPrefixRegex = /^(https?:\/\/)?(wwww\.|ww\.|w{5,}\.|w{1,2}\.)/i;
        
        return domainRegex.test(url) && !invalidPrefixRegex.test(url);
    },

    /**
     * URL을 정규화 (프로토콜 추가)
     * @param {string} url - 입력 URL
     * @returns {string} 정규화된 URL
     */
    normalize: function(url) {
        return /^https?:\/\//i.test(url) ? url : 'https://' + url;
    },

    /**
     * URL에서 도메인 부분 추출
     * @param {string} url - 입력 URL
     * @returns {string} 도메인 부분
     */
    extractDomain: function(url) {
        return url.replace(/^https?:\/\//i, '');
    }
};
```

### 선택 영역 관리 단순화
```javascript
/**
 * 선택 영역 관리 객체
 */
const SelectionManager = {
    /**
     * 현재 선택 영역을 저장
     * @returns {boolean} 저장 성공 여부
     */
    save: function() {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
            savedRange = null;
            return true;
        }
        
        const range = selection.getRangeAt(0);
        savedRange = range.cloneRange();
        return true;
    },
    
    /**
     * 저장된 선택 영역을 복원
     * @returns {boolean} 복원 성공 여부
     */
    restore: function() {
        if (!savedRange) return false;
        
        try {
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(savedRange);
            return true;
        } catch (e) {
            console.warn('선택 영역 복원 실패:', e);
            return false;
        }
    },
    
    /**
     * 선택 영역 초기화
     */
    clear: function() {
        savedRange = null;
    }
};
```

### URL 처리 로직 통합
```javascript
// URL 처리 함수
const processUrl = (url) => {
    if (!URLUtils.isValid(url)) {
        LiteEditorModal.alert('올바른 URL을 입력해주세요.\n예: https://example.com');
        return;
    }
    
    contentArea.focus();
    setTimeout(() => this.applyLink(url, contentArea), 0);
};

// 확인 버튼 클릭 이벤트
okButton.addEventListener('click', () => {
    const url = urlInput.value.trim();
    processUrl(url);
});

// URL 입력 필드 엔터 이벤트
urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        const url = urlInput.value.trim();
        processUrl(url);
    }
});
```

### 커서 위치 관리 통합
```javascript
// 커서를 링크 뒤로 이동
const newLink = contentArea.querySelector('a[href="' + finalUrl + '"]');
if (newLink) {
    const range = document.createRange();
    range.setStartAfter(newLink);
    range.collapse(true);
    
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
}
```

## 코드 리뷰

### URL 유틸리티 객체

URL 관련 기능을 별도의 객체로 분리한 것은 다음과 같은 이점을 제공합니다:

1. **관심사 분리**: URL 검증, 정규화, 도메인 추출이 모두 별도 메서드로 분리되어 있어 각 기능에 집중할 수 있습니다.
2. **재사용성**: 여러 곳에서 동일한 URL 처리 로직을 사용할 수 있습니다.
3. **확장성**: 새로운 URL 관련 기능이 필요할 때 쉽게 추가할 수 있습니다.
4. **유지보수성**: URL 처리 로직에 변경이 필요할 때 한 곳에서만 수정하면 됩니다.

특히 `isValid` 메서드는 단순한 URL 형식 검사를 넘어 한글 도메인 지원과 잘못된 접두사(www 오타 등) 검사까지 포함하여 사용자 경험을 향상시킵니다.

### 선택 영역 관리 개선

선택 영역 관리 로직은 다음과 같은 개선점이 있습니다:

1. **단순화**: 불필요한 조건문과 중복 코드를 제거하여 코드 복잡성을 줄였습니다.
2. **일관성**: `save`, `restore`, `clear` 메서드를 통해 일관된 인터페이스를 제공합니다.
3. **오류 처리**: 예외 상황에 대한 처리를 통해 에디터의 안정성을 향상시켰습니다.

이러한 개선은 선택 영역 관리 코드를 더 읽기 쉽고 유지보수하기 쉽게 만들었습니다.

### 모달 이벤트 처리 최적화

모달 이벤트 처리 코드는 다음과 같은 최적화가 이루어졌습니다:

1. **중복 제거**: URL 처리 로직을 `processUrl` 함수로 통합하여 코드 중복을 제거했습니다.
2. **모듈화**: 관련 코드를 함께 배치하여 가독성을 높였습니다.
3. **이벤트 위임**: 이벤트 처리 로직을 효율적으로 구성했습니다.

이러한 최적화는 코드의 일관성과 유지보수성을 높였습니다.

## 향후 과제

1. **접근성 개선**: 키보드 탐색 및 스크린 리더 지원 강화
2. **URL 검증 기능 확장**: 더 다양한 URL 형식 지원 (특수 프로토콜, 국제화된 도메인 등)
3. **링크 편집 기능 추가**: 기존 링크 수정 기능 구현
4. **성능 최적화**: DOM 조작 최소화를 통한 성능 개선
5. **테스트 케이스 추가**: 다양한 시나리오에 대한 테스트 구현

## 결론

이번 리팩토링을 통해 Lite Editor의 링크 플러그인 코드 품질과 사용자 경험이 크게 향상되었습니다. 특히 URL 처리 로직을 체계화하고, 선택 영역 관리를 단순화하며, 이벤트 처리를 최적화함으로써 코드의 가독성과 유지보수성이 개선되었습니다. 또한 커서 위치 관리 로직을 통합하여 링크 삽입 후 커서 위치가 더 예측 가능하게 동작하도록 변경되었습니다. 