(function () {
  const STYLE_ID = 'lite-editor-modal-style';
  const CSS_PATH = 'css/plugins/modal.css';

  const MODAL_TYPES = {
    ALERT: 'alert',
    CONFIRM: 'confirm'
  };

  function loadStyles() {
    if (!document.getElementById(STYLE_ID)) {
      const link = document.createElement('link');
      link.id = STYLE_ID;
      link.rel = 'stylesheet';
      link.href = CSS_PATH;
      document.head.appendChild(link);
    }
  }

  function safeCall(fn) {
    if (typeof fn === 'function') fn();
  }

  function createButton(type, text) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `lite-editor-modal-button ${type === 'primary' ? 'lite-editor-modal-button-primary' : 'lite-editor-modal-button-secondary'}`;
    btn.setAttribute('data-action', type === 'primary' ? 'confirm' : 'cancel');
    btn.textContent = text;
    return btn;
  }

  function createModalTemplate(type, options) {
    const overlay = document.createElement('div');
    overlay.className = 'lite-editor-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'modal-title');

    overlay.innerHTML = `
      <div class="lite-editor-modal">
        <div class="lite-editor-modal-header">
          <h3 id="modal-title" style="font-size:10px;">${options.title || (type === MODAL_TYPES.CONFIRM ? 'Confirm' : 'Alert')}</h3>
        </div>
        <div class="lite-editor-modal-body">
          <p style="font-size:12px;">${options.message || ''}</p>
        </div>
        <div class="lite-editor-modal-footer"></div>
      </div>
    `;

    const footer = overlay.querySelector('.lite-editor-modal-footer');
    if (type === MODAL_TYPES.CONFIRM) {
      footer.appendChild(createButton('cancel', options.cancelText || 'Cancel'));
    }
    footer.appendChild(createButton('primary', options.confirmText || 'OK'));

    return overlay;
  }

  function closeModal(callback) {
    const modal = document.querySelector('.lite-editor-modal-overlay');
    if (!modal) return;

    modal.classList.remove('show');
    document.body.style.overflow = '';

    setTimeout(() => {
      modal.remove();
      safeCall(callback);
    }, 200);
  }

  function showModal(type, options = {}) {
    loadStyles();

    const existing = document.querySelector('.lite-editor-modal-overlay');
    if (existing) existing.remove();

    const modal = createModalTemplate(type, options);
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    // 모달 내부 클릭 이벤트 처리 (확인, 취소, 바깥 클릭 시)
    modal.addEventListener('click', (e) => {
      const action = e.target.getAttribute('data-action');
      if (action === 'confirm') {
        closeModal(options.onConfirm);
      } else if (action === 'cancel') {
        closeModal(options.onCancel);
      } else if (e.target === modal && options.closeOnClickOutside !== false) {
        const cb = type === MODAL_TYPES.CONFIRM ? options.onCancel : options.onConfirm;
        closeModal(cb);
      }
    });

    // Escape 키 처리
    function handleKey(e) {
      try {
        if (e.key === 'Escape') {
          e.preventDefault();
          document.removeEventListener('keydown', handleKey);
          const cb = type === MODAL_TYPES.CONFIRM ? options.onCancel : options.onConfirm;
          closeModal(cb);
        }
        // ✅ Enter 키 처리 추가
        else if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          document.removeEventListener('keydown', handleKey);
          
          // ✅ 항상 확인 버튼 클릭
          const confirmBtn = modal.querySelector('[data-action="confirm"]');
          if (confirmBtn) {
            confirmBtn.click();
          }
        }
      } catch (error) {
        if (window.errorHandler) {
          errorHandler.logError('Modal', errorHandler.codes.MODAL.KEY_HANDLER, error);
        }
      }
    }
    document.addEventListener('keydown', handleKey);

    // 포커스 처리: 기본적으로 확인 버튼에 포커스를 줌
    const confirmBtn = modal.querySelector('[data-action="confirm"]');
    setTimeout(() => {
      modal.classList.add('show');
      if (confirmBtn) confirmBtn.focus();
    }, 10);

    return modal;
  }

  // 공통 헬퍼 함수: 아이콘이 있는 타이틀 생성
  function createIconTitle(icon, titleText, options = {}) {
    const iconSize = options.iconSize || '15px';
    const textSize = options.textSize || '16px';
    
    return `
      <div style="
        display: flex; 
        align-items: center; 
        gap: 8px;
        padding: 4px 0;
        line-height: 1.2;
      ">
        <span style="font-size: ${iconSize};">${icon}</span>
        <span style="
          font-size: ${textSize}; 
          font-weight: 600;
          vertical-align: middle;
        ">${titleText}</span>
      </div>
    `;
  }

  window.LiteEditorModal = {
    alert(message, options = {}) {
      const titleText = options.titleText || 'Alert';
      const formattedTitle = createIconTitle('⚠️', titleText, options);
      
      return showModal(MODAL_TYPES.ALERT, {
        ...options,
        message,
        title: options.title || formattedTitle,
        confirmText: options.confirmText || 'OK',
      });
    },

    confirm(message, options = {}) {
      const titleText = options.titleText || 'Confirm';
      const formattedTitle = createIconTitle('💡', titleText, options);
      
      return showModal(MODAL_TYPES.CONFIRM, {
        ...options,
        message,
        title: options.title || formattedTitle,
        confirmText: options.confirmText || 'OK',
        cancelText: options.cancelText || 'Cancel',
      });
    },

    close: closeModal,
  };
})();