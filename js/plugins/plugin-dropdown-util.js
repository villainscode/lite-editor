/**
 * LiteEditor 드롭다운 유틸리티
 * 드롭다운 관련 공통 기능 제공
 */
(function() {
  // 기존 PluginUtil 객체가 있는지 확인
  if (!window.PluginUtil) {
    console.error('PluginUtil이 정의되지 않았습니다. plugin-util.js가 먼저 로드되었는지 확인하세요.');
    return;
  }
  
  // 드롭다운 유틸리티 추가
  window.PluginUtil.dropdown = {
    /**
     * 드롭다운 공통 기능 설정
     */
    setupDropdown: function(button, dropdownMenu, params) {
      const options = params || {};
      
      // 이미 설정된 경우 처리 방지
      if (button._dropdownSetup) return;
      button._dropdownSetup = true;
      
      return {
        // 여기에 공통 함수 구현
        // 기존 플러그인의 기능을 망가뜨리지 않도록 주의
      };
    }
  };
})();