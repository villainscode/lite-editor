# LiteEditor 이미지 업로드 플러그인 완벽 구현 가이드

## 📋 개요

LiteEditor의 이미지 업로드 플러그인 구현 문서입니다. 이 문서만으로 처음부터 완전한 이미지 업로드 기능을 구현할 수 있도록 모든 세부사항을 포함합니다.

### 주요 기능
- ✅ **이미지 업로드**: URL 입력 방식 + 파일 업로드 방식
- ✅ **스크롤 위치 고정**: 이미지 삽입 시 스크롤 점프 방지
- ✅ **이미지 리사이징**: 우하단 핸들로 크기 조절
- ✅ **이미지 선택 및 이동**: 클릭 선택 + 드래그 앤 드롭 이동
- ✅ **완전한 UI/UX**: 모달, 애니메이션, 키보드 단축키

## 🚨 핵심 문제 및 해결책

### 1. 스크롤 점프 문제
**문제**: `document.execCommand('insertHTML')`이 실행되면 브라우저가 자동으로 삽입 위치로 스크롤 이동

**해결책**: 다단계 스크롤 위치 보존 시스템
```javascript
// 1. 스크롤 위치 저장
const scrollPositions = {
    editor: editor.scrollTop,
    window: window.pageYOffset,
    body: document.body.scrollTop,
    documentElement: document.documentElement.scrollTop
};

// 2. 다단계 복원 (즉시 + 애니메이션 프레임 + 타이머)
function restoreAllScrollPositions(positions) {
    // 즉시 복원
    editor.scrollTop = positions.editor;
    window.scrollTo(0, positions.window);
    
    // 애니메이션 프레임 후 재복원
    requestAnimationFrame(() => {
        editor.scrollTop = positions.editor;
        window.scrollTo(0, positions.window);
    });
    
    // 타이머로 안전장치
    setTimeout(() => {
        editor.scrollTop = positions.editor;
        window.scrollTo(0, positions.window);
    }, 50);
}
```

### 2. 에디터 요소 타겟팅 문제
**문제**: `#lite-editor`는 툴바를 포함한 컨테이너, 실제 편집 영역은 `.lite-editor-content`

**해결책**: 올바른 편집 영역 타겟팅
```javascript
// ❌ 잘못된 방법
const editor = document.querySelector('#lite-editor'); 

// ✅ 올바른 방법
const editor = document.querySelector('.lite-editor-content');
```

### 3. Selection 범위 보존 문제
**문제**: 모달 표시 중 커서 위치가 손실됨

**해결책**: PluginUtil을 사용한 Selection 저장/복원
```javascript
// 모달 생성 시 저장
savedRange = util.selection.saveSelection();

// 이미지 삽입 시 복원 후 삽입
util.selection.restoreSelection(savedRange);
const success = document.execCommand('insertHTML', false, imageHTML);
```

## 🏗️ 완전한 구현 코드

### 메인 플러그인 구조
```javascript
(function() {
    const util = window.PluginUtil || {};
    const PLUGIN_ID = 'imageUpload';
    
    // 전역 변수
    let isEventHandlerRegistered = false;
    let savedRange = null;
    
    // 핵심 기능들...
})();
```

