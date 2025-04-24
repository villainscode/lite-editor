/**
 * LiteEditor Bold Plugin
 * 텍스트 굵게 서식 플러그인
 */

(function() {
  /**
   * 굵게 플러그인 (PluginUtil 유틸리티 활용)
   * 2025-03-30 리팩토링: PluginUtil.registerInlineFormatPlugin 활용
   */
  PluginUtil.registerInlineFormatPlugin('bold', 'Bold', 'format_bold');
})();
