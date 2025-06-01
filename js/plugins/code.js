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
    
    // ✅ 추가: 단축키용 action 함수
    action: function(contentArea, buttonElement, event) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      
      if (!util.utils.canExecutePlugin(contentArea)) {
        return;
      }
      
      contentArea.focus();
      applyCodeFormat(contentArea);
    },
    
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

  /**
   * ✅ 디버깅 강화된 code 요소 감지 함수
   */
  function isInsideCodeElement(range, contentArea) {
    let currentElement = range.startContainer;
    
    if (window.errorHandler) {
      errorHandler.colorLog('CODE', '🔍 isInsideCodeElement 시작', {
        startContainer: currentElement.nodeName,
        nodeType: currentElement.nodeType
      }, '#ff9800');
    }
    
    if (currentElement.nodeType === Node.TEXT_NODE) {
      if (window.errorHandler) {
        errorHandler.colorLog('CODE', '📝 텍스트 노드 → 부모로 이동', {
          textContent: currentElement.textContent?.substring(0, 30),
          parentTag: currentElement.parentElement?.tagName || 'none'
        }, '#2196f3');
      }
      currentElement = currentElement.parentElement;
    }
    
    let checkDepth = 0;
    while (currentElement && currentElement !== contentArea && checkDepth < 10) {
      if (window.errorHandler) {
        errorHandler.colorLog('CODE', `🔍 체크 중 (깊이 ${checkDepth})`, {
          tagName: currentElement.tagName,
          className: currentElement.className || 'none',
          isCodeTag: currentElement.tagName === 'CODE'
        }, currentElement.tagName === 'CODE' ? '#4caf50' : '#9e9e9e');
      }
      
      if (currentElement.tagName === 'CODE') {
        if (window.errorHandler) {
          errorHandler.colorLog('CODE', '✅ CODE 태그 발견!', {
            codeElement: currentElement.outerHTML.substring(0, 100) + '...'
          }, '#4caf50');
        }
        return currentElement;
      }
      
      currentElement = currentElement.parentElement;
      checkDepth++;
    }
    
    if (window.errorHandler) {
      errorHandler.colorLog('CODE', '❌ CODE 태그 없음', {
        finalElement: currentElement?.tagName || 'null',
        reachedContentArea: currentElement === contentArea,
        maxDepthReached: checkDepth >= 10
      }, '#f44336');
    }
    
    return null;
  }

  /**
   * ✅ 시퀀셜 처리: 코드 서식 적용 메인 함수
   */
  function applyCodeFormat(contentArea) {
    const selection = util.selection.getSafeSelection();
    if (!selection || !selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    
    // ✅ 단계별 상세 분석
    if (window.errorHandler) {
      // 1. Range 기본 정보
      errorHandler.colorLog('CODE', '📍 Range 기본 정보', {
        collapsed: range.collapsed,
        startOffset: range.startOffset,
        endOffset: range.endOffset
      }, '#ff9800');
      
      // 2. StartContainer 상세 분석
      const startContainer = range.startContainer;
      errorHandler.colorLog('CODE', '📍 StartContainer 분석', {
        nodeType: startContainer.nodeType,
        nodeName: startContainer.nodeName,
        nodeValue: startContainer.nodeValue?.substring(0, 50) || 'null',
        textContent: startContainer.textContent?.substring(0, 50) || 'null'
      }, '#2196f3');
      
      // 3. ParentElement 체인 분석
      let current = startContainer;
      const parentChain = [];
      let depth = 0;
      
      while (current && current !== contentArea && depth < 10) {
        if (current.nodeType === Node.ELEMENT_NODE) {
          parentChain.push({
            tagName: current.tagName,
            className: current.className || 'none',
            id: current.id || 'none',
            outerHTML: current.outerHTML?.substring(0, 100) + '...'
          });
        } else if (current.nodeType === Node.TEXT_NODE) {
          parentChain.push({
            nodeType: 'TEXT_NODE',
            textContent: current.textContent?.substring(0, 30) || 'empty',
            parentTag: current.parentElement?.tagName || 'none'
          });
        }
        current = current.parentElement || current.parentNode;
        depth++;
      }
      
      errorHandler.colorLog('CODE', '📍 부모 요소 체인', {
        chain: parentChain,
        totalDepth: depth
      }, '#9c27b0');
      
      // 4. 주변 형제 요소들 분석
      const parent = startContainer.parentElement;
      if (parent) {
        const siblings = Array.from(parent.childNodes).map((node, index) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            return {
              index,
              type: 'ELEMENT',
              tagName: node.tagName,
              isCurrentContainer: node === startContainer
            };
          } else if (node.nodeType === Node.TEXT_NODE) {
            return {
              index,
              type: 'TEXT',
              content: node.textContent?.substring(0, 20) || 'empty',
              isCurrentContainer: node === startContainer
            };
          }
          return { index, type: 'OTHER', isCurrentContainer: node === startContainer };
        });
        
        errorHandler.colorLog('CODE', '📍 형제 노드들', {
          parentTag: parent.tagName,
          siblings: siblings
        }, '#4caf50');
      }
    }
    
    // ✅ 기존 중첩 체크
    const existingCodeElement = isInsideCodeElement(range, contentArea);
    
    if (window.errorHandler) {
      errorHandler.colorLog('CODE', '🔍 중첩 체크 최종 결과', {
        foundCode: !!existingCodeElement,
        codeTag: existingCodeElement?.tagName || 'none',
        shouldReturn: !!existingCodeElement
      }, existingCodeElement ? '#4caf50' : '#f44336');
    }
    
    if (existingCodeElement) {
      errorHandler.colorLog('CODE', '⛔ 중첩 방지 - 함수 종료', {}, '#ff5722');
      return; // 중첩 방지
    }
    
    // 계속 진행...
    if (range.collapsed) {
      createEmptyCodeBlock(contentArea, range);
    } else {
      wrapSelectedTextWithCode(contentArea, range);
    }
  }

  /**
   * ✅ 수정된 빈 코드 블록 생성 (P 태그 내부에 생성)
   */
  function createEmptyCodeBlock(contentArea, range) {
    if (window.errorHandler) {
      errorHandler.colorLog('CODE', '�� 빈 코드 블록 생성 시작', {
        rangeContainer: range.startContainer.nodeName,
        rangeParent: range.startContainer.parentElement?.tagName || 'none'
      }, '#9c27b0');
    }

    // ✅ 수정: 항상 P 태그 내부에 생성하도록 보장
    let targetParagraph = null;
    
    // 현재 위치의 P 태그 찾기
    let currentNode = range.startContainer;
    if (currentNode.nodeType === Node.TEXT_NODE) {
      currentNode = currentNode.parentElement;
    }
    
    while (currentNode && currentNode !== contentArea) {
      if (currentNode.tagName === 'P') {
        targetParagraph = currentNode;
        break;
      }
      currentNode = currentNode.parentElement;
    }
    
    // P 태그가 없으면 새로 생성
    if (!targetParagraph) {
      targetParagraph = document.createElement('p');
      targetParagraph.textContent = '\u200B';
      
      // 현재 range 위치에 P 태그 삽입
      range.insertNode(targetParagraph);
      
      // range를 새 P 태그 내부로 이동
      range.selectNodeContents(targetParagraph);
      range.collapse(true);
    }

    // ✅ P 태그 내부에 code 생성
    const codeElement = util.dom.createElement('code', {
      'contenteditable': 'true'
    });
    
    codeElement.style.display = 'block';
    codeElement.style.width = '100%';
    codeElement.textContent = '\u200B';

    setupCodeBlockKeyboardEvents(codeElement, contentArea);
    
    // P 태그 내용을 code로 교체
    targetParagraph.innerHTML = '';
    targetParagraph.appendChild(codeElement);
    
    if (window.errorHandler) {
      errorHandler.colorLog('CODE', '✅ P 태그 내부에 code 생성 완료', {
        paragraphHTML: targetParagraph.outerHTML,
        codeHTML: codeElement.outerHTML
      }, '#4caf50');
    }
    
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
   * ✅ 새 함수: 불필요한 <br> 태그 정리
   */
  function cleanupUnnecessaryBreaks(codeElement) {
    const parentElement = codeElement.parentElement;
    
    if (!parentElement) return;
    
    // ✅ code 요소 다음의 <br> 태그들 확인
    let nextSibling = codeElement.nextSibling;
    const brsToRemove = [];
    
    while (nextSibling) {
      if (nextSibling.nodeType === Node.ELEMENT_NODE && nextSibling.tagName === 'BR') {
        // ✅ 다음 형제가 <br>이고, 그 다음이 없거나 공백 텍스트면 제거 대상
        const afterBr = nextSibling.nextSibling;
        
        if (!afterBr || (afterBr.nodeType === Node.TEXT_NODE && !afterBr.textContent.trim())) {
          brsToRemove.push(nextSibling);
          nextSibling = afterBr;
        } else {
          break; // 의미있는 내용이 뒤에 있으면 중단
        }
      } else if (nextSibling.nodeType === Node.TEXT_NODE && !nextSibling.textContent.trim()) {
        // ✅ 공백 텍스트 노드는 건너뛰기
        nextSibling = nextSibling.nextSibling;
      } else {
        break; // 다른 요소가 있으면 중단
      }
    }
    
    // ✅ 불필요한 <br> 태그들 제거
    brsToRemove.forEach(br => {
      if (window.errorHandler) {
        errorHandler.colorLog('CODE', '🧹 불필요한 <br> 제거', {
          brElement: br.outerHTML
        }, '#ff5722');
      }
      br.parentNode.removeChild(br);
    });
    
    if (window.errorHandler && brsToRemove.length > 0) {
      errorHandler.colorLog('CODE', '✅ <br> 정리 완료', {
        removedCount: brsToRemove.length,
        finalHTML: parentElement.innerHTML
      }, '#4caf50');
    }
  }

  /**
   * ✅ 수정된 선택 영역 코드 적용 (블록 구조 해체)
   */
  function wrapSelectedTextWithCode(contentArea, range) {
    const offsets = util.selection.calculateOffsets(contentArea);
    
    // ✅ HTML 구조를 보존하면서 내용 추출
    const selectedContent = range.extractContents();
    
    // ✅ 추출된 내용을 임시 div에 넣어서 HTML 분석
    const tempDiv = document.createElement('div');
    tempDiv.appendChild(selectedContent.cloneNode(true));
    
    if (window.errorHandler) {
      errorHandler.colorLog('CODE', '🔍 선택된 원본 HTML', {
        originalHTML: tempDiv.innerHTML,
        hasBlockElements: /<(p|div|h[1-6]|li|ul|ol|blockquote)>/i.test(tempDiv.innerHTML)
      }, '#ff9800');
    }
    
    // ✅ 블록 요소들을 텍스트로 변환
    let processedHTML = tempDiv.innerHTML;
    
    // 1. 블록 요소 시작 태그들을 제거
    processedHTML = processedHTML.replace(/<(p|div|h[1-6]|li|ul|ol|blockquote)[^>]*>/gi, '');
    
    // 2. 블록 요소 끝 태그들을 줄바꿈으로 변환
    processedHTML = processedHTML.replace(/<\/(p|div|h[1-6]|li|ul|ol|blockquote)>/gi, '\n');
    
    // 3. &nbsp; 보존
    processedHTML = processedHTML.replace(/&nbsp;/g, '___NBSP_PLACEHOLDER___');
    
    // 4. <br> → \n 변환
    processedHTML = processedHTML.replace(/<br\s*\/?>/gi, '\n');
    
    // 5. 나머지 HTML 태그 제거
    let selectedText = processedHTML.replace(/<[^>]*>/g, '');
    
    // 6. &nbsp; 복원
    selectedText = selectedText.replace(/___NBSP_PLACEHOLDER___/g, '\u00A0');
    
    // 7. 연속된 줄바꿈 정리
    selectedText = selectedText.replace(/\n{3,}/g, '\n\n');
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
      errorHandler.colorLog('CODE', '📝 블록 구조 해체 완료', {
        originalHTML: tempDiv.innerHTML.substring(0, 100) + '...',
        processedText: selectedText.substring(0, 100) + '...',
        hasLineBreaks: selectedText.includes('\n')
      }, '#9c27b0');
    }

    try {
      // ✅ 안전한 HTML 생성 (&nbsp; 보존)
      let finalHTML = selectedText
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\u00A0/g, '&nbsp;')  // non-breaking space → &nbsp;
        .replace(/\n/g, '<br>');       // 줄바꿈 → <br>

      // ✅ 인라인 코드 요소 생성 (블록 요소 없음)
      const codeElement = util.dom.createElement('code');
      codeElement.innerHTML = finalHTML;  // 순수 텍스트 + <br> + &nbsp;만 포함
      
      // ✅ CSS 설정
      if (selectedText.includes('\n')) {
        codeElement.style.display = 'inline-block';
        codeElement.style.whiteSpace = 'pre-wrap';
      }

      // 키보드 이벤트 핸들러 추가
      setupCodeBlockKeyboardEvents(codeElement, contentArea);

      // 선택 영역에 코드 요소 삽입
      range.insertNode(codeElement);
      
      // 다음 텍스트와 붙음 방지
      insertLineBreakIfNeeded(codeElement);
      
      // 커서를 코드 요소 다음으로 이동
      setTimeout(() => {
        const newRange = document.createRange();
        newRange.setStartAfter(codeElement);
        newRange.collapse(true);
        
        const sel = util.selection.getSafeSelection();
        sel.removeAllRanges();
        sel.addRange(newRange);
        
        contentArea.focus();
        
        if (window.errorHandler) {
          errorHandler.colorLog('CODE', '✅ 코드 적용 완료 (블록 구조 해체)', {
            finalHTML: codeElement.outerHTML.substring(0, 200) + '...',
            hasLineBreaks: selectedText.includes('\n'),
            display: selectedText.includes('\n') ? 'inline-block' : 'inline'
          }, '#4caf50');
        }
      }, 10);
      
    } catch (error) {
      if (window.errorHandler) {
        errorHandler.logError('CODE', 'WRAP_ERROR', error);
      }
      
      // 실패 시 원래 내용 복원
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
          if (!e.shiftKey) {
            e.preventDefault();
            e.stopImmediatePropagation();
            e.stopPropagation();
            
            // ✅ 브라우저 기본 동작 완전 차단
            if (e.returnValue !== undefined) {
              e.returnValue = false;
            }
            
            exitCodeBlockToNewParagraph(codeBlock, contentArea);
            return false;
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
   * ✅ 완전 수정된 코드 블럭 탈출 함수 (정확한 위치 삽입)
   */
  function exitCodeBlockToNewParagraph(codeElement, contentArea) {
    try {
      if (window.errorHandler) {
        errorHandler.colorLog('CODE', '🚪 탈출 시작 - 정확한 위치 계산', {
          codeElement: codeElement.tagName,
          codeParent: codeElement.parentNode?.tagName || 'none',
          codeNextSibling: codeElement.nextSibling?.tagName || codeElement.nextSibling?.textContent?.substring(0, 20) || 'none'
        }, '#ff9800');
      }
      
      const newParagraph = document.createElement('p');
      newParagraph.textContent = '\u200B';
      
      // ✅ 핵심 수정: code 요소 바로 다음에 삽입 (래퍼 무시)
      const codeParent = codeElement.parentNode;
      
      if (codeParent) {
        if (codeElement.nextSibling) {
          // code 요소 바로 다음에 삽입
          codeParent.insertBefore(newParagraph, codeElement.nextSibling);
          
          if (window.errorHandler) {
            errorHandler.colorLog('CODE', '📍 삽입 방법: code 다음 형제 앞', {
              insertedAfter: codeElement.tagName,
              insertedBefore: codeElement.nextSibling.tagName || 'text',
              parentTag: codeParent.tagName
            }, '#4caf50');
          }
        } else {
          // code 요소가 부모의 마지막 자식인 경우
          codeParent.appendChild(newParagraph);
          
          if (window.errorHandler) {
            errorHandler.colorLog('CODE', '📍 삽입 방법: 부모에 appendChild', {
              parentTag: codeParent.tagName,
              codeWasLastChild: true
            }, '#4caf50');
          }
        }
      } else {
        // 예외 상황: code 요소에 부모가 없는 경우
        contentArea.appendChild(newParagraph);
        
        if (window.errorHandler) {
          errorHandler.logError('CODE', 'NO_PARENT_ERROR', new Error('code 요소에 부모가 없음'));
        }
      }
      
      if (window.errorHandler) {
        // 삽입 후 위치 확인
        const newParagraphParent = newParagraph.parentNode;
        const parentChildren = Array.from(newParagraphParent.children);
        const newParagraphIndex = parentChildren.indexOf(newParagraph);
        const codeIndex = parentChildren.indexOf(codeElement);
        
        errorHandler.colorLog('CODE', '📍 P 태그 삽입 완료 (정확한 위치)', {
          newParagraphHTML: newParagraph.outerHTML,
          parentTag: newParagraphParent.tagName,
          newParagraphIndex: newParagraphIndex,
          codeElementIndex: codeIndex,
          isImmediatelyAfterCode: newParagraphIndex === codeIndex + 1,
          totalChildrenInParent: parentChildren.length
        }, '#4caf50');
      }
      
      // ✅ 커서 이동 (동일)
      setTimeout(() => {
        const newRange = document.createRange();
        newRange.selectNodeContents(newParagraph);
        newRange.collapse(true);
        
        const selection = util.selection.getSafeSelection();
        selection.removeAllRanges();
        selection.addRange(newRange);
        
        contentArea.focus();
        
        if (window.errorHandler) {
          errorHandler.colorLog('CODE', '🎯 커서 이동 완료 (정확한 위치)', {
            focusNode: selection.focusNode?.nodeName || 'none',
            focusNodeParent: selection.focusNode?.parentNode?.tagName || 'none',
            isInNewParagraph: selection.focusNode === newParagraph || selection.focusNode?.parentNode === newParagraph
          }, '#4caf50');
        }
        
      }, 10);
      
    } catch (error) {
      if (window.errorHandler) {
        errorHandler.logError('CODE', 'EXIT_CODE_BLOCK_ERROR', error);
      }
      
      // 대체 방법: contentArea 끝에 추가
      try {
        const fallbackP = document.createElement('p');
        fallbackP.textContent = '\u200B';
        contentArea.appendChild(fallbackP);
        
        setTimeout(() => {
          const range = document.createRange();
          range.setStart(fallbackP, 0);
          range.collapse(true);
          
          const selection = util.selection.getSafeSelection();
          selection.removeAllRanges();
          selection.addRange(range);
          
          contentArea.focus();
        }, 10);
      } catch (e) {
        // 최후의 수단도 실패하면 무시
      }
    }
  }

  /**
   * ✅ 새 함수: 서식 상속 완전 차단
   */
  function createCleanParagraph() {
    const p = document.createElement('p');
    
    // ✅ 모든 가능한 서식 속성 초기화
    const cleanStyles = {
      display: '',
      whiteSpace: '',
      width: '',
      fontFamily: '',
      fontSize: '',
      fontWeight: '',
      fontStyle: '',
      textDecoration: '',
      backgroundColor: '',
      color: '',
      padding: '',
      margin: '',
      border: ''
    };
    
    Object.assign(p.style, cleanStyles);
    
    // ✅ 속성들도 제거
    ['contenteditable', 'class', 'id'].forEach(attr => {
      p.removeAttribute(attr);
    });
    
    p.textContent = '\u200B';
    
    return p;
  }
})();