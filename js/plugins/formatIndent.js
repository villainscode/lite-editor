/**
 * LiteEditor Indentation Plugin
 * 들여쓰기 및 내어쓰기 통합 플러그인
 */

(function() {
  function normalizeIndent(contentArea) {
    // 모든 blockquote 들여쓰기 강제
    contentArea.querySelectorAll('blockquote').forEach(bq => {
      bq.style.marginLeft   = '1.5em';
      bq.style.marginRight  = '0';
    });
  }
  // 들여쓰기 플러그인
  LiteEditor.registerPlugin('formatIndent', {
    title: 'Indentation',
    icon: 'format_indent_increase',
    customRender: function(toolbar, contentArea) {
      // 버튼 컨테이너 생성 - 들여쓰기 증가
      const increaseContainer = document.createElement('div');
      increaseContainer.className = 'lite-editor-button';
      increaseContainer.setAttribute('title', 'Increase Indent');
      
      // 아이콘 추가
      const increaseIcon = document.createElement('i');
      increaseIcon.className = 'material-icons';
      increaseIcon.textContent = 'format_indent_increase';
      increaseContainer.appendChild(increaseIcon);
      
      // 버튼 컨테이너 생성 - 들여쓰기 감소
      const decreaseContainer = document.createElement('div');
      decreaseContainer.className = 'lite-editor-button';
      decreaseContainer.setAttribute('title', 'Decrease Indent');
      
      // 아이콘 추가
      const decreaseIcon = document.createElement('i');
      decreaseIcon.className = 'material-icons';
      decreaseIcon.textContent = 'format_indent_decrease';
      decreaseContainer.appendChild(decreaseIcon);
      
      // 들여쓰기 증가 클릭 이벤트
      increaseContainer.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 선택 영역 관리
        if (window.liteEditorSelection) {
          window.liteEditorSelection.restore();
        }
        
        // 명령 실행
        document.execCommand('indent', false, null);
        
        // 포커스 유지
        contentArea.focus();
        
        // 들여쓰기 간격 일관성 유지
        normalizeIndent(contentArea);
        
        // 변경 효과 확인을 위해 다시 선택 영역 저장
        if (window.liteEditorSelection) {
          window.liteEditorSelection.save();
        }
      });
      
      // 들여쓰기 감소 클릭 이벤트
      decreaseContainer.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 선택 영역 관리
        if (window.liteEditorSelection) {
          window.liteEditorSelection.restore();
        }
        
        // 명령 실행
        document.execCommand('outdent', false, null);
        
        // 포커스 유지
        contentArea.focus();
        
        // 들여쓰기 간격 일관성 유지
        normalizeIndent(contentArea);
        
        // 변경 효과 확인을 위해 다시 선택 영역 저장
        if (window.liteEditorSelection) {
          window.liteEditorSelection.save();
        }
      });
      
      // 툴바에 버튼 추가
      toolbar.appendChild(increaseContainer);
      toolbar.appendChild(decreaseContainer);
      
      // 두 버튼을 감싸는 컨테이너 반환
      const containerWrapper = document.createElement('div');
      containerWrapper.style.display = 'contents';
      containerWrapper.appendChild(increaseContainer);
      containerWrapper.appendChild(decreaseContainer);
      
      return containerWrapper;
    }
  });
})();
