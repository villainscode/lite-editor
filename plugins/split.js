/**
 * LiteEditor split Plugin
 * 분할 화면 플러그인
 */

(function() {
    // 화면 분할 플러그인
    LiteEditor.registerPlugin('split', {
        title: 'Split Screen',
        icon: 'view_column', // 대체 아이콘 사용
        customRender: function(toolbar, contentArea) {
            // 버튼 생성
            const splitButton = document.createElement('button');
            splitButton.className = 'lite-editor-button lite-editor-split-button';
            splitButton.setAttribute('title', 'Split Screen');

            // 아이콘 추가
            const splitIcon = document.createElement('i');
            splitIcon.className = 'material-icons';
            splitIcon.textContent = 'view_column'; 
            splitButton.appendChild(splitIcon);
            
            // 클릭 이벤트 추가
            splitButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                splitScreen(contentArea);
            });
            
            // 버튼을 툴바에 추가
            toolbar.appendChild(splitButton);
        }
    });
})();