### 1. 스크롤 관리자 (editorScrollManager)
```javascript
const editorScrollManager = {
    saveScrollPosition() {
        const editor = document.querySelector('#lite-editor');
        const editorContent = document.querySelector('.lite-editor-content');
        
        // 실제 스크롤 컨테이너 찾기
        let scrollContainer = null;
        let scrollTop = 0;
        
        if (editorContent && editorContent.scrollTop > 0) {
            scrollContainer = editorContent;
            scrollTop = editorContent.scrollTop;
        } else if (editor && editor.scrollTop > 0) {
            scrollContainer = editor;
            scrollTop = editor.scrollTop;
        } else {
            // 스크롤이 0이어도 높이가 있는 컨테이너 찾기
            if (editorContent && editorContent.scrollHeight > editorContent.clientHeight) {
                scrollContainer = editorContent;
                scrollTop = editorContent.scrollTop;
            } else if (editor && editor.scrollHeight > editor.clientHeight) {
                scrollContainer = editor;
                scrollTop = editor.scrollTop;
            }
        }
        
        return {
            scrollTop: scrollTop,
            container: scrollContainer,
            timestamp: Date.now()
        };
    },
    
    restoreScrollPosition(savedPosition, delay = 0) {
        if (!savedPosition) return;
        
        const restoreScroll = () => {
            let targetContainer = savedPosition.container;
            
            if (!targetContainer) {
                const editor = document.querySelector('#lite-editor');
                const editorContent = document.querySelector('.lite-editor-content');
                targetContainer = editorContent || editor;
            }
            
            if (targetContainer) {
                targetContainer.scrollTop = savedPosition.scrollTop;
            }
        };
        
        if (delay > 0) {
            setTimeout(restoreScroll, delay);
        } else {
            restoreScroll();
            requestAnimationFrame(restoreScroll);
        }
    }
};
```

### 2. 완전한 이미지 컨테이너 생성
```javascript
function insertImage(src) {
    if (!src) return;
    
    const editor = document.querySelector('.lite-editor-content');
    if (!editor) return;
    
    // 스크롤 위치 저장
    const scrollPositions = {
        editor: editor.scrollTop,
        window: window.pageYOffset,
        body: document.body.scrollTop,
        documentElement: document.documentElement.scrollTop
    };
    
    // 완전한 이미지 컨테이너 HTML
    const timestamp = Date.now();
    const imageHTML = `
        <div class="image-wrapper" 
             contenteditable="false" 
             draggable="true" 
             id="img-${timestamp}"
             data-selectable="true"
             style="display: inline-block; position: relative; margin: 10px 0; max-width: 95%; resize: both; overflow: hidden;">
            <img src="${src}" 
                 style="width: 100%; height: auto; display: block;">
            <div class="image-resize-handle" 
                 style="position: absolute; right: 0; bottom: 0; width: 10px; height: 10px; background-image: linear-gradient(135deg, transparent 50%, #4285f4 50%, #4285f4 100%); cursor: nwse-resize; z-index: 10;"></div>
        </div><br>`;
    
    // 저장된 선택 영역 복원 후 삽입
    if (savedRange) {
        try {
            util.selection.restoreSelection(savedRange);
            
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const isInsideEditor = editor.contains(range.startContainer);
                
                if (isInsideEditor) {
                    const success = document.execCommand('insertHTML', false, imageHTML);
                    if (success) {
                        restoreAllScrollPositions(scrollPositions);
                        const event = new Event('input', { bubbles: true });
                        editor.dispatchEvent(event);
                        return;
                    }
                }
            }
        } catch (error) {
            console.error('선택 영역 복원 실패:', error);
        }
    }
    
    // 대안: 에디터 끝에 삽입
    editor.insertAdjacentHTML('beforeend', imageHTML);
    restoreAllScrollPositions(scrollPositions);
    
    const event = new Event('input', { bubbles: true });
    editor.dispatchEvent(event);
    
    // 스크롤 복원 함수
    function restoreAllScrollPositions(positions) {
        // 즉시 복원
        editor.scrollTop = positions.editor;
        window.scrollTo(0, positions.window);
        document.body.scrollTop = positions.body;
        document.documentElement.scrollTop = positions.documentElement;
        
        // 애니메이션 프레임 후 재복원
        requestAnimationFrame(() => {
            editor.scrollTop = positions.editor;
            window.scrollTo(0, positions.window);
        });
        
        // 50ms 후 재복원
        setTimeout(() => {
            editor.scrollTop = positions.editor;
            window.scrollTo(0, positions.window);
        }, 50);
        
        // 100ms 후 재복원
        setTimeout(() => {
            editor.scrollTop = positions.editor;
            window.scrollTo(0, positions.window);
        }, 100);
    }
}
```

