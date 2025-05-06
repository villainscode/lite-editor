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
    
    // PluginUtil 참조
    const util = window.PluginUtil;
    
    // 상태 관리
    const state = {
        isGridLayerVisible: false,
        savedRange: null,
        gridLayer: null,
        cleanupFn: null, // 이벤트 정리 함수
        tableButton: null
    };
    
    // 선택 영역 관리
    const selectionManager = {
        saveSelection() {
            state.savedRange = util.selection.saveSelection();
        },
        
        restoreSelection() {
            if (state.savedRange) {
                util.selection.restoreSelection(state.savedRange);
            }
        }
    };
    
    // 스타일 관리
    const styleManager = {
        addTableStyles() {
            util.styles.loadCssFile(STYLE_ID, CSS_PATH);
        },
        
        addTableHoverStyles() {
            const styleId = 'tableHoverStyles';
            if (document.getElementById(styleId)) return;
            
            const css = `
                .grid-layer button {
                    transition: transform 0.1s ease !important;
                }
                .grid-layer button:hover {
                    transform: scale(0.95) !important;
                    background-color: rgba(0, 0, 0, 0.05) !important;
                }
            `;
            
            util.styles.addInlineStyle(styleId, css);
        }
    };
    
    // 컬럼 리사이즈 관리
    const resizerManager = {
        // 리사이즈 상태 (최소 필요 상태만 유지)
        state: {
            active: null // 현재 활성화된 리사이저 상태 정보
        },
        
        // 테이블에 리사이저 초기화
        initTableResizers(table) {
            if (!table || table.classList.contains('resizer-initialized')) {
                return; // 이미 초기화된 경우 스킵
            }
            
            // 테이블 레이아웃 및 너비 설정
            this.setupTableLayout(table);
            
            // 첫 번째 행의 모든 셀에 리사이저 추가
            this.setupColumnResizers(table);
            
            // 초기화 완료 표시
            table.classList.add('resizer-initialized');
        },
        
        // 테이블 레이아웃 설정
        setupTableLayout(table) {
            // 테이블 레이아웃을 fixed로 설정
            table.style.tableLayout = 'fixed';
            
            // 테이블 너비 설정 (픽셀 단위로 고정)
            if (!table.style.width || table.style.width.indexOf('%') !== -1) {
                table.style.width = table.offsetWidth + 'px';
            }
        },
        
        // 컬럼 리사이저 설정
        setupColumnResizers(table) {
            const firstRow = table.querySelector('tr');
            if (!firstRow) return;
            
            const cells = firstRow.querySelectorAll('th, td');
            
            // 각 셀에 기본 너비 부여 (픽셀 단위)
            const cellCount = cells.length;
            const defaultCellWidth = Math.floor(table.offsetWidth / cellCount);
            
            cells.forEach(cell => {
                // 셀에 명시적 픽셀 단위 너비 설정
                if (!cell.style.width || cell.style.width.indexOf('%') !== -1) {
                    cell.style.width = defaultCellWidth + 'px';
                }
                
                // 리사이저 추가
                this.addResizerToCell(cell);
            });
        },
        
        // 셀에 리사이저 추가
        addResizerToCell(cell) {
            // 이미 리사이저가 있는 경우 스킵
            if (cell.querySelector('.resizer')) return;
            
            // 셀에 상대 위치 스타일 적용
            cell.style.position = 'relative';
            
            // 리사이저 요소 생성
            const resizer = this.createResizerElement();
            
            // 리사이저에 이벤트 리스너 추가
            resizer.addEventListener('mousedown', this.handleResizeStart.bind(this));
            
            // 셀에 리사이저 추가
            cell.appendChild(resizer);
        },
        
        // 리사이저 요소 생성
        createResizerElement() {
            const resizer = document.createElement('div');
            resizer.className = 'resizer';
            resizer.contentEditable = 'false';
            
            // 필수 인라인 스타일만 적용 (나머지는 CSS로 처리)
            Object.assign(resizer.style, {
                position: 'absolute',
                top: '0',
                right: '0',
                width: '5px',
                height: '100%',
                cursor: 'col-resize',
                zIndex: '10'
            });
            
            return resizer;
        },
        
        // 리사이징 시작 처리
        handleResizeStart(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const resizer = e.target;
            const cell = resizer.parentElement;
            const table = cell.closest('table');
            
            if (!table) return;
            
            // 리사이징 시작 전 모든 셀에 명시적 픽셀 너비 설정
            this.fixColumnWidths(table);
            
            // 리사이징 상태 저장
            this.state.active = {
                resizer,
                cell,
                table,
                startX: e.clientX,
                startWidth: cell.offsetWidth,
                startTableWidth: table.offsetWidth
            };
            
            // 리사이징 상태 표시
            resizer.classList.add('resizing');
            document.body.style.cursor = 'col-resize';
            
            // 이벤트 리스너 추가
            document.addEventListener('mousemove', this.handleResizeMove, true);
            document.addEventListener('mouseup', this.handleResizeEnd, true);
        },
        
        // 모든 컬럼 너비를 픽셀 단위로 고정
        fixColumnWidths(table) {
            table.querySelectorAll('th, td').forEach(cell => {
                if (!cell.style.width || cell.style.width.indexOf('%') !== -1) {
                    cell.style.width = cell.offsetWidth + 'px';
                }
            });
        },
        
        // 리사이징 중 처리 (정적 메서드로 정의)
        handleResizeMove(e) {
            const state = resizerManager.state;
            if (!state.active) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            const deltaX = e.clientX - state.active.startX;
            const newWidth = state.active.startWidth + deltaX;
            
            // 최소 너비 제한
            if (newWidth > 30) {
                // 현재 셀 너비만 조정
                state.active.cell.style.width = newWidth + 'px';
                
                // 테이블 전체 너비도 조정 (다른 셀은 그대로 유지)
                state.active.table.style.width = (state.active.startTableWidth + deltaX) + 'px';
            }
        },
        
        // 리사이징 종료 처리 (정적 메서드로 정의)
        handleResizeEnd(e) {
            const state = resizerManager.state;
            if (!state.active) return;
            
            // 리사이징 클래스 제거
            state.active.resizer.classList.remove('resizing');
            
            // 커서 스타일 복원
            document.body.style.cursor = '';
            
            // 에디터 상태 업데이트
            resizerManager.notifyEditorUpdate();
            
            // 이벤트 리스너 제거
            document.removeEventListener('mousemove', resizerManager.handleResizeMove, true);
            document.removeEventListener('mouseup', resizerManager.handleResizeEnd, true);
            
            // 상태 초기화
            state.active = null;
        },
        
        // 에디터 상태 업데이트 알림
        notifyEditorUpdate() {
            const editor = document.querySelector('#lite-editor');
            if (editor && typeof util !== 'undefined' && util.editor && util.editor.dispatchEditorEvent) {
                util.editor.dispatchEditorEvent(editor);
            }
        },
        
        // 에디터 내 모든 테이블 리사이저 초기화
        initAllTables(contentArea) {
            if (!contentArea) return;
            
            const tables = contentArea.querySelectorAll('table:not(.resizer-initialized)');
            tables.forEach(table => {
                this.initTableResizers(table);
            });
        }
    };
    
    // 정적 핸들러 설정
    resizerManager.handleResizeMove = resizerManager.handleResizeMove.bind(resizerManager);
    resizerManager.handleResizeEnd = resizerManager.handleResizeEnd.bind(resizerManager);
    
    // 그리드 레이어 관리
    const gridLayerManager = {
        toggleGridLayer(buttonElement) {
            // 현재 스크롤 위치 저장
            const currentScrollY = window.scrollY;
            
            if (state.isGridLayerVisible) {
                this.hideGridLayer();
                return;
            }
            
            this.showGridLayer(buttonElement);
            
            // 스크롤 위치 복원
            requestAnimationFrame(() => {
                setTimeout(() => {
                    window.scrollTo(window.scrollX, currentScrollY);
                }, 50);
            });
        },
        
        showGridLayer(buttonElement) {
            selectionManager.saveSelection();
            
            // 다른 열린 모달 모두 닫기
            util.activeModalManager.closeAll();
            
            // 그리드 레이어 생성
            state.gridLayer = this.createGridLayer();
            state.isGridLayerVisible = true;
            
            // 레이어 위치 설정 및 표시
            this.positionAndShowLayer(buttonElement);
            
            // 버튼 상태 업데이트
            buttonElement.classList.add('active');
            
            // 외부 클릭 이벤트 설정
            util.setupOutsideClickHandler(state.gridLayer, () => {
                this.hideGridLayer();
            }, [buttonElement]);
        },
        
        positionAndShowLayer(buttonElement) {
            // 버튼 위치 기반으로 레이어 위치 설정
            const buttonRect = buttonElement.getBoundingClientRect();
            state.gridLayer.style.position = 'absolute';
            state.gridLayer.style.top = (buttonRect.bottom + window.scrollY) + 'px';
            state.gridLayer.style.left = buttonRect.left + 'px';
            state.gridLayer.style.zIndex = '99999';
            
            // 레이어를 활성 모달로 등록
            state.gridLayer.closeCallback = () => {
                this.hideGridLayer();
            };
            
            util.activeModalManager.register(state.gridLayer);
            
            // 레이어 표시
            state.gridLayer.style.display = 'block';
        },
        
        hideGridLayer() {
            if (!state.gridLayer) return;
            
            // 레이어 숨기기
            state.gridLayer.style.display = 'none';
            
            // 버튼 상태 업데이트
            if (state.tableButton) {
                state.tableButton.classList.remove('active');
            }
            
            // 활성 모달에서 제거
            util.activeModalManager.unregister(state.gridLayer);
            state.isGridLayerVisible = false;
            
            // 모달 이벤트 정리 (필요 없으므로 제거 가능)
            if (state.cleanupFn) {
                state.cleanupFn();
                state.cleanupFn = null;
            }
        },
        
        createGridLayer() {
            // 기존 레이어 삭제
            const existingLayer = document.querySelector('.grid-layer');
            if (existingLayer) existingLayer.remove();
            
            // 새 레이어 생성
            const gridLayer = util.dom.createElement('div', {
                className: 'grid-layer'
            });
            
            // 제목 추가
            const title = util.dom.createElement('p', {
                textContent: `Drag to select table size (Max ${GRID_SIZE}×${GRID_SIZE})`
            });
            
            // 그리드 컨테이너 생성
            const gridContainer = util.dom.createElement('div', {
                className: 'grid-container'
            });
            
            // 그리드 테이블과 선택 핸들러 설정
            const { gridTable, getSelectedDimensions } = this.createGridTable();
            gridContainer.appendChild(gridTable);
            
            // 옵션 패널 추가
            const optionsPanel = util.dom.createElement('div', {
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
            const buttonContainer = util.dom.createElement('div', {
                className: 'button-container'
            });
            
            // 삽입 버튼 생성
            const insertButton = util.dom.createElement('button', {
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
            const buttonIcon = util.dom.createElement('div', {
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
        
            // 스타일 추가
            styleManager.addTableHoverStyles();
        
            // 이벤트 전파 방지
        gridLayer.addEventListener('click', e => {
            e.stopPropagation();
        });
                
            document.body.appendChild(gridLayer);
        return gridLayer;
        },
        
        createGridTable() {
            const gridTable = util.dom.createElement('table', {
                className: 'grid'
            });
            
            const tbody = util.dom.createElement('tbody');
        
        let isMouseDown = false;
        let startRow = null, startCol = null, endRow = null, endCol = null;
        
        // 그리드 셀 생성
        for (let i = 0; i < GRID_SIZE; i++) {
                const tr = util.dom.createElement('tr');
            for (let j = 0; j < GRID_SIZE; j++) {
                    const td = util.dom.createElement('td');
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
            const group = util.dom.createElement('div', {
                className: 'form-group'
            });
            
            const labelEl = util.dom.createElement('label', {
                textContent: label
            });
            
            // 드롭다운 컨테이너 - 상대 위치 설정
            const dropdownContainer = util.dom.createElement('div', {
                className: 'relative inline-block'
            }, {
                width: width
            });
            
            // 버튼 컨테이너
            const buttonContainer = util.dom.createElement('div');
            
            // 선택 버튼
            const button = util.dom.createElement('button', {
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
            const selectedText = util.dom.createElement('span', {
                className: 'selected-text',
                textContent: defaultValue
            });
            
            // 화살표 아이콘
            const arrowIcon = util.dom.createSvgElement('svg', {
                viewBox: '0 0 20 20',
                fill: 'currentColor',
                'aria-hidden': 'true'
            });
            
            arrowIcon.style.width = '1.25rem';
            arrowIcon.style.height = '1.25rem';
            arrowIcon.style.color = '#9ca3af';
            
            const path = util.dom.createSvgElement('path', {
                'fill-rule': 'evenodd',
                'd': 'M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z',
                'clip-rule': 'evenodd'
            });
            
            arrowIcon.appendChild(path);
            
            button.appendChild(selectedText);
            button.appendChild(arrowIcon);
            buttonContainer.appendChild(button);
            
            // 드롭다운 메뉴
            const dropdownMenu = util.dom.createElement('div', {
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
                width: '95%',
                borderRadius: '0.375rem',
                backgroundColor: 'white',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                border: '1px solid rgba(0, 0, 0, 0.05)'
            });
            
            const menuContent = util.dom.createElement('div', {
                className: 'py-1',
                role: 'none'
            });
            
            // 옵션 추가
            options.forEach((option, index) => {
                const optionEl = util.dom.createElement('div', {
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
                const iconCell = util.dom.createElement('div', {}, {
                    width: '27px',
                    height: '27px',
                    marginRight: '10px',
                    flexShrink: '0'
                });
                
                // 메뉴 아이콘 생성
                const isLineDropdown = label === 'Line';
                
                if (isLineDropdown) {
                    // 라인 스타일 아이콘
                    const lineIcon = util.dom.createElement('div', {}, {
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
                        const line = util.dom.createElement('div', {}, {
                            width: '22px',
                            height: '0',
                            borderTop: '1px solid #555'
                        });
                        lineIcon.appendChild(line);
                    } else if (option === 'Dotted') {
                        // 점선
                        const line = util.dom.createElement('div', {}, {
                            width: '22px',
                            height: '0',
                            borderTop: '1px dotted #555'
                        });
                        lineIcon.appendChild(line);
                    } // No border는 아무것도 추가하지 않음
                    
                    iconCell.appendChild(lineIcon);
                } else {
                    // Style 드롭다운용 아이콘
                    const tableIcon = util.dom.createElement('div', {}, {
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
                const textCell = util.dom.createElement('div', {
                    textContent: option
                }, {
                    fontSize: '0.8125rem',
                    color: '#374151'
                });
                
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
                    optionEl.style.backgroundColor = '';
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
            
            // 스타일에 따른 클래스 설정
            let tableClass = '';
            if (style === 'header') {
                tableClass = 'lite-table-header';
            } else if (style === 'column') {
                tableClass = 'lite-table-column';
            } else if (style === 'complex') {
                tableClass = 'lite-table-complex';
            }
            
            // 라인 스타일에 따른 클래스 추가
            if (line === 'dotted') {
                tableClass += ' lite-table-dotted';
            } else if (line === 'no-border') {
                tableClass += ' lite-table-no-border';
            }
            
            // 테이블 생성
            const table = util.dom.createElement('table', {
                className: tableClass
            }, {
                width: '100%',
                borderCollapse: 'collapse',
                tableLayout: 'fixed' // 테이블 레이아웃을 fixed로 설정
            });
            
            // 선 스타일 적용
            let borderStyle = '1px solid #ccc';
            if (line === 'dotted') {
                borderStyle = '1px dotted #666';
            } else if (line === 'no-border') {
                // no-border의 경우 에디터에서는 점선으로 표시
                borderStyle = '0.5px dashed #f8f8f8';
            }
            
            table.style.border = borderStyle;
            
            // 테이블 바디 생성
            const tbody = util.dom.createElement('tbody');
            
            // 통합된 테이블 구조 생성
            this.createTableStructure(tbody, rows, cols, borderStyle, style);
            
            table.appendChild(tbody);
            
            // 현재 선택 위치에 테이블 삽입
            const selection = window.getSelection();
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(table);
            
            // 테이블에 리사이저 초기화
            resizerManager.initTableResizers(table);
            
            // 테이블 뒤에 줄바꿈 추가
            const br = util.dom.createElement('br');
            table.parentNode.insertBefore(br, table.nextSibling);
            
            // 커서 위치 이동
            const newRange = document.createRange();
            newRange.setStartAfter(br);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
            
            // 에디터 상태 업데이트
            util.editor.dispatchEditorEvent(editor);
        },
        
        // 통합된 테이블 구조 생성 함수
        createTableStructure(tbody, rows, cols, borderStyle, tableType) {
            // 테이블 너비 지정 및 각 셀의 기본 너비 계산 (픽셀 단위)
            const editorWidth = (document.querySelector('#lite-editor')?.clientWidth || 600) * 0.95; // 테이블 너비 
            const cellWidth = Math.floor(editorWidth / cols);
            
            // 문서 프래그먼트를 사용하여 DOM 삽입 최소화
            const fragment = document.createDocumentFragment();
            
            for (let i = 0; i < rows; i++) {
                const row = util.dom.createElement('tr');
                
                for (let j = 0; j < cols; j++) {
                    // 테이블 타입에 따라 헤더 셀 결정
                    let isHeader = false;
                    
                    switch (tableType) {
                        case 'header':
                            isHeader = (i === 0);
                            break;
                        case 'column':
                            isHeader = (j === 0);
                            break;
                        case 'complex':
                            isHeader = (i === 0 || j === 0);
                            break;
                        // basic은 기본값인 false 유지
                    }
                    
                    // 셀에 명시적 너비 지정 (픽셀 단위)
                    const cellStyles = {
                        width: cellWidth + 'px'
                    };
                    
                    const cell = this.createCell(isHeader, borderStyle, cellStyles);
                    row.appendChild(cell);
                }
                
                fragment.appendChild(row);
            }
            
            // 최적화된 DOM 업데이트 (한 번에 모든 행 추가)
            tbody.appendChild(fragment);
        },
        
        createCell(isHeader, borderStyle, styles = {}) {
            // 공통 셀 생성 로직
            const tag = isHeader ? 'th' : 'td';
            const defaultStyles = {
                padding: '5px 5px',
                height: '32px',
                border: borderStyle
            };
            
            if (isHeader) {
                // 배경색 제거, 폰트 굵기만 유지
                defaultStyles.fontWeight = 'bold';
            }
            
            // 추가 스타일 적용
            const cellStyles = {...defaultStyles, ...styles};
            
            // 셀 생성
            return util.dom.createElement(tag, {
                contentEditable: true
            }, cellStyles);
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
            const tableButton = util.dom.createElement('button', {
                className: 'lite-editor-button lite-editor-table-button',
                title: 'Insert Table'
            });

            // 아이콘 추가
            const tableIcon = util.dom.createElement('i', {
                className: 'material-icons',
                textContent: 'grid_on'
            });
            
            tableButton.appendChild(tableIcon);
            
            // 버튼 참조 저장
            state.tableButton = tableButton;
            
            // 클릭 이벤트 추가
            tableButton.addEventListener('click', e => {
                e.preventDefault();
                e.stopPropagation();
                gridLayerManager.toggleGridLayer(tableButton);
            });
            
            // 에디터 로드 후 기존 테이블 리사이저 초기화
            setTimeout(() => {
                resizerManager.initAllTables(contentArea);
            }, 0);
            
            // 에디터 콘텐츠 변경 감지를 위한 MutationObserver 설정
            const tableObserver = new MutationObserver(mutations => {
                let hasTableChanges = false;
                
                mutations.forEach(mutation => {
                    if (mutation.type === 'childList') {
                        // 새로운 테이블이 추가되었는지 확인
                        mutation.addedNodes.forEach(node => {
                            if (node.nodeName === 'TABLE') {
                                hasTableChanges = true;
                            } else if (node.nodeType === 1) { // Element node
                                if (node.querySelector('table')) {
                                    hasTableChanges = true;
                                }
                            }
                        });
                    }
                });
                
                // 테이블 변경이 감지된 경우에만 리사이저 초기화
                if (hasTableChanges) {
                    resizerManager.initAllTables(contentArea);
                }
            });
            
            // observer 설정 및 시작
            tableObserver.observe(contentArea, {
                childList: true,
                subtree: true
            });
            
            return tableButton;
        }
    });
})();


