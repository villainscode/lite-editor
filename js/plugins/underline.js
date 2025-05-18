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
  
  // 밑줄 기능 실행 함수
  function applyUnderline(contentArea) {
    document.execCommand('underline', false, null);
  }
  
  // Mac용 단축키 (Cmd+U)
  LiteEditor.registerShortcut('underline', {
    key: 'u',
    meta: true,
    action: function(contentArea) {
      applyUnderline(contentArea);
    }
  });
  
  // Windows/Linux용 단축키 (Ctrl+U)
  LiteEditor.registerShortcut('underline', {
    key: 'u',
    ctrl: true,
    action: function(contentArea) {
      applyUnderline(contentArea);
    }
  });

  // Underline 단축키 (Alt+U)
  LiteEditor.registerShortcut('underline', {
    key: 'u',
    alt: true,
    action: function(contentArea) {
      document.execCommand('underline', false, null);
    }
  });
})();
