/**
 * LiteEditor Indentation Plugin
 * 들여쓰기 및 내어쓰기 통합 플러그인
 */

(function() {
  // 들여쓰기 간격 설정 (공백 수)
  let INDENT_SIZE = 4;
  const INDENT_CHAR = '\u00A0'; // non-breaking space
  
  /**
   * 들여쓰기 간격 설정 함수
   * @param {number} size - 들여쓰기 간격 (공백 수)
   */
  function setIndentSize(size) {
    if (typeof size === 'number' && size > 0) {
      INDENT_SIZE = size;
      // 문서 내 모든 에디터 영역에 대해 정규화 적용
      document.querySelectorAll('[contenteditable="true"]').forEach(normalizeIndent);
    }
  }
  
  /**
   * 들여쓰기 간격 일관성 유지
   * @param {HTMLElement} contentArea - 에디터 영역 요소
   */
  function normalizeIndent(contentArea) {
    // blockquote 들여쓰기 강제
    contentArea.querySelectorAll('blockquote').forEach(bq => {
      bq.style.paddingLeft = `${INDENT_SIZE * 0.25}em`;
      bq.style.marginRight = '0';
    });
    
    // 기타 들여쓰기가 적용된 요소들도 처리
    contentArea.querySelectorAll('p[style*="margin-left"], div[style*="margin-left"], h1[style*="margin-left"], h2[style*="margin-left"], h3[style*="margin-left"], h4[style*="margin-left"], h5[style*="margin-left"], h6[style*="margin-left"]').forEach(el => {
      // 현재 들여쓰기 레벨 계산
      const currentMargin = parseFloat(window.getComputedStyle(el).marginLeft) || 0;
      const currentLevel = Math.round(currentMargin / (16 * 1)); // 1em 기준으로 레벨 계산
      
      if (currentLevel > 0) {
        // Tab 키와 동일한 들여쓰기 방식 사용
        // 텍스트 컨텐츠 앞에 공백 추가
        if (el.firstChild && el.firstChild.nodeType === Node.TEXT_NODE) {
          // 기존 공백 제거
          el.firstChild.textContent = el.firstChild.textContent.replace(/^[\u00A0 ]+/, '');
          // 새로운 레벨에 맞는 공백 추가
          el.firstChild.textContent = INDENT_CHAR.repeat(INDENT_SIZE * currentLevel) + el.firstChild.textContent;
        } else {
          // 텍스트 노드가 없으면 생성
          const textNode = document.createTextNode(INDENT_CHAR.repeat(INDENT_SIZE * currentLevel));
          el.insertBefore(textNode, el.firstChild);
        }
        
        // 마진 스타일 제거
        el.style.marginLeft = '';
      }
    });
  }
  
  /**
   * 들여쓰기/내어쓰기 공통 처리 함수
   * @param {HTMLElement} contentArea - 에디터 영역 요소
   * @param {string} command - 실행할 명령 ('indent' 또는 'outdent')
   */
  function handleIndentation(contentArea, command) {
    // 선택 영역 관리
    if (window.liteEditorSelection) {
      window.liteEditorSelection.restore();
    }
    
    if (command === 'indent') {
      // 탭 키와 동일한 방식으로 들여쓰기 추가
      document.execCommand('insertHTML', false, INDENT_CHAR.repeat(INDENT_SIZE));
    } else {
      // 내어쓰기
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        if (range.startContainer.nodeType === Node.TEXT_NODE) {
          const text = range.startContainer.textContent;
          const lineStart = text.lastIndexOf('\n', range.startOffset - 1) + 1;
          const spacesToRemove = Math.min(INDENT_SIZE, getLeadingSpaces(text.substring(lineStart)));
          
          if (spacesToRemove > 0) {
            // 현재 커서 위치 저장
            const originalOffset = range.startOffset;
            
            // 공백 제거
            const newText = text.substring(0, lineStart) + text.substring(lineStart + spacesToRemove);
            range.startContainer.textContent = newText;
            
            // 커서 위치 조정 - 제거된 공백만큼 앞으로 이동하되 줄 시작보다 앞으로는 가지 않음
            const newOffset = Math.max(lineStart, originalOffset - spacesToRemove);
            range.setStart(range.startContainer, newOffset);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }
      }
    }
    
    // 포커스 유지
    contentArea.focus();
    
    // 변경 효과 확인을 위해 다시 선택 영역 저장
    if (window.liteEditorSelection) {
      window.liteEditorSelection.save();
    }
  }
  
  /**
   * 선행 공백 개수 가져오기
   * @param {string} text - 텍스트
   * @returns {number} 선행 공백 개수
   */
  function getLeadingSpaces(text) {
    let count = 0;
    for (let i = 0; i < text.length; i++) {
      if (text[i] === ' ' || text[i] === INDENT_CHAR) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }
  
  /**
   * 버튼 생성 헬퍼 함수
   * @param {string} icon - 아이콘 텍스트
   * @param {string} title - 버튼 툴팁
   * @returns {HTMLElement} 생성된 버튼 요소
   */
  function createButton(icon, title) {
    const container = document.createElement('button');
    container.type = 'button';
    container.className = 'lite-editor-button';
    container.setAttribute('title', title);
    
    const iconElement = document.createElement('i');
    iconElement.className = 'material-icons';
    iconElement.textContent = icon;
    container.appendChild(iconElement);
    
    return container;
  }
  
  // 들여쓰기 플러그인 등록
  LiteEditor.registerPlugin('formatIndent', {
    title: 'Indentation',
    icon: 'format_indent_increase',
    customRender: function(toolbar, contentArea) {
      // 버튼 컨테이너 생성
      const containerWrapper = document.createElement('div');
      containerWrapper.style.display = 'contents';
      
      // 들여쓰기 증가 버튼
      const increaseButton = createButton('format_indent_increase', 'Increase Indent');
      increaseButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleIndentation(contentArea, 'indent');
      });
      
      // 들여쓰기 감소 버튼
      const decreaseButton = createButton('format_indent_decrease', 'Decrease Indent');
      decreaseButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleIndentation(contentArea, 'outdent');
      });
      
      // 컨테이너에 버튼 추가
      containerWrapper.appendChild(increaseButton);
      containerWrapper.appendChild(decreaseButton);
      
      return containerWrapper;
    }
  });
  
  /**
   * Tab 키 이벤트 핸들러 (일반 텍스트용)
   */
  function handleTabKey(event) {
    // Tab 키가 아니면 무시
    if (event.key !== 'Tab') return;
    
    // 에디터 영역 찾기
    const contentArea = event.target.closest('[contenteditable="true"]');
    if (!contentArea) return;
    
    // 리스트 내부인지 확인 (리스트는 각각의 플러그인에서 처리)
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      let node = range.startContainer;
      
      // 부모 노드들을 확인하여 리스트 내부인지 검사
      while (node && node !== contentArea) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // 리스트 요소들인지 확인
          if (node.tagName === 'LI' || 
              (node.tagName === 'UL' && node.hasAttribute('data-lite-editor-bullet')) ||
              (node.tagName === 'OL' && node.hasAttribute('data-lite-editor-number')) ||
              node.classList.contains('checklist-item')) {
            return; // 리스트 내부이면 해당 플러그인에서 처리하도록 함
          }
        }
        node = node.parentNode;
      }
    }
    
    // 기본 동작 방지
    event.preventDefault();
    event.stopPropagation();
    
    // 들여쓰기/내어쓰기 실행
    if (event.shiftKey) {
      handleIndentation(contentArea, 'outdent');
    } else {
      handleIndentation(contentArea, 'indent');
    }
  }
  
  // Tab 키 이벤트 리스너 등록
  document.addEventListener('keydown', handleTabKey, false);
  
  
  // 외부에서 사용할 수 있도록 함수 노출
  window.LiteEditor = window.LiteEditor || {};
  window.LiteEditor.formatIndent = {
    setIndentSize: setIndentSize,
    normalizeIndent: normalizeIndent
  };
})();