/**
 * LiteEditor Blockquote Plugin
 * 인용구(blockquote) 서식 플러그인
 */

(function() {
  // 인용구 플러그인
  LiteEditor.registerPlugin('blockquote', {
    title: 'Blockquote',
    icon: 'format_quote',
    action: function(contentArea, buttonElement, event) {
      // 이벤트 전파 제어
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      
      // 기존 toggleFormat 사용을 벗어나 직접 명령 실행
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
        } catch (e) {
          console.error('인용구 스타일 적용 오류:', e);
        }
      }, 50);
    }
  });
})();
