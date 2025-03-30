/**
 * LiteEditor Strike Plugin
 * 텍스트 취소선 서식 플러그인
 */

(function() {
  // 취소선 플러그인 (MDN Selection API 기반 개선)
  LiteEditor.registerPlugin('strike', {
    title: 'Strike',
    icon: 'strikethrough_s',
    action: function(contentArea, buttonElement, event) {
      // 1. 이벤트 전파 제어
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      
      // 2. 중복 실행 방지 플래그
      buttonElement.setAttribute('data-processing', 'true');
      
      // 3. 현재 선택 영역 저장
      if (window.liteEditorSelection) {
        window.liteEditorSelection.save();
      }

      // 4. 포커스 확인
      if (document.activeElement !== contentArea) {
        contentArea.focus();
      }
      
      // 5. 선택이 유효한지 확인하는 함수
      function isSelectionValid() {
        const sel = window.getSelection();
        return sel && sel.rangeCount > 0 && !sel.isCollapsed;
      }
      
      // 6. 안정적인 실행을 위한 적절한 지연 시간 설정
      setTimeout(function executeCommand() {
        try {
          // 7. 선택 영역 복원
          if (window.liteEditorSelection) {
            const restored = window.liteEditorSelection.restore();
            
            // 8. 안정적인 명령 실행 순서 보장
            setTimeout(function() {
              try {
                // 9. 모바일 브라우저에서도 작동하도록 Range 확인
                if (!isSelectionValid()) {
                  // 선택이 유효하지 않으면 다시 복원 시도
                  window.liteEditorSelection.restore();
                }
                
                // 10. 추가 포커스 유지(일부 브라우저에서 필요)
                contentArea.focus();
                
                // 11. 명령 실행
                document.execCommand('strikethrough', false, null);
                
                // 12. 선택 영역 유지를 위한 추가 작업
                setTimeout(function() {
                  // 13. Selection.anchorNode와 focusNode 상태 확인
                  const sel = window.getSelection();
                  if (sel && sel.rangeCount > 0) {
                    // 14. 선택이 유효한지 확인
                    if (sel.anchorNode && sel.focusNode) {
                      // 포커스 유지
                      contentArea.focus();
                    } else {
                      // 선택이 유효하지 않으면 다시 복원 시도
                      window.liteEditorSelection.restore();
                    }
                  }
                  
                  // 15. 처리 상태 플래그 제거
                  buttonElement.removeAttribute('data-processing');
                  console.log('Strike 서식 적용 완료');
                }, 10);
              } catch (innerError) {
                console.error('Strike 서식 명령 실행 오류:', innerError);
                buttonElement.removeAttribute('data-processing');
              }
            }, 20); // 명령 실행 전 지연
          }
        } catch (outerError) {
          console.error('Strike 서식 적용 중 오류:', outerError);
          buttonElement.removeAttribute('data-processing');
        }
      }, 50); // 주요 실행 지연
    }
  });
})();
