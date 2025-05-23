# Lite Editor Worklog - 2025.01.24

## 개요

Lite Editor의 align.js 플러그인에서 스크롤 위치 보존 기능 추가 및 선택 영역 관련 심각한 버그 수정 작업을 진행했습니다. 초기 스크롤 문제 해결 과정에서 더 치명적인 드래그 선택 방해 문제가 발생했으며, 이를 해결하는 과정에서 정렬 기능 자체의 동작 문제와 선택 영역 보존 문제까지 연쇄적으로 발생했습니다. 이 문서는 동일한 실수를 반복하지 않기 위한 완전한 해결 가이드입니다.

## 문제 발생 순서 및 해결 과정

### 1. 초기 문제: 스크롤 위치 이동 버그

**문제**: align 아이콘 클릭 시 스크롤이 제일 위로 올라가는 현상
**원인**: `selection.addRange()` 호출 시 브라우저가 자동으로 해당 위치로 스크롤 이동
**해결**: `util.scroll.savePosition()` / `util.scroll.restorePosition()` 적용

### 2. 치명적 문제 발생: 드래그 선택 방해

**문제**: 여러 라인에 걸쳐 마우스로 드래그 선택이 끊기거나 불가능해짐
**원인**: 과도한 디버깅 장치와 전역 이벤트 리스너들이 사용자의 자연스러운 드래그 동작을 방해

#### 2.1 문제가 된 코드들 (절대 추가하면 안됨)

```javascript
// ❌ 전역 선택 변경 가로채기 - 드래그 선택 방해
document.addEventListener('selectionchange', () => {
  // 연속 이벤트 방지를 위한 디바운싱
  if (selectionSaveTimeout) {
    clearTimeout(selectionSaveTimeout);
  }
  
  selectionSaveTimeout = setTimeout(() => {
    const normalizedRange = normalizeSelectionRange(); // 선택 영역 강제 변경!
    if (normalizedRange && normalizedRange.toString().trim().length > 0) {
      savedRange = normalizedRange; // 사용자 선택을 덮어씀!
    }
  }, 100);
});

// ❌ 에디터 영역 마우스 이벤트 가로채기 - 드래그 방해
contentArea.addEventListener('mousedown', () => {
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    savedRange = selection.getRangeAt(0).cloneRange(); // 사용자 선택 강제 저장
  }
});

// ❌ 전역 객체 - 다른 플러그인과 충돌 가능성
if (!window.liteEditorSelection) {
  window.liteEditorSelection = {
    save: function() { /* ... */ },
    restore: function() { /* ... */ }
  };
}

// ❌ 선택 영역 강제 변경 함수 - 사용자 의도와 다를 수 있음
function normalizeSelectionRange() {
  // 줄바꿈이 포함된 경우 Range를 줄바꿈 전까지로 제한
  // 이 로직이 여러 라인 선택을 방해함
}
```

### 3. 정렬 기능 동작 불가 문제

**문제**: 선택 영역 지정 후 align 버튼 클릭 시 정렬이 적용되지 않음
**원인**: 버튼 클릭으로 인해 선택이 해제된 후 `normalizeAndSaveSelection()`이 빈 선택을 찾으려 함

#### 3.1 잘못된 로직
```javascript
// ❌ 정렬 버튼 클릭 시 다시 선택 찾기 시도
alignBtn.addEventListener('click', (e) => {
  if (normalizeAndSaveSelection()) { // 이미 선택이 해제된 상태!
    applyAlignment(option.align, contentArea);
  }
});
```

#### 3.2 올바른 로직
```javascript
// ✅ 미리 저장된 선택 영역 사용
alignButton.addEventListener('mousedown', (e) => {
  saveSelectionWithNormalization(); // 버튼 클릭 전에 미리 저장
});

alignBtn.addEventListener('click', (e) => {
  if (savedRange && savedRange.toString().trim().length > 0) { // 저장된 것 사용
    applyAlignment(option.align, contentArea);
  }
});
```

### 4. 정렬 후 선택 영역 해제 문제

**문제**: 정렬 적용 후 선택된 텍스트가 블록 해제됨
**원인**: 이벤트 실행 순서와 `util.scroll.restorePosition()` 함수가 선택을 방해

