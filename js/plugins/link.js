/**
 * LiteEditor Link Plugin
 * 링크 삽입 및 편집 플러그인
 */

(function() {
    // 상수 및 변수 선언
    const PLUGIN_ID = 'link';
    const STYLE_ID = 'linkStyles';
    const CSS_PATH = 'css/plugins/link.css';

    // 모달 템플릿
    const template = `
    <div class="modal-overlay">
        <div class="modal-content">            
            <div class="input-container">
                <label>Link URL</label>
                <input type="text" placeholder="https://">
            </div>
            
            <div class="button-container">
                <button type="button" data-action="close" title="Cancel">
                    <span class="material-icons">close</span>
                </button>
                <button type="submit" title="Insert">
                    <span class="material-icons">add_circle</span>
                </button>
            </div>
        </div>
    </div>`;

    // 링크 플러그인 등록
    LiteEditor.registerPlugin(PLUGIN_ID, {
        title: 'Link',
        icon: 'link',
        customRender: function(toolbar, contentArea) {
            // CSS 로드
            if (!document.querySelector(`#${STYLE_ID}`)) {
                const styleSheet = document.createElement('link');
                styleSheet.id = STYLE_ID;
                styleSheet.rel = 'stylesheet';
                styleSheet.href = CSS_PATH;
                document.head.appendChild(styleSheet);
            }

            // 버튼 생성
            const button = document.createElement('button');
            button.className = 'lite-editor-button lite-editor-link-button';
            button.setAttribute('title', 'Insert link');

            // 아이콘 추가
            const icon = document.createElement('i');
            icon.className = 'material-icons';
            icon.textContent = 'link';
            button.appendChild(icon);
            
            // 버튼 클릭 이벤트
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // 선택된 텍스트 확인
                const selection = window.getSelection();
                if (!selection || !selection.toString().trim()) {
                    LiteEditorModal.alert('텍스트를 선택한 후 링크를 적용해주세요.');
                    return;
                }
                
                // 선택 영역 저장
                if (window.liteEditorSelection) {
                    window.liteEditorSelection.save();
                }
                
                // 모달 생성
                const modalContainer = document.createElement('div');
                modalContainer.innerHTML = template;
                const modal = modalContainer.firstElementChild;
                document.body.appendChild(modal);
                
                // 요소 참조
                const urlInput = modal.querySelector('input[type="text"]');
                const closeButton = modal.querySelector('button[data-action="close"]');
                const submitButton = modal.querySelector('button[type="submit"]');
                
                // 위치 설정
                const buttonRect = button.getBoundingClientRect();
                modal.style.position = 'absolute';
                modal.style.top = (buttonRect.bottom + window.scrollY) + 'px';
                modal.style.left = (buttonRect.left + window.scrollX) + 'px';
                modal.style.zIndex = '10000';
                
                // 입력 필드 클릭 시 버블링 방지
                urlInput.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
                
                // 입력 필드에 포커스 추가
                urlInput.addEventListener('focus', (e) => {
                    e.stopPropagation();
                });
                
                // 모달 내 클릭 시 닫히지 않도록
                modal.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
                
                // 모달 표시 및 입력란 포커스
                modal.classList.add('show');
                
                // 포커스 지연 설정
                setTimeout(() => {
                    urlInput.focus();
                }, 50);
                
                // 외부 클릭 시 닫기 - 지연 설정으로 초기 클릭 방지
                let clickHandlerActive = false;
                setTimeout(() => {
                    clickHandlerActive = true;
                }, 300);
                
                const closeOnOutsideClick = (evt) => {
                    if (!clickHandlerActive) return;
                    if (!modal.contains(evt.target) && evt.target !== button) {
                        document.removeEventListener('click', closeOnOutsideClick);
                        modal.classList.remove('show');
                        setTimeout(() => {
                            modal.remove();
                        }, 300);
                    }
                };
                
                document.addEventListener('click', closeOnOutsideClick);
                
                // Esc 키로 닫기
                const escapeKeyClose = (evt) => {
                    if (evt.key === 'Escape') {
                        document.removeEventListener('keydown', escapeKeyClose);
                        modal.classList.remove('show');
                        setTimeout(() => {
                            modal.remove();
                        }, 300);
                    }
                };
                
                document.addEventListener('keydown', escapeKeyClose);
                
                // 닫기 버튼
                closeButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    document.removeEventListener('click', closeOnOutsideClick);
                    document.removeEventListener('keydown', escapeKeyClose);
                    modal.classList.remove('show');
                    setTimeout(() => modal.remove(), 300);
                });
                
                // Enter 키로 제출
                urlInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        submitButton.click();
                    }
                });
                
                // 제출 버튼
                submitButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // URL 가져오기
                    let url = urlInput.value.trim();
                    
                    // URL이 비어있으면 처리하지 않음
                    if (!url) return;
                    
                    // 프로토콜이 없으면 https:// 추가
                    if (!/^https?:\/\//i.test(url)) {
                        url = 'https://' + url;
                    }
                    
                    // 이벤트 리스너 제거
                    document.removeEventListener('click', closeOnOutsideClick);
                    document.removeEventListener('keydown', escapeKeyClose);
                    
                    // 선택 영역 복원
                    if (window.liteEditorSelection) {
                        window.liteEditorSelection.restore();
                    }
                    
                    // 링크 생성
                    document.execCommand('createLink', false, url);
                    
                    // 생성된 링크에 target="_blank" 추가
                    const links = contentArea.querySelectorAll('a[href="' + url + '"]');
                    for (let i = 0; i < links.length; i++) {
                        links[i].setAttribute('target', '_blank');
                    }
                    
                    // 변경 이벤트 발생
                    contentArea.dispatchEvent(new Event('input', { bubbles: true }));
                    
                    // 모달 닫기
                    modal.classList.remove('show');
                    setTimeout(() => modal.remove(), 300);
                });
            });
            
            // 버튼을 툴바에 추가
            toolbar.appendChild(button);
        }
    });
})();
