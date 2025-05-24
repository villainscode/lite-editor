/**
 * LiteEditor line Plugin
 * 라인 삽입 플러그인
 */

(function() {
    // PluginUtil 참조
    const util = window.PluginUtil;
    
    // 스타일 요소 생성 및 추가 - PluginUtil 사용
    util.styles.addInlineStyle('lite-editor-line-style', `
        .lite-editor-hr {
            display: block;
            height: 1px;
            border: 0;
            border-top: 1px solid #c9c9c9;
            margin: 5px 0;
            padding: 0;
        }
    `);
    
    /**
     * 현재 커서 위치에 가로선(HR 태그)을 삽입하는 함수
     * @param {Element} contentArea - 에디터의 편집 가능한 영역
     */
    function insertLine(contentArea) {
        // 에디터에 포커스 설정
        contentArea.focus();
        
        // 선택 영역 가져오기 - PluginUtil 사용
        const selection = util.selection.getSafeSelection();
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
        while (block !== contentArea && !util.dom.isBlockElement(block)) {
            block = block.parentNode;
        }
        
        // 커서 위치가 블록의 시작인지 확인 - PluginUtil 사용
        const isAtStart = util.selection.isAtStartOfBlock(range);
        
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
                
                // 커서를 빈 단락으로 이동 - 개선된 방식
                setTimeout(() => {
                    try {
                util.selection.moveCursorTo(p, 0);
                        p.focus(); // 명시적 포커스 추가
                    } catch (e) {
                        errorHandler.logError('LinePlugin', errorHandler.codes.COMMON.SELECTION_RESTORE, e);
                    }
                }, 0);
            } else {
                // 블록 중간이나 끝인 경우 현재 블록을 분할
                splitBlockAndInsertHR(contentArea, block, range);
            }
        }
        
        // 변경 이벤트 발생
        util.editor.dispatchEditorEvent(contentArea);
    }
    
    /**
     * HR 요소 생성 - PluginUtil 사용
     * @returns {HTMLElement} HR 요소
     */
    function createHR() {
        return util.dom.createElement('hr', {
            className: 'lite-editor-hr'
        });
    }
    
    /**
     * 빈 단락 생성 - PluginUtil 사용
     * @returns {HTMLElement} P 요소
     */
    function createEmptyParagraph() {
        return util.dom.createElement('p', {
            innerHTML: '<br>',
            'data-editor-element': 'true'
        }, {
            margin: '0'
        });
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
        
        // 커서를 빈 단락으로 이동 - 개선된 방식
        setTimeout(() => {
            try {
        util.selection.moveCursorTo(p, 0);
                p.focus(); // 명시적 포커스 추가
            } catch (e) {
                errorHandler.logError('LinePlugin', errorHandler.codes.COMMON.SELECTION_RESTORE, e);
            }
        }, 0);
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
        
        // 커서를 새 블록의 시작 위치로 이동 - PluginUtil 사용
        util.selection.moveCursorTo(newBlock, 0);
    }

    /**
     * 라인 버튼 렌더링 함수 - PluginUtil 사용
     * @param {Element} toolbar - 툴바 요소
     * @param {Element} contentArea - 에디터 요소
     * @returns {HTMLElement} 생성된 버튼 요소
     */
    function renderLineButton(toolbar, contentArea) {
        // 버튼 생성
        const lineButton = util.dom.createElement('button', {
            className: 'lite-editor-button lite-editor-line-button',
            title: 'Insert Line'
        });

        // 아이콘 추가
        const lineIcon = util.dom.createElement('i', {
            className: 'material-icons',
            textContent: 'horizontal_rule'
        });
        lineButton.appendChild(lineIcon);
        
        // 클릭 이벤트 추가
        lineButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            insertLine(contentArea);
        });
        
        return lineButton;
    }

    // 플러그인 등록
    LiteEditor.registerPlugin('line', {
        title: 'Insert Line',
        icon: 'horizontal_rule', 
        customRender: renderLineButton,
        init: function(editor) {
            // 에디터 영역에 속성 추가하여 자동완성 기능과의 충돌 방지
            editor.contentArea.setAttribute('data-no-completion', 'true');
        }
    });
    
    document.addEventListener('keydown', function(e) {
        // Alt+H 테스트
        if ((e.key.toLowerCase() === 'h' || e.key === 'ㅗ') && e.altKey && !e.ctrlKey && !e.shiftKey) {
            try {
                insertLine(document.querySelector('[contenteditable="true"]'));
            } catch (err) {
                errorHandler.logError('LINE', 'P1007', err);
                errorHandler.showUserAlert('P1007', `수평선 삽입 실패: ${err.message}`);
            }
            e.preventDefault();
        }
    }, false);
})();