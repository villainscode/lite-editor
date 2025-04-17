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
        
        // 2. 디버그 유틸리티 (코어 이후, 플러그인 이전에 로드)
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
        'js/plugins/codeBlock.js',
        
        // 5. 폰트 및 색상 관련 플러그인
        'js/plugins/fontFamily.js',
        'js/plugins/fontColor.js',
        'js/plugins/highlight.js',
        'js/plugins/heading.js',
        
        // 6. 구조 및 정렬 관련 플러그인
        'js/plugins/list.js',
        'js/plugins/align.js',
        'js/plugins/formatIndent.js',
        
        // 7. 삽입 관련 플러그인
        'js/plugins/link.js',
        'js/plugins/imageUpload.js',
        'js/plugins/table.js',
        
        // 8. 레이아웃 관련 플러그인
        'js/plugins/line.js',
        
        // 9. 기타 플러그인
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

/**
 * 블록 태그 처리 함수 (선택 영역 내 요소만 처리)
 */
function handleBlockTags(contentArea, selectionInfo) {
  try {
    const blockSelector = BLOCK_TAGS.filter(tag => tag !== 'BLOCKQUOTE').join(',');
    if (!blockSelector) return false;
    
    // 공통 조상을 기준으로 블록 태그 검색
    let commonAncestor = selectionInfo.range.commonAncestorContainer;
    if (commonAncestor.nodeType === Node.TEXT_NODE) {
      commonAncestor = commonAncestor.parentNode;
    }
    
    // 1. 공통 조상 자체가 블록 태그인지 확인 (중요: 이 부분이 누락됨)
    let processedAny = false;
    
    if (BLOCK_TAGS.includes(commonAncestor.nodeName)) {
      console.log(`공통 조상이 블록 태그(${commonAncestor.nodeName})인 경우 처리`);
      const p = document.createElement('p');
      p.textContent = commonAncestor.textContent;
      commonAncestor.parentNode.replaceChild(p, commonAncestor);
      processedAny = true;
      
      // 공통 조상 자체를 변경했으므로 여기서 종료
      return true;
    }
    
    // 2. 공통 조상 내 블록 태그 검색 (기존 로직)
    const allBlockElements = commonAncestor.querySelectorAll(blockSelector);
    console.log(`검색된 블록 요소 수: ${allBlockElements.length}`);
    
    const selectedBlockElements = Array.from(allBlockElements).filter(
      node => isNodeInSelection(node, selectionInfo.range)
    );
    
    console.log(`선택 영역 내 블록 요소 수: ${selectedBlockElements.length}`);
    
    if (selectedBlockElements.length === 0) {
      return processedAny; // 공통 조상이 처리되었다면 true, 아니면 false
    }
    
    // 각 블록 태그를 p로 변환
    for (const blockElement of selectedBlockElements) {
      const p = document.createElement('p');
      p.textContent = blockElement.textContent;
      blockElement.parentNode.replaceChild(p, blockElement);
      processedAny = true;
    }
    
    return processedAny;
  } catch (error) {
    console.error('블록 태그 처리 중 오류:', error);
    return false;
  }
} 