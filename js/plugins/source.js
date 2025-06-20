/**
 * LiteEditor Source Plugin
 * HTML 소스 보기/편집 플러그인
 */

(function() {
  const PLUGIN_ID = 'source';
  let isActive = false;
  
  /**
   * HTML 소스 버튼 아이콘 토글
   * @param {Element} contentArea - 에디터 콘텐츠 영역
   */
  function sourceAction(contentArea) {
    // 버튼 찾기
    const sourceButton = document.querySelector('.lite-editor-button[data-plugin="source"]');
    if (!sourceButton) return;
    
    // 아이콘 요소 찾기
    const icon = sourceButton.querySelector('.material-icons');
    if (!icon) return;
    
    // 토글
    if (!isActive) {
      // 활성화: html → edit
      sourceButton.classList.add('active');
      icon.textContent = 'wysiwyg';
      isActive = true;
      console.log('[SOURCE] 소스 모드 아이콘 활성화');
    } else {
      // 비활성화: edit → html
      sourceButton.classList.remove('active');
      icon.textContent = 'html';
      isActive = false;
      console.log('[SOURCE] Rich 모드 아이콘 복원');
    }
  }
  
  /**
   * 소스 플러그인 등록
   */
  if (window.LiteEditor && typeof LiteEditor.registerPlugin === 'function') {
    LiteEditor.registerPlugin(PLUGIN_ID, {
      title: 'HTML Source',
      icon: 'html',
      action: sourceAction
    });
  } else {
    console.error('[SOURCE] LiteEditor 플러그인 시스템을 찾을 수 없습니다.');
  }
})();
