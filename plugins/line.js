

/**
 * LiteEditor line Plugin
 * 라인 삽입 플러그인
 */

(function() {
    LiteEditor.registerPlugin('line', {
        title: 'Insert Line',
        icon: 'drag_handle', 
        customRender: function(toolbar, contentArea) {
            // 버튼 생성
            const lineButton = document.createElement('button');
            lineButton.className = 'lite-editor-button lite-editor-line-button';
            lineButton.setAttribute('title', 'Insert Line');

            // 아이콘 추가
            const lineIcon = document.createElement('i');
            lineIcon.className = 'material-icons';
            lineIcon.textContent = 'drag_handle';
            lineButton.appendChild(lineIcon);
            
            // 클릭 이벤트 추가
            lineButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                // 버튼의 아이콘 요소 찾기
                const iconElement = lineButton.querySelector('i.material-icons');
                
                // 아이콘 요소의 텍스트 내용(아이콘 이름) 가져오기
                if (iconElement) {
                    const iconName = iconElement.textContent || iconElement.innerText;
                    alert('아이콘 이름: ' + iconName);
                } else {
                    alert('아이콘을 찾을 수 없습니다');
                }
                // insertLine(contentArea);
            });
            
            // 버튼을 툴바에 추가
            toolbar.appendChild(lineButton);
        }
    });
})();


