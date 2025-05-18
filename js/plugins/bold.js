/**
 * LiteEditor Bold Plugin
 * 텍스트 굵게 서식 플러그인
 */

(function() {
  const PLUGIN_ID = 'bold';
  
  /**
   * 굵게 적용 액션
   * @param {Element} contentArea - 에디터 콘텐츠 영역
   */
  function boldAction(contentArea) {
    document.execCommand('bold', false, null);
  }
  
  /**
   * 굵게 플러그인 (PluginUtil 유틸리티 활용)
   * 2025-03-30 리팩토링: PluginUtil.registerInlineFormatPlugin 활용
   */
  PluginUtil.registerInlineFormatPlugin(PLUGIN_ID, 'Bold (⌘B)', 'format_bold');
  
  // 단축키 등록
  LiteEditor.registerShortcut(PLUGIN_ID, {
    key: 'b',
    ctrl: true,  // Windows/Linux는 Ctrl+B
    action: boldAction
  });
  
  // Mac용 단축키 추가 (⌘+B)
  LiteEditor.registerShortcut(PLUGIN_ID, {
    key: 'b',
    meta: true,  // Mac은 ⌘+B
    action: boldAction
  });

  // Bold 단축키 (Alt+B)
  LiteEditor.registerShortcut('bold', {
    key: 'b',
    alt: true,
    action: function(contentArea) {
      document.execCommand('bold', false, null);
    }
  });
})();
