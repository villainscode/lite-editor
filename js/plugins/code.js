/**
 * LiteEditor Code Plugin
 * 텍스트 코드 서식 플러그인
 * 여러 줄에 걸친 코드 적용 시에도 줄바꿈이 유지되도록 개선
 */

(function() {
  const util = window.PluginUtil;
  
  LiteEditor.registerPlugin('code', {
    title: 'Code',
    icon: 'code',
    customRender: function(toolbar, contentArea) {
      const button = util.dom.createElement('button', {
        className: 'lite-editor-button',
        title: 'Code'
      });

      const icon = util.dom.createElement('i', {
        className: 'material-icons',
        textContent: 'code'
      });
      button.appendChild(icon);

      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        executeCodeAction(contentArea);
      });

      return button;
    }
  });

  // Code 단축키 (Alt+C)
  LiteEditor.registerShortcut('code', {
    key: 'c',
    alt: true,
    action: executeCodeAction
  });

  /**
   * 코드 삽입 공통 로직 (디버깅 버전)
   */
  function executeCodeAction(contentArea) {
    console.log('🔍 [CODE DEBUG] executeCodeAction 시작');
    
    // ✅ 레이어 체크 및 포커스 확인
    const canExecute = util.utils.canExecutePlugin(contentArea);
    console.log('🔍 [CODE DEBUG] canExecutePlugin 결과:', canExecute);
    
    if (!canExecute) {
        console.log('❌ [CODE DEBUG] canExecutePlugin이 false 반환 - 실행 취소');
        return;
    }
    
    contentArea.focus();
    console.log('✅ [CODE DEBUG] contentArea.focus() 완료');
    
    // 선택 영역 확인
    const selection = util.selection.getSafeSelection();
    console.log('🔍 [CODE DEBUG] selection:', selection);
    console.log('🔍 [CODE DEBUG] selection.rangeCount:', selection?.rangeCount);
    
    if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        console.log('🔍 [CODE DEBUG] range:', range);
        console.log('🔍 [CODE DEBUG] range.collapsed:', range.collapsed);
        console.log('🔍 [CODE DEBUG] range.toString():', `"${range.toString()}"`);
        
        if (!range.collapsed) {
            console.log('📝 [CODE DEBUG] 선택 영역 있음 - 기존 로직 실행');
            // ✅ 선택 영역이 있는 경우: 기존 로직 그대로
            const offsets = util.selection.calculateOffsets(contentArea);
            
            let selectedText = range.toString();
            const trimmedText = selectedText.replace(/[\s\n\r]+$/, '');
            selectedText = trimmedText;
            
            const formattedText = selectedText
              .split('\n')
              .map(line => line.trim().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'))
              .join('\n');
            
            range.deleteContents();
            
            const codeElement = document.createElement('code');
            codeElement.setAttribute('data-selection-marker', 'true');
            codeElement.style.display = 'block';
            codeElement.style.width = '100%';
            codeElement.style.padding = '10px';
            codeElement.style.borderRadius = '4px';
            codeElement.style.fontFamily = 'monospace';
            codeElement.innerHTML = formattedText;
            
            range.insertNode(codeElement);
            
            util.selection.restoreSelectionByMarker(contentArea, 'code[data-selection-marker="true"]', 10)
              .then(success => {
                if (!success) {
                  util.selection.restoreFromOffsets(contentArea, offsets);
                  contentArea.focus();
                }
              });
        } else {
            console.log('✨ [CODE DEBUG] 선택 영역 없음 - 기본 코드 블록 삽입');
            insertDefaultCodeBlock(range);
        }
    } else {
        console.log('🎯 [CODE DEBUG] 선택 객체 없음 - 맨 끝에 기본 코드 블록 삽입');
        insertDefaultCodeBlockAtEnd(contentArea);
    }
  }

  /**
   * 기본 코드 요소 생성 (통일된 스타일)
   */
  function createDefaultCodeElement() {
    const codeElement = document.createElement('code');
    codeElement.textContent = '\u200B'; // Zero-width space (눈에 안보이는 공백)
    
    // ✅ 멀티라인과 동일한 스타일 적용
    codeElement.style.display = 'block';
    codeElement.style.width = '100%';
    codeElement.style.padding = '10px';
    codeElement.style.borderRadius = '4px';
    codeElement.style.fontFamily = 'monospace';
    codeElement.style.backgroundColor = '#f8f8f8';  // 선택사항
    codeElement.style.border = '1px solid #e0e0e0';  // 선택사항
    codeElement.contentEditable = 'true';
    
    return codeElement;
  }

  /**
   * 기본 한줄짜리 코드 블록 삽입 (초간단 버전)
   */
  function insertDefaultCodeBlock(range) {
    const codeElement = createDefaultCodeElement();
    range.insertNode(codeElement);
    
    // ✅ 포커스 + 커서 끝으로
    setTimeout(() => {
        codeElement.focus();
        const range = document.createRange();
        range.selectNodeContents(codeElement);
        range.collapse(false); // 끝으로
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }, 0);
  }
  
  /**
   * 맨 끝에 기본 코드 블록 삽입 (초간단 버전)
   */
  function insertDefaultCodeBlockAtEnd(contentArea) {
    const codeElement = createDefaultCodeElement();
    contentArea.appendChild(codeElement);
    
    // ✅ 아주 짧은 지연만 주면 끝!
    setTimeout(() => codeElement.focus(), 0);
  }
})();