#### 4.1 문제가 된 순서
```javascript
// ❌ 잘못된 순서
alignBtn.addEventListener('click', (e) => {
  applyAlignment(option.align, contentArea); // 1. 선택 설정
  dropdownMenu.classList.remove('show');     // 2. 드롭다운 닫기 (포커스 변경)
  util.scroll.restorePosition();             // 3. 스크롤 복원 (선택 해제!)
});
```

#### 4.2 올바른 순서
```javascript
// ✅ 올바른 순서
alignBtn.addEventListener('click', (e) => {
  // 1. 먼저 드롭다운 닫기
  dropdownMenu.classList.remove('show');
  dropdownMenu.style.display = 'none';
  alignButton.classList.remove('active');
  isDropdownOpen = false;
  util.activeModalManager.unregister(dropdownMenu);
  
  // 2. 모든 처리 완료 후 정렬 적용 (setTimeout으로 지연)
  setTimeout(() => {
    applyAlignment(option.align, contentArea);
  }, 10);
  
  // 3. util.scroll.restorePosition() 제거 또는 정렬 전에 실행
});
```

## 최종 해결된 코드 구조

### 핵심 함수들

```javascript
// ✅ 간단하고 안전한 선택 저장
function saveSelectionWithNormalization() {
  const selection = window.getSelection();
  if (!selection.rangeCount) return false;
  
  const range = selection.getRangeAt(0);
  if (range.toString().trim().length > 0) {
    savedRange = range.cloneRange();
    return true;
  }
  return false;
}

// ✅ 정확한 정렬 적용 및 선택 복원
function applyAlignment(alignType, contentArea) {
  try {
    if (!savedRange || savedRange.toString().trim().length === 0) {
      throw new Error('No selection to restore');
    }
    
    const alignStyles = {
      'Left': 'left', 'Center': 'center', 
      'Right': 'right', 'Full': 'justify'
    };
    
    const alignValue = alignStyles[alignType];
    if (!alignValue) return;
    
    // 현재 스크롤 위치 저장
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    
    // span으로 감싸서 정확한 범위에만 적용
    const selectedText = savedRange.toString();
    const spanElement = document.createElement('span');
    spanElement.style.display = 'block';
    spanElement.style.textAlign = alignValue;
    spanElement.textContent = selectedText;
    
    // 기존 선택 영역을 새 요소로 교체
    savedRange.deleteContents();
    savedRange.insertNode(spanElement);
    
    // 새로 생성된 span 요소를 선택
    const selection = window.getSelection();
    selection.removeAllRanges();
    
    const newRange = document.createRange();
    newRange.selectNodeContents(spanElement);
    selection.addRange(newRange);
    
    // 새로운 선택 영역을 저장
    savedRange = newRange.cloneRange();
    
    // 스크롤 위치 복원
    if (window.scrollX !== scrollX || window.scrollY !== scrollY) {
      window.scrollTo(scrollX, scrollY);
    }
    
    util.editor.dispatchEditorEvent(contentArea);
    
  } catch (e) {
    errorHandler.logError('AlignPlugin', errorHandler.codes.PLUGINS.ALIGN.APPLY, e);
  }
}
```

### 이벤트 리스너 구조

```javascript
// ✅ align 버튼 mousedown - 선택 영역 미리 저장
alignButton.addEventListener('mousedown', (e) => {
  saveSelectionWithNormalization();
});

// ✅ 정렬 옵션 클릭 - 올바른 순서로 처리
alignBtn.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  
  if (savedRange && savedRange.toString().trim().length > 0) {
    // 1. 먼저 드롭다운 닫기
    dropdownMenu.classList.remove('show');
    dropdownMenu.style.display = 'none';
    alignButton.classList.remove('active');
    isDropdownOpen = false;
    util.activeModalManager.unregister(dropdownMenu);
    
    // 2. 모든 처리 완료 후 정렬 적용
    setTimeout(() => {
      applyAlignment(option.align, contentArea);
    }, 10);
  }
});
```

## 제거해야 할 코드 패턴들

### 1. 전역 이벤트 리스너 (절대 금지)
```javascript
// ❌ 절대 추가하면 안됨
document.addEventListener('selectionchange', () => { /* ... */ });
contentArea.addEventListener('mousedown', () => { /* ... */ });
```

### 2. 전역 객체 생성 (충돌 위험)
```javascript
// ❌ 플러그인별로 전역 객체 생성 금지
window.liteEditorSelection = { /* ... */ };
```

