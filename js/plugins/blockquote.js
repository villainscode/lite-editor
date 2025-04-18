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
      } catch (e) {
        console.error('인용구 스타일 적용 오류:', e);
      }
    }, 50);
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
