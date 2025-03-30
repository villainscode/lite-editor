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
      // applyInlineFormat 함수를 활용하여 코드 중복 제거
      LiteEditorUtils.applyInlineFormat(contentArea, buttonElement, 'code', event);
    }
  });
})();
  