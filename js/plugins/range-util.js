/**
 * LiteEditor Range Utility
 * 선택 영역 분석 및 처리를 위한 유틸리티 함수 모음
 */

(function() {
  // 기존 PluginUtil과 DebugUtils 참조
  const util = window.PluginUtil;
  const debugUtils = window.DebugUtils;
  
  const RangeUtil = {
    /**
     * 문자열 콘텐츠를 기준으로 selection start, end 오프셋 계산
     * @param {Element} container - 선택 영역을 포함하는 컨테이너 요소
     * @returns {Object|null} - start와 end 오프셋을 포함하는 객체 또는 null
     */
    getSelectionOffsets: function(container) {
      const sel = window.getSelection();
      if (!sel.rangeCount) return null;
      const range = sel.getRangeAt(0);

      // container 내 전체 텍스트 노드를 순회하며 오프셋 누적
      let charIndex = 0, startOffset = -1, endOffset = -1;
      const treeWalker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );

      while (treeWalker.nextNode()) {
        const node = treeWalker.currentNode;
        if (node === range.startContainer) {
          startOffset = charIndex + range.startOffset;
        }
        if (node === range.endContainer) {
          endOffset = charIndex + range.endOffset;
          break;
        }
        charIndex += node.textContent.length;
      }
      
      // 선택이 커서(비선택)인 경우
      if (startOffset >= 0 && endOffset < 0) {
        endOffset = startOffset;
      }
      
      return startOffset >= 0 ? { start: startOffset, end: endOffset } : null;
    },

    /**
     * 선택 영역에 적용된 포맷 태그와 텍스트 정보 분석
     * @param {Element} container - 선택 영역을 포함하는 컨테이너 요소
     * @returns {Object} - 선택 영역 정보를 포함하는 객체
     */
    analyzeSelection: function(container) {
      // 플러그인 유틸의 selection 함수 활용
      const sel = util.selection.getSafeSelection();
      if (!sel.rangeCount) return null;
      
      const range = sel.getRangeAt(0);
      const offsets = util.selection.calculateOffsets(container);
      
      // 선택 영역 조상 요소 수집
      const ancestors = [];
      let currentNode = range.commonAncestorContainer;
      
      // 텍스트 노드인 경우 부모 요소부터 시작
      if (currentNode.nodeType === Node.TEXT_NODE) {
        currentNode = currentNode.parentNode;
      }
      
      // 컨테이너까지 위로 올라가며 요소 수집
      while (currentNode && currentNode !== container) {
        if (currentNode.nodeType === Node.ELEMENT_NODE) {
          ancestors.push({
            tagName: currentNode.tagName.toLowerCase(),
            className: currentNode.className,
            id: currentNode.id,
            styles: window.getComputedStyle(currentNode)
          });
        }
        currentNode = currentNode.parentNode;
      }
      
      return {
        offsets,
        selectedText: sel.toString(),
        ancestors,
        isCollapsed: range.collapsed,
        startContainer: {
          nodeType: range.startContainer.nodeType,
          nodeName: range.startContainer.nodeName
        },
        endContainer: {
          nodeType: range.endContainer.nodeType,
          nodeName: range.endContainer.nodeName
        }
      };
    },
    
    /**
     * 선택 영역 정보를 콘솔에 로그 출력(기본 방식)
     * @param {Element} container - 선택 영역을 포함하는 컨테이너 요소
     */
    logSelectionInfo: function(container) {
      const info = this.analyzeSelection(container);
      if (!info) {
        console.log('📌 선택된 영역이 없습니다.');
        return;
      }
      
      console.group('📌 선택 영역 정보');
      
      // 선택 영역 오프셋 출력
      console.log(
        `시작 인덱스: ${info.offsets.start}, 종료 인덱스: ${info.offsets.end}`
      );
      
      // 선택된 텍스트 출력
      console.log(`선택된 텍스트: "${info.selectedText}"`);
      
      // 적용된 태그 정보 출력
      console.log('적용된 태그:');
      if (info.ancestors.length) {
        info.ancestors.forEach((ancestor, index) => {
          console.log(`  ${index + 1}. <${ancestor.tagName}${ancestor.className ? ` class="${ancestor.className}"` : ''}${ancestor.id ? ` id="${ancestor.id}"` : ''}>`);
        });
      } else {
        console.log('  적용된 태그 없음');
      }
      
      console.groupEnd();
    },
    
    /**
     * 콘솔에 카라 선택 영역 정보 표시 (DebugUtils 사용)
     * @param {Element} container - 선택 영역을 포함하는 컨테이너 요소
     */
    debugSelectionInfo: function(container) {
      const info = this.analyzeSelection(container);
      if (!info) {
        debugUtils.debugLog('RANGE', '선택된 영역이 없습니다.', null, '#f44336');
        return;
      }
      
      // 기본 선택 영역 정보
      debugUtils.debugLog(
        'RANGE', 
        `선택 영역: ${info.offsets.start} → ${info.offsets.end}`, 
        { 
          text: info.selectedText,
          length: info.selectedText.length,
          collapsed: info.isCollapsed
        }, 
        '#2196f3'
      );
      
      // 적용된 태그 정보
      if (info.ancestors.length) {
        const tags = info.ancestors.map(a => `<${a.tagName}>`).join(' → ');
        debugUtils.debugLog('RANGE', `적용된 태그: ${tags}`, info.ancestors, '#4caf50');
        
        // 추가: 적용된 스타일 정보
        const styles = {};
        const styleProps = ['fontWeight', 'fontStyle', 'textDecoration', 'color', 'backgroundColor'];
        
        // 첫 번째 부모 요소의 스타일 속성 추출
        if (info.ancestors.length > 0 && info.ancestors[0].styles) {
          styleProps.forEach(prop => {
            const value = info.ancestors[0].styles[prop];
            if (value && value !== 'normal' && value !== 'none') {
              styles[prop] = value;
            }
          });
        }
        
        if (Object.keys(styles).length > 0) {
          debugUtils.debugLog('RANGE', '적용된 스타일:', styles, '#9c27b0');
        }
      } else {
        debugUtils.debugLog('RANGE', '적용된 태그 없음', null, '#757575');
      }
      
      // 선택 영역 컨테이너 정보
      debugUtils.debugLog(
        'RANGE', 
        '선택 컨테이너 정보:', 
        {
          start: `${info.startContainer.nodeName} (${info.startContainer.nodeType})`,
          end: `${info.endContainer.nodeName} (${info.endContainer.nodeType})`
        }, 
        '#ff9800'
      );
    },
    
    /**
     * 이벤트에 따라 선택 영역 정보 로깅 설정
     * @param {Element} container - 선택 영역을 포함하는 컨테이너 요소
     * @param {Object} options - 설정 옵션
     */
    setupSelectionLogging: function(container, options = {}) {
      const defaultOptions = {
        mouseup: true,       // 마우스로 드래그 후 로깅
        keyup: true,         // 화살표 키 등 사용 시 로깅
        dblclick: true,      // 더블클릭 시 로깅
        selectionchange: false, // 선택 변경마다 로깅 (주의: 많은 로그 생성)
        useDebugUtils: true  // DebugUtils 사용 여부
      };
      
      const config = {...defaultOptions, ...options};
      const logFn = config.useDebugUtils ? this.debugSelectionInfo.bind(this) : this.logSelectionInfo.bind(this);
      
      // 마우스 드래그 후 로깅
      if (config.mouseup) {
        container.addEventListener('mouseup', () => setTimeout(() => logFn(container), 0));
      }
      
      // 키보드 선택 로깅
      if (config.keyup) {
        container.addEventListener('keyup', e => {
          const keys = [
            'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 
            'Home', 'End', 'PageUp', 'PageDown'
          ];
          
          // Ctrl+A로 전체 선택 시에도 로깅
          if (keys.includes(e.key) || (e.key === 'a' && (e.ctrlKey || e.metaKey))) {
            setTimeout(() => logFn(container), 0);
          }
        });
      }
      
      // 더블클릭 로깅
      if (config.dblclick) {
        container.addEventListener('dblclick', () => setTimeout(() => logFn(container), 0));
      }
      
      // selectionchange 이벤트 로깅 (주의: 매우 자주 발생함)
      if (config.selectionchange) {
        document.addEventListener('selectionchange', () => {
          if (document.activeElement === container) {
            setTimeout(() => logFn(container), 0);
          }
        });
      }
    }
  };

  // 기존 selection 유틸에 메서드 추가
  util.rangeAnalyzer = RangeUtil;
  
  // 전역 객체에 RangeUtil 등록
  window.RangeUtil = RangeUtil;
})();
