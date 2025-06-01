/**
 * LiteEditor Shortcut Manager
 * 플랫폼별 단축키 관리 및 충돌 방지 시스템
 * Version 1.0.0
 */

class ShortcutManager {
  constructor() {
    this.shortcuts = new Map();
    this.platform = this._detectPlatform();
    this.activeListener = null;
    this.debugMode = window.DEBUG_MODE || false;
    
    // 시스템 예약 키 조합 (건드리면 안 되는 것들)
    this.systemReservedKeys = new Set([
      'cmd+c', 'cmd+v', 'cmd+x', 'cmd+z', 'cmd+shift+z', // 기본 편집
      'cmd+a', 'cmd+s', 'cmd+w', 'cmd+r', 'cmd+t',       // 브라우저 기본
      'alt+tab', 'cmd+tab', 'ctrl+alt+del'               // 시스템 기본
    ]);
    
    this._logInfo('ShortcutManager 초기화 완료', this.platform);
  }

  /**
   * 플랫폼 감지 및 설정
   * @returns {Object} 플랫폼 정보
   */
  _detectPlatform() {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    
    const isMac = /Mac|iPod|iPhone|iPad/.test(platform);
    const isWindows = /Win/.test(platform);
    const isLinux = /Linux/.test(platform);
    
    return {
      isMac,
      isWindows, 
      isLinux,
      cmdKey: isMac ? 'metaKey' : 'ctrlKey',
      cmdSymbol: isMac ? '⌘' : 'Ctrl',
      altKey: 'altKey',
      altSymbol: isMac ? '⌥' : 'Alt',
      shiftSymbol: 'Shift'
    };
  }

  /**
   * 단축키 등록
   * @param {string} id - 플러그인 ID
   * @param {Object} shortcut - 단축키 정의
   */
  register(id, shortcut) {
    try {
      const normalizedShortcut = this._normalizeShortcut(shortcut);
      
      // 🚫 시스템 예약 키 조합 체크
      const keyCombo = this._getKeyCombo(normalizedShortcut);
      if (this.systemReservedKeys.has(keyCombo)) {
        this._logWarning(`시스템 예약 키 조합입니다: ${keyCombo}. 등록을 건너뜁니다.`);
        return false;
      }
      
      // 🚫 Alt 단독 조합 차단 (맥에서 특수문자 충돌 방지)
      if (normalizedShortcut.alt && !normalizedShortcut.cmd && this.platform.isMac) {
        this._logWarning(`맥에서 Alt 단독 조합은 지원하지 않습니다: ${keyCombo}`);
        return false;
      }
      
      if (!this.shortcuts.has(id)) {
        this.shortcuts.set(id, []);
      }
      
      this.shortcuts.get(id).push(normalizedShortcut);
      this._logInfo(`단축키 등록 성공: ${id} → ${this._getDisplayKey(normalizedShortcut)}`);
      
      return true;
    } catch (error) {
      this._logError('단축키 등록 실패:', error);
      return false;
    }
  }

  /**
   * 단축키 정규화
   * @param {Object} shortcut - 원본 단축키 정의
   * @returns {Object} 정규화된 단축키
   */
  _normalizeShortcut(shortcut) {
    return {
      key: this._normalizeKey(shortcut.key),
      cmd: Boolean(shortcut.cmd),
      shift: Boolean(shortcut.shift),
      alt: Boolean(shortcut.alt),
      action: shortcut.action || (() => {}),
      description: shortcut.description || '',
      priority: shortcut.priority || 0
    };
  }

  /**
   * 키 정규화 (대소문자, 특수키 처리)
   * @param {string} key - 원본 키
   * @returns {string} 정규화된 키
   */
  _normalizeKey(key) {
    // 특수키 매핑
    const specialKeys = {
      'tab': 'Tab',
      'enter': 'Enter', 
      'escape': 'Escape',
      'space': ' ',
      'backspace': 'Backspace',
      'delete': 'Delete'
    };
    
    const lowerKey = key.toLowerCase();
    return specialKeys[lowerKey] || lowerKey;
  }

