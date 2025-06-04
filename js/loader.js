/**
 * LiteEditor 통합 로더
 * CSS와 JS를 모두 동적으로 로드
 */

(function() {
    const versionScript = document.createElement('script');
    versionScript.src = `js/data/version.js?t=${Date.now()}`; // ✅ 타임스탬프 추가
    
    versionScript.onload = function() {
        const VERSION = window.LiteEditorVersion?.version || 'v1.0.05';
        
        // CSS 파일들 로드
        loadCSS(VERSION);
        
        // JS 파일들 로드
        loadJS(VERSION);
    };
    
    document.head.appendChild(versionScript);
    
    // CSS 로드 함수
    function loadCSS(version) {
        const cssFiles = [
            'css/core.css',
            'css/plugins/library.css',
            'css/plugins/plugins.css',
            'css/plugins/media.css',
            'css/plugins/modal.css',
            'css/plugins/codeBlock.css'
        ];
        
        cssFiles.forEach(cssFile => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = `${cssFile}?v=${version}`;
            document.head.appendChild(link);
        });
    }
    
    // JS 로드 함수
    function loadJS(version) {
        const scripts = [
            // 데이터 파일
            'js/data/videoList.js',
            'js/data/codeLanguages.js',
            'js/error-handler.js',
            
            // ✅ 새로운 단축키 시스템 (core.js 이전에 로드)
            'js/core/shortcut-definitions.js',
            'js/core/shortcut-manager.js',
            
            'js/core.js',
            'js/security-manager.js',
            
            // 먼저 플러그인 유틸리티를 로드
            'js/plugins/plugin-util.js',
            
            // 유틸리티 및 기본 기능
            'js/plugins/history.js',
            'js/plugins/format-util.js',
            'js/plugins/reset.js',
            
            // 텍스트 서식 관련 플러그인
            'js/plugins/bold.js',
            'js/plugins/italic.js',
            'js/plugins/underline.js',
            'js/plugins/strike.js',
            'js/plugins/code.js',
            'js/plugins/blockquote.js',
            
            // 코드 블록 플러그인
            'js/plugins/codeBlock.js',
            
            // 폰트 및 색상 관련 플러그인
            'js/plugins/fontFamily.js',
            'js/plugins/fontColor.js',
            'js/plugins/highlight.js',
            'js/plugins/heading.js',
            
            // 구조 및 정렬 관련 플러그인
            'js/plugins/align.js',
            'js/plugins/formatIndent.js',
            
            // 삽입 관련 플러그인
            'js/plugins/link.js',
            'js/plugins/imageLayout.js',
            'js/plugins/imageUpload.js',
            'js/plugins/table.js',
            'js/plugins/media.js',
            'js/plugins/line.js',
            
            // 체크리스트 플러그인
            'js/plugins/checkList.js',
            'js/plugins/bulletList.js',
            'js/plugins/numberedList.js',

            // 모달 플러그인
            'js/modal.js'
        ];
        
        function loadScript(index) {
            if (index >= scripts.length) {
                // 모든 스크립트 로드 완료 후 이벤트 발생
                const event = new Event('lite-editor-loaded');
                document.dispatchEvent(event);
                return;
            }
            
            const script = document.createElement('script');
            script.src = `${scripts[index]}?v=${version}`;
            
            script.onload = function() {
                // 다음 스크립트 로드
                loadScript(index + 1);
            };
            
            script.onerror = function(error) {
                if (window.errorHandler) {
                    errorHandler.logError('Loader', errorHandler.codes.COMMON.SCRIPT_LOAD, error);
                } else {
                    console.error(`[Loader] 스크립트 로드 실패: ${scripts[index]}`, error);
                }
                // 오류 발생해도 다음 스크립트 로드 시도
                loadScript(index + 1);
            };
            
            document.head.appendChild(script);
        }
        
        loadScript(0);
    }
})(); 
