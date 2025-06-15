/**
 * LiteEditor Code Plugin
 * 텍스트 코드 서식 플러그인
 * 선택 영역에 따른 정확한 코드 처리
 */

(function() {
  const util = window.PluginUtil;
  
  // ✅ 공통 로직을 별도 함수로 추출
  function executeCodeAction(contentArea, triggerSource = 'unknown') {
    if (!contentArea) return;
    if (!util.utils.canExecutePlugin(contentArea)) return;
    
    contentArea.focus();
    
    // 히스토리 기록
    if (window.LiteEditorHistory) {
      window.LiteEditorHistory.forceRecord(contentArea, `Before Code (${triggerSource})`);
    }
    
    applyCodeFormat(contentArea);
    
    // 히스토리 완료 기록
    setTimeout(() => {
      if (window.LiteEditorHistory) {
        window.LiteEditorHistory.recordState(contentArea, `After Code (${triggerSource})`);
      }
    }, 100);
  }

  // ✅ 플러그인 등록 (간소화)
  PluginUtil.registerPlugin('code', {
    title: 'Code',
    icon: 'code',
    action: function(contentArea, buttonElement, event) {
      if (event) event.preventDefault();
      executeCodeAction(contentArea, 'Button Click');
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

    // ✅ core.css 기본 스타일만 사용
    const codeElement = util.dom.createElement('code', {
      'contenteditable': 'true'
    });
    
    // ✅ 빈 코드 블록만 전체 너비로 오버라이드
    codeElement.style.display = 'block';
    codeElement.style.width = '100%';
    // padding, margin은 core.css 그대로 사용 (제거)
    
    codeElement.textContent = '\u200B'; // 보이지 않는 문자

    setupCodeBlockKeyboardEvents(codeElement, contentArea);
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
    
    // ✅ 새로 추가: 원본 range 정보 저장 (다음 텍스트 확인용)
    const originalEndContainer = range.endContainer;
    const originalEndOffset = range.endOffset;
    
    // ✅ HTML 구조를 보존하면서 내용 추출
    const selectedContent = range.extractContents();
    
    // ✅ 추출된 내용을 임시 div에 넣어서 HTML 분석
    const tempDiv = document.createElement('div');
    tempDiv.appendChild(selectedContent.cloneNode(true));
    
    // ✅ HTML에서 줄바꿈 보존하면서 텍스트 추출
    let selectedText = tempDiv.innerHTML
      .replace(/<br\s*\/?>/gi, '\n')  // <br> → \n 변환
      .replace(/<[^>]*>/g, '');       // 다른 HTML 태그 제거

    // ✅ security-manager.js의 unescapeHtml 함수 사용
    selectedText = window.LiteEditorSecurity.unescapeHtml(selectedText);
    
    // ✅ emphasis.js와 동일한 trim 처리 (앞뒤 공백 제거)
    selectedText = selectedText.trim();
    
    if (!selectedText) {
      // 실패 시 원래 내용 복원
      range.insertNode(selectedContent);
      if (window.errorHandler) {
        errorHandler.logError('CODE', 'EMPTY_SELECTION', new Error('선택된 텍스트가 없습니다.'));
      }
      return;
    }

    if (window.errorHandler) {
      errorHandler.colorLog('CODE', '📝 선택 영역 코드 적용 (HTML 구조 보존)', {
        text: selectedText.substring(0, 50) + '...',
        hasLineBreaks: selectedText.includes('\n'),
        length: selectedText.length,
        originalHTML: tempDiv.innerHTML.substring(0, 100) + '...'
      }, '#9c27b0');
    }

    try {
      // ✅ security-manager.js의 escapeHtml 함수 사용 + 줄바꿈 → <br> 변환
      const escapedText = window.LiteEditorSecurity.escapeHtml(selectedText)
        .replace(/\n/g, '<br>'); // 줄바꿈 → <br>

      // ✅ 인라인 코드 요소 생성 (core.css 기본 활용)
      const codeElement = util.dom.createElement('code');
      codeElement.innerHTML = escapedText;
      
      // ✅ CSS :has(br) 룰 오버라이드 (인라인 유지)
      if (selectedText.includes('\n')) {
        codeElement.style.display = 'inline-block';
        codeElement.style.whiteSpace = 'pre-wrap';
      }

      // ✅ 키보드 이벤트 핸들러 추가 (인라인 코드에도)
      setupCodeBlockKeyboardEvents(codeElement, contentArea);

      // ✅ 선택 영역에 코드 요소 삽입 (이미 extractContents()로 삭제됨)
      range.insertNode(codeElement);
      
      // ✅ 수정: 단순화된 줄바꿈 검사
      insertLineBreakIfNeeded(codeElement);
      
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
          errorHandler.colorLog('CODE', '✅ 코드 적용 완료 (줄바꿈 보존)', {
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

  /**
   * ✅ 수정: 코드 삽입 후 다음 텍스트 확인 및 줄바꿈 처리
   */
  function insertLineBreakIfNeeded(codeElement) {
    // 1. 코드 요소 바로 다음 노드 확인
    const nextNode = codeElement.nextSibling;
    
    if (nextNode && nextNode.nodeType === Node.TEXT_NODE) {
      const nextText = nextNode.textContent;
      
      // 2. 다음 텍스트가 공백 없이 바로 시작하는지 확인
      if (nextText && !nextText.startsWith(' ') && nextText.trim()) {
        // 3. <br> 태그 삽입
        const br = document.createElement('br');
        codeElement.parentNode.insertBefore(br, nextNode);
        
        if (window.errorHandler) {
          errorHandler.colorLog('CODE', '✅ 자동 줄바꿈 삽입', {
            nextText: nextText.substring(0, 20) + '...',
            reason: '다음 텍스트와 붙음 방지'
          }, '#4caf50');
        }
        
        return true;
      }
    }
    
    return false;
  }

  /**
   * ✅ 수정: 캡처 단계에서 코드 블럭 키보드 이벤트 우선 처리
   */
  function setupCodeBlockKeyboardEvents(codeElement, contentArea) {
    // ✅ 기존 개별 요소 이벤트 제거
    // codeElement.addEventListener('keydown', ...) 

    // ✅ contentArea 레벨에서 캡처 단계로 등록 (다른 플러그인과 동일한 패턴)
    const keyboardHandler = (e) => {
      if (e.key === 'Enter') {
        // ✅ 현재 커서가 코드 블럭 내부에 있는지 확인
        const selection = util.selection.getSafeSelection();
        if (!selection || !selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        let currentElement = range.startContainer;
        
        // ✅ 텍스트 노드인 경우 부모 요소로 이동
        if (currentElement.nodeType === Node.TEXT_NODE) {
          currentElement = currentElement.parentElement;
        }
        
        // ✅ 코드 요소 찾기
        let codeBlock = null;
        while (currentElement && currentElement !== contentArea) {
          if (currentElement.tagName === 'CODE') {
            codeBlock = currentElement;
            break;
          }
          currentElement = currentElement.parentElement;
        }
        
        // ✅ 코드 블럭 내부에서만 처리
        if (codeBlock) {
          if (e.shiftKey) {
            // ✅ Shift + Enter: 코드 블럭 안에서 줄바꿈
            e.preventDefault();
            e.stopImmediatePropagation(); // ✅ 다른 핸들러 차단
            insertLineBreakInCode(codeBlock);
            
            if (window.errorHandler) {
              errorHandler.colorLog('CODE', '📝 코드 블럭 내 줄바꿈', {}, '#2196f3');
            }
          } else {
            // ✅ Enter: 코드 블럭 탈출 → 새로운 P 태그
            e.preventDefault();
            e.stopImmediatePropagation(); // ✅ 다른 핸들러 차단
            exitCodeBlockToNewParagraph(codeBlock, contentArea);
            
            if (window.errorHandler) {
              errorHandler.colorLog('CODE', '🚪 코드 블럭 탈출 → 새 문단', {}, '#4caf50');
            }
          }
        }
      }
    };
    
    // ✅ 캡처 단계로 등록 (다른 성공적인 플러그인들과 동일한 패턴)
    contentArea.addEventListener('keydown', keyboardHandler, true);
    
    // ✅ cleanup 함수 반환 (메모리 누수 방지)
    return () => {
      contentArea.removeEventListener('keydown', keyboardHandler, true);
    };
  }

  /**
   * ✅ 코드 블럭 안에서 줄바꿈 삽입
   */
  function insertLineBreakInCode(codeElement) {
    const selection = util.selection.getSafeSelection();
    if (!selection || !selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    
    // 현재 커서 위치에 <br> 태그 삽입
    const br = document.createElement('br');
    range.deleteContents();
    range.insertNode(br);
    
    // 커서를 <br> 다음으로 이동
    range.setStartAfter(br);
    range.collapse(true);
    
    selection.removeAllRanges();
    selection.addRange(range);
  }

  /**
   * ✅ 코드 블럭에서 탈출하여 새로운 P 태그 생성
   */
  function exitCodeBlockToNewParagraph(codeElement, contentArea) {
    // ✅ 새로운 P 태그 생성
    const newParagraph = util.dom.createElement('p');
    newParagraph.innerHTML = '<br>'; // 빈 문단 표시용
    
    // ✅ 코드 블럭 다음에 P 태그 삽입
    if (codeElement.nextSibling) {
      contentArea.insertBefore(newParagraph, codeElement.nextSibling);
    } else {
      contentArea.appendChild(newParagraph);
    }
    
    // ✅ 새로운 P 태그로 커서 이동
    setTimeout(() => {
      const newRange = document.createRange();
      newRange.setStart(newParagraph, 0);
      newRange.collapse(true);
      
      const selection = util.selection.getSafeSelection();
      selection.removeAllRanges();
      selection.addRange(newRange);
      
      // contentArea에 포커스 설정
      contentArea.focus();
      
      if (window.errorHandler) {
        errorHandler.colorLog('CODE', '✅ 새 문단 생성 및 포커스 완료', {
          newParagraph: newParagraph.outerHTML
        }, '#4caf50');
      }
    }, 10);
  }

  // ✅ 단축키 등록 (Alt+Shift+C)
  document.addEventListener('keydown', function(e) {
    const contentArea = e.target.closest('[contenteditable="true"]');
    if (!contentArea) return;
    
    const editorContainer = contentArea.closest('.lite-editor, .lite-editor-content');
    if (!editorContainer) return;

    const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);

    // ✅ Alt+Shift+C (Mac/Windows 공통)
    if (e.altKey && e.shiftKey && !e.metaKey && !e.ctrlKey && e.key.toLowerCase() === 'c') {
      try {
        e.preventDefault();
        e.stopPropagation();
        executeCodeAction(contentArea, 'Alt+Shift+C');
      } catch (error) {
        if (window.errorHandler) {
          errorHandler.logWarning('CodePlugin', 'Alt+Shift+C 처리 중 확장 프로그램 충돌', error);
        }
      }
    }
  }, true);
})();