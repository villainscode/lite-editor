/**
 * LiteEditor Numbered List Plugin
 * - 순서 있는 목록 서식과 깊이별 스타일 적용 (선택한 리스트만 적용)
 * - 규칙: 011-numberlist-bulletlist-rule-agent.mdc
 */

(function() {
  // CSS 스타일 추가 함수
  function addNumberedListStyles() {
    if (document.getElementById('lite-editor-numbered-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'lite-editor-numbered-styles';
    style.textContent = `
      /* 깊이에 따른 리스트 스타일 지정 (3depth까지 고유, 4depth부터 순환) */
      [contenteditable="true"] ol { list-style-type: decimal; }
      [contenteditable="true"] ol ol { list-style-type: lower-alpha; }
      [contenteditable="true"] ol ol ol { list-style-type: lower-roman; }
      [contenteditable="true"] ol ol ol ol { list-style-type: decimal; }
      /* 단락 기본 여백 */
      [contenteditable="true"] p {
        margin: 8px 0;
      }
    `;
    document.head.appendChild(style);
  }

  // 스타일 추가
  addNumberedListStyles();

  // 플러그인 등록
  PluginUtil.registerPlugin('orderedList', {
    title: 'Numbered List',
    icon: 'format_list_numbered',
    action: function(contentArea, buttonElement, event) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      
      // 에디터에 포커스 설정
      contentArea.focus();
      
      // 브라우저 내장 명령어로 순서있는 리스트 토글
      document.execCommand('insertOrderedList', false, null);
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
  
  // 포커스 유지 기능 추가
  document.addEventListener('focusin', function(event) {
    const editor = event.target.closest('[contenteditable="true"]');
    if (editor) {
      editor.addEventListener('blur', function() {
        // 포커스 이벤트가 후에 동작하므로 약간 지연
        setTimeout(() => this.focus(), 0);
      }, { once: true });
    }
  });
  
  // Alt+O 단축키 등록 (numberedList.js는 Alt+O 사용)
  LiteEditor.registerShortcut('orderedList', {
    key: 'o',
    alt: true,
    action: function(contentArea) {
      // 에디터에 포커스 설정
      contentArea.focus();
      
      // 브라우저 내장 명령어로 순서있는 리스트 토글
      document.execCommand('insertOrderedList', false, null);
    }
  });
})();