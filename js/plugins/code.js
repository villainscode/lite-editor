/**
 * LiteEditor Code Plugin
 * 텍스트 코드 서식 플러그인
 */

(function() {
  /**
   * 코드 플러그인 (PluginUtil 유틸리티 활용)
   * 2025-03-30 리팩토링: PluginUtil.registerBlockFormatPlugin 활용
   */
  
  // 코드 서식 적용을 위한 커스텀 액션
  const applyCodeStyles = function(contentArea, buttonElement, event) {
    // 특별한 코드 처리 함수 사용
    LiteEditorUtils.applyCodeFormat(contentArea, buttonElement, event);
  };
  
  // PluginUtil을 사용하여 플러그인 등록
  PluginUtil.registerBlockFormatPlugin(
    'code',     // id
    'Code',     // title
    'code',     // icon
    'code',     // tag (실제 적용은 applyCodeFormat에서 처리)
    applyCodeStyles  // customAction
  );
})();
  