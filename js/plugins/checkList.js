/**
 * LiteEditor Check List Plugin
 * 체크박스가 포함된 목록 플러그인
 */

(function() {
  // 체크리스트 생성 함수
  function createChecklist(contentArea) {
    // PluginUtil 사용하여 안전하게 Selection 획득
    const selection = PluginUtil.selection.getSafeSelection();
    if (!selection || !selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    
    if (!selectedText.trim()) return;
    
    // 기존 리스트 확인
    const parentList = range.commonAncestorContainer.closest('ul, ol');
    
    if (parentList) {
      // 기존 리스트를 체크리스트로 변환
      const items = parentList.querySelectorAll('li');
      items.forEach(item => {
        // 체크박스가 이미 있는지 확인
        if (!item.querySelector('input[type="checkbox"]')) {
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.className = 'lite-editor-checkbox';
          item.insertBefore(checkbox, item.firstChild);
        }
      });
      
      // 클래스 추가
      parentList.classList.add('lite-editor-checklist');
    } else {
      // 새 체크리스트 생성
      // 우선 순서 없는 목록 생성
      document.execCommand('insertUnorderedList', false, null);
      
      // 새로 생성된 리스트 찾기
      let node = selection.anchorNode;
      // 텍스트 노드면 부모 요소로 이동
      if (node.nodeType === Node.TEXT_NODE) {
        node = node.parentNode;
      }
      const newList = node.closest('ul');
      if (newList) {
        newList.classList.add('lite-editor-checklist');
        
        // 항목에 체크박스 추가
        const items = newList.querySelectorAll('li');
        items.forEach(item => {
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.className = 'lite-editor-checkbox';
          item.insertBefore(checkbox, item.firstChild);
        });
      }
    }
  }

  // 체크리스트 플러그인 등록
  PluginUtil.registerPlugin('checkList', {
    title: 'Check List',
    icon: 'checklist',
    action: function(contentArea, buttonElement, event) {
      // 이벤트 처리
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      
      // 포커스 확보
      contentArea.focus();
      
      // 선택 영역 저장 및 복원
      if (window.liteEditorSelection) {
        window.liteEditorSelection.save();
        window.liteEditorSelection.restore();
      }
      
      // 체크리스트 생성
      createChecklist(contentArea);
      
      // 변경 후 선택 영역 저장
      if (window.liteEditorSelection) {
        window.liteEditorSelection.save();
      }
    }
  });
})();
