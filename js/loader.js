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
        'js/core.js',
        
        // 2. 유틸리티 및 기본 기능
        'plugins/history.js',
        'plugins/format-utils.js',
        
        // 3. 텍스트 서식 관련 플러그인
        'plugins/bold.js',
        'plugins/italic.js',
        'plugins/underline.js',
        'plugins/strike.js',
        'plugins/code.js',
        'plugins/blockquote.js',
        
        // 4. 폰트 및 색상 관련 플러그인
        'plugins/fontFamily.js',
        'plugins/fontColor.js',
        'plugins/highlight.js',
        'plugins/heading.js',
        
        // 5. 구조 및 정렬 관련 플러그인
        'plugins/list.js',
        'plugins/align.js',
        'plugins/formatIndent.js',
        
        // 6. 삽입 관련 플러그인
        'plugins/link.js',
        'plugins/table.js',
        
        // 7. 레이아웃 관련 플러그인
        'plugins/split.js',
        'plugins/line.js',
        
        // 8. 기타 플러그인
        'plugins/reset.js'
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
        
        script.onerror = function() {
            console.error('스크립트 로드 실패:', scriptList[index]);
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