### 3. 모달 UI 템플릿
```javascript
const template = `
<div class="modal-overlay">
    <div class="modal-content">            
        <div>
            <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #333;">Insert Image</h3>
            
            <!-- URL 입력 -->
            <div style="margin-bottom: 10px;">
                <label style="display: block; font-size: 13px; font-weight: 500; color: #666; margin-bottom: 4px;">
                URL
                </label>
                <input type="url" 
                       id="image-url-input"
                       placeholder="https://" 
                       style="width: 100%; padding: 6px 8px; font-size: 13px; border: 1px solid #ccc; border-radius: 4px; outline: none;">
            </div>
            
            <!-- 구분선 -->
            <div style="display: flex; align-items: center; margin: 15px 0;">
                <div style="font-size: 11px; color: #888; margin-right: 8px;">OR</div>
                <div style="flex-grow: 1; height: 1px; background-color: #e0e0e0;"></div>
            </div>

            <!-- 파일 업로드 -->
            <div style="margin-bottom: 10px;">
                <label style="display: block; font-size: 13px; font-weight: 500; color: #666; margin-bottom: 4px;">
                 File
                </label>
                <div style="display: flex; align-items: center; justify-content: center; width: 100%;">
                    <label style="width: 100%; display: flex; flex-direction: column; align-items: center; padding: 10px; background-color: #f8f9fa; color: #666; border-radius: 4px; border: 1px dashed #ccc; cursor: pointer;">
                        <span class="material-icons" style="font-size: 20px; margin-bottom: 4px;">add_photo_alternate</span>
                        <span style="font-size: 12px;">Select a File</span>
                        <input type="file" id="image-file-input" style="display: none;" accept="image/*">
                    </label>
                </div>
            </div>
        </div>
        
        <!-- 버튼 -->
        <div style="display: flex; justify-content: flex-end;">
            <button type="button" data-action="close"
                    style="display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; margin-right: 8px; border-radius: 4px; border: none; background-color: transparent; cursor: pointer;"
                    title="Cancel">
                <span class="material-icons" style="font-size: 18px; color: #5f6368;">close</span>
            </button>
            <button type="submit"
                    style="display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 4px; border: none; background-color: transparent; cursor: pointer;"
                    title="Insert">
                <span class="material-icons" style="font-size: 18px; color: #5f6368;">add_circle</span>
            </button>
        </div>
    </div>
</div>`;
```

