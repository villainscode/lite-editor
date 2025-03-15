/**
 * LiteEditor List Plugin
 * 순서 및 비순서 목록 플러그인
 */

(function() {
  // 목록 플러그인
  LiteEditor.registerPlugin('list', {
    title: 'List',
    icon: 'format_list_bulleted',
    customRender: function(toolbar, contentArea) {
      // 컨테이너 생성
      const listContainer = document.createElement('div');
      listContainer.style.display = 'flex';
      
      // 순서 없는 목록 버튼
      const unorderedButton = document.createElement('button');
      unorderedButton.className = 'lite-editor-button';
      unorderedButton.setAttribute('title', 'Bullet List');
      
      const unorderedIcon = document.createElement('i');
      unorderedIcon.className = 'material-icons';
      unorderedIcon.textContent = 'format_list_bulleted';
      unorderedButton.appendChild(unorderedIcon);
      
      // 순서 있는 목록 버튼
      const orderedButton = document.createElement('button');
      orderedButton.className = 'lite-editor-button';
      orderedButton.setAttribute('title', 'Numbered List');
      
      const orderedIcon = document.createElement('i');
      orderedIcon.className = 'material-icons';
      orderedIcon.textContent = 'format_list_numbered';
      orderedButton.appendChild(orderedIcon);
      
      // 순서 없는 목록 버튼 클릭 이벤트
      unorderedButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 선택 영역 처리
        if (window.liteEditorSelection) {
          window.liteEditorSelection.save();
          contentArea.focus();
          window.liteEditorSelection.restore();
        }
        
        document.execCommand('insertUnorderedList', false, null);
        
        if (window.liteEditorSelection) {
          window.liteEditorSelection.save();
        }
      });
      
      // 순서 있는 목록 버튼 클릭 이벤트
      orderedButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 선택 영역 처리
        if (window.liteEditorSelection) {
          window.liteEditorSelection.save();
          contentArea.focus();
          window.liteEditorSelection.restore();
        }
        
        document.execCommand('insertOrderedList', false, null);
        
        if (window.liteEditorSelection) {
          window.liteEditorSelection.save();
        }
      });
      
      // 버튼 추가
      listContainer.appendChild(unorderedButton);
      listContainer.appendChild(orderedButton);
      
      return listContainer;
    }
  });
})();
