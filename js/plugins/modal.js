/**
 * LiteEditor Modal System
 * 알림 및 확인창을 위한 모달 시스템 (Tailwind 스타일, 컴팩트 사이즈)
 */

(function() {
    // 모달 ID와 클래스
    const MODAL_ID = 'lite-editor-modal';
    const STYLE_ID = 'lite-editor-modal-style';
    const CSS_PATH = 'css/plugins/modal.css';
    
    // 모달 타입
    const MODAL_TYPES = {
        ALERT: 'alert',
        CONFIRM: 'confirm'
    };
    
    // CSS 로드 함수
    function loadStyles() {
        if (document.getElementById(STYLE_ID)) return;
        
        const styleSheet = document.createElement('link');
        styleSheet.id = STYLE_ID;
        styleSheet.rel = 'stylesheet';
        styleSheet.href = CSS_PATH;
        document.head.appendChild(styleSheet);
    }
    
    // 초기화 함수
    function initialize() {
        // CSS 로드
        loadStyles();
        
        // 기존 모달 제거 - 페이지 로드시 남아있을 수 있는 모달 처리
        const existingModal = getModalElement();
        if (existingModal) {
            existingModal.parentNode.removeChild(existingModal);
        }
    }
    
    // 모달 HTML 템플릿 생성
    function createModalTemplate(type, options) {
        const isConfirm = type === MODAL_TYPES.CONFIRM;
        
        return `
            <div class="lite-editor-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
                <div class="lite-editor-modal">
                    <div class="lite-editor-modal-header">
                        <h3 id="modal-title" style="font-size:10px;">${options.title || (isConfirm ? 'Confirm' : 'Alert')}</h3>
                    </div>
                    <div class="lite-editor-modal-body">
                        <p style="font-size:12px;">${options.message || ''}</p>
                    </div>
                    <div class="lite-editor-modal-footer">
                        ${isConfirm ? 
                            `<button type="button" class="lite-editor-modal-button lite-editor-modal-button-secondary" data-action="cancel">${options.cancelText || 'Cancel'}</button>` 
                            : ''}
                        <button type="button" class="lite-editor-modal-button lite-editor-modal-button-primary" data-action="confirm">${options.confirmText || 'OK'}</button>
                    </div>
                </div>
            </div>
        `;
    }
    
    // 모달 엘리먼트 가져오기
    function getModalElement() {
        return document.querySelector('.lite-editor-modal-overlay');
    }
    
    // 모달 닫기
    function closeModal(callback) {
        const modal = getModalElement();
        if (!modal) return;
        
        modal.classList.remove('show');
        
        // 모달 닫을 때 body 스크롤 복원
        document.body.style.overflow = '';
        
        setTimeout(() => {
            if (modal && modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
            if (typeof callback === 'function') {
                callback();
            }
        }, 200);
    }
    
    // 클릭 이벤트 처리 함수
    function handleClick(e, modal, type, options) {
        const target = e.target;
        
        // 확인 버튼 클릭
        if (target.matches('[data-action="confirm"]')) {
            closeModal(() => {
                if (typeof options.onConfirm === 'function') {
                    options.onConfirm();
                }
            });
        }
        // 취소 버튼 클릭
        else if (target.matches('[data-action="cancel"]')) {
            closeModal(() => {
                if (typeof options.onCancel === 'function') {
                    options.onCancel();
                }
            });
        }
        // 모달 외부 클릭 - 모달 자체는 이벤트 중단
        else if (target === modal && options.closeOnClickOutside !== false) {
            // Confirm 모달인 경우 취소 동작으로 처리
            if (type === MODAL_TYPES.CONFIRM) {
                closeModal(() => {
                    if (typeof options.onCancel === 'function') {
                        options.onCancel();
                    }
                });
            } else {
                closeModal(() => {
                    if (typeof options.onConfirm === 'function') {
                        options.onConfirm();
                    }
                });
            }
        }
    }
    
    // 모달 보이기
    function showModal(type, options = {}) {
        // 기존 모달 제거
        const existingModal = getModalElement();
        if (existingModal) {
            existingModal.parentNode.removeChild(existingModal);
        }
        
        // 모달 생성
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = createModalTemplate(type, options);
        const modal = modalContainer.firstElementChild;
        document.body.appendChild(modal);
        
        // body 스크롤 방지
        document.body.style.overflow = 'hidden';
        
        // 클릭 이벤트 리스너 추가
        modal.addEventListener('click', (e) => handleClick(e, modal, type, options));
        
        // ESC 키 이벤트 리스너
        function handleKeydown(e) {
            if (e.key === 'Escape' && options.closeOnEsc !== false) {
                e.preventDefault();
                document.removeEventListener('keydown', handleKeydown);
                
                if (type === MODAL_TYPES.CONFIRM && typeof options.onCancel === 'function') {
                    closeModal(options.onCancel);
                } else {
                    closeModal(options.onConfirm);
                }
            }
        }
        
        document.addEventListener('keydown', handleKeydown);
        
        // 포커스 관리를 위한 첫 번째 포커스 가능 요소 선택
        const confirmButton = modal.querySelector('[data-action="confirm"]');
        
        // 모달 표시 및 포커스 처리
        setTimeout(() => {
            modal.classList.add('show');
            if (confirmButton) {
                confirmButton.focus();
            }
        }, 10);
        
        return modal;
    }
    
    // 초기화 실행
    initialize();
    
    // 전역 객체로 API 노출
    window.LiteEditorModal = {
        // Alert 모달 표시
        alert: function(message, options = {}) {
            return showModal(MODAL_TYPES.ALERT, {
                message: message,
                title: options.title || 'Alert',
                confirmText: options.confirmText || 'OK',
                onConfirm: options.onConfirm,
                closeOnClickOutside: options.closeOnClickOutside,
                closeOnEsc: options.closeOnEsc
            });
        },
        
        // Confirm 모달 표시
        confirm: function(message, options = {}) {
            return showModal(MODAL_TYPES.CONFIRM, {
                message: message,
                title: options.title || 'Confirm',
                confirmText: options.confirmText || 'OK',
                cancelText: options.cancelText || 'Cancel',
                onConfirm: options.onConfirm,
                onCancel: options.onCancel,
                closeOnClickOutside: options.closeOnClickOutside,
                closeOnEsc: options.closeOnEsc
            });
        },
        
        // 모달 닫기
        close: closeModal
    };
})(); 