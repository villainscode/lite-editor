/**
 * LiteEditor Italic Plugin
 * 텍스트 기울임 서식 플러그인
 */

(function() {
  const PLUGIN_ID = 'italic';
  
  /**
   * 기울임 적용 액션
   * @param {Element} contentArea - 에디터 콘텐츠 영역
   */
  function italicAction(contentArea) {
    document.execCommand('italic', false, null);
  }
  
  /**
   * 기울임 플러그인 (PluginUtil 유틸리티 활용)
   */
  PluginUtil.registerInlineFormatPlugin(PLUGIN_ID, 'Italic (⌘I)', 'format_italic');
  
  // 단축키 등록
  LiteEditor.registerShortcut(PLUGIN_ID, {
    key: 'i',
    ctrl: true,  // Windows/Linux는 Ctrl+I
    action: italicAction
  });
  
  // Mac용 단축키 추가 (⌘+I)
  LiteEditor.registerShortcut(PLUGIN_ID, {
    key: 'i',
    meta: true,  // Mac은 ⌘+I
    action: italicAction
  });

})();
