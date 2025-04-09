/**
 * LiteEditor table Plugin
 * 표만들기 플러그인
 */

(function() {
    // 표만들기 플러그인
    LiteEditor.registerPlugin('table', {
        title: 'Table',
        icon: 'grid_on', 
        customRender: function(toolbar, contentArea) {
            // 버튼 생성
            const tableButton = document.createElement('button');
            tableButton.className = 'lite-editor-button lite-editor-table-button';
            tableButton.setAttribute('title', 'Insert Table');

            // 아이콘 추가
            const tableIcon = document.createElement('i');
            tableIcon.className = 'material-icons';
            tableIcon.textContent = 'grid_on'; 
            tableButton.appendChild(tableIcon);
            
            // 클릭 이벤트 추가
            tableButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                //insertTable(contentArea);
            });
            
            // 버튼을 툴바에 추가 (반환하지 않음)
            toolbar.appendChild(tableButton);
        }
    });
})();