### 4. 드래그 앤 드롭 기능
```javascript
function initImageDragDrop() {
    const editor = document.querySelector('#lite-editor');
    if (!editor) return;

    let draggedImage = null;
    let dropIndicator = null;
    let selectedImage = null;
    let animationFrameId = null;

    // 드롭 인디케이터 생성
    function createDropIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'image-drop-indicator';
        indicator.style.position = 'absolute';
        indicator.style.width = '2px';
        indicator.style.height = '20px';
        indicator.style.backgroundColor = '#4285f4';
        indicator.style.zIndex = '9999';
        indicator.style.pointerEvents = 'none';
        indicator.style.animation = 'cursorBlink 1s infinite';
        indicator.style.display = 'none';
        
        editor.appendChild(indicator);
        return indicator;
    }

    // 드롭 인디케이터 표시
    function showDropIndicator(x, y) {
        if (!dropIndicator) {
            dropIndicator = createDropIndicator();
        }

        let range = document.caretRangeFromPoint(x, y);
        if (!range) return;

        const rects = range.getClientRects();
        if (!rects.length || rects.length === 0) {
            const tempSpan = document.createElement('span');
            tempSpan.style.display = 'inline-block';
            tempSpan.style.width = '0';
            tempSpan.style.height = '1em';
            tempSpan.textContent = '\u200B';
            
            range.insertNode(tempSpan);
            
            const tempRect = tempSpan.getBoundingClientRect();
            const editorRect = editor.getBoundingClientRect();
            dropIndicator.style.left = (tempRect.left - editorRect.left) + 'px';
            dropIndicator.style.top = (tempRect.top - editorRect.top) + 'px';
            dropIndicator.style.height = tempRect.height + 'px';
            
            tempSpan.parentNode.removeChild(tempSpan);
        } else {
            const rect = rects[0];
            const editorRect = editor.getBoundingClientRect();
            
            dropIndicator.style.left = (rect.left - editorRect.left) + 'px';
            dropIndicator.style.top = (rect.top - editorRect.top) + 'px';
            dropIndicator.style.height = rect.height + 'px';
        }
        
        dropIndicator.style.display = 'block';
    }

    // 이미지 선택
    function selectImage(imageWrapper) {
        if (selectedImage && selectedImage !== imageWrapper) {
            selectedImage.removeAttribute('data-selected');
        }
        
        selectedImage = imageWrapper;
        selectedImage.setAttribute('data-selected', 'true');
    }

    // 이벤트 리스너들
    editor.addEventListener('click', (event) => {
        const imageWrapper = findClosestElement(event.target, '.image-wrapper');
        
        if (!imageWrapper) {
            deselectImage();
            return;
        }
        
        selectImage(imageWrapper);
        event.stopPropagation();
    });

    editor.addEventListener('dragstart', (event) => {
        const imageWrapper = findClosestElement(event.target, '.image-wrapper');
        if (!imageWrapper) return;

        draggedImage = imageWrapper;
        selectImage(imageWrapper);
        
        event.dataTransfer.setData('text/plain', imageWrapper.id);
        event.dataTransfer.effectAllowed = 'move';
        
        setTimeout(() => {
            imageWrapper.classList.add('dragging');
        }, 0);
    });

    editor.addEventListener('drop', (event) => {
        event.preventDefault();
        event.stopPropagation();
        
        hideDropIndicator();
        
        if (!draggedImage) return;
        
        // 드롭 시에도 스크롤 위치 보존
        const scrollPosition = editorScrollManager.saveScrollPosition();
        
        let range = document.caretRangeFromPoint(event.clientX, event.clientY);
        
        if (range) {
            if (draggedImage.parentNode) {
                draggedImage.parentNode.removeChild(draggedImage);
            }
            
            range.insertNode(draggedImage);
            draggedImage.classList.remove('dragging');
            
            // br 태그 추가
            if (!draggedImage.nextSibling || 
                (draggedImage.nextSibling.nodeType !== Node.ELEMENT_NODE || 
                 draggedImage.nextSibling.nodeName !== 'BR')) {
                const br = document.createElement('br');
                draggedImage.parentNode.insertBefore(br, draggedImage.nextSibling);
            }
            
            // 스크롤 위치 복원
            editorScrollManager.restoreScrollPosition(scrollPosition);
            
            const event = new Event('input', { bubbles: true });
            editor.dispatchEvent(event);
        }
        
        draggedImage = null;
    });
}
```

### 5. CSS 스타일
```css
.image-wrapper {
    transition: opacity 0.2s ease, outline 0.2s ease;
    cursor: move;
}

.image-wrapper:hover {
    outline: 1px solid rgba(66, 133, 244, 0.3);
}

.image-wrapper[data-selected="true"] {
    outline: 2px solid #4285f4;
}

.image-wrapper.dragging {
    opacity: 0.5;
    outline: 2px dashed #4285f4;
}

@keyframes cursorBlink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
}
```

## 🔧 핵심 기술 포인트

### 1. Selection 관리
```javascript
// 저장
savedRange = util.selection.saveSelection();

// 복원
util.selection.restoreSelection(savedRange);
```

### 2. execCommand vs insertAdjacentHTML
```javascript
// ✅ execCommand - 커서 위치에 정확히 삽입
document.execCommand('insertHTML', false, imageHTML);

// ❌ insertAdjacentHTML - 에디터 끝에만 삽입
editor.insertAdjacentHTML('beforeend', imageHTML);
```

