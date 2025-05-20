/**
 * LiteEditor Bullet List Plugin
 * - 불릿 리스트 서식과 깊이별 스타일 적용 (선택한 리스트만 적용)
 * - 규칙: 011-numberlist-bulletlist-rule-agent.mdc
 */
(function() {
  // CSS 스타일 추가 함수
  function addBulletListStyles() {
    if (document.getElementById('lite-editor-bullet-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'lite-editor-bullet-styles';
    style.textContent = `
      [contenteditable="true"] ul { list-style-type: disc; }
      [contenteditable="true"] ul ul { list-style-type: circle; }
      [contenteditable="true"] ul ul ul { list-style-type: square; }
      [contenteditable="true"] ul ul ul ul { list-style-type: disc; }
      [contenteditable="true"] ul ul ul ul ul { list-style-type: circle; }

      /* 기본 paragraph 스타일 */
      [contenteditable="true"] p {
        margin: 8px 0;
      }
    `;
    document.head.appendChild(style);
  }

  // 스타일 추가
  addBulletListStyles();

  // 플러그인 등록
  PluginUtil.registerPlugin('unorderedList', {
    title: 'Bullet List',
    icon: 'format_list_bulleted',
    action: function(contentArea, buttonElement, event) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      
      // 에디터에 포커스 설정
      contentArea.focus();
      // 브라우저 내장 명령어로 불릿 리스트 토글
      document.execCommand('insertUnorderedList', false, null);
    }
  });
  
  // Tab/Shift+Tab 키로 들여쓰기/내어쓰기 이벤트 처리
  document.addEventListener('keydown', function(event) {
    if (event.key !== 'Tab') return;
    
    // 에디터 영역 찾기
    const contentArea = event.target.closest('[contenteditable="true"]');
    if (!contentArea) return;
    
    // 기본 동작 방지
    event.preventDefault();
    
    // Shift 키 여부에 따라 들여쓰기 또는 내어쓰기 실행
    if (event.shiftKey) {
      document.execCommand('outdent', false, null);
    } else {
      document.execCommand('indent', false, null);
    }
    
    // 에디터에 다시 포커스
    contentArea.focus();
  }, true);
})();