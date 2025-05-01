/**
 * LiteEditor 디버깅 유틸리티
 * 플러그인 개발 시 필요한 디버깅 기능 모음
 */

// 디버깅 모드 활성화 여부
// 전역으로 설정하여 모든 디버깅 기능을 한번에 활성화/비활성화 가능
// 기본적으로 활성화되어 있음
window.DEBUG_MODE = window.DEBUG_MODE !== undefined ? window.DEBUG_MODE : true;

/**
 * 색상 로그 출력 함수
 * @param {string} module 모듈명 (예: 'ALIGN', 'LINK' 등)
 * @param {string} message 출력할 메시지
 * @param {any} data 추가 데이터 (선택사항)
 * @param {string} color 로그 색상 (CSS 색상값)
 */
function debugLog(module, message, data, color = '#2196f3') {
  if (!window.DEBUG_MODE) return;
  
  console.log(
    `%c[${module}] ${message}`,
    `color:${color};font-weight:bold;`,
    data || ''
  );
}

/**
 * 화면에 디버깅 요소 표시
 * @param {string} message 표시할 메시지
 * @param {number} duration 표시 시간 (ms)
 * @param {string} bgColor 배경색
 * @param {string} textColor 텍스트 색상
 */
function showDebugElement(message, duration = 3000, bgColor = 'red', textColor = 'white') {
  if (!window.DEBUG_MODE) return;
  
  const debugElement = document.createElement('div');
  debugElement.textContent = message;
  debugElement.style.position = 'fixed';
  debugElement.style.top = '10px';
  debugElement.style.right = '10px';
  debugElement.style.backgroundColor = bgColor;
  debugElement.style.color = textColor;
  debugElement.style.padding = '10px';
  debugElement.style.zIndex = '999999';
  debugElement.style.fontWeight = 'bold';
  debugElement.style.borderRadius = '4px';
  document.body.appendChild(debugElement);
  
  setTimeout(() => {
    if (debugElement.parentNode) {
      debugElement.parentNode.removeChild(debugElement);
    }
  }, duration);
}

/**
 * 에디터 선택 영역 정보 반환 유틸
 * @param {HTMLElement|string} target 편집 영역 요소 또는 CSS 선택자(기본 '#lite-editor')
 * @returns {{ start:number, end:number, text:string }|null}
 */
function getEditorSelectionInfo(target = '#lite-editor') {
  const editor = typeof target === 'string' ? document.querySelector(target) : target;
  const sel = window.getSelection();
  if (!editor || !sel || sel.rangeCount === 0) return null;

  const range = sel.getRangeAt(0);
  if (range.collapsed) return null; // 선택 없으면 종료

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

  debugLog('SELECTION', `start=${start}, end=${end}, text="${text}"`);

  return { start, end, text };
}

/**
 * 선택 영역 정보 상세 출력
 * @param {Range} range 선택 영역 Range 객체
 */
function logSelectionDetails(range) {
  if (!window.DEBUG_MODE || !range) return;
  
  const details = {
    startContainer: range.startContainer,
    startOffset: range.startOffset,
    endContainer: range.endContainer,
    endOffset: range.endOffset,
    commonAncestorContainer: range.commonAncestorContainer,
    text: range.toString()
  };
  
  debugLog('SELECTION_DETAILS', '선택 영역 상세 정보', details);
  return details;
}

// 전역 네임스페이스에 디버깅 함수 등록
window.DebugUtils = {
  debugLog,
  showDebugElement,
  getEditorSelectionInfo,
  logSelectionDetails,
  // 디버깅 모드 설정 함수
  enableDebug: function() { window.DEBUG_MODE = true; },
  disableDebug: function() { window.DEBUG_MODE = false; }
};