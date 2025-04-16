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
        title.textContent = `Drag to select table size (Max ${GRID_SIZE}×${GRID_SIZE})`;
        
        // 그리드 컨테이너 생성
        const gridContainer = document.createElement('div');
        gridContainer.className = 'grid-container';
        
        // 그리드 테이블과 선택 핸들러 설정
        const { gridTable, getSelectedDimensions } = createGridTable();
        gridContainer.appendChild(gridTable);
        
        // 옵션 패널 추가
        const optionsPanel = document.createElement('div');
        optionsPanel.className = 'options-panel';
        
        // Style 선택 그룹
        const styleGroup = document.createElement('div');
        styleGroup.className = 'form-group';
        
        const styleLabel = document.createElement('label');
        styleLabel.textContent = 'Style';
        
        // Style 커스텀 셀렉트 생성
        const styleSelectContainer = document.createElement('div');
        styleSelectContainer.className = 'custom-select-container';
        styleSelectContainer.style.width = '90px';
        
        // Style 선택 버튼
        const styleButton = document.createElement('button');
        styleButton.type = 'button';
        styleButton.className = 'custom-select-button';
        styleButton.style.width = '90px';
        styleButton.style.border = '1px solid #e5e7eb';
        
        // 선택된 텍스트
        const styleSelectedText = document.createElement('span');
        styleSelectedText.textContent = 'Basic';
        styleSelectedText.className = 'selected-text';
        styleSelectedText.style.width = '65px';
        styleSelectedText.style.border = '1px solid transparent';
        
        // 화살표 아이콘
        const styleArrow = document.createElement('svg');
        styleArrow.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        styleArrow.setAttribute('fill', 'none');
        styleArrow.setAttribute('viewBox', '0 0 24 24');
        styleArrow.setAttribute('stroke-width', '1.5');
        styleArrow.setAttribute('stroke', 'currentColor');
        styleArrow.setAttribute('width', '12');
        styleArrow.setAttribute('height', '12');
        styleArrow.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />';
        
        styleButton.appendChild(styleSelectedText);
        styleButton.appendChild(styleArrow);
        
        // Style 드롭다운
        const styleDropdown = document.createElement('div');
        styleDropdown.className = 'custom-select-dropdown hidden';
        styleDropdown.style.width = '90px';
        
        // Style 옵션들
        const styleOptions = ['Basic', 'Header', 'Column'];
        styleOptions.forEach(option => {
            const optionEl = document.createElement('div');
            optionEl.className = `custom-select-option ${option === 'Basic' ? 'selected' : ''}`;
            optionEl.textContent = option;
            optionEl.dataset.value = option.toLowerCase();
            
            optionEl.addEventListener('click', () => {
                // 선택된 옵션 업데이트
                styleSelectedText.textContent = option;
                
                // 선택된 클래스 업데이트
                styleDropdown.querySelectorAll('.custom-select-option').forEach(el => {
                    el.classList.remove('selected');
                });
                optionEl.classList.add('selected');
                
                // 드롭다운 닫기
                styleDropdown.classList.add('hidden');
            });
            
            styleDropdown.appendChild(optionEl);
        });
        
        // 토글 이벤트 추가
        styleButton.addEventListener('click', (e) => {
            e.stopPropagation();
            styleDropdown.classList.toggle('hidden');
            lineDropdown.classList.add('hidden'); // 다른 드롭다운 닫기
        });
        
        styleSelectContainer.appendChild(styleButton);
        styleSelectContainer.appendChild(styleDropdown);
        
        styleGroup.appendChild(styleLabel);
        styleGroup.appendChild(styleSelectContainer);
        
        // Line 선택 그룹
        const lineGroup = document.createElement('div');
        lineGroup.className = 'form-group';
        
        const lineLabel = document.createElement('label');
        lineLabel.textContent = 'Line';
        
        // Line 커스텀 셀렉트 생성
        const lineSelectContainer = document.createElement('div');
        lineSelectContainer.className = 'custom-select-container';
        lineSelectContainer.style.width = '90px';
        
        // Line 선택 버튼
        const lineButton = document.createElement('button');
        lineButton.type = 'button';
        lineButton.className = 'custom-select-button';
        lineButton.style.width = '90px';
        lineButton.style.border = '1px solid #e5e7eb';
        
        // 선택된 텍스트
        const lineSelectedText = document.createElement('span');
        lineSelectedText.textContent = 'Solid';
        lineSelectedText.className = 'selected-text';
        lineSelectedText.style.width = '65px';
        lineSelectedText.style.border = '1px solid transparent';
        
        // 화살표 아이콘
        const lineArrow = document.createElement('svg');
        lineArrow.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        lineArrow.setAttribute('fill', 'none');
        lineArrow.setAttribute('viewBox', '0 0 24 24');
        lineArrow.setAttribute('stroke-width', '1.5');
        lineArrow.setAttribute('stroke', 'currentColor');
        lineArrow.setAttribute('width', '12');
        lineArrow.setAttribute('height', '12');
        lineArrow.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />';
        
        lineButton.appendChild(lineSelectedText);
        lineButton.appendChild(lineArrow);
        
        // Line 드롭다운
        const lineDropdown = document.createElement('div');
        lineDropdown.className = 'custom-select-dropdown hidden';
        lineDropdown.style.width = '90px';
        
        // Line 옵션들
        const lineOptions = ['Solid', 'Dotted', 'No border'];
        lineOptions.forEach(option => {
            const optionEl = document.createElement('div');
            optionEl.className = `custom-select-option ${option === 'Solid' ? 'selected' : ''}`;
            optionEl.textContent = option;
            optionEl.dataset.value = option.toLowerCase().replace(' ', '-');
            
            optionEl.addEventListener('click', () => {
                // 선택된 옵션 업데이트
                lineSelectedText.textContent = option;
                
                // 선택된 클래스 업데이트
                lineDropdown.querySelectorAll('.custom-select-option').forEach(el => {
                    el.classList.remove('selected');
                });
                optionEl.classList.add('selected');
                
                // 드롭다운 닫기
                lineDropdown.classList.add('hidden');
            });
            
            lineDropdown.appendChild(optionEl);
        });
        
        // 토글 이벤트 추가
        lineButton.addEventListener('click', (e) => {
            e.stopPropagation();
            lineDropdown.classList.toggle('hidden');
            styleDropdown.classList.add('hidden'); // 다른 드롭다운 닫기
        });
        
        lineSelectContainer.appendChild(lineButton);
        lineSelectContainer.appendChild(lineDropdown);
        
        lineGroup.appendChild(lineLabel);
        lineGroup.appendChild(lineSelectContainer);
        
        // 버튼 컨테이너 생성 (우측 정렬용)
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'button-container';
        
        // 삽입 버튼 생성
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
        
        // 옵션 패널에 그룹들 추가
        optionsPanel.appendChild(styleGroup);
        optionsPanel.appendChild(lineGroup);
        optionsPanel.appendChild(buttonContainer);
        
        // 그리드 컨테이너에 옵션 패널 추가
        gridContainer.appendChild(optionsPanel);
        
        // 그리드 레이어에 그리드 컨테이너 추가
        gridLayer.appendChild(gridContainer);
        
        // 외부 클릭시 드롭다운 닫기
        document.addEventListener('click', () => {
            styleDropdown.classList.add('hidden');
            lineDropdown.classList.add('hidden');
        });
        
        // 삽입 버튼 클릭 이벤트
        insertButton.addEventListener('click', () => {
            const dimensions = getSelectedDimensions();
            if (dimensions) {
                const selectedStyle = styleSelectedText.textContent.toLowerCase();
                const selectedLine = lineSelectedText.textContent.toLowerCase().replace(' ', '-');
                
                // 테이블 옵션 설정
                const tableOptions = {
                    style: selectedStyle,
                    line: selectedLine
                };
                
                insertTable(dimensions.rows, dimensions.cols, tableOptions);
                hideGridLayer();
            }
        });
        
        // 외부 이벤트 핸들러 등록
        setupOutsideClickHandler();
        setupEscapeKeyHandler();
        
        document.body.appendChild(gridLayer);
        gridLayer.addEventListener('click', e => {
            e.stopPropagation();
        });
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
    
    // 11. 외부 클릭 이벤트 핸들러 설정
    function setupOutsideClickHandler() {
        // 기존 핸들러 제거
        document.removeEventListener('click', handleOutsideClick, true);
        document.addEventListener('click', handleOutsideClick, true);
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
    
    // 12. ESC 키 이벤트 핸들러 설정
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
    
    // 13. 테이블 삽입 함수
    function insertTable(rows, cols, tableOptions = {}) {
        const editor = document.querySelector('#lite-editor');
        if (!editor) return;
        
        editor.focus();
        restoreSelection();
        
        // 테이블 스타일 설정
        const style = tableOptions.style || 'basic';
        const line = tableOptions.line || 'solid';
        
        // 테이블 생성
        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        
        // 선 스타일 적용
        let borderStyle = '1px solid #ccc';
        if (line === 'dotted') {
            borderStyle = '1px dotted #ccc';
        } else if (line === 'no-border') {
            borderStyle = 'none';
        }
        
        table.style.border = borderStyle;
        
        // 테이블 바디 생성
        const tbody = document.createElement('tbody');
        
        // 스타일에 따라 테이블 구성 변경
        if (style === 'header' && rows > 1) {
            // 헤더 행 추가
            const headerRow = document.createElement('tr');
            
            for (let j = 0; j < cols; j++) {
                const th = document.createElement('th');
                th.contentEditable = true;
                th.style.padding = '5px 5px';
                th.style.height = '32px';
                th.style.border = borderStyle;
                th.style.backgroundColor = '#f1f1f1';
                th.style.fontWeight = 'bold';
                
                headerRow.appendChild(th);
            }
            
            tbody.appendChild(headerRow);
            
            // 나머지 행 추가
            for (let i = 1; i < rows; i++) {
                const row = document.createElement('tr');
                
                for (let j = 0; j < cols; j++) {
                    const cell = document.createElement('td');
                    cell.contentEditable = true;
                    cell.style.padding = '5px 5px';
                    cell.style.height = '32px';
                    cell.style.border = borderStyle;
                    
                    row.appendChild(cell);
                }
                
                tbody.appendChild(row);
            }
        } else if (style === 'column' && cols > 0) {
            // 컬럼 스타일 테이블
            for (let i = 0; i < rows; i++) {
                const row = document.createElement('tr');
                
                for (let j = 0; j < cols; j++) {
                    const cell = j === 0 ? document.createElement('th') : document.createElement('td');
                    cell.contentEditable = true;
                    cell.style.padding = '5px 5px';
                    cell.style.height = '32px';
                    cell.style.border = borderStyle;
                    
                    if (j === 0) {
                        cell.style.backgroundColor = '#f1f1f1';
                        cell.style.fontWeight = 'bold';
                    }
                    
                    row.appendChild(cell);
                }
                
                tbody.appendChild(row);
            }
        } else {
            // 기본 테이블
            for (let i = 0; i < rows; i++) {
                const row = document.createElement('tr');
                
                for (let j = 0; j < cols; j++) {
                    const cell = document.createElement('td');
                    cell.contentEditable = true;
                    cell.style.padding = '5px 5px';
                    cell.style.height = '32px';
                    cell.style.border = borderStyle;
                    
                    row.appendChild(cell);
                }
                
                tbody.appendChild(row);
            }
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
    
    // 14. 플러그인 등록
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


