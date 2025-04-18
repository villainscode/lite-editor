/**
 * LiteEditor Code Block Plugin
 * 코드 블럭 플러그인
 */

(function() {
  /**
   * 코드 블럭 플러그인 (PluginUtil 유틸리티 활용)
   * 2025-03-30 리팩토링: PluginUtil 스타일의 구조로 수정
   */
  
  // 코드 블럭 UI 및 이벤트 처리를 위한 커스텀 렌더러
  const renderCodeBlockButton = function(toolbar, contentArea) {
    // 버튼 생성 - PluginUtil 활용
    const codeBlockButton = PluginUtil.dom.createElement('button', {
      className: 'lite-editor-button lite-editor-code-block-button',
      title: 'Code Block'
    });

    // 아이콘 추가 - PluginUtil 활용
    const codeBlockIcon = PluginUtil.dom.createElement('i', {
      className: 'material-icons',
      textContent: 'data_object'
    });
    codeBlockButton.appendChild(codeBlockIcon);
    
    // 클릭 이벤트 추가
    codeBlockButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      // splitScreen(contentArea); - 기존 주석 유지
    });
    
    // 버튼 반환 (toolbar에는 자동으로 추가됨)
    return codeBlockButton;
  };
  
  // LiteEditor에 플러그인 등록 (customRender 사용)
  LiteEditor.registerPlugin('codeBlock', {
    title: 'Code Block',
    icon: 'code_blocks', // 대체 아이콘 사용
    customRender: renderCodeBlockButton
  });
})();