class ImageUploadModal {
    constructor() {
        this.modalTemplate = document.getElementById('imageUploadTemplate');
        this.modal = null;
        this.overlay = null;
    }

    init() {
        // 템플릿을 복제하여 모달 생성
        this.modal = this.modalTemplate.content.cloneNode(true).firstElementChild;
        document.body.appendChild(this.modal);
        
        // 오버레이와 컨텐츠 요소 참조 저장
        this.overlay = this.modal;
        this.content = this.modal.querySelector('.modal-content');

        // 이벤트 리스너 설정
        this.setupEventListeners();
    }

    setupEventListeners() {
        // URL 입력 이벤트
        const urlInput = this.modal.querySelector('input[type="url"]');
        if (urlInput) {
            urlInput.addEventListener('change', this.handleUrlInput.bind(this));
        }

        // 파일 선택 이벤트
        const fileInput = this.modal.querySelector('input[type="file"]');
        if (fileInput) {
            fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        }

        // 닫기 버튼 이벤트
        const closeButton = this.modal.querySelector('[data-action="close"]');
        if (closeButton) {
            closeButton.addEventListener('click', this.close.bind(this));
        }

        // 삽입 버튼 이벤트
        const submitButton = this.modal.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.addEventListener('click', this.handleSubmit.bind(this));
        }

        // 오버레이 클릭 시 닫기
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.close();
            }
        });

        // 모달 컨텐츠 클릭 시 이벤트 버블링 방지
        this.content.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    handleUrlInput(e) {
        const url = e.target.value;
        // URL 입력 처리 로직
        console.log('URL input:', url);
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            // 파일 선택 처리 로직
            console.log('Selected file:', file);
        }
    }

    handleSubmit(e) {
        e.preventDefault();
        const urlInput = this.modal.querySelector('input[type="url"]');
        const fileInput = this.modal.querySelector('input[type="file"]');
        
        const imageUrl = urlInput ? urlInput.value : '';
        const imageFile = fileInput ? fileInput.files[0] : null;
        
        // TODO: 이미지 업로드 또는 URL 처리 로직 구현
        console.log('Image URL:', imageUrl);
        console.log('Image File:', imageFile);
        
        this.close();
    }

    open() {
        this.overlay.classList.add('show');
        // ESC 키로 모달 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.close();
            }
        });
    }

    close() {
        this.overlay.classList.remove('show');
        // 입력 필드 초기화
        const urlInput = this.modal.querySelector('input[type="url"]');
        const fileInput = this.modal.querySelector('input[type="file"]');
        
        if (urlInput) urlInput.value = '';
        if (fileInput) fileInput.value = '';
    }
}

// 컴포넌트 export
export default ImageUploadModal; 