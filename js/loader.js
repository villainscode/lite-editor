/**
 * LiteEditor 스크립트 로더
 * 모든 필수 JS 파일을 동적으로 로드합니다.
 */

(function() {
    // 기본 경로 설정
    const basePath = '';
    
    // 로드할 스크립트 파일 목록 (순서 중요)
    const scripts = [
        // 1. 코어 라이브러리
        'js/error-handler.js',
        'js/core.js',
        
        // 1.5 보안 관리자 (코어 이후 바로 로드)
        'js/security-manager.js',
        
        // 2. 플러그인 유틸리티를 디버그 유틸리티보다 먼저 로드
        'js/plugins/plugin-util.js',
        'js/debug-utils.js',
        
        // 3. 유틸리티 및 기본 기능
        'js/plugins/history.js',
        'js/plugins/format-utils.js',
        'js/plugins/reset.js',
        
        // 4. 텍스트 서식 관련 플러그인
        'js/plugins/bold.js',
        'js/plugins/italic.js',
        'js/plugins/underline.js',
        'js/plugins/strike.js',
        'js/plugins/code.js',
        'js/plugins/blockquote.js',
        
        // 5. 코드 블록 플러그인
        'js/plugins/codeBlock.js',
        
        // 6. 폰트 및 색상 관련 플러그인
        'js/plugins/fontFamily.js',
        'js/plugins/fontColor.js',
        'js/plugins/emphasis.js',
        'js/plugins/heading.js',
        
        // 7. 구조 및 정렬 관련 플러그인
        'js/plugins/align.js',
        'js/plugins/formatIndent.js',
        
        // 8. 삽입 관련 플러그인
        'js/plugins/link.js',
        'js/plugins/imageUpload.js',
        'js/plugins/table.js',
        'js/plugins/media.js',
        'js/plugins/line.js',
        
        // 9. 체크리스트 플러그인
        'js/plugins/checkList.js',
        'js/plugins/bulletList.js',
        'js/plugins/numberedList.js',

        // 10. 기타 플러그인
        'js/modal.js',
    ];
    
    // 스크립트 순차적 로드 함수
    function loadScripts(scriptList, index = 0) {
        if (index >= scriptList.length) {
            // 모든 스크립트 로드 완료 후 이벤트 발생
            const event = new Event('lite-editor-loaded');
            document.dispatchEvent(event);
            return;
        }
        
        const script = document.createElement('script');
        script.src = basePath + scriptList[index];
        
        script.onload = function() {
            // 다음 스크립트 로드
            loadScripts(scriptList, index + 1);
        };
        
        script.onerror = function(error) {
            if (window.errorHandler) {
                errorHandler.logError('Loader', errorHandler.codes.COMMON.SCRIPT_LOAD, error);
            } else {
                console.error(`[Loader] 스크립트 로드 실패: ${scriptList[index]}`, error);
            }
            // 오류 발생해도 다음 스크립트 로드 시도
            loadScripts(scriptList, index + 1);
        };
        
        document.head.appendChild(script);
    }
    
    // 스크립트 로드 시작
    document.addEventListener('DOMContentLoaded', function() {
        loadScripts(scripts);
    });
})(); 
