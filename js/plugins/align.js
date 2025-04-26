/**
 * LiteEditor Alignment Plugin
 * 텍스트 정렬 관련 통합 플러그인
 * 디버깅 코드는 debug-utils.js의 함수를 활용하여 공통화
 */

// 디버깅 유틸리티 공통 참조
// @[js/debug-utils.js]

(function() {
  // 상수 정의
  const PLUGIN_ID = 'align';
  const MODULE_NAME = 'ALIGN'; // 디버깅 로그용 모듈명
  
  // 팝업 저장 변수
  let popup = null;
  
  /**
   * 선택 영역 저장 (정렬 적용 후 복원용)
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
      
      // 디버깅: 선택 영역 복원 로그
      DebugUtils.debugLog(MODULE_NAME, '선택 영역 복원됨', null, '#4CAF50');
    }
  }
  
  /**
   * 정렬 적용 함수
   */
  function applyAlignment(alignType, contentArea) {
    // 디버깅: 정렬 적용 시작 로그
    DebugUtils.debugLog(MODULE_NAME, `정렬 적용: ${alignType}`, null, '#FF9800');
    DebugUtils.getEditorSelectionInfo(contentArea);
    
    // 선택 영역 저장
    const savedSelection = saveSelection();
    
    // 정렬 명령 실행
    document.execCommand('justify' + alignType);
    
    // 선택 영역 복원
    restoreSelection(savedSelection);
    
    // 디버깅: 정렬 적용 완료 로그
    DebugUtils.debugLog(MODULE_NAME, `정렬 적용 완료: ${alignType}`, null, '#4CAF50');
    // 디버깅 요소 표시
    DebugUtils.showDebugElement(`정렬 적용: ${alignType}`, 1500, '#4CAF50');
  }
  
  /**
   * 정렬 팝업 생성 및 표시
   */
  function createAlignPopup(button, contentArea) {
    // 디버깅: 팝업 생성 로그
    DebugUtils.debugLog(MODULE_NAME, '정렬 팝업 생성', null, '#2196F3');
    
    // 기존 팝업 제거
    if (popup) {
      document.body.removeChild(popup);
      popup = null;
    }
    
    // 새 팝업 생성
    popup = document.createElement('div');
    popup.innerHTML = `
      <button class="align-btn" data-align="Left"><i class="material-icons">format_align_left</i></button>
      <button class="align-btn" data-align="Center"><i class="material-icons">format_align_center</i></button>
      <button class="align-btn" data-align="Right"><i class="material-icons">format_align_right</i></button>
      <button class="align-btn" data-align="Full"><i class="material-icons">format_align_justify</i></button>
    `;
    
    // 팝업 스타일 직접 적용
    popup.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      display: flex;
      background-color: white;
      border: 1px solid #ddd;
      border-radius: 4px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      padding: 4px;
      z-index: 99999;
    `;
    
    // 버튼 스타일 적용
    const buttons = popup.querySelectorAll('.align-btn');
    buttons.forEach(btn => {
      btn.style.cssText = `
        width: 32px;
        height: 32px;
        display: flex;
        justify-content: center;
        align-items: center;
        background: none;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        padding: 0;
        margin: 0 2px;
        transition: background-color 0.2s;
      `;
      
      // 호버 효과 추가
      btn.addEventListener('mouseover', function() {
        this.style.backgroundColor = '#f0f0f0';
      });
      
      btn.addEventListener('mouseout', function() {
        this.style.backgroundColor = 'transparent';
      });
      
      // 클릭 이벤트 추가
      btn.addEventListener('click', function() {
        const alignType = this.getAttribute('data-align');
        
        // 디버깅: 정렬 버튼 클릭 로그
        DebugUtils.debugLog(MODULE_NAME, `정렬 버튼 클릭: ${alignType}`, null, '#FF9800');
        
        // 정렬 적용
        applyAlignment(alignType, contentArea);
        
        // 팝업 닫기
        closePopup();
      });
    });
    
    // 팝업 문서에 추가
    document.body.appendChild(popup);
    
    // 버튼 위치 기준으로 팝업 위치 설정
    const rect = button.getBoundingClientRect();
    popup.style.top = (rect.bottom + window.scrollY) + 'px';
    popup.style.left = (rect.left + window.scrollX) + 'px';
    
    // 디버깅: 팝업 위치 로그
    DebugUtils.debugLog(MODULE_NAME, '팝업 위치 설정', {
      top: popup.style.top,
      left: popup.style.left,
      rect: rect
    });
    
    // 외부 클릭 시 팝업 닫기
    setTimeout(() => {
      document.addEventListener('click', handleOutsideClick);
    }, 10);
    
    return popup;
  }
  
  /**
   * 외부 클릭 처리
   */
  function handleOutsideClick(e) {
    if (popup && !popup.contains(e.target)) {
      // 디버깅: 외부 클릭 감지 로그
      DebugUtils.debugLog(MODULE_NAME, '외부 클릭으로 팝업 닫기');
      closePopup();
    }
  }
  
  /**
   * 팝업 닫기
   */
  function closePopup() {
    if (popup && popup.parentNode) {
      document.removeEventListener('click', handleOutsideClick);
      popup.parentNode.removeChild(popup);
      popup = null;
      
      // 디버깅: 팝업 닫기 로그
      DebugUtils.debugLog(MODULE_NAME, '팝업 닫힘');
    }
  }
  
  // 플러그인 등록
  LiteEditor.registerPlugin(PLUGIN_ID, {
    title: 'Alignment',
    icon: 'format_align_left',
    customRender: function(toolbar, contentArea) {
      // 디버깅: 플러그인 초기화 로그
      DebugUtils.debugLog(MODULE_NAME, '플러그인 초기화', null, '#9C27B0');
      
      // 버튼 생성
      const button = document.createElement('button');
      button.className = 'lite-editor-button';
      button.title = 'Text Alignment';
      
      // 아이콘 추가
      const icon = document.createElement('i');
      icon.className = 'material-icons';
      icon.textContent = 'format_align_left';
      button.appendChild(icon);
      
      // 클릭 이벤트
      button.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // 디버깅: 메인 버튼 클릭 로그
        DebugUtils.debugLog(MODULE_NAME, '정렬 메인 버튼 클릭');
        // 선택 영역 정보 출력
        DebugUtils.getEditorSelectionInfo(contentArea);
        
        // 팝업 토글
        if (popup) {
          closePopup();
        } else {
          createAlignPopup(this, contentArea);
        }
      });
      
      toolbar.appendChild(button);
      return button;
    },
    // 단축키 설정 (추후 구현 가능)
    shortcuts: {
      // 'ctrl+l': 'justifyLeft',
      // 'ctrl+e': 'justifyCenter',
      // 'ctrl+r': 'justifyRight',
      // 'ctrl+j': 'justifyFull'
    }
  });
})();