/**
 * LiteEditor split Plugin
 * 코드 블럭 플러그인
 */

(function() {
    LiteEditor.registerPlugin('codeBlock', {
        title: 'Code Block',
        icon: 'code_blocks', // 대체 아이콘 사용
        customRender: function(toolbar, contentArea) {
            // 버튼 생성
            const codeBlockButton = document.createElement('button');
            codeBlockButton.className = 'lite-editor-button lite-editor-code-block-button';
            codeBlockButton.setAttribute('title', 'Code Block');

            // 아이콘 추가
            const codeBlockIcon = document.createElement('i');
            codeBlockIcon.className = 'material-icons';
            codeBlockIcon.textContent = 'data_object'; 
            codeBlockButton.appendChild(codeBlockIcon);
            
            // 클릭 이벤트 추가
            codeBlockButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // splitScreen(contentArea);
            });
            
            // 버튼을 툴바에 추가
            toolbar.appendChild(codeBlockButton);
        }
    });
})();