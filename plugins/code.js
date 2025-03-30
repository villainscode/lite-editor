/**
 * LiteEditor Code Plugin
 * 텍스트 코드 서식 플러그인
 */

(function() {
  // 코드 플러그인 (MDN Selection API 기반 개선)
  LiteEditor.registerPlugin('code', {
    title: 'Code',
    icon: 'code',
    action: function(contentArea, buttonElement, event) {
      // 코드 태그는 특별한 처리가 필요하므로 전용 함수 사용
      LiteEditorUtils.applyCodeFormat(contentArea, buttonElement, event);
    }
  });
})();
  