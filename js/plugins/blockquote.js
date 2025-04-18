/**
 * LiteEditor Blockquote Plugin
 * 인용구(blockquote) 서식 플러그인
 */

(function() {
  /**
   * 인용구 플러그인 (PluginUtil 유틸리티 활용)
   * 2025-03-30 리팩토링: PluginUtil.registerBlockFormatPlugin 활용
   */
  
  // 인용구 스타일 적용을 위한 커스텀 액션
  const applyBlockquoteStyles = function(contentArea, buttonElement, event) {
    // 이벤트 전파 제어
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    // 기존 명령 실행
    document.execCommand('formatBlock', false, '<blockquote>');
    
    // blockquote에 기본 스타일 적용 (기존 코드 유지)
    setTimeout(() => {
      try {
        const blockquotes = contentArea.querySelectorAll('blockquote');
        blockquotes.forEach(quote => {
          if (!quote.style.borderLeft) {
            quote.style.borderLeft = '3px solid #ccc';
            quote.style.paddingLeft = '10px';
            quote.style.margin = '10px 0';
          }
        });
        
        // 엔터 키 이벤트 핸들러 설정
        setupBlockquoteEnterHandler(contentArea);
      } catch (e) {
        console.error('인용구 스타일 적용 오류:', e);
      }
    }, 50);
  };
  
  // 엔터 키 핸들러 설정
  const setupBlockquoteEnterHandler = function(contentArea) {
    // 이미 설정된 경우 중복 추가하지 않음
    if (contentArea.getAttribute('data-blockquote-handler') === 'true') {
      return;
    }
    
    contentArea.setAttribute('data-blockquote-handler', 'true');
    
    contentArea.addEventListener('keydown', function(e) {
      // 엔터 키 감지
      if (e.key === 'Enter') {
        // 현재 선택 범위 확인
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        const startNode = range.startContainer;
        
        // 가장 가까운 blockquote 찾기
        let blockquoteParent = null;
        let currentNode = startNode;
        
        while (currentNode && currentNode !== contentArea) {
          if (currentNode.nodeName.toLowerCase() === 'blockquote') {
            blockquoteParent = currentNode;
            break;
          }
          currentNode = currentNode.parentNode;
        }
        
        // blockquote 내부에서 엔터를 눌렀을 때 기본 동작 대체
        if (blockquoteParent) {
          // 기본 동작 방지
          e.preventDefault();
          
          // 텍스트 노드 내용이 비어있거나 커서가 끝에 있는 경우 blockquote 벗어나기
          if ((startNode.nodeType === 3 && startNode.nodeValue.trim() === '') || 
              (startNode.nodeType === 3 && range.startOffset === startNode.nodeValue.length) ||
              (startNode.nodeType === 1 && startNode.innerHTML === '<br>')) {
            
            // blockquote 다음에 새 p 요소 추가
            const newP = document.createElement('p');
            newP.innerHTML = '<br>';
            
            // blockquote 다음에 삽입
            if (blockquoteParent.nextSibling) {
              blockquoteParent.parentNode.insertBefore(newP, blockquoteParent.nextSibling);
            } else {
              blockquoteParent.parentNode.appendChild(newP);
            }
            
            // 커서를 새 p 요소로 이동
            const newRange = document.createRange();
            newRange.setStart(newP, 0);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
          } else {
            // 일반 엔터 처리 - blockquote 내부에서 줄바꿈
            document.execCommand('insertHTML', false, '<br>');
          }
        }
      }
    });
  };
  
  // PluginUtil을 사용하여 플러그인 등록
  PluginUtil.registerBlockFormatPlugin(
    'blockquote',  // id
    'Blockquote',  // title
    'format_quote', // icon
    'blockquote',  // tag
    applyBlockquoteStyles  // customAction
  );
})();
