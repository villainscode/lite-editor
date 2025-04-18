/**
 * LiteEditor Underline Plugin
 * 텍스트 밑줄 서식 플러그인
 */

(function() {
  /**
   * 밑줄 플러그인 (PluginUtil 유틸리티 활용)
   * 2025-03-30 리팩토링: PluginUtil.registerInlineFormatPlugin 활용
   */
  PluginUtil.registerInlineFormatPlugin('underline', 'Underline', 'format_underlined');
})();
