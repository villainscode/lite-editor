/**
 * LiteEditor Bold Plugin
 * 텍스트 굵게 서식 플러그인
 */

(function() {
  /**
   * 굵게 플러그인 (format-utils.js의 공통 함수 활용)
   * 2025-03-30 리팩토링: 중복 코드 제거 및 applyInlineFormat 사용
   */
  LiteEditor.registerPlugin('bold', {
    title: 'Bold',
    icon: 'format_bold',
    action: function(contentArea, buttonElement, event) {
      // applyInlineFormat 함수를 활용하여 코드 중복 제거
      LiteEditorUtils.applyInlineFormat(contentArea, buttonElement, 'bold', event);
    }
  });
})();
