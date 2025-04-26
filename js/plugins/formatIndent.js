/**
 * LiteEditor Indentation Plugin
 * 들여쓰기 및 내어쓰기 통합 플러그인
 */

(function() {
  // 들여쓰기 간격 설정 (em 단위)
  let indentSize = 1.5;
  
  /**
   * 들여쓰기 간격 설정 함수
   * @param {number} size - 들여쓰기 간격 (em 단위)
   */
  function setIndentSize(size) {
    if (typeof size === 'number' && size > 0) {
      indentSize = size;
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
      bq.style.marginLeft = `${indentSize}em`;
      bq.style.marginRight = '0';
    });
    
    // 기타 들여쓰기가 적용된 요소들도 처리
    contentArea.querySelectorAll('p[style*="margin-left"], div[style*="margin-left"], h1[style*="margin-left"], h2[style*="margin-left"], h3[style*="margin-left"], h4[style*="margin-left"], h5[style*="margin-left"], h6[style*="margin-left"]').forEach(el => {
      // 현재 들여쓰기 레벨 계산
      const currentMargin = parseFloat(window.getComputedStyle(el).marginLeft) || 0;
      const currentLevel = Math.round(currentMargin / (16 * indentSize));
      
      // 레벨에 맞게 간격 재설정
      if (currentLevel > 0) {
        el.style.marginLeft = `${currentLevel * indentSize}em`;
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
    
    // 명령 실행
    document.execCommand(command, false, null);
    
    // 포커스 유지
    contentArea.focus();
    
    // 들여쓰기 간격 일관성 유지
    normalizeIndent(contentArea);
    
    // 변경 효과 확인을 위해 다시 선택 영역 저장
    if (window.liteEditorSelection) {
      window.liteEditorSelection.save();
    }
  }
  
  /**
   * 버튼 생성 헬퍼 함수
   * @param {string} icon - 아이콘 텍스트
   * @param {string} title - 버튼 툴팁
   * @returns {HTMLElement} 생성된 버튼 요소
   */
  function createButton(icon, title) {
    const container = document.createElement('div');
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
  
  // 외부에서 사용할 수 있도록 함수 노출
  window.LiteEditor = window.LiteEditor || {};
  window.LiteEditor.formatIndent = {
    setIndentSize: setIndentSize,
    normalizeIndent: normalizeIndent
  };
})();