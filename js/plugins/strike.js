/**
 * LiteEditor Strike Plugin
 * 텍스트 취소선 서식 플러그인
 */

(function() {
  /**
   * 취소선 플러그인 (format-utils.js의 공통 함수 활용)
   * 2025-03-30 리팩토링: 중복 코드 제거 및 applyInlineFormat 사용
   */
  LiteEditor.registerPlugin('strike', {
    title: 'Strike',
    icon: 'strikethrough_s',
    action: function(contentArea, buttonElement, event) {
      // applyInlineFormat 함수를 활용하여 코드 중복 제거
      LiteEditorUtils.applyInlineFormat(contentArea, buttonElement, 'strikethrough', event);
    }
  });
})();