  /**
   * 키 조합 문자열 생성 (중복 체크용)
   * @param {Object} shortcut - 단축키 객체
   * @returns {string} 키 조합 문자열
   */
  _getKeyCombo(shortcut) {
    const parts = [];
    if (shortcut.cmd) parts.push('cmd');
    if (shortcut.shift) parts.push('shift');
    if (shortcut.alt) parts.push('alt');
    parts.push(shortcut.key);
    return parts.join('+');
  }

  /**
   * 표시용 키 조합 문자열 생성
   * @param {Object} shortcut - 단축키 객체
   * @returns {string} 사용자에게 표시할 키 조합
   */
  _getDisplayKey(shortcut) {
    const parts = [];
    if (shortcut.cmd) parts.push(this.platform.cmdSymbol);
    if (shortcut.shift) parts.push(this.platform.shiftSymbol);
    if (shortcut.alt) parts.push(this.platform.altSymbol);
    
    // 키 표시명 정리
    let displayKey = shortcut.key;
    if (shortcut.key === ' ') displayKey = 'Space';
    else if (shortcut.key.length === 1) displayKey = shortcut.key.toUpperCase();
    
    parts.push(displayKey);
    return parts.join('+');
  }

  /**
   * 이벤트 리스너 설정
   * @param {HTMLElement} contentArea - 에디터 콘텐츠 영역
   */
  setupListener(contentArea) {
    if (this.activeListener) {
      this.removeListener();
    }

    this.activeListener = (e) => this._handleKeyDown(e, contentArea);
    
    // 🔥 캡처 단계에서 처리 (우선순위 확보)
    contentArea.addEventListener('keydown', this.activeListener, true);
    
    this._logInfo('단축키 리스너 설정 완료');
  }

  /**
   * 키다운 이벤트 핸들러
   * @param {KeyboardEvent} e - 키보드 이벤트
   * @param {HTMLElement} contentArea - 콘텐츠 영역
   */
  _handleKeyDown(e, contentArea) {
    try {
      // 🚫 입력 요소에서는 단축키 무시
      if (this._isInputElement(e.target)) {
        return;
      }

      // 🚫 모달이나 드롭다운이 열려있으면 무시
      if (this._hasOpenModals()) {
        return;
      }

      // 🔍 단축키 매칭 찾기
      const matchedShortcut = this._findMatchingShortcut(e);
      
      if (matchedShortcut) {
        // ✅ 이벤트 차단 및 실행
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        this._logInfo(`단축키 실행: ${this._getDisplayKey(matchedShortcut)}`);
        
        // ✅ 가상 버튼 요소 생성하여 전달
        const virtualButton = {
          hasAttribute: () => false,
          setAttribute: () => {},
          removeAttribute: () => {},
          _isVirtual: true,
          _shortcutId: matchedShortcut.id
        };
        
        // 액션 실행 시 contentArea와 가상 버튼 전달
        matchedShortcut.action(contentArea, virtualButton);
        
        if (window.errorHandler) {
          errorHandler.colorLog('SHORTCUT', `✅ 단축키 실행: ${matchedShortcut.id}`, null, '#4caf50');
        }
        
        return false;
      }
    } catch (error) {
      if (window.errorHandler) {
        errorHandler.logError('ShortcutManager', '알 수 없는 오류', error);
      }
    }
  }

  /**
   * 입력 요소인지 확인
   * @param {Element} element - 확인할 요소
   * @returns {boolean} 입력 요소 여부
   */
  _isInputElement(element) {
    const inputTags = ['INPUT', 'TEXTAREA', 'SELECT'];
    const contentEditableCheck = element.contentEditable === 'true' && 
                                 element !== document.querySelector('.lite-editor-content');
    
    return inputTags.includes(element.tagName) || contentEditableCheck;
  }

  /**
   * 열린 모달이나 드롭다운이 있는지 확인
   * @returns {boolean} 모달 존재 여부
   */
  _hasOpenModals() {
    const modalSelectors = [
      '.lite-editor-dropdown-menu.show',
      '.modal-overlay.show', 
      '.lite-editor-popup-layer.show',
      '[class*="dropdown"][style*="display: block"]',
      '[class*="modal"][style*="display: block"]'
    ];
    
    return document.querySelector(modalSelectors.join(', ')) !== null;
  }

