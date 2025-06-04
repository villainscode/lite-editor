/**
 * LiteEditor Highlight Plugin - 최소 버전
 */

(function() {
  const util = window.PluginUtil || {};

  // 전역 상태 변수
  let savedRange = null;
  let savedCursorPosition = null;
  
  /**
   * 기본 색상 데이터 로드
   */
  function loadHighlightColors() {
    const defaultColors = [
      '#ffffcc', '#ffff00', '#ffecb3', '#ffcc00', '#d0f0c0', '#daf2f9', '#b1d6f7',
      '#ffd9cc', '#ffccff', '#e6d3ff', '#ccccff', '#e6ffcc', '#d9d9d9', '#bdbdbd'
    ];
    return util.dataLoader?.loadColorData ? 
           util.dataLoader.loadColorData('highlight', defaultColors) : 
           defaultColors;
  }
  
  /**
   * 하이라이트 적용 함수 - 기본 버전
   */
  function applyHighlightColor(color, contentArea, colorIndicator) {
    try {
      if (colorIndicator) {
        colorIndicator.style.backgroundColor = color;
        colorIndicator.style.border = 'none';
      }
      
      if (savedRange) {
        // 선택 영역 복원 후 하이라이트 적용
        const restored = util.selection.restoreSelection(savedRange);
        if (restored) {
          document.execCommand('hiliteColor', false, color);
        }
      } else if (savedCursorPosition) {
        // 커서 위치 복원 후 하이라이트 적용
        const range = document.createRange();
        const sel = window.getSelection();
        
        range.setStart(savedCursorPosition.startContainer, savedCursorPosition.startOffset);
        range.setEnd(savedCursorPosition.endContainer, savedCursorPosition.endOffset);
        sel.removeAllRanges();
        sel.addRange(range);
        
        document.execCommand('hiliteColor', false, color);
      }
      
      util.editor?.dispatchEditorEvent?.(contentArea);
      
    } catch (e) {
      console.error('하이라이트 적용 중 오류:', e);
    }
  }

  /**
   * 플러그인 등록
   */
  LiteEditor.registerPlugin('highlight', {
    customRender: function(toolbar, contentArea) {
      const container = util.dom.createElement('div', {
        className: 'lite-editor-button',
        title: 'Highlight'
      });
      
      const icon = util.dom.createElement('i', {
        className: 'material-icons',
        textContent: 'format_color_fill'
      });
      container.appendChild(icon);
      
      const colorIndicator = util.dom.createElement('span', {
        className: 'lite-editor-color-indicator'
      }, {
        backgroundColor: 'transparent',
        border: '1px solid #ccc'
      });
      container.appendChild(colorIndicator);
      
      // 드롭다운 레이어 생성
      const dropdown = util.dom.createElement('div', {
        className: 'lite-editor-dropdown-menu',
        id: 'highlight-dropdown-' + Math.random().toString(36).substr(2, 9)
      }, {
        position: 'absolute',
        zIndex: '99999',
        display: 'none',
        backgroundColor: '#fff',
        border: '1px solid #ccc',
        borderRadius: '4px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        padding: '8px 0'
      });
      
      const colorGrid = util.dom.createElement('div', {
        className: 'lite-editor-color-grid'
      });
      dropdown.appendChild(colorGrid);
      
      // 색상 셀들 생성
      const colors = loadHighlightColors();
      colors.forEach(color => {
        const colorCell = util.dom.createElement('div', {
          className: 'lite-editor-color-cell',
          'data-color': color
        }, {
          backgroundColor: color
        });
        
        // 색상 선택 시 하이라이트 적용
        colorCell.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          dropdown.classList.remove('show');
          dropdown.style.display = 'none';
          util.activeModalManager?.unregister?.(dropdown);
          
          // 하이라이트 적용
          applyHighlightColor(color, contentArea, colorIndicator);
        });
        
        colorGrid.appendChild(colorCell);
      });
      
      document.body.appendChild(dropdown);
      
      // 마우스 다운 시 선택 영역/커서 위치 저장
      container.addEventListener('mousedown', (e) => {
        const selection = util.selection.getSafeSelection();
        if (!selection?.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        const selectedText = range.toString().trim();
        
        if (selectedText) {
          // 선택 영역 모드
          savedRange = util.selection.saveSelection();
          savedCursorPosition = null;
        } else {
          // 커서 모드
          savedRange = null;
          savedCursorPosition = {
            startContainer: range.startContainer,
            startOffset: range.startOffset,
            endContainer: range.endContainer,
            endOffset: range.endOffset
          };
        }
      });
      
      // 아이콘 클릭 이벤트
      container.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!savedRange && !savedCursorPosition) return;
        
        const isVisible = dropdown.classList.contains('show');
        
        if (isVisible) {
          dropdown.classList.remove('show');
          dropdown.style.display = 'none';
          util.activeModalManager?.unregister?.(dropdown);
        } else {
          util.activeModalManager?.closeAll?.();
          
          setTimeout(() => {
            dropdown.classList.add('show');
            dropdown.style.display = 'block';
            container.classList.add('active');
            
            util.layer?.setLayerPosition?.(dropdown, container);
            util.activeModalManager?.register?.(dropdown);
          }, 10);
          
          util.setupOutsideClickHandler?.(dropdown, () => {
            dropdown.classList.remove('show');
            dropdown.style.display = 'none';
            container.classList.remove('active');
            util.activeModalManager?.unregister?.(dropdown);
          }, [container]);
        }
      });
      
      return container;
    }
  });
})();