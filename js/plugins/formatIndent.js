/**
 * LiteEditor Indentation Plugin
 * 들여쓰기 및 내어쓰기 통합 플러그인 (검수 완료 버전)
 */

(function() {
  // 설정 상수
  let INDENT_SIZE = 4;
  const INDENT_CHAR = '\u00A0'; // non-breaking space
  
  // 메모리 관리를 위한 컬렉션
  const eventCleanupFunctions = [];
  
  /**
   * 들여쓰기 간격 설정 함수 (D1 요구사항)
   */
  function setIndentSize(size) {
    if (typeof size === 'number' && size > 0) {
      INDENT_SIZE = size;
      safelyNormalizeAllEditors();
    }
  }
  
  /**
   * 안전한 에디터 정규화
   */
  function safelyNormalizeAllEditors() {
    try {
      const editors = document.querySelectorAll('[contenteditable="true"]');
      editors.forEach(editor => {
        if (editor && editor.isConnected) {
          normalizeIndent(editor);
        }
      });
    } catch (error) {
      if (window.errorHandler) {
        errorHandler.logError('FormatIndent', 'NORMALIZE_ALL', error);
      }
    }
  }
  
  /**
   * 들여쓰기 간격 일관성 유지 (D2, D3 요구사항)
   */
  function normalizeIndent(contentArea) {
    if (!contentArea || !contentArea.isConnected) return;
    
    try {
      // D3: blockquote 들여쓰기 강제
      const blockquotes = contentArea.querySelectorAll('blockquote');
      blockquotes.forEach(bq => {
        if (bq.isConnected) {
          bq.style.paddingLeft = `${INDENT_SIZE * 0.25}em`;
          bq.style.marginRight = '0';
        }
      });
      
      // D2: 마진 기반 들여쓰기를 공백으로 정규화
      const selector = 'p[style*="margin-left"], div[style*="margin-left"], h1[style*="margin-left"], h2[style*="margin-left"], h3[style*="margin-left"], h4[style*="margin-left"], h5[style*="margin-left"], h6[style*="margin-left"]';
      const elements = contentArea.querySelectorAll(selector);
      
      elements.forEach(el => {
        if (!el.isConnected) return;
        
        const currentMargin = parseFloat(window.getComputedStyle(el).marginLeft) || 0;
        const currentLevel = Math.round(currentMargin / 16);
        
        if (currentLevel > 0) {
          convertMarginToSpaces(el, currentLevel);
        }
      });
    } catch (error) {
      if (window.errorHandler) {
        errorHandler.logError('FormatIndent', 'NORMALIZE', error);
      }
    }
  }
  
  /**
   * 마진을 공백으로 변환
   */
  function convertMarginToSpaces(el, level) {
    try {
      const indentText = INDENT_CHAR.repeat(INDENT_SIZE * level);
      
      if (el.firstChild && el.firstChild.nodeType === Node.TEXT_NODE) {
        el.firstChild.textContent = el.firstChild.textContent.replace(/^[\u00A0 ]+/, '');
        el.firstChild.textContent = indentText + el.firstChild.textContent;
      } else {
        const textNode = document.createTextNode(indentText);
        el.insertBefore(textNode, el.firstChild);
      }
      
      el.style.marginLeft = '';
    } catch (error) {
      if (window.errorHandler) {
        errorHandler.logError('FormatIndent', 'CONVERT_MARGIN', error);
      }
    }
  }
  
  /**
   * BR 컨텍스트 분석 (D5, D6 요구사항)
   */
  function isBRContext(selection) {
    if (!selection || selection.rangeCount === 0) return false;
    
    const range = selection.getRangeAt(0);
    let container = range.startContainer;
    
    // P 태그 내부 확인
    let parentP = container;
    while (parentP && parentP.nodeType !== Node.ELEMENT_NODE) {
      parentP = parentP.parentNode;
    }
    
    while (parentP && parentP.nodeName !== 'P') {
      parentP = parentP.parentNode;
    }
    
    // P 태그 내부에 BR이 있는지 확인
    if (parentP && parentP.nodeName === 'P') {
      return parentP.querySelector('br') !== null;
    }
    
    return false;
  }
  
  /**
   * 들여쓰기/내어쓰기 공통 처리 함수 - 선택 영역 관리 제거
   */
  function handleIndentation(contentArea, command) {
    if (!contentArea || !contentArea.isConnected) return;
    
    try {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      // 🔧 디버깅: 시작 상태 로깅
      if (window.errorHandler) {
        errorHandler.selectionLog.start(contentArea);
        errorHandler.colorLog('FormatIndent', `🎯 ${command.toUpperCase()} 명령 시작`, {
          command: command,
          isConnected: contentArea.isConnected,
          selectionCount: selection.rangeCount
        }, '#ff5722');
      }
      
      // D5, D6: BR 컨텍스트에서 특별 처리
      const inBRContext = isBRContext(selection);
      
      // 🔧 디버깅: BR 컨텍스트 분석 결과
      if (window.errorHandler) {
        errorHandler.colorLog('FormatIndent', '🌿 BR 컨텍스트 분석', {
          inBRContext: inBRContext,
          startContainer: selection.getRangeAt(0).startContainer,
          startOffset: selection.getRangeAt(0).startOffset
        }, '#795548');
      }
      
      if (command === 'indent') {
        executeIndent(selection, inBRContext, contentArea);
      } else {
        executeOutdent(selection, inBRContext, contentArea);
      }
      
      // 🔧 수정: 단순한 포커스 유지만
      try {
        contentArea.focus();
        contentArea.dispatchEvent(new Event('input', { bubbles: true }));
      } catch (error) {
        contentArea.focus();
      }
      
      // 🔧 디버깅: 최종 상태 로깅
      if (window.errorHandler) {
        errorHandler.selectionLog.final(contentArea);
        errorHandler.colorLog('FormatIndent', `✅ ${command.toUpperCase()} 명령 완료`, {
          command: command,
          finalFocus: document.activeElement === contentArea
        }, '#4caf50');
      }
      
    } catch (error) {
      if (window.errorHandler) {
        errorHandler.logError('FormatIndent', 'HANDLE_INDENTATION', error);
        errorHandler.colorLog('FormatIndent', '❌ 처리 중 오류 발생', {
          command: command,
          error: error.message
        }, '#f44336');
      }
    }
  }
  
  /**
   * 들여쓰기 실행 (A1, B1, C1) - 디버깅 추가
   */
  function executeIndent(selection, inBRContext, contentArea) {
    // 🔧 디버깅: 들여쓰기 시작 상태
    if (window.errorHandler) {
      const range = selection.getRangeAt(0);
      errorHandler.colorLog('FormatIndent', '📝 들여쓰기 실행 시작', {
        inBRContext: inBRContext,
        startContainer: range.startContainer.nodeName || 'TEXT_NODE',
        startOffset: range.startOffset,
        textContent: range.startContainer.textContent?.substring(0, 50) + '...',
        textLength: range.startContainer.textContent?.length
      }, '#ff9800');
    }
    
    if (inBRContext) {
      // D6: BR 컨텍스트에서는 라인 시작에만 들여쓰기
      insertIndentAtLineStartFixed(contentArea);
    } else {
      // 일반적인 들여쓰기
      if (window.errorHandler) {
        errorHandler.colorLog('FormatIndent', '🔧 일반 들여쓰기 실행', {
          indentSize: INDENT_SIZE,
          indentChar: INDENT_CHAR.charCodeAt(0)
        }, '#9c27b0');
      }
      document.execCommand('insertHTML', false, INDENT_CHAR.repeat(INDENT_SIZE));
      
      // 🔧 디버깅: 일반 들여쓰기 후 상태
      if (window.errorHandler) {
        errorHandler.selectionLog.change(contentArea, '일반 들여쓰기 후');
      }
    }
  }
  
  /**
   * BR 컨텍스트에서 라인 시작 들여쓰기 (P 요소 처리 추가)
   */
  function insertIndentAtLineStartFixed(contentArea) {
    try {
      const selection = window.getSelection();
      const range = selection.getRangeAt(0);
      
      // 🔧 디버깅: BR 컨텍스트 들여쓰기 시작
      if (window.errorHandler) {
        errorHandler.colorLog('FormatIndent', '🌿 BR 컨텍스트 들여쓰기 시작', {
          nodeType: range.startContainer.nodeType,
          nodeName: range.startContainer.nodeName,
          currentOffset: range.startOffset,
          textContent: range.startContainer.textContent
        }, '#8bc34a');
      }
      
      // 🔧 수정: P 요소와 텍스트 노드 모두 처리
      if (range.startContainer.nodeType === Node.TEXT_NODE) {
        // 기존 텍스트 노드 처리
        handleTextNodeIndent(range, contentArea);
      } else if (range.startContainer.nodeType === Node.ELEMENT_NODE && 
                 range.startContainer.nodeName === 'P') {
        // 🔧 추가: P 요소 처리
        handlePElementIndent(range, contentArea);
      } else {
        // 🔧 폴백: 일반 들여쓰기
        if (window.errorHandler) {
          errorHandler.colorLog('FormatIndent', '🔄 지원하지 않는 노드 타입 → 일반 들여쓰기', {
            nodeType: range.startContainer.nodeType,
            nodeName: range.startContainer.nodeName
          }, '#ff5722');
        }
        document.execCommand('insertHTML', false, INDENT_CHAR.repeat(INDENT_SIZE));
      }
      
    } catch (error) {
      // 폴백: 일반 들여쓰기
      if (window.errorHandler) {
        errorHandler.colorLog('FormatIndent', '⚠️ BR 들여쓰기 실패 → 폴백', {
          error: error.message
        }, '#ff5722');
      }
      document.execCommand('insertHTML', false, INDENT_CHAR.repeat(INDENT_SIZE));
    }
  }
  
  /**
   * 텍스트 노드 들여쓰기 처리 (기존 로직)
   */
  function handleTextNodeIndent(range, contentArea) {
    const textNode = range.startContainer;
    const text = textNode.textContent;
    const currentOffset = range.startOffset;
    const indentText = INDENT_CHAR.repeat(INDENT_SIZE);
    
    // 🔧 디버깅: 처리 전 상태
    if (window.errorHandler) {
      errorHandler.colorLog('FormatIndent', '📊 텍스트 노드 처리 전 상태', {
        originalText: text,
        currentOffset: currentOffset,
        isAtStart: currentOffset === 0,
        indentSize: INDENT_SIZE
      }, '#607d8b');
    }
    
    if (currentOffset === 0) {
      // 텍스트 시작에 들여쓰기 추가
      textNode.textContent = indentText + text;
      
      // 커서를 들여쓰기 뒤로 이동
      const newOffset = currentOffset + INDENT_SIZE;
      range.setStart(textNode, newOffset);
      range.collapse(true);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      
      if (window.errorHandler) {
        errorHandler.colorLog('FormatIndent', '✨ 텍스트 노드 들여쓰기 완료', {
          newText: textNode.textContent,
          oldOffset: currentOffset,
          newOffset: newOffset,
          indentAdded: INDENT_SIZE
        }, '#4caf50');
        errorHandler.selectionLog.change(contentArea, '텍스트 노드 들여쓰기 후');
      }
    } else {
      // 중간 위치에서는 일반 들여쓰기
      document.execCommand('insertHTML', false, indentText);
      
      if (window.errorHandler) {
        errorHandler.selectionLog.change(contentArea, '텍스트 노드 중간 들여쓰기 후');
      }
    }
  }
  
  /**
   * P 요소 들여쓰기 처리 (새로 추가)
   */
  function handlePElementIndent(range, contentArea) {
    const pElement = range.startContainer;
    const currentOffset = range.startOffset;
    const indentText = INDENT_CHAR.repeat(INDENT_SIZE);
    
    // 🔧 디버깅: P 요소 처리 시작
    if (window.errorHandler) {
      errorHandler.colorLog('FormatIndent', '📋 P 요소 들여쓰기 처리 시작', {
        currentOffset: currentOffset,
        childNodesCount: pElement.childNodes.length,
        firstChildType: pElement.firstChild ? pElement.firstChild.nodeType : 'none',
        hasTextContent: !!pElement.textContent
      }, '#9c27b0');
    }
    
    // P 요소의 첫 번째 자식이 텍스트 노드인지 확인
    if (pElement.firstChild && pElement.firstChild.nodeType === Node.TEXT_NODE) {
      // 첫 번째 텍스트 노드에 들여쓰기 추가
      const firstTextNode = pElement.firstChild;
      const originalText = firstTextNode.textContent;
      
      // 라인 시작에 들여쓰기 추가
      firstTextNode.textContent = indentText + originalText;
      
      // 🔧 수정: 커서를 첫 번째 텍스트 노드의 들여쓰기 뒤로 이동
      const newOffset = INDENT_SIZE;
      range.setStart(firstTextNode, newOffset);
      range.collapse(true);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      
      if (window.errorHandler) {
        errorHandler.colorLog('FormatIndent', '✨ P 요소 첫 텍스트 노드 들여쓰기 완료', {
          originalText: originalText,
          newText: firstTextNode.textContent,
          newOffset: newOffset,
          indentAdded: INDENT_SIZE
        }, '#4caf50');
        errorHandler.selectionLog.change(contentArea, 'P 요소 들여쓰기 후');
      }
    } else {
      // 텍스트 노드가 없으면 새로 생성해서 들여쓰기 추가
      const newTextNode = document.createTextNode(indentText);
      pElement.insertBefore(newTextNode, pElement.firstChild);
      
      // 커서를 새 텍스트 노드의 끝으로 이동
      range.setStart(newTextNode, INDENT_SIZE);
      range.collapse(true);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      
      if (window.errorHandler) {
        errorHandler.colorLog('FormatIndent', '🆕 P 요소에 새 텍스트 노드 생성 및 들여쓰기', {
          newTextContent: newTextNode.textContent,
          newOffset: INDENT_SIZE
        }, '#4caf50');
        errorHandler.selectionLog.change(contentArea, 'P 요소 새 텍스트 노드 생성 후');
      }
    }
  }
  
  /**
   * 내어쓰기 실행 (A2, B2, C2, C3) - 디버깅 추가
   */
  function executeOutdent(selection, inBRContext, contentArea) {
    try {
      const range = selection.getRangeAt(0);
      
      // 🔧 디버깅: 내어쓰기 시작 상태
      if (window.errorHandler) {
        errorHandler.colorLog('FormatIndent', '📝 내어쓰기 실행 시작', {
          inBRContext: inBRContext,
          nodeType: range.startContainer.nodeType,
          startOffset: range.startOffset,
          textContent: range.startContainer.textContent
        }, '#e91e63');
      }
      
      if (range.startContainer.nodeType !== Node.TEXT_NODE) {
        if (window.errorHandler) {
          errorHandler.colorLog('FormatIndent', '⚠️ 텍스트 노드가 아님 → 내어쓰기 중단', {
            nodeType: range.startContainer.nodeType,
            nodeName: range.startContainer.nodeName
          }, '#ff5722');
        }
        return;
      }
      
      const text = range.startContainer.textContent;
      const offset = range.startOffset;
      
      // 🔧 수정: 커서 위치 주변의 들여쓰기 문자 확인
      const cursorIndentInfo = analyzeCursorIndentation(text, offset, inBRContext);
      
      // 🔧 디버깅: 커서 들여쓰기 분석 결과
      if (window.errorHandler) {
        errorHandler.colorLog('FormatIndent', '🔍 커서 들여쓰기 분석 결과', {
          canRemove: cursorIndentInfo.canRemove,
          strategy: cursorIndentInfo.strategy,
          spacesToRemove: cursorIndentInfo.spacesToRemove,
          originalOffset: cursorIndentInfo.originalOffset,
          removeStart: cursorIndentInfo.removeStart,
          removeEnd: cursorIndentInfo.removeEnd
        }, '#9c27b0');
      }
      
      if (cursorIndentInfo.canRemove) {
        removeCursorIndentation(range, cursorIndentInfo, contentArea);
      } else {
        if (window.errorHandler) {
          errorHandler.colorLog('FormatIndent', '⚠️ 제거할 들여쓰기 없음', {
            text: text.substring(0, 50) + '...',
            offset: offset
          }, '#ff9800');
        }
      }
      
    } catch (error) {
      if (window.errorHandler) {
        errorHandler.logError('FormatIndent', 'EXECUTE_OUTDENT', error);
        errorHandler.colorLog('FormatIndent', '❌ 내어쓰기 처리 중 오류', {
          error: error.message
        }, '#f44336');
      }
    }
  }
  
  /**
   * 커서 위치 주변 들여쓰기 분석 (수정됨)
   */
  function analyzeCursorIndentation(text, offset, inBRContext) {
    // 라인 시작점 찾기
    const lineStart = inBRContext ? 0 : text.lastIndexOf('\n', offset - 1) + 1;
    
    // 1. 라인 시작 부분의 들여쓰기 확인
    const lineStartSpaces = getLeadingSpaces(text.substring(lineStart));
    
    // 2. 커서 앞의 연속된 들여쓰기 문자 확인
    let beforeCursor = '';
    let beforeStart = offset;
    
    // 커서 앞쪽으로 연속된 들여쓰기 문자 찾기
    for (let i = offset - 1; i >= lineStart; i--) {
      const char = text[i];
      if (char === INDENT_CHAR || char === ' ') {
        beforeCursor = char + beforeCursor;
        beforeStart = i;
      } else {
        break;
      }
    }
    
    // 3. 커서 뒤의 연속된 들여쓰기 문자 확인
    let afterCursor = '';
    let afterEnd = offset;
    
    const lineEnd = text.indexOf('\n', offset);
    const actualLineEnd = lineEnd === -1 ? text.length : lineEnd;
    
    for (let i = offset; i < actualLineEnd; i++) {
      const char = text[i];
      if (char === INDENT_CHAR || char === ' ') {
        afterCursor += char;
        afterEnd = i + 1;
      } else {
        break;
      }
    }
    
    // 4. 제거 가능한 들여쓰기 결정 (🔧 수정: 우선순위 변경)
    const totalCursorSpaces = beforeCursor.length + afterCursor.length;
    
    // 🔧 핵심 수정: 라인 시작 들여쓰기를 우선 처리
    if (lineStartSpaces > 0) {
      // 라인 시작에 들여쓰기가 있는 경우 (우선순위 1)
      return {
        canRemove: true,
        strategy: 'line',
        removeStart: lineStart,
        removeEnd: lineStart + Math.min(INDENT_SIZE, lineStartSpaces), // 🔧 수정: INDENT_SIZE만큼만 제거
        spacesToRemove: Math.min(INDENT_SIZE, lineStartSpaces),
        originalOffset: offset,
        lineStart: lineStart
      };
    } else if (totalCursorSpaces > 0) {
      // 커서 주변에 들여쓰기 문자가 있는 경우 (우선순위 2)
      // 🔧 수정: 정확한 제거 범위 계산
      const spacesToRemove = Math.min(INDENT_SIZE, totalCursorSpaces);
      let actualRemoveEnd;
      
      if (beforeCursor.length >= spacesToRemove) {
        // 커서 앞의 공백에서만 제거
        actualRemoveEnd = beforeStart + spacesToRemove;
      } else {
        // 커서 앞뒤에서 제거
        actualRemoveEnd = beforeStart + beforeCursor.length + (spacesToRemove - beforeCursor.length);
      }
      
      return {
        canRemove: true,
        strategy: 'cursor',
        removeStart: beforeStart,
        removeEnd: Math.min(actualRemoveEnd, afterEnd), // 🔧 수정: 안전한 범위
        spacesToRemove: spacesToRemove,
        originalOffset: offset,
        lineStart: lineStart
      };
    }
    
    return { canRemove: false };
  }
  
  /**
   * 커서 들여쓰기 제거 (안전성 강화)
   */
  function removeCursorIndentation(range, indentInfo, contentArea) {
    try {
      const { strategy, removeStart, removeEnd, spacesToRemove, originalOffset, lineStart } = indentInfo;
      
      const textNode = range.startContainer;
      const text = textNode.textContent;
      
      // 🔧 안전성 검사: 제거 범위 유효성 확인
      const safeRemoveStart = Math.max(0, Math.min(removeStart, text.length));
      const safeRemoveEnd = Math.max(safeRemoveStart, Math.min(removeEnd, text.length));
      const actualSpacesToRemove = safeRemoveEnd - safeRemoveStart;
      
      // 🔧 디버깅: 제거 전 상태 (안전성 검사 포함)
      if (window.errorHandler) {
        errorHandler.colorLog('FormatIndent', '🗑️ 들여쓰기 제거 시작', {
          strategy: strategy,
          originalText: text,
          textLength: text.length,
          removeStart: removeStart,
          removeEnd: removeEnd,
          safeRemoveStart: safeRemoveStart,
          safeRemoveEnd: safeRemoveEnd,
          spacesToRemove: spacesToRemove,
          actualSpacesToRemove: actualSpacesToRemove,
          originalOffset: originalOffset,
          textToRemove: text.substring(safeRemoveStart, safeRemoveEnd)
        }, '#e91e63');
      }
      
      // 안전성 검사 실패 시 처리 중단
      if (actualSpacesToRemove === 0) {
        if (window.errorHandler) {
          errorHandler.colorLog('FormatIndent', '⚠️ 안전성 검사 실패 - 제거할 텍스트 없음', {
            removeStart, removeEnd, textLength: text.length
          }, '#ff5722');
        }
        return;
      }
      
      // 텍스트 제거
      const newText = text.substring(0, safeRemoveStart) + text.substring(safeRemoveEnd);
      textNode.textContent = newText;
      
      // 🔧 수정: 안전한 커서 위치 계산
      let newOffset;
      
      if (strategy === 'cursor') {
        // 커서 주변 들여쓰기 제거한 경우
        if (originalOffset >= safeRemoveEnd) {
          // 커서가 제거 영역 뒤에 있었음
          newOffset = originalOffset - actualSpacesToRemove;
        } else if (originalOffset <= safeRemoveStart) {
          // 커서가 제거 영역 앞에 있었음
          newOffset = originalOffset;
        } else {
          // 커서가 제거 영역 내부에 있었음
          newOffset = safeRemoveStart;
        }
      } else {
        // 라인 시작 들여쓰기 제거한 경우
        if (originalOffset <= lineStart + actualSpacesToRemove) {
          newOffset = lineStart;
        } else {
          newOffset = originalOffset - actualSpacesToRemove;
        }
      }
      
      // 🔧 최종 안전성 검사
      const finalOffset = Math.max(0, Math.min(newOffset, newText.length));
      
      // 🔧 디버깅: 커서 위치 계산 결과
      if (window.errorHandler) {
        errorHandler.colorLog('FormatIndent', '📐 커서 위치 계산', {
          strategy: strategy,
          originalOffset: originalOffset,
          calculatedOffset: newOffset,
          finalOffset: finalOffset,
          newTextLength: newText.length,
          offsetDifference: originalOffset - finalOffset,
          isValidOffset: finalOffset <= newText.length
        }, '#607d8b');
      }
      
      // 🔧 안전한 커서 위치 복원
      range.setStart(textNode, finalOffset);
      range.collapse(true);
      
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      
      // 🔧 디버깅: 제거 완료 상태
      if (window.errorHandler) {
        errorHandler.colorLog('FormatIndent', '✅ 들여쓰기 제거 완료', {
          newText: newText,
          finalOffset: finalOffset,
          textLength: newText.length,
          actuallyRemoved: actualSpacesToRemove
        }, '#4caf50');
        errorHandler.selectionLog.change(contentArea, `${strategy} 전략 내어쓰기 후`);
      }
      
    } catch (error) {
      if (window.errorHandler) {
        errorHandler.logError('FormatIndent', 'REMOVE_CURSOR_INDENTATION', error);
        errorHandler.colorLog('FormatIndent', '❌ 커서 들여쓰기 제거 실패', {
          error: error.message
        }, '#f44336');
      }
    }
  }
  
  /**
   * 선행 공백 개수 계산
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
   * 버튼 생성 (B3)
   */
  function createButton(icon, title) {
    if (window.PluginUtil && window.PluginUtil.dom) {
      const button = window.PluginUtil.dom.createElement('button', {
        type: 'button',
        className: 'lite-editor-button',
        title: title
      });
      
      const iconElement = window.PluginUtil.dom.createElement('i', {
        className: 'material-icons',
        textContent: icon
      });
      
      button.appendChild(iconElement);
      return button;
    }
    
    // 폴백
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
  
  /**
   * Tab 키 이벤트 핸들러 (A1-A3, E1) - 디버깅 추가
   */
  function handleTabKey(event) {
    if (event.key !== 'Tab') return;
    
    const contentArea = event.target.closest('[contenteditable="true"]');
    if (!contentArea || !contentArea.isConnected) return;
    
    // E1: 리스트 내부 감지
    if (isInListContext(contentArea)) {
      // 🔧 핵심 수정: 리스트 컨텍스트에서는 완전히 이벤트를 다른 핸들러에게 위임
      return; // preventDefault 호출하지 않음
    }
    
    // 🔧 일반 텍스트에서만 preventDefault 호출
    event.preventDefault();
    event.stopPropagation();
    
    const command = event.shiftKey ? 'outdent' : 'indent';
    handleIndentation(contentArea, command);
  }
  
  /**
   * 리스트 컨텍스트 확인 (E1) - 수정됨
   */
  function isInListContext(contentArea) {
    try {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return false;
      
      const range = selection.getRangeAt(0);
      let node = range.startContainer;
      
      while (node && node !== contentArea) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // 🔧 수정: 체크리스트만 formatIndent에서 처리하지 않음
          // bulletList와 numberedList는 각자의 플러그인에서 처리하도록 함
          if (node.classList.contains('checklist-item')) {
            return true; // 체크리스트만 차단
          }
          
          // 🔧 제거: UL, OL, LI 체크 제거
          // 이제 bulletList.js와 numberedList.js가 직접 처리
        }
        node = node.parentNode;
      }
      return false;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * 메모리 정리
   */
  function cleanup() {
    try {
      eventCleanupFunctions.forEach(cleanupFn => {
        try {
          cleanupFn();
        } catch (e) {
          // 정리 중 오류 무시
        }
      });
      eventCleanupFunctions.length = 0;
    } catch (error) {
      if (window.errorHandler) {
        errorHandler.logError('FormatIndent', 'CLEANUP', error);
      }
    }
  }
  
  // 플러그인 등록
  LiteEditor.registerPlugin('formatIndent', {
    title: 'Indentation',
    icon: 'format_indent_increase',
    customRender: function(toolbar, contentArea) {
      const containerWrapper = document.createElement('div');
      containerWrapper.style.display = 'contents';
      
      const increaseButton = createButton('format_indent_increase', 'Increase Indent');
      const increaseHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleIndentation(contentArea, 'indent');
      };
      increaseButton.addEventListener('click', increaseHandler);
      
      const decreaseButton = createButton('format_indent_decrease', 'Decrease Indent');
      const decreaseHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleIndentation(contentArea, 'outdent');
      };
      decreaseButton.addEventListener('click', decreaseHandler);
      
      // 메모리 정리 등록
      eventCleanupFunctions.push(
        () => {
          increaseButton.removeEventListener('click', increaseHandler);
          decreaseButton.removeEventListener('click', decreaseHandler);
        }
      );
      
      containerWrapper.appendChild(increaseButton);
      containerWrapper.appendChild(decreaseButton);
      
      return containerWrapper;
    }
  });
  
  // 이벤트 리스너 등록
  const tabKeyHandler = handleTabKey;
  document.addEventListener('keydown', tabKeyHandler, false);
  
  eventCleanupFunctions.push(() => {
    document.removeEventListener('keydown', tabKeyHandler, false);
  });
  
  const unloadHandler = cleanup;
  window.addEventListener('beforeunload', unloadHandler);
  eventCleanupFunctions.push(() => {
    window.removeEventListener('beforeunload', unloadHandler);
  });
  
  // 외부 API
  window.LiteEditor = window.LiteEditor || {};
  window.LiteEditor.formatIndent = {
    setIndentSize: setIndentSize,
    normalizeIndent: normalizeIndent,
    cleanup: cleanup
  };
})();