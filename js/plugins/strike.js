/**
 * LiteEditor Strike Plugin
 * 텍스트 취소선 서식 플러그인
 */

(function() {
  const PLUGIN_ID = 'strike';

  // 취소선 적용 액션
  function strikeAction(contentArea) {
    document.execCommand('strikeThrough', false, null);
  }

  // 플러그인 등록
  PluginUtil.registerInlineFormatPlugin(PLUGIN_ID, 'Strikethrough (⌘⇧S)', 'strikethrough_s', 'strikeThrough');

  // Mac/Win 공통: cmd/ctrl + shift + s (캡처링 단계에서 강제 처리)
  document.addEventListener('keydown', function(e) {
    // 에디터 영역 찾기
    const contentArea = e.target.closest('[contenteditable=\"true\"]');
    if (!contentArea) return;

    // Mac: ⌘+Shift+S, Windows/Linux: Ctrl+Shift+S
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key.toLowerCase() === 's' || e.key === 'ㄴ')) {
      e.preventDefault();
      e.stopImmediatePropagation(); // 시스템 핸들러보다 먼저 처리
      strikeAction(contentArea);
    }
  }, true); // 캡처링 단계

  // 기존 LiteEditor.registerShortcut 등록도 유지(테스트/접근성 호환)
  LiteEditor.registerShortcut(PLUGIN_ID, {
    key: 's',
    meta: true,
    shift: true,
    action: strikeAction
  });
  
})();
