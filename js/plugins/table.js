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
        
        // Style 드롭다운 생성
        const styleDropdown = createStyledDropdown(
            'Style', 
            ['Basic', 'Header', 'Column', 'Complex'],
            'Basic'
        );
        
        // Line 드롭다운 생성
        const lineDropdown = createStyledDropdown(
            'Line', 
            ['Solid', 'Dotted', 'No border'], 
            'Solid'
        );
        
        // 버튼 컨테이너 생성 (우측 정렬용)
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'button-container';
        
        // 삽입 버튼 생성 - 크기 및 스타일 개선
        const insertButton = document.createElement('button');
        insertButton.type = 'button';
        insertButton.title = 'Insert Table';
        insertButton.className = 'table-insert-button';
        insertButton.style.display = 'flex';
        insertButton.style.alignItems = 'center';
        insertButton.style.justifyContent = 'center';
        insertButton.style.borderRadius = '4px';
        insertButton.style.border = 'none';
        insertButton.style.backgroundColor = 'transparent';
        insertButton.style.cursor = 'pointer';
        
        // 아이콘 추가 - 크기를 키움
        const buttonIcon = document.createElement('div');
        buttonIcon.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#5f6368">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
            </svg>
        `;
        buttonIcon.style.display = 'flex';
        buttonIcon.style.alignItems = 'center';
        buttonIcon.style.justifyContent = 'center';
        
        insertButton.appendChild(buttonIcon);
        buttonContainer.appendChild(insertButton);
        
        // 옵션 패널에 그룹들 추가
        optionsPanel.appendChild(styleDropdown.group);
        optionsPanel.appendChild(lineDropdown.group);
        optionsPanel.appendChild(buttonContainer);
        
        // 그리드 컨테이너에 옵션 패널 추가
        gridContainer.appendChild(optionsPanel);
        
        // 그리드 레이어에 제목과 그리드 컨테이너 추가
        gridLayer.appendChild(title);
        gridLayer.appendChild(gridContainer);
        
        // 그리드 레이어에 클릭 이벤트 추가
        gridLayer.addEventListener('click', (e) => {
            // 클릭 이벤트가 드롭다운 버튼이나 드롭다운 메뉴 내부가 아닌 경우에만 처리
            const isDropdownButton = e.target.closest('.dropdown-button');
            const isDropdownMenu = e.target.closest('.dropdown-menu');
            
            // 드롭다운 버튼이나 메뉴가 아닌 영역 클릭 시 모든 드롭다운 닫기
            if (!isDropdownButton && !isDropdownMenu) {
                // 레이어 내 모든 드롭다운 메뉴 닫기
                const dropdowns = gridLayer.querySelectorAll('.dropdown-menu');
                dropdowns.forEach(menu => {
                    menu.classList.add('hidden');
                    const btn = menu.parentNode.querySelector('.dropdown-button');
                    if (btn) btn.setAttribute('aria-expanded', 'false');
                });
            }
            
            // 이벤트 전파는 계속 진행 (레이어 전체 이벤트 핸들링을 위해)
        });
        
        // 삽입 버튼 클릭 이벤트
        insertButton.addEventListener('click', () => {
            const dimensions = getSelectedDimensions();
            if (dimensions) {
                const selectedStyle = styleDropdown.getValue().toLowerCase();
                const selectedLine = lineDropdown.getValue().toLowerCase().replace(' ', '-');
                
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
        addTableHoverStyles();
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
        } else if (style === 'complex' && rows > 1 && cols > 0) {
            // Complex 스타일 테이블 (첫 행, 첫 열 모두 회색)
            for (let i = 0; i < rows; i++) {
                const row = document.createElement('tr');
                
                for (let j = 0; j < cols; j++) {
                    // 첫 번째 행이거나 첫 번째 열이면 th 태그 사용
                    const cell = (i === 0 || j === 0) ? document.createElement('th') : document.createElement('td');
                    cell.contentEditable = true;
                    cell.style.padding = '5px 5px';
                    cell.style.height = '32px';
                    cell.style.border = borderStyle;
                    
                    // 첫 번째 행이거나 첫 번째 열이면 회색 배경 및 굵은 폰트
                    if (i === 0 || j === 0) {
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

    // Style 커스텀 드롭다운 코드 수정
    function createStyledDropdown(label, options, defaultValue, width = '140px') {
        const group = document.createElement('div');
        group.className = 'form-group';
        
        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        
        // 드롭다운 컨테이너 - 상대 위치 설정
        const dropdownContainer = document.createElement('div');
        dropdownContainer.className = 'relative inline-block';
        dropdownContainer.style.width = width;
        
        // 버튼 컨테이너
        const buttonContainer = document.createElement('div');
        
        // 선택 버튼
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'dropdown-button';
        button.setAttribute('aria-expanded', 'false');
        button.setAttribute('aria-haspopup', 'true');
        button.style.display = 'inline-flex';
        button.style.width = '100%';
        button.style.justifyContent = 'space-between';
        button.style.alignItems = 'center';
        button.style.borderRadius = '0.375rem';
        button.style.backgroundColor = 'white';
        button.style.padding = '0.5rem 0.75rem';
        button.style.fontSize = '0.875rem';
        button.style.fontWeight = '600';
        button.style.color = '#111827';
        button.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
        button.style.border = '1px solid #d1d5db';
        
        // 선택된 텍스트
        const selectedText = document.createElement('span');
        selectedText.textContent = defaultValue;
        selectedText.className = 'selected-text';
        
        // 화살표 아이콘
        const arrowIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        arrowIcon.setAttribute('viewBox', '0 0 20 20');
        arrowIcon.setAttribute('fill', 'currentColor');
        arrowIcon.setAttribute('aria-hidden', 'true');
        arrowIcon.style.width = '1.25rem';
        arrowIcon.style.height = '1.25rem';
        arrowIcon.style.color = '#9ca3af';
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('fill-rule', 'evenodd');
        path.setAttribute('d', 'M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z');
        path.setAttribute('clip-rule', 'evenodd');
        
        arrowIcon.appendChild(path);
        
        button.appendChild(selectedText);
        button.appendChild(arrowIcon);
        buttonContainer.appendChild(button);
        
        // 드롭다운 메뉴
        const dropdownMenu = document.createElement('div');
        dropdownMenu.className = 'dropdown-menu hidden';
        dropdownMenu.setAttribute('role', 'menu');
        dropdownMenu.setAttribute('aria-orientation', 'vertical');
        dropdownMenu.setAttribute('tabindex', '-1');
        dropdownMenu.style.position = 'absolute';
        dropdownMenu.style.right = '0';
        dropdownMenu.style.zIndex = '10';
        dropdownMenu.style.fontSize = '11px'
        dropdownMenu.style.marginTop = '0';
        dropdownMenu.style.width = '100%';
        dropdownMenu.style.borderRadius = '0.375rem';
        dropdownMenu.style.backgroundColor = 'white';
        dropdownMenu.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
        dropdownMenu.style.border = '1px solid rgba(0, 0, 0, 0.05)';
        
        const menuContent = document.createElement('div');
        menuContent.className = 'py-1';
        menuContent.setAttribute('role', 'none');
        
        // 옵션 추가 - 스타일 수정된 버전
        options.forEach((option, index) => {
            const optionEl = document.createElement('div');
            optionEl.className = 'dropdown-item';
            optionEl.setAttribute('role', 'menuitem');
            optionEl.setAttribute('tabindex', '-1');
            optionEl.setAttribute('id', `menu-item-${index}`);
            optionEl.style.display = 'flex';
            optionEl.style.alignItems = 'center';
            optionEl.style.padding = '6px 8px';
            optionEl.style.cursor = 'pointer';
            
            // 아이콘 셀 생성 - 크기 조정
            const iconCell = document.createElement('div');
            iconCell.style.width = '27px'; // 30px에서 3px 감소
            iconCell.style.height = '27px'; // 30px에서 3px 감소
            iconCell.style.marginRight = '10px';
            iconCell.style.flexShrink = '0';
            
            // 메뉴 아이콘 생성 (label이 'Line'인 경우에는 다른 아이콘 적용)
            const isLineDropdown = label === 'Line';
            
            if (isLineDropdown) {
                // 라인 스타일 아이콘
                const lineIcon = document.createElement('div');
                lineIcon.style.width = '27px'; // 30px에서 3px 감소
                lineIcon.style.height = '27px'; // 30px에서 3px 감소
                lineIcon.style.display = 'flex';
                lineIcon.style.alignItems = 'center';
                lineIcon.style.justifyContent = 'center';
                lineIcon.style.border = '1px solid #ccc';
                lineIcon.style.boxSizing = 'border-box';
                
                if (option === 'Solid') {
                    // 실선
                    const line = document.createElement('div');
                    line.style.width = '22px';
                    line.style.height = '0';
                    line.style.borderTop = '1px solid #555';
                    lineIcon.appendChild(line);
                } else if (option === 'Dotted') {
                    // 점선
                    const line = document.createElement('div');
                    line.style.width = '22px';
                    line.style.height = '0';
                    line.style.borderTop = '1px dotted #555';
                    lineIcon.appendChild(line);
                } else if (option === 'No border') {
                    // 테두리만 있는 빈 네모 (내부 아이콘 없음)
                    // 아무것도 추가하지 않음 - 빈 네모 테두리만 표시
                }
                
                iconCell.appendChild(lineIcon);
            } else {
                // Style 드롭다운용 아이콘 크기도 변경
                const tableIcon = document.createElement('div');
                tableIcon.style.width = '27px'; // 30px에서 3px 감소
                tableIcon.style.height = '27px'; // 30px에서 3px 감소
                tableIcon.style.border = '1px solid #ccc';
                tableIcon.style.display = 'grid';
                tableIcon.style.gridTemplateColumns = '1fr 1fr';
                tableIcon.style.gridTemplateRows = '1fr 1fr';
                
                // 옵션별 다른 스타일 적용 (기존 코드)
                if (option === 'Basic') {
                    // 기본 표 (모든 셀 흰색)
                    tableIcon.innerHTML = `
                        <div style="border-right: 1px solid #ccc; border-bottom: 1px solid #ccc;"></div>
                        <div style="border-bottom: 1px solid #ccc;"></div>
                        <div style="border-right: 1px solid #ccc;"></div>
                        <div></div>
                    `;
                } else if (option === 'Header') {
                    // 첫 번째 행에 회색 배경
                    tableIcon.innerHTML = `
                        <div style="border-right: 1px solid #ccc; border-bottom: 1px solid #ccc; background-color: #f1f1f1;"></div>
                        <div style="border-bottom: 1px solid #ccc; background-color: #f1f1f1;"></div>
                        <div style="border-right: 1px solid #ccc;"></div>
                        <div></div>
                    `;
                } else if (option === 'Column') {
                    // 첫 번째 열에 회색 배경
                    tableIcon.innerHTML = `
                        <div style="border-right: 1px solid #ccc; border-bottom: 1px solid #ccc; background-color: #f1f1f1;"></div>
                        <div style="border-bottom: 1px solid #ccc;"></div>
                        <div style="border-right: 1px solid #ccc; background-color: #f1f1f1;"></div>
                        <div></div>
                    `;
                } else if (option === 'Complex') {
                    // Complex: 첫 번째 행과 첫 번째 열 모두 회색 배경
                    tableIcon.innerHTML = `
                        <div style="border-right: 1px solid #ccc; border-bottom: 1px solid #ccc; background-color: #f1f1f1;"></div>
                        <div style="border-bottom: 1px solid #ccc; background-color: #f1f1f1;"></div>
                        <div style="border-right: 1px solid #ccc; background-color: #f1f1f1;"></div>
                        <div></div>
                    `;
                }
                
                iconCell.appendChild(tableIcon);
            }
            
            // 텍스트 셀 생성
            const textCell = document.createElement('div');
            textCell.textContent = option;
            textCell.style.fontSize = '0.8125rem';
            textCell.style.color = '#374151';
            
            // 활성화된 아이템 스타일 적용
            if (option === defaultValue) {
                optionEl.classList.add('active');
                optionEl.style.backgroundColor = '#f3f4f6';
                textCell.style.fontWeight = '500';
            }
            
            // 셀 추가
            optionEl.appendChild(iconCell);
            optionEl.appendChild(textCell);
            
            // 클릭 이벤트 설정
            optionEl.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // 선택된 옵션 업데이트
                selectedText.textContent = option;
                
                // 활성 클래스 업데이트
                menuContent.querySelectorAll('.dropdown-item').forEach(el => {
                    el.classList.remove('active');
                    el.style.backgroundColor = '';
                    el.querySelector('div:nth-child(2)').style.fontWeight = 'normal';
                });
                
                optionEl.classList.add('active');
                optionEl.style.backgroundColor = '#f3f4f6';
                textCell.style.fontWeight = '500';
                
                // 드롭다운 닫기
                dropdownMenu.classList.add('hidden');
                button.setAttribute('aria-expanded', 'false');
            });
            
            // 호버 효과 추가
            optionEl.addEventListener('mouseenter', () => {
                optionEl.style.backgroundColor = '#f3f4f6';
            });
            
            optionEl.addEventListener('mouseleave', () => {
                if (!optionEl.classList.contains('active')) {
                    optionEl.style.backgroundColor = '';
                }
            });
            
            menuContent.appendChild(optionEl);
        });
        
        dropdownMenu.appendChild(menuContent);
        
        // 토글 이벤트 추가
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // 드롭다운 토글
            const isHidden = dropdownMenu.classList.contains('hidden');
            
            // 모든 드롭다운 닫기
            document.querySelectorAll('.dropdown-menu').forEach(menu => {
                menu.classList.add('hidden');
                const btn = menu.parentNode.querySelector('button');
                if (btn) btn.setAttribute('aria-expanded', 'false');
            });
            
            // 현재 드롭다운 토글
            if (isHidden) {
                dropdownMenu.classList.remove('hidden');
                button.setAttribute('aria-expanded', 'true');
            } else {
                dropdownMenu.classList.add('hidden');
                button.setAttribute('aria-expanded', 'false');
            }
        });
        
        dropdownContainer.appendChild(buttonContainer);
        dropdownContainer.appendChild(dropdownMenu);
        
        group.appendChild(labelEl);
        group.appendChild(dropdownContainer);
        
        return {
            group,
            button,
            selectedText,
            dropdownMenu,
            getValue: () => selectedText.textContent
        };
    }

    // 테이블 레이어 너비 및 높이 관리 함수 추가
    function setTableLayerDimensions(layer, width, height) {
        if (!layer) return;
        
        if (width) {
            layer.style.width = typeof width === 'number' ? `${width}px` : width;
        }
        
        if (height) {
            layer.style.height = typeof height === 'number' ? `${height}px` : height;
        }
    }

    // 함수 선언 (파일 상단 다른 함수들과 함께 선언)
    function addTableHoverStyles() {
        const styleId = 'tableHoverStyles';
        if (document.getElementById(styleId)) return;
        
        const styleEl = document.createElement('style');
        styleEl.id = styleId;
        styleEl.type = 'text/css';
        styleEl.innerText = `
            .grid-layer button {
                transition: transform 0.1s ease !important;
            }
            .grid-layer button:hover {
                transform: scale(0.95) !important;
                background-color: rgba(0, 0, 0, 0.05) !important;
            }
        `;
        document.head.appendChild(styleEl);
    }

    // 아이콘 크기를 위한 전용 스타일 태그 추가
    function addTableIconStyles() {
        const styleId = 'tableIconStyles';
        if (document.getElementById(styleId)) {
            // 이미 존재하면 제거 후 다시 추가
            const existingStyle = document.getElementById(styleId);
            existingStyle.parentNode.removeChild(existingStyle);
        }
        
        const styleEl = document.createElement('style');
        styleEl.id = styleId;
        styleEl.type = 'text/css';
        styleEl.innerHTML = `
            .grid-layer .table-insert-icon {
                font-size: 24px !important;
                width: 24px !important;
                height: 24px !important;
                display: inline-block !important;
                line-height: 1 !important;
            }
            
            .grid-layer .table-insert-button {
                width: 36px !important;
                height: 36px !important;
                padding: 6px !important;
            }
        `;
        document.head.appendChild(styleEl);
    }
})();