### 3. 스크롤 복원 타이밍
```javascript
// 즉시 + 애니메이션 프레임 + 타이머를 모두 사용해야 안정적
restoreScroll(); // 즉시
requestAnimationFrame(restoreScroll); // 다음 프레임
setTimeout(restoreScroll, 50); // 안전장치
```

### 4. 이미지 컨테이너 구조
```html
<div class="image-wrapper" contenteditable="false" draggable="true" data-selectable="true">
    <img src="..." style="width: 100%; height: auto; display: block;">
    <div class="image-resize-handle" style="..."></div>
</div><br>
```

## 🎯 사용법

### 1. 플러그인 등록
```javascript
LiteEditor.registerPlugin('imageUpload', {
    title: 'Image upload',
    icon: 'photo_camera',
    customRender: function(toolbar, contentArea) {
        // CSS 로드
        util.styles.loadCssFile('imageUploadStyles', 'css/plugins/imageUpload.css');
        
        // 드래그앤드롭 스타일 추가
        addDragAndDropStyles();
        
        // 드래그앤드롭 초기화
        setTimeout(initImageDragDrop, 500);
        
        // 버튼 생성
        const button = util.dom.createElement('button', {
            className: 'lite-editor-button lite-editor-image-upload-button',
            title: 'Image upload'
        });
        
        button.addEventListener('click', showModal);
        toolbar.appendChild(button);
    }
});
```

### 2. 사용자 인터랙션
1. **이미지 업로드**: 툴바 카메라 아이콘 클릭
2. **URL 입력**: 모달에서 URL 입력 후 Enter 또는 추가 버튼
3. **파일 선택**: 파일 선택 영역 클릭하여 파일 업로드
4. **이미지 선택**: 삽입된 이미지 클릭
5. **이미지 이동**: 이미지를 드래그해서 원하는 위치로 이동
6. **이미지 리사이징**: 이미지 우하단 핸들로 크기 조절

## 🚀 최적화 포인트

### 1. 성능 최적화
- `requestAnimationFrame`을 사용한 부드러운 애니메이션
- `throttle`을 적용한 드래그 이벤트 처리
- 이벤트 위임을 통한 메모리 효율성

### 2. 브라우저 호환성
- `document.caretRangeFromPoint` + `document.caretPositionFromPoint` 폴백
- CSS 트랜지션 및 애니메이션 지원
- 다양한 스크롤 컨테이너 대응

### 3. 사용자 경험
- ESC 키로 모달 닫기
- 외부 클릭으로 모달 닫기
- 드래그 시 시각적 피드백
- 즉각적인 스크롤 위치 복원

## 🐛 디버깅 가이드

### 1. 스크롤 점프 문제
```javascript
// 디버깅 로그 확인
console.log('[SCROLL DEBUG] 스크롤 저장:', scrollPositions);
console.log('[DEBUG] 스크롤 복원 완료');
```

### 2. 이미지 삽입 실패
```javascript
// 에디터 요소 확인
const editor = document.querySelector('.lite-editor-content');
console.log('[DEBUG] 에디터:', editor);

// execCommand 결과 확인
const success = document.execCommand('insertHTML', false, imageHTML);
console.log('[DEBUG] execCommand 결과:', success);
```

### 3. Selection 문제
```javascript
// 선택 영역 상태 확인
console.log('[DEBUG] 저장된 선택 영역:', savedRange);
console.log('[DEBUG] 복원된 Range:', selection.getRangeAt(0));
```

## 📁 파일 구조
js/plugins/
├── imageUpload.js # 메인 플러그인 파일
css/plugins/
├── imageUpload.css # 스타일 파일
docs/
├── 20250524-imageupload.md # 이 문서

이 문서를 기반으로 완전한 이미지 업로드 플러그인을 처음부터 구현할 수 있습니다.