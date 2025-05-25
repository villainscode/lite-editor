/**
 * LiteEditor imageUpload Plugin - 리셋 버전
 * 이미지 업로드 기본 기능만 포함
 */
(function() {
    const util = window.PluginUtil || {};
    
    // 상수 및 변수 선언
    const PLUGIN_ID = 'imageUpload';
    const STYLE_ID = 'imageUploadStyles';
    const CSS_PATH = 'css/plugins/imageUpload.css';
    let isEventHandlerRegistered = false;
    let savedRange = null;

    // 🔧 selection 저장 함수
    function saveSelection() {
        savedRange = util.selection ? util.selection.saveSelection() : null;
    }

    // 🔧 에디터 요소 찾기
    function getEditorElements() {
        return {
            container: document.querySelector('#lite-editor'),
            content: document.querySelector('.lite-editor-content')
        };
    }

    // 🔧 모달 템플릿
    const template = `
    <div class="modal-overlay">
        <div class="modal-content">            
            <div>
                <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #333;">Insert Image</h3>
                
                <div style="margin-bottom: 10px;">
                    <label style="display: block; font-size: 13px; font-weight: 500; color: #666; margin-bottom: 4px;">
                    URL
                    </label>
                    <input type="url" 
                           id="image-url-input"
                           placeholder="https://" 
                           style="width: 100%; padding: 6px 8px; font-size: 13px; border: 1px solid #ccc; border-radius: 4px; outline: none;">
                </div>
                
                <div style="display: flex; align-items: center; margin: 15px 0;">
                    <div style="font-size: 11px; color: #888; margin-right: 8px;">OR</div>
                    <div style="flex-grow: 1; height: 1px; background-color: #e0e0e0;"></div>
                </div>

                <div style="margin-bottom: 10px;">
                    <label style="display: block; font-size: 13px; font-weight: 500; color: #666; margin-bottom: 4px;">
                     File
                    </label>
                    <div style="display: flex; align-items: center; justify-content: center; width: 100%;">
                        <label style="width: 100%; display: flex; flex-direction: column; align-items: center; padding: 10px; background-color: #f8f9fa; color: #666; border-radius: 4px; border: 1px dashed #ccc; cursor: pointer;">
                            <span class="material-icons" style="font-size: 20px; margin-bottom: 4px;">add_photo_alternate</span>
                            <span style="font-size: 12px;">Select a File</span>
                            <input type="file" id="image-file-input" style="display: none;" accept="image/*">
                        </label>
                    </div>
                </div>
            </div>
            
            <div style="display: flex; justify-content: flex-end;">
                <button type="submit"
                        style="display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 4px; border: none; background-color: transparent; cursor: pointer;"
                        title="Insert">
                    <span class="material-icons" style="font-size: 18px; color: #5f6368;">add_circle</span>
                </button>
            </div>
        </div>
    </div>`;

    // 모달 관리 함수들
    function closeModal(modal) {
        if (!modal) return;
        
        modal.classList.remove('show');
        modal.style.opacity = '0';
        modal.style.visibility = 'hidden';
        
        if (util.activeModalManager) {
            util.activeModalManager.unregister(modal);
        }
        
        setTimeout(() => modal.remove(), 300);
    }

    function createModal() {
        saveSelection();

        const existingModal = document.querySelector('.modal-overlay');
        if (existingModal) existingModal.remove();

        const modalContainer = util.dom ? util.dom.createElement('div') : document.createElement('div');
        modalContainer.innerHTML = template;
        const modal = modalContainer.firstElementChild;
        document.body.appendChild(modal);

        setupModalEvents(modal);
        return modal;
    }

    function setupModalEvents(modal) {
        const insertButton = modal.querySelector('button[type="submit"]');
        const urlInput = modal.querySelector('#image-url-input');
        const fileInput = modal.querySelector('#image-file-input');

        const button = document.querySelector('.lite-editor-image-upload-button');
        if (util.setupOutsideClickHandler) {
            util.setupOutsideClickHandler(modal, () => closeModal(modal), [button]);
        }
        
        urlInput.addEventListener('click', (e) => e.stopPropagation());

        urlInput.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') e.stopPropagation();
            if (e.key === 'Enter') {
                e.preventDefault();
                const url = urlInput.value.trim();
                if (url) processImageInsertion(url, null, modal);
            }
        });

        fileInput.addEventListener('change', (e) => {
            const fileName = e.target.files[0]?.name;
            const textSpan = fileInput.parentElement.querySelector('span:not(.material-icons)');
            
            if (fileName && textSpan) {
                textSpan.textContent = fileName;
            }
        });

        insertButton.addEventListener('click', (e) => {
            e.preventDefault();
            
            const url = urlInput.value.trim();
            const file = fileInput.files[0];
            
            if (url || file) {
                processImageInsertion(url, file, modal);
            } else {
                console.log('URL 또는 파일이 필요합니다');
            }
        });
    }

    function processImageInsertion(url, file, modal) {
        console.log('[IMAGE_UPLOAD] 처리 시작:', { url: !!url, file: !!file });
        
        closeModal(modal);
        
        if (url) {
            console.log('[IMAGE_UPLOAD] URL 이미지:', url);
            // TODO: insertImage(url) 구현 예정
        } else if (file) {
            console.log('[IMAGE_UPLOAD] 파일 처리 시작');
            const reader = new FileReader();
            reader.onload = (e) => {
                console.log('[IMAGE_UPLOAD] 파일 읽기 완료');
                // TODO: insertImage(e.target.result) 구현 예정
            };
            reader.readAsDataURL(file);
        }
    }

    function showModal() {
        const modal = createModal();
        const button = document.querySelector('.lite-editor-image-upload-button');
        
        if (button && util.layer && util.layer.setLayerPosition) {
            util.layer.setLayerPosition(modal, button);
        }
        
        setTimeout(() => {
            modal.style.removeProperty('opacity');
            modal.style.removeProperty('visibility');
            modal.classList.add('show');
            
            if (util.activeModalManager) {
                util.activeModalManager.register(modal);
            }
            
            requestAnimationFrame(() => {
                const urlInput = modal.querySelector('#image-url-input');
                if (urlInput) urlInput.focus();
            });
        }, 10);

        setupGlobalEvents();
    }

    function setupGlobalEvents() {
        if (isEventHandlerRegistered) return;
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.querySelector('.modal-overlay.show');
                if (modal) closeModal(modal);
            }
        });
        
        isEventHandlerRegistered = true;
    }

    // 플러그인 등록
    LiteEditor.registerPlugin(PLUGIN_ID, {
        title: 'Image upload',
        icon: 'photo_camera',
        customRender: function(toolbar, contentArea) {
            if (util.styles && util.styles.loadCssFile) {
                util.styles.loadCssFile(STYLE_ID, CSS_PATH);
            }

            const button = util.dom ? 
                util.dom.createElement('button', {
                    className: 'lite-editor-button lite-editor-image-upload-button',
                    title: 'Image upload'
                }) : 
                (() => {
                    const btn = document.createElement('button');
                    btn.className = 'lite-editor-button lite-editor-image-upload-button';
                    btn.title = 'Image upload';
                    return btn;
                })();
            
            const icon = util.dom ? 
                util.dom.createElement('i', {
                    className: 'material-symbols-outlined',
                    textContent: 'photo_camera'
                }) :
                (() => {
                    const i = document.createElement('i');
                    i.className = 'material-symbols-outlined';
                    i.textContent = 'photo_camera';
                    return i;
                })();
            button.appendChild(icon);
            
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const existingModal = document.querySelector('.modal-overlay.show');
                if (existingModal) {
                    closeModal(existingModal);
                    return;
                }
                
                showModal();
            });
            
            toolbar.appendChild(button);
            setupGlobalEvents();
        }
    });
})();