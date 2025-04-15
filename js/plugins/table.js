/**
 * LiteEditor table Plugin
 * 표만들기 플러그인
 */

(function() {
    // 1. 상수 및 변수 선언
    const PLUGIN_ID = 'table';
    const STYLE_ID = 'tablePluginStyles';
    const CSS_PATH = 'css/plugins/table.css';
    const GRID_SIZE = 10; // 그리드 크기 상수화
    const CELL_STYLES = {
        padding: '5px 5px',
        height: '32px',
        border: '1px solid #ccc'
    };
    
    // 테이블 스타일 옵션 (UI 표시용)
    const TABLE_STYLES = [
        { value: 'basic', text: 'Basic table' },
        { value: 'title', text: 'Title column table' },
        { value: 'emphasized', text: 'Emphasized' }
    ];
    
    // 선 스타일 옵션 (UI 표시용)
    const LINE_STYLES = [
        { value: 'border', text: 'border' },
        { value: 'dotted', text: 'dotted line' },
        { value: 'none', text: 'none' }
    ];
    
    let isGridLayerVisible = false;
    let savedRange = null;
    let gridLayer = null;
    
    // 2. 선택 영역 유틸리티
    function saveSelection() {
        const sel = window.getSelection();
        if (sel.rangeCount > 0) {
            savedRange = sel.getRangeAt(0).cloneRange();
        }
    }
    
    function restoreSelection() {
        const sel = window.getSelection();
        sel.removeAllRanges();
        if (savedRange) {
            sel.addRange(savedRange);
        }
    }
    
    // 3. 에디터 상태 업데이트
    function dispatchEditorEvent(editor) {
        editor.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    // 4. 그리드 레이어 스타일 추가
    function addTableStyles() {
        if (document.getElementById(STYLE_ID)) return;
        
        // CSS 파일 로드
        const linkEl = document.createElement('link');
        linkEl.id = STYLE_ID;
        linkEl.rel = 'stylesheet';
        linkEl.type = 'text/css';
        linkEl.href = CSS_PATH;
        document.head.appendChild(linkEl);
    }
    
    // 5. 그리드 레이어 표시/숨김 토글
    function toggleGridLayer(buttonElement) {
        if (isGridLayerVisible) {
            hideGridLayer();
            return;
        }
        
        showGridLayer(buttonElement);
    }
    
    // 6. 그리드 레이어 표시
    function showGridLayer(buttonElement) {
        saveSelection();
        gridLayer = createGridLayer();
        isGridLayerVisible = true;
        
        // 버튼 위치 기준으로 레이어 위치 설정
        const rect = buttonElement.getBoundingClientRect();
        gridLayer.style.top = (rect.bottom + window.scrollY) + 'px';
        gridLayer.style.left = (rect.left + window.scrollX) + 'px';
        
        // 화면 경계 밖으로 나가지 않도록 조정
        setTimeout(() => {
            const layerRect = gridLayer.getBoundingClientRect();
            if (layerRect.right > window.innerWidth) {
                gridLayer.style.left = (window.innerWidth - layerRect.width - 10) + 'px';
            }
        }, 0);
        
        gridLayer.style.display = 'block';
    }
    
    // 7. 그리드 레이어 숨김
    function hideGridLayer() {
        if (gridLayer) {
            gridLayer.style.display = 'none';
        }
        isGridLayerVisible = false;
    }
    
    // 8. 그리드 레이어 생성
    function createGridLayer() {
        // 기존 레이어 삭제
        const existingLayer = document.querySelector('.grid-layer');
        if (existingLayer) existingLayer.remove();
        
        // 새 레이어 생성
        const gridLayer = document.createElement('div');
        gridLayer.className = 'grid-layer';
        
        // 제목 추가
        const title = document.createElement('p');
        title.textContent = `드래그하여 표 크기를 선택하세요 (최대 ${GRID_SIZE}×${GRID_SIZE})`;
        gridLayer.appendChild(title);
        
        // 그리드 테이블과 선택 핸들러 설정
        const { gridTable, getSelectedDimensions } = createGridTable();
        gridLayer.appendChild(gridTable);
        
        // 옵션 영역 추가 (UI만 표시)
        const tableOptions = createTableOptions();
        gridLayer.appendChild(tableOptions);
        
        // 버튼 영역 추가
        const buttonContainer = createButtonContainer();
        gridLayer.appendChild(buttonContainer);
        
        // 삽입 버튼 클릭 이벤트
        const insertButton = buttonContainer.querySelector('button');
        insertButton.addEventListener('click', () => {
            const dimensions = getSelectedDimensions();
            if (dimensions) {
                insertTable(dimensions.rows, dimensions.cols);
                hideGridLayer();
            }
        });
        
        // 외부 이벤트 핸들러 등록
        setupOutsideClickHandler();
        setupEscapeKeyHandler();
        
        document.body.appendChild(gridLayer);
        return gridLayer;
    }
    
    // 9. 그리드 테이블 생성
    function createGridTable() {
        const gridTable = document.createElement('table');
        gridTable.className = 'grid';
        const tbody = document.createElement('tbody');
        
        let isMouseDown = false;
        let startRow = null, startCol = null, endRow = null, endCol = null;
        
        // 그리드 셀 생성
        for (let i = 0; i < GRID_SIZE; i++) {
            const tr = document.createElement('tr');
            for (let j = 0; j < GRID_SIZE; j++) {
                const td = document.createElement('td');
                td.dataset.row = i;
                td.dataset.col = j;
                tr.appendChild(td);
            }
            tbody.appendChild(tr);
        }
        
        gridTable.appendChild(tbody);
        
        // 선택 영역 지우기
        function clearSelection() {
            gridTable.querySelectorAll('td').forEach(cell => {
                cell.classList.remove('selected');
            });
        }
        
        // 선택 영역 강조 표시
        function highlightSelection(sRow, sCol, eRow, eCol) {
            clearSelection();
            const minRow = Math.min(sRow, eRow);
            const maxRow = Math.max(sRow, eRow);
            const minCol = Math.min(sCol, eCol);
            const maxCol = Math.max(sCol, eCol);
            
            gridTable.querySelectorAll('td').forEach(cell => {
                const r = parseInt(cell.dataset.row);
                const c = parseInt(cell.dataset.col);
                if (r >= minRow && r <= maxRow && c >= minCol && c <= maxCol) {
                    cell.classList.add('selected');
                }
            });
        }
        
        // 현재 선택된 영역의 행/열 수 반환
        function getSelectedDimensions() {
            if (startRow === null || startCol === null) return null;
            
            const minRow = Math.min(startRow, endRow !== null ? endRow : startRow);
            const maxRow = Math.max(startRow, endRow !== null ? endRow : startRow);
            const minCol = Math.min(startCol, endCol !== null ? endCol : startCol);
            const maxCol = Math.max(startCol, endCol !== null ? endCol : startCol);
            
            return {
                rows: maxRow - minRow + 1,
                cols: maxCol - minCol + 1
            };
        }
        
        // 마우스 이벤트 핸들러
        tbody.addEventListener('mousedown', e => {
            if (e.target.tagName === 'TD') {
                isMouseDown = true;
                startRow = parseInt(e.target.dataset.row);
                startCol = parseInt(e.target.dataset.col);
                endRow = startRow;
                endCol = startCol;
                highlightSelection(startRow, startCol, startRow, startCol);
            }
            e.preventDefault();
        });
        
        tbody.addEventListener('mouseover', e => {
            if (isMouseDown && e.target.tagName === 'TD') {
                endRow = parseInt(e.target.dataset.row);
                endCol = parseInt(e.target.dataset.col);
                highlightSelection(startRow, startCol, endRow, endCol);
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (isMouseDown) {
                isMouseDown = false;
            }
        });
        
        return { gridTable, getSelectedDimensions };
    }
    
    // 10. 테이블 옵션 생성 함수 (UI 표시만 - 기능 없음)
    function createTableOptions() {
        // 옵션 영역 추가
        const tableOptions = document.createElement('div');
        tableOptions.id = 'tableOptions';
        
        // 테이블 스타일 옵션
        const styleOptionDiv = document.createElement('div');
        const styleLabel = document.createElement('label');
        styleLabel.textContent = 'Select table style:';
        styleLabel.setAttribute('for', 'tableStyleSelect');
        styleOptionDiv.appendChild(styleLabel);
        
        const styleSelect = document.createElement('select');
        styleSelect.id = 'tableStyleSelect';
        
        TABLE_STYLES.forEach(option => {
            const optionEl = document.createElement('option');
            optionEl.value = option.value;
            optionEl.textContent = option.text;
            styleSelect.appendChild(optionEl);
        });
        
        styleOptionDiv.appendChild(styleSelect);
        tableOptions.appendChild(styleOptionDiv);
        
        // 선 스타일 옵션
        const lineOptionDiv = document.createElement('div');
        const lineLabel = document.createElement('label');
        lineLabel.textContent = 'Line style:';
        lineLabel.setAttribute('for', 'lineStyleSelect');
        lineOptionDiv.appendChild(lineLabel);
        
        const lineSelect = document.createElement('select');
        lineSelect.id = 'lineStyleSelect';
        
        LINE_STYLES.forEach(option => {
            const optionEl = document.createElement('option');
            optionEl.value = option.value;
            optionEl.textContent = option.text;
            lineSelect.appendChild(optionEl);
        });
        
        lineOptionDiv.appendChild(lineSelect);
        tableOptions.appendChild(lineOptionDiv);
        
        return tableOptions;
    }
    
    // 11. 버튼 컨테이너 생성
    function createButtonContainer() {
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'button-container';
        
        // 삽입 버튼
        const insertButton = document.createElement('button');
        insertButton.type = 'button';
        insertButton.title = 'Insert Table';
        
        const buttonIcon = document.createElement('span');
        buttonIcon.className = 'material-icons';
        buttonIcon.style.fontSize = '18px';
        buttonIcon.style.color = '#5f6368';
        buttonIcon.textContent = 'add_circle';
        
        insertButton.appendChild(buttonIcon);
        buttonContainer.appendChild(insertButton);
        
        return buttonContainer;
    }
    
    // 12. 외부 클릭 이벤트 핸들러 설정
    function setupOutsideClickHandler() {
        // 기존 핸들러 제거
        document.removeEventListener('click', handleOutsideClick);
        document.addEventListener('click', handleOutsideClick);
    }
    
    function handleOutsideClick(e) {
        if (isGridLayerVisible && 
            gridLayer && 
            !gridLayer.contains(e.target) && 
            !e.target.classList.contains('lite-editor-table-button') &&
            !e.target.closest('.lite-editor-table-button')) {
            hideGridLayer();
        }
    }
    
    // 13. ESC 키 이벤트 핸들러 설정
    function setupEscapeKeyHandler() {
        // 기존 핸들러 제거
        document.removeEventListener('keydown', handleEscapeKey);
        document.addEventListener('keydown', handleEscapeKey);
    }
    
    function handleEscapeKey(e) {
        if (e.key === 'Escape' && isGridLayerVisible) {
            hideGridLayer();
        }
    }
    
    // 14. 테이블 삽입 함수 (기본 테이블만 생성)
    function insertTable(rows, cols) {
        const editor = document.querySelector('#lite-editor');
        if (!editor) return;
        
        editor.focus();
        restoreSelection();
        
        // 테이블 생성
        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.border = CELL_STYLES.border;
        
        // 테이블 바디 생성
        const tbody = document.createElement('tbody');
        
        for (let i = 0; i < rows; i++) {
            const row = document.createElement('tr');
            
            for (let j = 0; j < cols; j++) {
                const cell = document.createElement('td');
                cell.contentEditable = true;
                
                // 스타일 적용
                Object.entries(CELL_STYLES).forEach(([prop, value]) => {
                    cell.style[prop] = value;
                });
                
                row.appendChild(cell);
            }
            
            tbody.appendChild(row);
        }
        
        table.appendChild(tbody);
        
        // 현재 선택 위치에 테이블 삽입
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(table);
        
        // 테이블 뒤에 줄바꿈 추가
        const br = document.createElement('br');
        table.parentNode.insertBefore(br, table.nextSibling);
        
        // 커서 위치 이동
        const newRange = document.createRange();
        newRange.setStartAfter(br);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
        
        // 에디터 상태 업데이트
        dispatchEditorEvent(editor);
    }
    
    // 15. 플러그인 등록
    LiteEditor.registerPlugin(PLUGIN_ID, {
        title: 'Table',
        icon: 'grid_on', 
        customRender: function(toolbar, contentArea) {
            // 스타일 추가
            addTableStyles();
            
            // 버튼 생성
            const tableButton = document.createElement('button');
            tableButton.className = 'lite-editor-button lite-editor-table-button';
            tableButton.title = 'Insert Table';

            // 아이콘 추가
            const tableIcon = document.createElement('i');
            tableIcon.className = 'material-icons';
            tableIcon.textContent = 'grid_on'; 
            tableButton.appendChild(tableIcon);
            
            // 클릭 이벤트 추가
            tableButton.addEventListener('click', e => {
                e.preventDefault();
                e.stopPropagation();
                toggleGridLayer(tableButton);
            });
            
            // 버튼을 툴바에 추가
            toolbar.appendChild(tableButton);
        }
    });
})();


