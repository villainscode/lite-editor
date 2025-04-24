/**
 * 에디터 선택 영역 정보 반환 유틸
 * @param {HTMLElement|string} target  편집 영역 요소 또는 CSS 선택자(기본 '#lite-editor')
 * @returns {{ start:number, end:number, text:string }|null}
 */
/**
 * #lite-editor 안의 선택 오프셋·텍스트 반환
 * 컨테이너 타입(Element/Text)에 관계없이 정확히 계산
 */
function getEditorSelectionInfo(target = '#lite-editor') {
    const editor = typeof target === 'string' ? document.querySelector(target) : target;
    const sel    = window.getSelection();
    if (!editor || !sel || sel.rangeCount === 0) return null;
  
    const range = sel.getRangeAt(0);
    if (range.collapsed) return null;            // 선택 없으면 종료
  
    // ── 절대 시작 오프셋 ──
    const startRange = range.cloneRange();
    startRange.selectNodeContents(editor);
    startRange.setEnd(range.startContainer, range.startOffset);
    const start = startRange.toString().length;
  
    // ── 절대 종료 오프셋 ──
    const endRange = range.cloneRange();
    endRange.selectNodeContents(editor);
    endRange.setEnd(range.endContainer, range.endOffset);
    const end = endRange.toString().length;
  
    const text = range.toString();
  
    console.log(
      `%c[SELECTION] start=${start}, end=${end}, text="${text}"`,
      'color:#2196f3;font-weight:bold;'
    );
  
    return { start, end, text };
  }