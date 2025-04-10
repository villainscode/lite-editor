/**
 * LiteEditor List Plugins
 * 목록 관련 플러그인들: 순서 없는 목록, 순서 있는 목록, 체크리스트
 */

// 순서 없는 목록 플러그인
(function() {
  // Safe selection getter - adds error handling for selection retrieval
  function getSafeSelection() {
    try {
      return window.getSelection();
    } catch (error) {
      console.warn('Error getting selection:', error);
      return null;
    }
  }

  LiteEditor.registerPlugin('unorderedList', {
    title: 'Bullet List',
    icon: 'format_list_bulleted',
    customRender: function(toolbar, contentArea) {
      // 버튼 생성
      const unorderedButton = document.createElement('button');
      unorderedButton.className = 'lite-editor-button';
      unorderedButton.setAttribute('title', 'Bullet List');
      
      // 아이콘 추가
      const unorderedIcon = document.createElement('i');
      unorderedIcon.className = 'material-icons';
      unorderedIcon.textContent = 'format_list_bulleted';
      unorderedButton.appendChild(unorderedIcon);
      
      // 클릭 이벤트 추가
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
      
      return unorderedButton;
    }
  });
  
  // 순서 있는 목록 플러그인
  LiteEditor.registerPlugin('orderedList', {
    title: 'Numbered List',
    icon: 'format_list_numbered',
    customRender: function(toolbar, contentArea) {
      // 버튼 생성
      const orderedButton = document.createElement('button');
      orderedButton.className = 'lite-editor-button';
      orderedButton.setAttribute('title', 'Numbered List');
      
      // 아이콘 추가
      const orderedIcon = document.createElement('i');
      orderedIcon.className = 'material-icons';
      orderedIcon.textContent = 'format_list_numbered';
      orderedButton.appendChild(orderedIcon);
      
      // 클릭 이벤트 추가
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
      
      return orderedButton;
    }
  });
  
  // 체크리스트 플러그인
  LiteEditor.registerPlugin('checkList', {
    title: 'Check List',
    icon: 'checklist',
    customRender: function(toolbar, contentArea) {
      // 버튼 생성
      const checklistButton = document.createElement('button');
      checklistButton.className = 'lite-editor-button';
      checklistButton.setAttribute('title', 'Check List');

      // 아이콘 추가
      const checklistIcon = document.createElement('i');
      checklistIcon.className = 'material-icons';
      checklistIcon.textContent = 'checklist';
      checklistButton.appendChild(checklistIcon);
      
      // 클릭 이벤트 추가
      checklistButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 선택 영역 처리
        if (window.liteEditorSelection) {
          window.liteEditorSelection.save();
          contentArea.focus();
          window.liteEditorSelection.restore();
        }
        
        // 체크리스트 생성 로직 호출
        createChecklist(contentArea);
        
        if (window.liteEditorSelection) {
          window.liteEditorSelection.save();
        }
      });
      
      return checklistButton;
    }
  });
  
  // 체크리스트 생성 유틸리티 함수
  function createChecklist(contentArea) {
    const selection = getSafeSelection();
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
      const newList = selection.anchorNode.closest('ul');
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
})();
