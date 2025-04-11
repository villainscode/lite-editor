(function() {
    const PLUGIN_ID = 'link';
    const STYLE_ID = 'linkStyles';
    const CSS_PATH = 'css/plugins/link.css';

    let savedRange = null;
    let activeModal = null;
    let isTextSelected = false;
    let isEventHandlerRegistered = false;

    const LinkModal = {
        show: function(buttonElement, contentArea) {
            const selectionResult = window.LiteEditorSelection.saveSelection();
            if (!selectionResult.success) {
                console.warn('선택 영역 저장 실패');
                return;
            }
            
            savedRange = selectionResult.range;
            isTextSelected = selectionResult.isTextSelected;
            
            this.close();
            
            activeModal = document.createElement('div');
            activeModal.className = 'lite-editor-link-popup';
            activeModal.innerHTML = `
                <input type="text" placeholder="https://" class="lite-editor-link-input">
                <button class="lite-editor-link-button">OK</button>
            `;
            
            const buttonRect = buttonElement.getBoundingClientRect();
            document.body.appendChild(activeModal);
            activeModal.style.top = (buttonRect.bottom + window.scrollY) + 'px';
            activeModal.style.left = (buttonRect.left + window.scrollX) + 'px';
            
            const modalRect = activeModal.getBoundingClientRect();
            if (modalRect.right > window.innerWidth) {
                activeModal.style.left = (window.innerWidth - modalRect.width - 10) + 'px';
            }
            
            const urlInput = activeModal.querySelector('input');
            const okButton = activeModal.querySelector('button');
            
            this.setupEvents(urlInput, okButton, contentArea, buttonElement);
            
            setTimeout(() => urlInput.focus({ preventScroll: true }), 0);
            
            return activeModal;
        },
        
        close: function() {
            if (activeModal && activeModal.parentNode) {
                activeModal.parentNode.removeChild(activeModal);
                activeModal = null;
            }
            window.LiteEditorSelection.cleanupSelection();
        },
        
        setupEvents: function(urlInput, okButton, contentArea, buttonElement) {
            okButton.addEventListener('click', () => this.applyLink(urlInput.value, contentArea));
            urlInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.applyLink(urlInput.value, contentArea);
                }
            });

            activeModal.addEventListener('click', (e) => e.stopPropagation());

            this.setupGlobalEvents(buttonElement);
        },
        
        setupGlobalEvents: function(buttonElement) {
            if (isEventHandlerRegistered) return;
            
            document.addEventListener('click', (e) => {
                if (activeModal && !activeModal.contains(e.target) && !buttonElement.contains(e.target)) {
                    this.close();
                }
            }, true);
            
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && activeModal) {
                    this.close();
                }
            });
            
            isEventHandlerRegistered = true;
        },
        
        applyLink: function(url, contentArea) {
            url = url.trim();
            if (!url) return;
            
            const finalUrl = /^https?:\/\//i.test(url) ? url : 'https://' + url;
            
            try {
                if (isTextSelected) {
                    window.LiteEditorSelection.restoreSelection(savedRange, isTextSelected);
                    
                    document.execCommand('createLink', false, finalUrl);
                    
                    const newLink = contentArea.querySelector('a[href="' + finalUrl + '"]');
                    if (newLink) {
                        newLink.setAttribute('target', '_blank');
                    }
                } else {
                    const linkText = url.replace(/^https?:\/\//i, '');
                    const linkElement = `<a href="${finalUrl}" target="_blank">${linkText}</a>`;
                    document.execCommand('insertHTML', false, linkElement);
                }
                
                contentArea.dispatchEvent(new Event('input', { bubbles: true }));
                
            } catch (e) {
                console.error('링크 적용 실패:', e);
            } finally {
                this.close();
            }
        }
    };

    LiteEditor.registerPlugin(PLUGIN_ID, {
        title: 'Link',
        icon: 'link',
        customRender: function(toolbar, contentArea) {
            if (!document.getElementById(STYLE_ID)) {
                const styleSheet = document.createElement('link');
                styleSheet.id = STYLE_ID;
                styleSheet.rel = 'stylesheet';
                styleSheet.href = CSS_PATH;
                document.head.appendChild(styleSheet);
            }
            
            const button = document.createElement('button');
            button.className = 'lite-editor-button lite-editor-link-button';
            button.setAttribute('title', 'Insert link');
            
            const icon = document.createElement('i');
            icon.className = 'material-icons';
            icon.textContent = 'link';
            button.appendChild(icon);
            
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                LinkModal.show(button, contentArea);
            });
            
            toolbar.appendChild(button);
        }
    });
})();