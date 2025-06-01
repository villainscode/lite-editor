/**
 * LiteEditor Strike Plugin
 * 텍스트 취소선 서식 플러그인
 */

(function() {
  const PLUGIN_ID = 'strike';

  PluginUtil.registerInlineFormatPlugin(PLUGIN_ID, 'Strikethrough (⌘⇧S)', 'strikethrough_s', 'strikeThrough');
})();
