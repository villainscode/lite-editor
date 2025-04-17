/**
 * LiteEditor table Plugin
 * 표 만들기 플러그인
 */

(function() {
    // 상수 정의
    const PLUGIN_ID = 'table';
    const STYLE_ID = 'tablePluginStyles';
    const CSS_PATH = 'css/plugins/table.css';
    const GRID_SIZE = 10;
    
    // 상태 관리
    const state = {
        isGridLayerVisible: false,
        savedRange: null,
        gridLayer: null
    };
    
    // DOM 조작 유틸리티
    const domUtils = {
        /**
         * 요소 생성 및 속성 지정 헬퍼
         */
        createElement(tag, attributes = {}, styles = {}) {
            const element = document.createElement(tag);
            
            // 속성 설정
            Object.entries(attributes).forEach(([key, value]) => {
                if (key === 'className') {
                    element.className = value;
                } else if (key === 'innerHTML') {
                    element.innerHTML = value;
                } else if (key === 'textContent') {
                    element.textContent = value;
                } else {
                    element.setAttribute(key, value);
                }
            });
            
            // 스타일 설정
            Object.entries(styles).forEach(([key, value]) => {
                element.style[key] = value;
            });
            
            return element;
        },
        
        /**
         * SVG 요소 생성 헬퍼
         */
        createSvgElement(tag, attributes = {}) {
            const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
            
            Object.entries(attributes).forEach(([key, value]) => {
                element.setAttribute(key, value);
            });
            
            return element;
        }
    };
    
    // 선택 영역 관리
    const selectionManager = {
        saveSelection() {
        const sel = window.getSelection();
        if (sel.rangeCount > 0) {
                state.savedRange = sel.getRangeAt(0).cloneRange();
            }
        },
        
        restoreSelection() {
            const sel = window.getSelection();
            sel.removeAllRanges();
            if (state.savedRange) {
                sel.addRange(state.savedRange);
            }
        }
    };
    
    // 스타일 관리
    const styleManager = {
        addTableStyles() {
            if (document.getElementById(STYLE_ID)) return;
            
            const linkEl = domUtils.createElement('link', {
                id: STYLE_ID,
                rel: 'stylesheet',
                type: 'text/css',
                href: CSS_PATH
            });
            
            document.head.appendChild(linkEl);
        },
        
        addTableHoverStyles() {
            const styleId = 'tableHoverStyles';
            if (document.getElementById(styleId)) return;
            
            const styleEl = domUtils.createElement('style', {
                id: styleId,
                type: 'text/css',
                innerText: `
                    .grid-layer button {
                        transition: transform 0.1s ease !important;
                    }
                    .grid-layer button:hover {
                        transform: scale(0.95) !important;
                        background-color: rgba(0, 0, 0, 0.05) !important;
                    }
                `
            });
            
            document.head.appendChild(styleEl);
        }
    };
    
    // 이벤트 관리
    const eventManager = {
        setupOutsideClickHandler() {
            document.removeEventListener('click', eventManager.handleOutsideClick, true);
            document.addEventListener('click', eventManager.handleOutsideClick, true);
        },
        
        handleOutsideClick(e) {
            if (state.isGridLayerVisible && 
                state.gridLayer && 
                !state.gridLayer.contains(e.target) && 
                !e.target.classList.contains('lite-editor-table-button') &&
                !e.target.closest('.lite-editor-table-button')) {
                gridLayerManager.hideGridLayer();
            }
        },
        
        setupEscapeKeyHandler() {
            document.removeEventListener('keydown', eventManager.handleEscapeKey);
            document.addEventListener('keydown', eventManager.handleEscapeKey);
        },
        
        handleEscapeKey(e) {
            if (e.key === 'Escape' && state.isGridLayerVisible) {
                gridLayerManager.hideGridLayer();
            }
        }
    };
    
    // 에디터 이벤트 디스패치
    function dispatchEditorEvent(editor) {
        editor.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    // 그리드 레이어 관리
    const gridLayerManager = {
        toggleGridLayer(buttonElement) {
            if (state.isGridLayerVisible) {
                this.hideGridLayer();
            return;
        }
        
            this.showGridLayer(buttonElement);
        },
        
        showGridLayer(buttonElement) {
            selectionManager.saveSelection();
            state.gridLayer = this.createGridLayer();
            state.isGridLayerVisible = true;
        
        // 버튼 위치 기준으로 레이어 위치 설정
        const rect = buttonElement.getBoundingClientRect();
            state.gridLayer.style.top = (rect.bottom + window.scrollY) + 'px';
            state.gridLayer.style.left = (rect.left + window.scrollX) + 'px';
        
        // 화면 경계 밖으로 나가지 않도록 조정
        setTimeout(() => {
                const layerRect = state.gridLayer.getBoundingClientRect();
            if (layerRect.right > window.innerWidth) {
                    state.gridLayer.style.left = (window.innerWidth - layerRect.width - 10) + 'px';
            }
        }, 0);
        
            state.gridLayer.style.display = 'block';
        },
        
        hideGridLayer() {
            if (state.gridLayer) {
                state.gridLayer.style.display = 'none';
            }
            state.isGridLayerVisible = false;
        },
        
        createGridLayer() {
        // 기존 레이어 삭제
        const existingLayer = document.querySelector('.grid-layer');
        if (existingLayer) existingLayer.remove();
        
        // 새 레이어 생성
            const gridLayer = domUtils.createElement('div', {
                className: 'grid-layer'
            });
        
        // 제목 추가
            const title = domUtils.createElement('p', {
                textContent: `Drag to select table size (Max ${GRID_SIZE}×${GRID_SIZE})`
            });
        
        // 그리드 컨테이너 생성
            const gridContainer = domUtils.createElement('div', {
                className: 'grid-container'
            });
        
        // 그리드 테이블과 선택 핸들러 설정
            const { gridTable, getSelectedDimensions } = this.createGridTable();
        gridContainer.appendChild(gridTable);
        
        // 옵션 패널 추가
            const optionsPanel = domUtils.createElement('div', {
                className: 'options-panel'
            });
            
            // Style 드롭다운 생성
            const styleDropdown = this.createStyledDropdown(
                'Style', 
                ['Basic', 'Header', 'Column', 'Complex'],
                'Basic'
            );
            
            // Line 드롭다운 생성
            const lineDropdown = this.createStyledDropdown(
                'Line', 
                ['Solid', 'Dotted', 'No border'], 
                'Solid'
            );
            
            // 버튼 컨테이너 생성 (우측 정렬용)
            const buttonContainer = domUtils.createElement('div', {
                className: 'button-container'
            });
            
            // 삽입 버튼 생성
            const insertButton = domUtils.createElement('button', {
                type: 'button',
                title: 'Insert Table',
                className: 'table-insert-button'
            }, {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer'
            });
            
            // 아이콘 추가
            const buttonIcon = domUtils.createElement('div', {
                innerHTML: `
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#5f6368">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
                    </svg>
                `
            }, {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            });
        
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
                
                    tableManager.insertTable(dimensions.rows, dimensions.cols, tableOptions);
                    this.hideGridLayer();
            }
        });
        
        // 외부 이벤트 핸들러 등록
            styleManager.addTableHoverStyles();
            eventManager.setupOutsideClickHandler();
            eventManager.setupEscapeKeyHandler();
        
        document.body.appendChild(gridLayer);
        gridLayer.addEventListener('click', e => {
            e.stopPropagation();
        });
            
        return gridLayer;
        },
        
        createGridTable() {
            const gridTable = domUtils.createElement('table', {
                className: 'grid'
            });
            
            const tbody = domUtils.createElement('tbody');
        
        let isMouseDown = false;
        let startRow = null, startCol = null, endRow = null, endCol = null;
        
        // 그리드 셀 생성
        for (let i = 0; i < GRID_SIZE; i++) {
                const tr = domUtils.createElement('tr');
            for (let j = 0; j < GRID_SIZE; j++) {
                    const td = domUtils.createElement('td');
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
        },
        
        createStyledDropdown(label, options, defaultValue, width = '140px') {
            const group = domUtils.createElement('div', {
                className: 'form-group'
            });
            
            const labelEl = domUtils.createElement('label', {
                textContent: label
            });
            
            // 드롭다운 컨테이너 - 상대 위치 설정
            const dropdownContainer = domUtils.createElement('div', {
                className: 'relative inline-block'
            }, {
                width: width
            });
            
            // 버튼 컨테이너
            const buttonContainer = domUtils.createElement('div');
            
            // 선택 버튼
            const button = domUtils.createElement('button', {
                type: 'button',
                className: 'dropdown-button',
                'aria-expanded': 'false',
                'aria-haspopup': 'true'
            }, {
                display: 'inline-flex',
                width: '100%',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderRadius: '0.375rem',
                backgroundColor: 'white',
                padding: '0.5rem 0.75rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#111827',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                border: '1px solid #d1d5db'
            });
            
            // 선택된 텍스트
            const selectedText = domUtils.createElement('span', {
                className: 'selected-text',
                textContent: defaultValue
            });
            
            // 화살표 아이콘
            const arrowIcon = domUtils.createSvgElement('svg', {
                viewBox: '0 0 20 20',
                fill: 'currentColor',
                'aria-hidden': 'true'
            });
            
            arrowIcon.style.width = '1.25rem';
            arrowIcon.style.height = '1.25rem';
            arrowIcon.style.color = '#9ca3af';
            
            const path = domUtils.createSvgElement('path', {
                'fill-rule': 'evenodd',
                'd': 'M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z',
                'clip-rule': 'evenodd'
            });
            
            arrowIcon.appendChild(path);
            
            button.appendChild(selectedText);
            button.appendChild(arrowIcon);
            buttonContainer.appendChild(button);
            
            // 드롭다운 메뉴
            const dropdownMenu = domUtils.createElement('div', {
                className: 'dropdown-menu hidden',
                role: 'menu',
                'aria-orientation': 'vertical',
                tabindex: '-1'
            }, {
                position: 'absolute',
                right: '0',
                zIndex: '10',
                fontSize: '11px',
                marginTop: '0',
                width: '100%',
                borderRadius: '0.375rem',
                backgroundColor: 'white',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                border: '1px solid rgba(0, 0, 0, 0.05)'
            });
            
            const menuContent = domUtils.createElement('div', {
                className: 'py-1',
                role: 'none'
            });
            
            // 옵션 추가
            options.forEach((option, index) => {
                const optionEl = domUtils.createElement('div', {
                    className: 'dropdown-item',
                    role: 'menuitem',
                    tabindex: '-1',
                    id: `menu-item-${index}`
                }, {
                    display: 'flex',
                    alignItems: 'center',
                    padding: '6px 8px',
                    cursor: 'pointer'
                });
                
                // 아이콘 셀 생성
                const iconCell = domUtils.createElement('div', {}, {
                    width: '27px',
                    height: '27px',
                    marginRight: '10px',
                    flexShrink: '0'
                });
                
                // 메뉴 아이콘 생성
                const isLineDropdown = label === 'Line';
                
                if (isLineDropdown) {
                    // 라인 스타일 아이콘
                    const lineIcon = domUtils.createElement('div', {}, {
                        width: '27px',
                        height: '27px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid #ccc',
                        boxSizing: 'border-box'
                    });
                    
                    if (option === 'Solid') {
                        // 실선
                        const line = domUtils.createElement('div', {}, {
                            width: '22px',
                            height: '0',
                            borderTop: '1px solid #555'
                        });
                        lineIcon.appendChild(line);
                    } else if (option === 'Dotted') {
                        // 점선
                        const line = domUtils.createElement('div', {}, {
                            width: '22px',
                            height: '0',
                            borderTop: '1px dotted #555'
                        });
                        lineIcon.appendChild(line);
                    } // No border는 아무것도 추가하지 않음
                    
                    iconCell.appendChild(lineIcon);
                } else {
                    // Style 드롭다운용 아이콘
                    const tableIcon = domUtils.createElement('div', {}, {
                        width: '27px',
                        height: '27px',
                        border: '1px solid #ccc',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gridTemplateRows: '1fr 1fr'
                    });
                    
                    // 옵션별 다른 스타일 적용
                    if (option === 'Basic') {
                        tableIcon.innerHTML = `
                            <div style="border-right: 1px solid #ccc; border-bottom: 1px solid #ccc;"></div>
                            <div style="border-bottom: 1px solid #ccc;"></div>
                            <div style="border-right: 1px solid #ccc;"></div>
                            <div></div>
                        `;
                    } else if (option === 'Header') {
                        tableIcon.innerHTML = `
                            <div style="border-right: 1px solid #ccc; border-bottom: 1px solid #ccc; background-color: #f1f1f1;"></div>
                            <div style="border-bottom: 1px solid #ccc; background-color: #f1f1f1;"></div>
                            <div style="border-right: 1px solid #ccc;"></div>
                            <div></div>
                        `;
                    } else if (option === 'Column') {
                        tableIcon.innerHTML = `
                            <div style="border-right: 1px solid #ccc; border-bottom: 1px solid #ccc; background-color: #f1f1f1;"></div>
                            <div style="border-bottom: 1px solid #ccc;"></div>
                            <div style="border-right: 1px solid #ccc; background-color: #f1f1f1;"></div>
                            <div></div>
                        `;
                    } else if (option === 'Complex') {
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
                const textCell = domUtils.createElement('div', {
                    textContent: option
                }, {
                    fontSize: '0.8125rem',
                    color: '#374151'
                });
                
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
    };
    
    // 테이블 생성 및 삽입
    const tableManager = {
        insertTable(rows, cols, tableOptions = {}) {
        const editor = document.querySelector('#lite-editor');
        if (!editor) return;
        
        editor.focus();
            selectionManager.restoreSelection();
        
        // 테이블 스타일 설정
        const style = tableOptions.style || 'basic';
        const line = tableOptions.line || 'solid';
        
        // 테이블 생성
            const table = domUtils.createElement('table', {}, {
                width: '100%',
                borderCollapse: 'collapse'
            });
        
        // 선 스타일 적용
        let borderStyle = '1px solid #ccc';
        if (line === 'dotted') {
            borderStyle = '1px dotted #ccc';
        } else if (line === 'no-border') {
            borderStyle = 'none';
        }
        
        table.style.border = borderStyle;
        
        // 테이블 바디 생성
            const tbody = domUtils.createElement('tbody');
        
        // 스타일에 따라 테이블 구성 변경
        if (style === 'header' && rows > 1) {
                this.createHeaderTable(tbody, rows, cols, borderStyle);
            } else if (style === 'column' && cols > 0) {
                this.createColumnTable(tbody, rows, cols, borderStyle);
            } else if (style === 'complex' && rows > 1 && cols > 0) {
                this.createComplexTable(tbody, rows, cols, borderStyle);
            } else {
                this.createBasicTable(tbody, rows, cols, borderStyle);
            }
            
            table.appendChild(tbody);
            
            // 현재 선택 위치에 테이블 삽입
            const selection = window.getSelection();
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(table);
            
            // 테이블 뒤에 줄바꿈 추가
            const br = domUtils.createElement('br');
            table.parentNode.insertBefore(br, table.nextSibling);
            
            // 커서 위치 이동
            const newRange = document.createRange();
            newRange.setStartAfter(br);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
            
            // 에디터 상태 업데이트
            dispatchEditorEvent(editor);
        },
        
        createHeaderTable(tbody, rows, cols, borderStyle) {
            // 헤더 행 추가
            const headerRow = domUtils.createElement('tr');
            
            for (let j = 0; j < cols; j++) {
                const th = domUtils.createElement('th', {
                    contentEditable: true
                }, {
                    padding: '5px 5px',
                    height: '32px',
                    border: borderStyle,
                    backgroundColor: '#f1f1f1',
                    fontWeight: 'bold'
                });
                
                headerRow.appendChild(th);
            }
            
            tbody.appendChild(headerRow);
            
            // 나머지 행 추가
            for (let i = 1; i < rows; i++) {
                const row = domUtils.createElement('tr');
                
                for (let j = 0; j < cols; j++) {
                    const cell = domUtils.createElement('td', {
                        contentEditable: true
                    }, {
                        padding: '5px 5px',
                        height: '32px',
                        border: borderStyle
                    });
                    
                    row.appendChild(cell);
                }
                
                tbody.appendChild(row);
            }
        },
        
        createColumnTable(tbody, rows, cols, borderStyle) {
            for (let i = 0; i < rows; i++) {
                const row = domUtils.createElement('tr');
                
                for (let j = 0; j < cols; j++) {
                    const isFirstColumn = j === 0;
                    const cell = domUtils.createElement(
                        isFirstColumn ? 'th' : 'td', 
                        { contentEditable: true },
                        {
                            padding: '5px 5px',
                            height: '32px',
                            border: borderStyle
                        }
                    );
                    
                    if (isFirstColumn) {
                        cell.style.backgroundColor = '#f1f1f1';
                        cell.style.fontWeight = 'bold';
                    }
                    
                    row.appendChild(cell);
                }
                
                tbody.appendChild(row);
            }
        },
        
        createComplexTable(tbody, rows, cols, borderStyle) {
            for (let i = 0; i < rows; i++) {
                const row = domUtils.createElement('tr');
                
                for (let j = 0; j < cols; j++) {
                    const isHeaderCell = i === 0 || j === 0;
                    const cell = domUtils.createElement(
                        isHeaderCell ? 'th' : 'td',
                        { contentEditable: true },
                        {
                            padding: '5px 5px',
                            height: '32px',
                            border: borderStyle
                        }
                    );
                    
                    if (isHeaderCell) {
                        cell.style.backgroundColor = '#f1f1f1';
                        cell.style.fontWeight = 'bold';
                    }
                    
                    row.appendChild(cell);
                }
                
                tbody.appendChild(row);
            }
        },
        
        createBasicTable(tbody, rows, cols, borderStyle) {
            for (let i = 0; i < rows; i++) {
                const row = domUtils.createElement('tr');
                
                for (let j = 0; j < cols; j++) {
                    const cell = domUtils.createElement('td', {
                        contentEditable: true
                    }, {
                        padding: '5px 5px',
                        height: '32px',
                        border: borderStyle
                    });
                    
                    row.appendChild(cell);
                }
                
                tbody.appendChild(row);
            }
        }
    };
    
    // 플러그인 등록
    LiteEditor.registerPlugin(PLUGIN_ID, {
        title: 'Table',
        icon: 'grid_on', 
        customRender: function(toolbar, contentArea) {
            // 스타일 추가
            styleManager.addTableStyles();
            
            // 버튼 생성
            const tableButton = domUtils.createElement('button', {
                className: 'lite-editor-button lite-editor-table-button',
                title: 'Insert Table'
            });

            // 아이콘 추가
            const tableIcon = domUtils.createElement('i', {
                className: 'material-icons',
                textContent: 'grid_on'
            });
            
            tableButton.appendChild(tableIcon);
            
            // 클릭 이벤트 추가
            tableButton.addEventListener('click', e => {
                e.preventDefault();
                e.stopPropagation();
                gridLayerManager.toggleGridLayer(tableButton);
            });
            
            // 버튼을 툴바에 추가
            toolbar.appendChild(tableButton);
        }
    });
})();


