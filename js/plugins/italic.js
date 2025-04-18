/**
 * LiteEditor Italic Plugin
 * 텍스트 기울임 서식 플러그인
 */

(function() {
  /**
   * 기울임 플러그인 (PluginUtil 유틸리티 활용)
   * 2025-03-30 리팩토링: PluginUtil.registerInlineFormatPlugin 활용
   */
  PluginUtil.registerInlineFormatPlugin('italic', 'Italic', 'format_italic');
})();
