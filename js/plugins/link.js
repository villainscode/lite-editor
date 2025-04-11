(function() {
    const PLUGIN_ID = 'link';
    const STYLE_ID = 'linkStyles';
    const CSS_PATH = 'css/plugins/link.css';

    let savedRange = null;
    let activeModal = null;
    let isTextSelected = false;
    let isEventHandlerRegistered = false;

    const SelectionManager = {
        save: function() {
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) {
                return false;
            }
            
            const range = selection.getRangeAt(0).cloneRange();
            
            isTextSelected = !selection.isCollapsed && selection.toString().trim().length > 0;
            
            if (isTextSelected) {
                try {
                    const wrapper = document.createElement('span');
                    wrapper.setAttribute('data-temp-link', 'true');
                    range.surroundContents(wrapper);
                    savedRange = wrapper;
                    return true;
                } catch (e) {
                    console.warn('선택 영역 감싸기 실패:', e);
                    return false;
                }
            } else {
                savedRange = range;
                return true;
            }
        },
        
        restore: function() {
            if (!savedRange) return false;
            
            try {
                const selection = window.getSelection();
                selection.removeAllRanges();
                
                if (isTextSelected) {
                    const range = document.createRange();
                    range.selectNodeContents(savedRange);
                    selection.addRange(range);
                } else {
                    selection.addRange(savedRange);
                }
                
                return true;
            } catch (e) {
                console.warn('선택 영역 복원 실패:', e);
                return false;
            }
        },
        
        cleanup: function() {
            const wrapper = document.querySelector('[data-temp-link]');
            if (wrapper) {
                const parent = wrapper.parentNode;
                while (wrapper.firstChild) {
                    parent.insertBefore(wrapper.firstChild, wrapper);
                }
                parent.removeChild(wrapper);
            }
        },
        
        hasSelection: function() {
            return isTextSelected;
        }
    };

    const LinkModal = {
        show: function(buttonElement, contentArea) {
            if (!SelectionManager.save()) {
                console.warn('선택 영역 저장 실패');
                return;
            }
            
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
                    SelectionManager.cleanup();
                    this.close();
                }
            }, true);
            
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && activeModal) {
                    SelectionManager.cleanup();
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
                if (SelectionManager.hasSelection()) {
                    if (savedRange && savedRange.tagName === 'SPAN' && savedRange.dataset.tempLink === 'true') {
                        SelectionManager.restore();
                        
                        document.execCommand('createLink', false, finalUrl);
                        
                        const newLink = contentArea.querySelector('a[href="' + finalUrl + '"]');
                        if (newLink) {
                            newLink.setAttribute('target', '_blank');
                        }
                        
                        SelectionManager.cleanup();
                    }
                } else {
                    const linkText = url.replace(/^https?:\/\//i, '');
                    const linkElement = `<a href="${finalUrl}" target="_blank">${linkText}</a>`;
                    document.execCommand('insertHTML', false, linkElement);
                }
                
                contentArea.dispatchEvent(new Event('input', { bubbles: true }));
                
            } catch (e) {
                console.error('링크 적용 실패:', e);
                SelectionManager.cleanup();
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