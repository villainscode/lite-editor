# LiteEditor 리스트 기능 개발 작업 로그
## 2025-04-25

## 목표
HTML 에디터에서 `bulletList`(순서 없는 목록)와 `numberedList`(순서 있는 목록) 기능을 개발하고, 깊이별 스타일 적용 및 Tab 키를 통한 들여쓰기/내어쓰기 기능을 구현

## 작업 내역

### 1단계: 기본 리스트 기능 구현
- **문제점**: 기본 `execCommand('insertUnorderedList')` 사용 시 스타일 미적용
- **해결책**: 명령 실행 후 대상 요소를 정확히 찾아 스타일 적용하는 로직 개발
- **구현 코드**:
```javascript
function findTargetUl(contentArea, savedRange, ulsBefore) {
  // 1. 새로 생성된 UL 찾기
  const ulsAfter = Array.from(contentArea.querySelectorAll('ul'));
  const newUls = ulsAfter.filter(ul => !ulsBefore.includes(ul));
  
  if (newUls.length > 0) {
    return newUls[0];
  }
  
  // 추가 탐색 로직...
}
```

### 2단계: 깊이별 스타일 적용
- **문제점**: HTML 표준 구조에서 깊이별 다른 스타일 적용 필요
- **해결책**: 
  - 불릿 리스트(UL): disc → circle → square 순환
  - 숫자 리스트(OL): decimal → lower-alpha → lower-roman 순환
- **핵심 구현**:
```javascript
function applyStyleByDepth(ul, depth) {
  const bulletStyles = ['disc', 'circle', 'square'];
  const styleIndex = (depth - 1) % 3;
  ul.style.setProperty('list-style-type', bulletStyles[styleIndex], 'important');
}

// OL용 구현
function applyStyleByDepth(ol, depth) {
  const numberStyles = ['decimal', 'lower-alpha', 'lower-roman'];
  const styleIndex = (depth - 1) % 3;
  ol.style.setProperty('list-style-type', numberStyles[styleIndex], 'important');
}
```

### 3단계: 들여쓰기/내어쓰기 구현
- **문제점**: 기본 `execCommand('indent')` 사용 시 HTML 표준 위반 구조 생성
- **원래 코드 문제**:
```javascript
document.execCommand('indent', false, null); // 비표준 구조 생성
// <ul><li>아이템</li><ul><li>하위 아이템</li></ul></ul> (잘못된 구조)
```
- **해결책**: DOM 직접 조작으로 표준 구조 생성
```javascript
function indentListItem(li, contentArea) {
  // 이전 형제 LI 찾기
  const prevLi = li.previousElementSibling;
  if (!prevLi) return;
  
  // 이전 LI 내의 UL 찾기 또는 생성
  let targetUl = prevLi.querySelector('ul') || document.createElement('ul');
  prevLi.appendChild(targetUl);
  
  // 현재 LI를 이전 LI의 UL로 이동
  li.parentNode.removeChild(li);
  targetUl.appendChild(li);
}
// <ul><li>아이템<ul><li>하위 아이템</li></ul></li></ul> (올바른 구조)
```

### 4단계: 선택 영역 제한 문제 해결
- **문제점**: 전체 문서 내 모든 리스트에 스타일 적용되는 문제
```javascript
// 문제 코드
contentArea.querySelectorAll('ul').forEach(rootUl => {
  applyBulletStyles(rootUl);
});
```
- **해결책**: 선택된 리스트만 처리하도록 변경
```javascript
const targetUl = findTargetUl(contentArea, savedRange, ulsBefore);
if (targetUl) {
  applyBulletStyles(targetUl);
}
```

### 5단계: 코드 리팩토링
- **개선사항**:
  - PluginUtil 활용하여 공통 함수 사용
  - CSS 클래스 및 인라인 스타일 병행 적용
  - 이벤트 처리 최적화(throttle, debounce 활용)

## 주요 성과
1. HTML 표준을 준수하는 리스트 구조 구현
2. 선택 영역에만 영향을 주는 격리된 처리
3. 깊이별 스타일 자동 순환 적용
4. Tab/Shift+Tab을 통한 직관적인 들여쓰기/내어쓰기
5. 코드 재사용성 향상 및 유지보수 용이성 개선

## 남은 과제
- 브라우저 호환성 테스트
- 혼합 리스트(UL/OL) 중첩 처리 개선
- 성능 최적화 및 대규모 문서 처리 효율성 향상
