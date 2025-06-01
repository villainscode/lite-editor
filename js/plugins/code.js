/**
 * LiteEditor Code Plugin
 * 텍스트 코드 서식 플러그인
 * 선택 영역에 따른 정확한 코드 처리
 */

(function() {
  const util = window.PluginUtil;
  
  LiteEditor.registerPlugin('code', {
    title: 'Code',
    icon: 'code',
    customRender: function(toolbar, contentArea) {
      const button = util.dom.createElement('button', {
        className: 'lite-editor-button',
        title: 'Code'
      });

      const icon = util.dom.createElement('i', {
        className: 'material-icons',
        textContent: 'code'
      });
      button.appendChild(icon);

      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!util.utils.canExecutePlugin(contentArea)) {
          return;
        }
        
        contentArea.focus();
        applyCodeFormat(contentArea);
      });

      return button;
    }
  });

  // Code 단축키 (Alt+C)
  LiteEditor.registerShortcut('code', {
    key: 'c',
    alt: true,
    action: function(contentArea) {
      applyCodeFormat(contentArea);
    }
  });

  /**
   * ✅ 시퀀셜 처리: 코드 서식 적용 메인 함수
   */
  function applyCodeFormat(contentArea) {
    const selection = util.selection.getSafeSelection();
    if (!selection || !selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    
    if (range.collapsed) {
      // ✅ 시퀀스 1: 빈 커서 → 100% 블록 코드
      createEmptyCodeBlock(contentArea, range);
    } else {
      // ✅ 시퀀스 2: 선택 영역 → 정확한 범위만 코드로 감싸기
      wrapSelectedTextWithCode(contentArea, range);
    }
  }

  /**
   * ✅ 빈 커서 → 100% 사이즈 빈 코드 블록 생성
   */
  function createEmptyCodeBlock(contentArea, range) {
    if (window.errorHandler) {
      errorHandler.colorLog('CODE', '📝 빈 코드 블록 생성', {}, '#9c27b0');
    }

    // ✅ core.css 기본 스타일 + 블록 속성
    const codeElement = util.dom.createElement('code', {
      'contenteditable': 'true'
    });
    
    // ✅ 블록 레벨 스타일만 추가 (core.css 기본 활용)
    codeElement.style.display = 'block';
    codeElement.style.width = '100%';
    codeElement.style.padding = '5px 10px';
    codeElement.style.margin = '8px 0';
    codeElement.textContent = '\u200B'; // 보이지 않는 문자

    // 삽입 및 포커스
    range.insertNode(codeElement);
    
    setTimeout(() => {
      const newRange = document.createRange();
      newRange.selectNodeContents(codeElement);
      newRange.collapse(true);
      
      const sel = util.selection.getSafeSelection();
      sel.removeAllRanges();
      sel.addRange(newRange);
      codeElement.focus();
    }, 10);
  }

  /**
   * ✅ 수정: 선택 영역 → 정확한 범위만 코드로 감싸기 (HTML 구조 보존)
   */
  function wrapSelectedTextWithCode(contentArea, range) {
    // ✅ 오프셋 계산 (복원용)
    const offsets = util.selection.calculateOffsets(contentArea);
    
    // ✅ HTML 구조를 보존하면서 내용 추출
    const selectedContent = range.extractContents();
    
    // ✅ 추출된 내용을 임시 div에 넣어서 HTML 분석
    const tempDiv = document.createElement('div');
    tempDiv.appendChild(selectedContent.cloneNode(true));
    
    // ✅ HTML에서 텍스트 추출 (br 태그 → \n 변환)
    let selectedText = tempDiv.innerHTML
      .replace(/<br\s*\/?>/gi, '\n')  // <br> → \n
      .replace(/<[^>]*>/g, '')         // 다른 HTML 태그 제거
      .replace(/&nbsp;/g, ' ')         // &nbsp; → 공백
      .replace(/&amp;/g, '&')         // &amp; → &
      .replace(/&lt;/g, '<')          // &lt; → <
      .replace(/&gt;/g, '>');         // &gt; → >
    
    if (!selectedText.trim()) {
      // 실패 시 원래 내용 복원
      range.insertNode(selectedContent);
      if (window.errorHandler) {
        errorHandler.logError('CODE', 'EMPTY_SELECTION', new Error('선택된 텍스트가 없습니다.'));
      }
      return;
    }

    if (window.errorHandler) {
      errorHandler.colorLog('CODE', '📝 선택 영역 코드 적용', {
        text: selectedText.substring(0, 50) + '...',
        hasLineBreaks: selectedText.includes('\n'),
        length: selectedText.length,
        originalHTML: tempDiv.innerHTML.substring(0, 100) + '...'
      }, '#9c27b0');
    }

    // ✅ HTML 이스케이프 + 줄바꿈 → <br> 변환
    const escapedText = selectedText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>'); // 줄바꿈 → <br>

    // ✅ 인라인 코드 요소 생성 (core.css 기본 활용)
    const codeElement = util.dom.createElement('code');
    codeElement.innerHTML = escapedText;
    
    // ✅ CSS :has(br) 룰 오버라이드 (인라인 유지)
    if (selectedText.includes('\n')) {
      codeElement.style.display = 'inline-block';
      codeElement.style.whiteSpace = 'pre-wrap';
    }

    try {
      // ✅ 선택 영역에 코드 요소 삽입 (이미 extractContents()로 삭제됨)
      range.insertNode(codeElement);
      
      // ✅ 커서를 코드 요소 다음으로 이동
      setTimeout(() => {
        const newRange = document.createRange();
        newRange.setStartAfter(codeElement);
        newRange.collapse(true);
        
        const sel = util.selection.getSafeSelection();
        sel.removeAllRanges();
        sel.addRange(newRange);
        
        contentArea.focus();
        
        if (window.errorHandler) {
          errorHandler.colorLog('CODE', '✅ 코드 적용 완료', {
            hasLineBreaks: selectedText.includes('\n'),
            display: selectedText.includes('\n') ? 'inline-block' : 'inline',
            finalText: escapedText
          }, '#4caf50');
        }
      }, 10);
      
    } catch (error) {
      if (window.errorHandler) {
        errorHandler.logError('CODE', 'WRAP_ERROR', error);
      }
      
      // ✅ 실패 시 원래 내용 복원
      range.insertNode(selectedContent);
      if (offsets) {
        util.selection.restoreFromOffsets(contentArea, offsets);
      }
    }
  }
})();