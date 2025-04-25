/**
 * LiteEditor Numbered List Plugin
 * 순서 있는 목록 플러그인
 */

(function() {
  // PluginUtil의 registerPlugin 활용하여 플러그인 등록
  PluginUtil.registerPlugin('orderedList', {
    title: 'Numbered List',
    icon: 'format_list_numbered',
    action: function(contentArea, buttonElement, event) {
      // 이벤트 처리
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      
      // 포커스 확보
      contentArea.focus();
      
      // 순서 있는 목록 삽입 (기본 기능만 남김)
      document.execCommand('insertOrderedList', false, null);
    }
  });
})();