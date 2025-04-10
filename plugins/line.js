/**
 * LiteEditor line Plugin
 * 라인 삽입 플러그인
 */

(function() {
    /**
     * 안전하게 Selection 객체 가져오기
     * @returns {Selection|null} Selection 객체 또는 null
     */
    function getSafeSelection() {
        try {
            return window.getSelection();
        } catch (e) {
            console.warn('Selection 객체를 가져오는 중 오류 발생:', e);
            return null;
        }
    }
    
    /**
     * 현재 커서 위치에 가로선(HR 태그)을 삽입하는 함수
     * @param {Element} contentArea - 에디터의 편집 가능한 영역
     */
    function insertLine(contentArea) {
        try {
            // 에디터에 포커스 설정
            contentArea.focus();
            
            // 선택 영역 가져오기
            const selection = getSafeSelection();
            if (!selection || selection.rangeCount === 0) {
                // Selection 객체를 가져올 수 없는 경우 간단히 처리
                insertHRWithParagraph(contentArea);
                return;
            }
            
            let range = selection.getRangeAt(0);
            
            // 현재 블록 요소 찾기
            let node = range.startContainer;
            let block = node;
            
            // 텍스트 노드인 경우 부모 노드 찾기
            if (node.nodeType === Node.TEXT_NODE) {
                block = node.parentNode;
            }
            
            // contentArea까지 올라가면서 가장 가까운 블록 요소 찾기
            while (block !== contentArea && !isBlockElement(block)) {
                block = block.parentNode;
            }
            
            // 커서 위치가 블록의 시작인지 확인
            const isAtStart = isAtStartOfBlock(range);
            
            if (block === contentArea) {
                // contentArea 자체인 경우 간단히 처리
                insertHRWithParagraph(contentArea);
            } else {
                if (isAtStart) {
                    // 블록 시작 위치인 경우 블록 앞에 HR 삽입
                    contentArea.insertBefore(createHR(), block);
                    
                    // 빈 단락 생성 및 삽입
                    const p = createEmptyParagraph();
                    contentArea.insertBefore(p, block);
                    
                    // 커서를 빈 단락으로 이동
                    moveCursorTo(p, 0);
                } else {
                    // 블록 중간이나 끝인 경우 현재 블록을 분할
                    splitBlockAndInsertHR(contentArea, block, range);
                }
            }
            
            // 변경 이벤트 발생
            contentArea.dispatchEvent(new Event('input', { bubbles: true }));
        } catch (e) {
            console.error('HR 태그 삽입 중 오류:', e);
            // 오류 발생 시 간단히 처리
            try {
                const hr = createHR();
                contentArea.appendChild(hr);
                
                const p = createEmptyParagraph();
                contentArea.appendChild(p);
                
                contentArea.focus();
            } catch (innerError) {
                console.error('복구 시도 중 추가 오류:', innerError);
            }
        }
    }
    
    /**
     * 요소가 블록 레벨 요소인지 확인
     * @param {Element} element - 확인할 요소
     * @returns {boolean} - 블록 요소 여부
     */
    function isBlockElement(element) {
        if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
        
        const blockTags = ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'PRE'];
        return blockTags.includes(element.nodeName);
    }
    
    /**
     * 커서가 블록의 시작 위치에 있는지 확인
     * @param {Range} range - 선택 범위
     * @returns {boolean} - 시작 위치 여부
     */
    function isAtStartOfBlock(range) {
        if (!range) return false;
        
        if (range.startOffset > 0) return false;
        
        const node = range.startContainer;
        if (node.nodeType === Node.TEXT_NODE) {
            // 텍스트 노드면 이전 형제 노드가 없어야 시작 위치로 판단
            let prevNode = node.previousSibling;
            while (prevNode) {
                if (prevNode.textContent.trim() !== '') return false;
                prevNode = prevNode.previousSibling;
            }
            return true;
        }
        
        return range.startOffset === 0;
    }
    
    /**
     * HR 요소 생성
     * @returns {HTMLElement} HR 요소
     */
    function createHR() {
        const hr = document.createElement('hr');
        hr.style.margin = '5px 0 0 0';
        hr.style.border = 'none';
        hr.style.borderTop = '1px solid #c9c9c9';
        hr.style.height = '1px';
        return hr;
    }
    
    /**
     * 빈 단락 생성
     * @returns {HTMLElement} P 요소
     */
    function createEmptyParagraph() {
        const p = document.createElement('p');
        p.innerHTML = '<br>';
        p.style.margin = '0';
        return p;
    }
    
    /**
     * contentArea에 바로 HR과 단락 삽입
     * @param {Element} contentArea - 에디터 영역
     */
    function insertHRWithParagraph(contentArea) {
        // HR 요소 생성 및 삽입
        const hr = createHR();
        contentArea.appendChild(hr);
        
        // 빈 단락 생성 및 삽입
        const p = createEmptyParagraph();
        contentArea.appendChild(p);
        
        // 커서를 빈 단락으로 이동
        moveCursorTo(p, 0);
    }
    
    /**
     * 블록을 분할하고 그 사이에 HR 삽입
     * @param {Element} contentArea - 에디터 영역
     * @param {Element} block - 분할할 블록 요소
     * @param {Range} range - 현재 선택 범위
     */
    function splitBlockAndInsertHR(contentArea, block, range) {
        // 블록의 내용을 클론해서 새 블록 생성
        const newBlock = block.cloneNode(false);
        
        // 범위 기준으로 새 블록으로 이동할 노드들 추출
        const fragment = range.extractContents();
        
        // 추출된 노드가 없으면 빈 BR 추가
        if (!fragment.firstChild) {
            newBlock.innerHTML = '<br>';
        } else {
            newBlock.appendChild(fragment);
        }
        
        // 원래 블록이 비어있으면 BR 추가
        if (!block.firstChild) {
            block.innerHTML = '<br>';
        }
        
        // HR 요소 생성
        const hr = createHR();
        
        // DOM에 삽입: 원래 블록 -> HR -> 새 블록
        if (block.nextSibling) {
            contentArea.insertBefore(hr, block.nextSibling);
            contentArea.insertBefore(newBlock, hr.nextSibling);
        } else {
            contentArea.appendChild(hr);
            contentArea.appendChild(newBlock);
        }
        
        // 커서를 새 블록의 시작 위치로 이동
        moveCursorTo(newBlock, 0);
    }
    
    /**
     * 커서를 지정된 노드의 위치로 이동
     * @param {Node} node - 커서를 위치시킬 노드
     * @param {number} offset - 오프셋 위치
     */
    function moveCursorTo(node, offset) {
        try {
            const selection = getSafeSelection();
            if (!selection) return;
            
            const range = document.createRange();
            
            range.setStart(node, offset);
            range.collapse(true);
            
            selection.removeAllRanges();
            selection.addRange(range);
        } catch (e) {
            console.warn('커서 이동 중 오류:', e);
        }
    }

    // 플러그인 등록
    LiteEditor.registerPlugin('line', {
        title: 'Insert Line',
        icon: 'drag_handle', 
        customRender: function(toolbar, contentArea) {
            // 버튼 생성
            const lineButton = document.createElement('button');
            lineButton.className = 'lite-editor-button lite-editor-line-button';
            lineButton.setAttribute('title', 'Insert Line');

            // 아이콘 추가
            const lineIcon = document.createElement('i');
            lineIcon.className = 'material-icons';
            lineIcon.textContent = 'drag_handle';
            lineButton.appendChild(lineIcon);
            
            // 클릭 이벤트 추가
            lineButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                insertLine(contentArea);
            });
            
            // 버튼을 툴바에 추가
            toolbar.appendChild(lineButton);
        }
    });
})();