  /**
   * 매칭되는 단축키 찾기
   * @param {KeyboardEvent} e - 키보드 이벤트
   * @returns {Object|null} 매칭된 단축키 또는 null
   */
  _findMatchingShortcut(e) {
    const pressedKey = this._normalizeKey(e.key);
    const isCmdPressed = e[this.platform.cmdKey];
    const isShiftPressed = e.shiftKey;
    const isAltPressed = e.altKey;

    // 우선순위 순으로 정렬된 모든 단축키 검사
    const allShortcuts = [];
    
    for (const [id, shortcutList] of this.shortcuts) {
      for (const shortcut of shortcutList) {
        allShortcuts.push({ id, ...shortcut });
      }
    }
    
    // 우선순위 정렬 (높은 우선순위 먼저)
    allShortcuts.sort((a, b) => b.priority - a.priority);

    for (const shortcut of allShortcuts) {
      if (this._isShortcutMatch(shortcut, pressedKey, isCmdPressed, isShiftPressed, isAltPressed)) {
        return shortcut;
      }
    }
    
    return null;
  }

  /**
   * 단축키 매칭 확인
   * @param {Object} shortcut - 단축키 정의
   * @param {string} pressedKey - 눌린 키
   * @param {boolean} cmd - Cmd/Ctrl 눌림 여부
   * @param {boolean} shift - Shift 눌림 여부  
   * @param {boolean} alt - Alt 눌림 여부
   * @returns {boolean} 매칭 여부
   */
  _isShortcutMatch(shortcut, pressedKey, cmd, shift, alt) {
    return shortcut.key === pressedKey &&
           shortcut.cmd === cmd &&
           shortcut.shift === shift &&
           shortcut.alt === alt;
  }

  /**
   * 리스너 제거
   */
  removeListener() {
    if (this.activeListener) {
      const contentAreas = document.querySelectorAll('.lite-editor-content');
      contentAreas.forEach(area => {
        area.removeEventListener('keydown', this.activeListener, true);
      });
      this.activeListener = null;
      this._logInfo('단축키 리스너 제거 완료');
    }
  }

  /**
   * 등록된 모든 단축키 목록 반환
   * @returns {Array} 단축키 목록
   */
  getAllShortcuts() {
    const result = [];
    for (const [id, shortcutList] of this.shortcuts) {
      for (const shortcut of shortcutList) {
        result.push({
          id,
          displayKey: this._getDisplayKey(shortcut),
          description: shortcut.description,
          ...shortcut
        });
      }
    }
    return result.sort((a, b) => a.id.localeCompare(b.id));
  }

  /**
   * 특정 ID의 단축키 제거
   * @param {string} id - 제거할 플러그인 ID
   */
  unregister(id) {
    if (this.shortcuts.has(id)) {
      this.shortcuts.delete(id);
      this._logInfo(`단축키 제거: ${id}`);
    }
  }

  /**
   * 모든 단축키 초기화
   */
  clear() {
    this.shortcuts.clear();
    this._logInfo('모든 단축키 초기화');
  }

  // 🐛 디버깅 메서드들
  _logInfo(message, data = null) {
    if (this.debugMode && window.errorHandler) {
      errorHandler.colorLog('SHORTCUT', message, data, '#2196f3');
    }
  }

  _logWarning(message, data = null) {
    if (window.errorHandler) {
      errorHandler.colorLog('SHORTCUT', `⚠️ ${message}`, data, '#ff9800');
    }
  }

  _logError(message, error = null) {
    if (window.errorHandler) {
      errorHandler.logError('ShortcutManager', 'SHORTCUT_ERROR', error || new Error(message));
    }
  }
}

// 전역으로 노출
window.ShortcutManager = ShortcutManager;

// 인스턴스 생성 및 전역 등록
if (!window.liteEditorShortcuts) {
  window.liteEditorShortcuts = new ShortcutManager();
} 