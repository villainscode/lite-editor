/**
 * LiteEditor imageUpload Plugin
 * 이미지 업로드 플러그인
 */

(function() {
    // HTML 템플릿 수정
    const template = `
    <div class="modal-overlay">
        <div class="modal-content p-3">            
            <!-- 입력 폼 -->
            <div class="space-y-2">
                <!-- URL 입력 -->
                <div>
                    <label class="block text-[13px] font-medium text-gray-400 mb-1">
                        Image URL
                    </label>
                    <input type="url" 
                           placeholder="https://" 
                           class="w-full px-2 py-0.5 text-[13px] border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400">
                </div>

                 <!-- 구분선 -->
                <div class="flex items-center justify-center my-1">
                <div class="h-px bg-gray-200 flex-grow"></div>
                <div class="mx-2 text-[10px] text-gray-500">or</div>
                <div class="h-px bg-gray-200 flex-grow"></div>
                </div>

                <!-- 파일 업로드 -->
                <div>
                    <label class="block text-[13px] font-medium text-gray-400 mb-1">
                        Image File
                    </label>
                    <div class="flex items-center justify-center w-full">
                        <label class="w-full flex flex-col items-center px-3 py-2 bg-white text-gray-400 rounded-lg border-2 border-gray-300 border-dashed cursor-pointer hover:bg-gray-50">
                            <span class="material-symbols-outlined text-sm mb-0.5 text-gray-400">add_photo_alternate</span>
                            <span class="text-[10px]">Select a File</span>
                            <input type="file" class="hidden" accept="image/*">
                        </label>
                    </div>
                </div>
            </div>
            
            <!-- 버튼 -->
            <div class="flex justify-end items-center space-x-1.5 mt-2">
            <button type="button" data-action="close"
                    class="flex items-center justify-center w-6 h-6 rounded-full hover:bg-gray-100 transition-colors"
                    title="Cancel">
                <span class="material-symbols-outlined text-gray-500" style="font-size: 16px;">close</span>
            </button>
            <button type="submit"
                    class="flex items-center justify-center w-6 h-6 rounded-full hover:bg-gray-100 transition-colors"
                    title="Insert">
                <span class="material-symbols-outlined text-gray-500" style="font-size: 16px;">add_circle</span>
            </button>
        </div>
        </div>
    </div>`;

    // 모달 관련 기능
    function createModal() {
        // 기존 모달이 있다면 제거
        const existingModal = document.querySelector('.modal-overlay');
        if (existingModal) {
            existingModal.remove();
        }

        // 모달 생성
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = template;
        document.body.appendChild(modalContainer.firstElementChild);

        const modal = document.querySelector('.modal-overlay');
        const closeButton = modal.querySelector('button[data-action="close"]');
        const insertButton = modal.querySelector('button[type="submit"]');
        const fileLabel = modal.querySelector('.flex-col');
        const fileInput = modal.querySelector('input[type="file"]');
        const urlInput = modal.querySelector('input[type="url"]');

        // 닫기 버튼 이벤트
        closeButton.addEventListener('click', () => {
            closeModal(modal);
        });

        // 파일 업로드 영역 클릭 시 파일 선택기 열기
        fileLabel.addEventListener('click', () => {
            // 이미 fileInput 내부에 있는 클릭 이벤트가 발생하므로 추가 로직 필요 없음
        });

        // 파일 선택 처리
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                // 파일 선택 시 텍스트 업데이트
                const fileName = e.target.files[0].name;
                const textSpan = fileLabel.querySelector('span:last-child');
                textSpan.textContent = fileName;
            }
        });

        // 삽입 버튼 이벤트
        insertButton.addEventListener('click', (e) => {
            e.preventDefault();
            const url = urlInput.value.trim();
            const file = fileInput.files[0];
            
            // URL 또는 파일 처리 로직
            if (url) {
                // URL 이미지 처리
                insertImageByUrl(url);
            } else if (file) {
                // 파일 이미지 처리
                insertImageByFile(file);
            }
            
            closeModal(modal);
        });

        // 외부 클릭 시 닫기
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal);
            }
        });

        // ESC 키로 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('show')) {
                closeModal(modal);
            }
        });

        return modal;
    }

    function insertImageByUrl(url) {
        // URL 이미지 삽입 로직
        const img = document.createElement('img');
        img.src = url;
        img.style.maxWidth = '100%';
        
        // 에디터 콘텐츠 영역에 이미지 삽입
        const contentArea = document.querySelector('.lite-editor-content');
        if (contentArea) {
            contentArea.appendChild(img);
        }
    }

    function insertImageByFile(file) {
        // 파일 이미지 삽입 로직
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.style.maxWidth = '100%';
            
            // 에디터 콘텐츠 영역에 이미지 삽입
            const contentArea = document.querySelector('.lite-editor-content');
            if (contentArea) {
                contentArea.appendChild(img);
            }
        };
        reader.readAsDataURL(file);
    }

    function closeModal(modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
    
    function showModal() {
        const modal = createModal();
        // 모달 표시
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    }

    // 플러그인 등록
    LiteEditor.registerPlugin('imageUpload', {
        title: 'Image upload',
        icon: 'photo_camera',
        customRender: function(toolbar, contentArea) {
            // 스타일시트 추가
            if (!document.querySelector('#imageUploadStyles')) {
                const styleSheet = document.createElement('link');
                styleSheet.id = 'imageUploadStyles';
                styleSheet.rel = 'stylesheet';
                styleSheet.href = 'css/imageupload.css';
                document.head.appendChild(styleSheet);
            }

            // 버튼 생성
            const imageUploadButton = document.createElement('button');
            imageUploadButton.className = 'lite-editor-button lite-editor-image-upload-button';
            imageUploadButton.setAttribute('title', 'Image upload');

            // 아이콘 추가
            const imageUploadIcon = document.createElement('i');
            imageUploadIcon.className = 'material-icons';
            imageUploadIcon.textContent = 'photo_camera';
            imageUploadButton.appendChild(imageUploadIcon);
            
            // 클릭 이벤트 추가
            imageUploadButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                showModal();
            });
            
            // 버튼을 툴바에 추가
            toolbar.appendChild(imageUploadButton);
        }
    });
})();