### 3. 과도한 선택 영역 조작 (사용자 의도 방해)
```javascript
// ❌ 사용자 선택을 임의로 변경하는 함수들
function normalizeSelectionRange() { /* 선택 영역 강제 변경 */ }
```

### 4. 잘못된 이벤트 순서
```javascript
// ❌ 선택 설정 후 다른 작업들
applyAlignment(); // 선택 설정
util.scroll.restorePosition(); // 선택 해제 위험!
```

## 디버깅 로그 가이드라인

### 꼭 필요한 로그만 남기기
```javascript
// ✅ 사용자 선택 동작 감지용 (전역에서)
console.log(`[SELECTION] 📌 selectionStart: ${startOffset}, selectionEnd: ${endOffset}`, {
  text: selectedText
});

// ✅ 에러 로그 (필수)
errorHandler.logError('AlignPlugin', errorHandler.codes.PLUGINS.ALIGN.APPLY, e);
```

### 제거해야 할 로그들
```javascript
// ❌ 내부 동작 디버그 로그들 (제거)
errorHandler.colorLog('ALIGN', 'Selection saved', { /* ... */ });
errorHandler.logDebug('CodeBlockPlugin', '코드 블록 삽입', { /* ... */ });
console.log('Valid normalized selection saved:', { /* ... */ });
```

## 테스트 체크리스트

### 필수 테스트 항목
1. **드래그 선택 테스트**
   - [ ] 단일 라인 선택 가능
   - [ ] 여러 라인에 걸친 드래그 선택 가능
   - [ ] 긴 텍스트 드래그 선택 시 끊김 없음

2. **정렬 기능 테스트**
   - [ ] 텍스트 선택 → align 버튼 클릭 → 정렬 옵션 클릭 시 정상 동작
   - [ ] 정렬 적용 후 해당 텍스트가 선택된 상태 유지
   - [ ] 정렬된 텍스트만 영향받고 다른 텍스트는 영향 없음

3. **스크롤 보존 테스트**
   - [ ] align 버튼 클릭 시 스크롤 위치 변경 없음
   - [ ] 정렬 적용 후 스크롤 위치 유지

4. **충돌 테스트**
   - [ ] 다른 플러그인과 동시 사용 시 문제 없음
   - [ ] 브라우저 확장 프로그램과 충돌 없음

## 코드 리뷰 포인트

### 1. 이벤트 리스너 검토
- `document.addEventListener` 사용 시 반드시 필요성 검토
- `contentArea` 이벤트는 정말 필요한 경우만 추가
- 이벤트 전파 방지 (`stopPropagation`) 신중히 사용

### 2. 선택 영역 처리 검토
- 사용자 선택을 임의로 변경하는 코드 금지
- 선택 저장은 사용자 동작 직전에만 수행
- 선택 복원은 정말 필요한 경우에만 수행

### 3. 스크롤 처리 검토
- `util.scroll.restorePosition()` 호출 타이밍 신중히 결정
- 선택 영역 설정과 스크롤 복원의 순서 고려

## 향후 개선 사항

1. **통합 선택 관리자**: 플러그인들 간의 선택 영역 충돌 방지를 위한 중앙 관리 시스템
2. **이벤트 우선순위**: 플러그인 간 이벤트 처리 우선순위 시스템
3. **디버깅 모드**: 개발 시에만 활성화되는 디버깅 로그 시스템
4. **자동 테스트**: 선택 영역 관련 자동 테스트 시스템 구축

## 결론

이번 작업을 통해 align.js의 스크롤 보존 기능을 성공적으로 구현했지만, 과정에서 더 치명적인 드래그 선택 방해 문제가 발생했습니다. 이는 디버깅을 위한 과도한 전역 이벤트 리스너와 선택 영역 조작 코드들이 원인이었습니다. 

**핵심 교훈**: 
1. 전역 이벤트 리스너는 절대 신중히 사용해야 하며, 특히 `selectionchange`와 `mousedown` 이벤트는 사용자의 자연스러운 상호작용을 방해할 수 있음
2. 선택 영역은 사용자의 의도를 최대한 존중하고, 임의로 변경하지 않아야 함
3. 디버깅 코드는 기능 구현 완료 후 반드시 정리해야 함
4. 이벤트 실행 순서는 사용자 경험에 직접적인 영향을 미치므로 신중히 설계해야 함

이 문서를 참고하여 동일한 문제를 반복하지 않고, 안정적이고 사용자 친화적인 에디터 플러그인을 개발할 수 있기를 바랍니다.
