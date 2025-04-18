/**
 * LiteEditor Strike Plugin
 * 텍스트 취소선 서식 플러그인
 */

(function() {
  /**
   * 취소선 플러그인 (PluginUtil 유틸리티 활용)
   * 2025-03-30 리팩토링: PluginUtil.registerInlineFormatPlugin 활용
   */
  PluginUtil.registerInlineFormatPlugin('strikethrough', 'Strikethrough', 'strikethrough_s', 'strikeThrough');
})();
