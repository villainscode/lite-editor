/**
 * LiteEditor Blockquote Plugin
 * 인용구(blockquote) 서식 플러그인 - 단순화 버전
 */

(function() {
  // 전역 이벤트 리스너가 등록되었는지 확인하는 플래그
  if (!document.querySelector('[data-blockquote-enter-handler]')) {
    // 문서 레벨에서 한 번만 이벤트 핸들러 등록
    document.addEventListener('keydown', function(e) {
      // Enter 키가 아니면 무시
      if (e.key !== 'Enter') return;
      
      // contenteditable 요소 찾기
      const contentArea = e.target.closest('[contenteditable="true"]');
      if (!contentArea) return;
      
      // selection 객체 가져오기 (PluginUtil 활용)
      const selection = PluginUtil.selection.getSafeSelection();
      if (!selection || !selection.rangeCount) return;
      
      const range = selection.getRangeAt(0);
      
      // 부모 blockquote 찾기
      let node = range.startContainer;
      let blockquote = null;
      
      while (node && node !== contentArea) {
        if (node.nodeName.toLowerCase() === 'blockquote') {
          blockquote = node;
          break;
        }
        node = node.parentNode;
      }
      
      // blockquote 내부에서 Enter 키 눌렀을 때
      if (blockquote && !e.shiftKey) {
        e.preventDefault();
        
        // p 태그 생성 및 삽입
        const newP = document.createElement('p');
        newP.innerHTML = '<br>';
        
        if (blockquote.nextSibling) {
          blockquote.parentNode.insertBefore(newP, blockquote.nextSibling);
        } else {
          blockquote.parentNode.appendChild(newP);
        }
        
        // 커서 이동
        const newRange = document.createRange();
        newRange.setStart(newP, 0);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    });
    
    // 중복 등록 방지를 위한 마커 추가
    const marker = document.createElement('span');
    marker.style.display = 'none';
    marker.setAttribute('data-blockquote-enter-handler', 'true');
    document.body.appendChild(marker);
  }
  
  // 플러그인 등록 - 기본 동작만 사용
  PluginUtil.registerBlockFormatPlugin(
    'blockquote',
    'Blockquote',
    'format_quote',
    'blockquote',
    null  // 커스텀 액션 없음 - 기본 문서 명령 사용
  );
})();
