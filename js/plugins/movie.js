/**
 * LiteEditor Media Plugin
 * 동영상 삽입 관련 플러그인
 */

(function() {
  // 상수 정의
  const PLUGIN_ID = 'media';
  const MODULE_NAME = 'MEDIA'; // 디버깅 로그용 모듈명
  
  // 팝업 저장 변수
  let popup = null;
  
  /**
   * 선택 영역 저장 (동영상 삽입 후 복원용)
   */
  function saveSelection() {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      return selection.getRangeAt(0).cloneRange();
    }
    return null;
  }
  
  /**
   * 저장된 선택 영역 복원
   */
  function restoreSelection(savedSelection) {
    if (savedSelection) {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(savedSelection);
    }
  }
  
  /**
   * 동영상 삽입 기능 (실제 구현은 나중에 추가 예정)
   */
  function insertMedia(contentArea) {
    // 선택 영역 저장
    const savedSelection = saveSelection();
    
    // 여기에 동영상 삽입 관련 기능 구현 예정
    console.log('동영상 삽입 기능이 호출되었습니다. 실제 구현은 나중에 추가될 예정입니다.');
    
    // 선택 영역 복원
    restoreSelection(savedSelection);
  }
  
  /**
   * 플러그인 등록
   */
  if (typeof LiteEditor !== 'undefined') {
    LiteEditor.registerPlugin(PLUGIN_ID, {
      icon: 'live_tv',
      title: '동영상 삽입',
      action: insertMedia
    });
  }
})();