/**
 * LiteEditor Strike Plugin
 * 텍스트 취소선 서식 플러그인
 */

(function() {
  const PLUGIN_ID = 'strike';
  // 플러그인 등록 시 command 파라미터 추가
  PluginUtil.registerInlineFormatPlugin(PLUGIN_ID, 'Strikethrough (⌘⇧S)', 'strikethrough_s', 'strikeThrough');
  
  // 전역 이벤트 리스너 등록 (캡처링 단계)
  document.addEventListener('keydown', function(e) {
    // 에디터 영역 찾기
    const contentArea = e.target.closest('[contenteditable="true"]');
    if (!contentArea) return;
    
    // Mac: ⌘+Shift+S, Windows/Linux: Ctrl+Shift+S
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && 
        (e.key.toLowerCase() === 's' || e.key === 'ㄴ')) {
      e.preventDefault();
      e.stopPropagation();
      document.execCommand('strikeThrough', false, null);
    }
  }, true); // 캡처링 단계에서 처리
})();
