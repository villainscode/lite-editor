/**
 * LiteEditor Font Family Plugin
 * 폰트 목록만 표시하는 간략한 버전
 * 수정된 버전 - 폰트 적용 오류 수정
 */

(function() {
  /**
   * 에디터 영역의 텍스트 선택 시 선택된 블록의 시작점과 끝점을 계산하는 함수
   * @param {Element} element - contenteditable 요소
   * @returns {Object|null} 선택 영역 정보 또는 null
   */
  function processContentEditableSelection(element) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      // 선택 영역이 없는 경우 처리 중단
      console.log('선택 영역이 없음 (processContentEditableSelection)');
      return null;
    }
    
    const range = selection.getRangeAt(0);
    if (range.collapsed) {
      console.log('선택 영역 접힘음 (collapsed range)');
      return null;
    }
    
    // 선택 영역의 시작점과 끝점 오프셋 계산
    const startIndex = getNodeOffset(element, range.startContainer, range.startOffset);
    const endIndex = getNodeOffset(element, range.endContainer, range.endOffset);
    
    // 선택된 블록 정보 생성
    const blockSelection = {
      text: range.toString(),
      start: startIndex,
      end: endIndex,
      range: range  // 원래 range 객체도 함께 저장
    };

    console.log('선택된 블록:', blockSelection);
    return blockSelection;
  }

  /**
   * contenteditable 요소 내에서 노드의 오프셋(문자 위치) 계산
   * @param {Element} root - contenteditable 요소 (루트)
   * @param {Node} targetNode - 선택 영역 내의 대상 노드
   * @param {number} targetOffset - 대상 노드 내의 오프셋
   * @returns {number} 루트 요소 기준의 전체 오프셋
   */
  function getNodeOffset(root, targetNode, targetOffset) {
    // 대상 노드가 텍스트 노드가 아닌 경우, 자식 노드를 순회하여 오프셋 계산
    if (targetNode.nodeType !== Node.TEXT_NODE) {
      let offset = 0;
      for (let i = 0; i < targetOffset; i++) {
        if (targetNode.childNodes[i]) {
          offset += getTextContent(targetNode.childNodes[i]).length;
        }
      }
      return offset;
    }
    
    let offset = targetOffset;
    // 루트 요소부터 대상 텍스트 노드까지의 전체 텍스트 길이를 누적 계산
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    while (walker.nextNode()) {
      if (walker.currentNode === targetNode) {
        break;
      }
      offset += walker.currentNode.textContent.length;
    }
    
    return offset;
  }

  /**
   * 노드의 모든 텍스트 콘텐츠를 반환하는 함수
   * @param {Node} node - 대상 노드
   * @returns {string} 노드 내의 텍스트 콘텐츠
   */
  function getTextContent(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent;
    }
    let text = '';
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null, false);
    while (walker.nextNode()) {
      text += walker.currentNode.textContent;
    }
    return text;
  }

  /**
   * 현재 텍스트 선택 여부를 정확하게 확인하는 함수
   * @param {Element} contentArea - contenteditable 요소
   * @returns {boolean} 유효한 선택 영역 여부
   */
  function hasValidSelection(contentArea) {
    // 개선된 선택 영역 계산 사용
    const selection = processContentEditableSelection(contentArea);
    return selection !== null && selection.text.trim().length > 0;
  }
  
  /**
   * DocumentFragment나 요소 내의 모든 노드에 직접 스타일 적용
   * @param {Node} node - 스타일을 적용할 노드
   * @param {string} property - CSS 속성 이름
   * @param {string} value - 적용할 속성 값
   */
  function applyStyleToNodes(node, property, value) {
    // 자기 자신에 스타일 적용 (요소 노드인 경우)
    if (node.nodeType === Node.ELEMENT_NODE && node.style) {
      node.style.setProperty(property, value, 'important');
    }
    
    // 모든 자식 노드에 스타일 적용
    if (node.childNodes && node.childNodes.length > 0) {
      for (let i = 0; i < node.childNodes.length; i++) {
        applyStyleToNodes(node.childNodes[i], property, value);
      }
    }
  }
  
  // 폰트 적용 테스트를 위한 스타일 추가
  function injectFontFamilyStyles() {
    // 이미 스타일 요소가 있는지 확인
    if (document.getElementById('lite-editor-font-styles')) {
      return;
    }
    
    const styleElement = document.createElement('style');
    styleElement.id = 'lite-editor-font-styles';
    styleElement.textContent = `
      /* 폰트 패밀리 직접 적용 스타일 - 높은 우선순위 */
      .lite-editor-content .font-family-applied {
        font-family: var(--applied-font) !important;
      }
      
      /* 코딩 폰트를 위한 특별 스타일 */
      .lite-editor-content .lite-editor-coding-font {
        font-family: inherit;
        white-space: pre;
        display: inline-block;
        border: 1px dashed #0066cc;
        border-radius: 3px;
        padding: 0 2px;
        background-color: rgba(0, 102, 204, 0.05);
      }
      
      /* font 태그 스타일 강화 - attr()가 지원되지 않을 수 있으니 직접 선택자로 처리 */
      .lite-editor-content font[face="Arial"] { font-family: Arial !important; }
      .lite-editor-content font[face="Times New Roman"] { font-family: "Times New Roman" !important; }
      .lite-editor-content font[face="Verdana"] { font-family: Verdana !important; }
      .lite-editor-content font[face="Tahoma"] { font-family: Tahoma !important; }
      .lite-editor-content font[face="Courier New"] { font-family: "Courier New" !important; }
      .lite-editor-content font[face="Georgia"] { font-family: Georgia !important; }
      .lite-editor-content font[face="Noto Sans KR"] { font-family: "Noto Sans KR" !important; }
      
      /* 코딩 폰트 직접 지정 - 더 강력한 선택자 사용 */
      .lite-editor-content font[face="IBM Plex Mono"] { font-family: "IBM Plex Mono", monospace !important; }
      .lite-editor-content font[face="Fira Code"] { font-family: "Fira Code", monospace !important; }
      .lite-editor-content font[face="JetBrains Mono"] { font-family: "JetBrains Mono", monospace !important; }
      .lite-editor-content font[face="Source Code Pro"] { font-family: "Source Code Pro", monospace !important; }
      .lite-editor-content font[face="Hack"] { font-family: Hack, monospace !important; }
      
      /* span 요소를 통한 코딩 폰트 적용 방식을 위한 선택자 */
      .lite-editor-content span[style*="IBM Plex Mono"] { font-family: "IBM Plex Mono", monospace !important; }
      .lite-editor-content span[style*="Fira Code"] { font-family: "Fira Code", monospace !important; }
      .lite-editor-content span[style*="JetBrains Mono"] { font-family: "JetBrains Mono", monospace !important; }
      .lite-editor-content span[style*="Source Code Pro"] { font-family: "Source Code Pro", monospace !important; }
      .lite-editor-content span[style*="Hack"] { font-family: Hack, monospace !important; }
    `;
    document.head.appendChild(styleElement);
  }
  
  // 폰트 드롭다운이 이미 DOM에 있는지 체크
  function ensureFontDropdownContainer() {
    let container = document.getElementById('lite-editor-font-dropdown-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'lite-editor-font-dropdown-container';
      container.style.position = 'absolute';
      container.style.top = '0';
      container.style.left = '0';
      container.style.width = '100%';
      container.style.height = '0';
      container.style.overflow = 'visible';
      container.style.zIndex = '2147483647'; // 최대 z-index 값
      document.body.appendChild(container);
    }
    return container;
  }
  
  // 폰트 적용 함수 - 표준 선택 메커니즘 사용
  function applyFontToSelection(fontFamily, contentArea) {
    console.log('폰트 적용 시도 (표준 방식):', fontFamily);
    
    // 1. 문서에 포커스 주기
    contentArea.focus();
    
    // 2. 표준 선택 영역 가져오기
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) {
      console.error('선택 영역이 없습니다');
      return false;
    }
    
    // 3. 폰트 패밀리 유효성 검사
    if (!fontFamily || fontFamily.trim() === '') {
      console.error('폰트 이름이 유효하지 않음');
      return false;
    }
    
    try {
      // 4. 레인지 가져오기 및 유효성 검사
      const range = selection.getRangeAt(0);
      
      if (range.collapsed) {
        console.log('선택된 내용 없음 (collapsed range)');
        return false;
      }
      
      // 5. 선택된 컨텐츠 가져오기
      const selectedContent = range.extractContents();
      if (!selectedContent.textContent.trim()) {
        console.log('선택된 텍스트가 비어있음');
        return false;
      }
      
      // 컨텐츠 가져왔음 - 확인
      console.log('선택된 컨텐츠 가져옴: ', selectedContent.textContent);
      
      // 6. 새로운 방식 - 세 가지 레이어 중첩해서 사용
      
      // 6.1 외부 SPAN 생성 (CSS 변수 사용)
      const outerSpan = document.createElement('span');
      outerSpan.className = 'font-family-applied';
      outerSpan.style.setProperty('--applied-font', fontFamily, 'important');
      outerSpan.dataset.fontFamily = fontFamily; // 데이터 속성으로도 저장
      
      // 6.2 font 태그 생성 (전통적인 방식)
      const fontElement = document.createElement('font');
      fontElement.setAttribute('face', fontFamily);
      fontElement.style.setProperty('font-family', fontFamily, 'important');
      
      // 6.3 내부 SPAN 생성 (직접 스타일 사용)
      const innerSpan = document.createElement('span');
      innerSpan.style.setProperty('font-family', fontFamily, 'important');
      
      // 7. 선택된 컨텐츠에 폰트 스타일 직접 적용 (DOM 순회)
      applyStyleToNodes(selectedContent, 'font-family', fontFamily);
      
      // 8. 중첩 구조로 삽입 (span > font > span > content)
      innerSpan.appendChild(selectedContent);
      fontElement.appendChild(innerSpan);
      outerSpan.appendChild(fontElement);
      
      // 9. 중첩 구조 삽입
      range.insertNode(outerSpan);
      
      // 10. 선택 영역 변경
      const selection = window.getSelection();
      selection.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNode(outerSpan);
      selection.addRange(newRange);
      
      // 최종적으로 생성된 요소 저장 (콘솔 출력용)
      const finalElement = outerSpan;
      
      console.log('폰트 성공적으로 적용됨:', fontFamily);
      
      // 사용자가 요청한 최종 적용된 HTML 태그 출력 (매우 강조됨)
      console.log('%c폰트 적용 결과: 생성된 태그 ===>', 'background: #FF0000; color: #FFFFFF; font-size: 20px; font-weight: bold; padding: 5px;');
      console.log('%c' + finalElement.outerHTML, 'font-size: 16px; background: #FFEB3B; padding: 3px; border: 1px solid #000;');
      
      // 간단한 태그 정보 (텍스트로)
      console.log('==============================================');
      console.log(`태그 이름: ${finalElement.tagName}, 값: ${finalElement.textContent}`);
      console.log(`중첩 구조: SPAN > FONT > SPAN > 텍스트`);
      console.log(`외부 클래스: ${finalElement.className}`); 
      console.log(`내부 폰트 태그 face 속성: ${fontElement.getAttribute('face')}`);
      console.log('==============================================');
      
      // 에디터 한가운데 해당 태그를 찾아서 보여주기
      console.log('%c에디터 내에서 중첩 폰트 태그를 찾음', 'background: #2196F3; color: white; font-size: 16px;');
      
      // 폰트 요소 타입 및 속성 출력 (자세히)
      console.log('%c적용된 외부 요소 상세 정보', 'background: #333; color: #ff9800; font-size: 14px;');
      console.log('outerSpan tagName:', finalElement.tagName);
      console.log('outerSpan className:', finalElement.className);
      console.log('outerSpan computed style:', window.getComputedStyle(finalElement).fontFamily);
      console.log('fontElement tagName:', fontElement.tagName);
      console.log('fontElement face attribute:', fontElement.getAttribute('face'));
      console.log('fontElement computed style:', window.getComputedStyle(fontElement).fontFamily);
      
      // 전체 에디터 상태 출력
      console.log('%c현재 에디터 HTML', 'background: #333; color: #4CAF50; font-size: 14px;');
      console.log(contentArea.innerHTML);
      
      // 에디터 HTML을 포맷팅해서 보여주기 (더 알기 쉽게)
      console.log('%c에디터 HTML 트리', 'background: #333; color: #03A9F4; font-size: 14px;');
      
      // DOM 구조 시각화
      function formatHTML(html) {
        let formatted = '';
        let indent = 0;
        
        // HTML 파싱 및 포맷팅
        html = html.replace(/>[\r\n\t ]*/g, '>').replace(/[\r\n\t ]*</g, '<');
        html = html.replace(/<\/(\w+)>/g, '</$1>\n');
        html = html.replace(/<(\w+)([^>]*)>/g, function(match, tag, attrs) {
          let nl = tag === 'br' ? '\n' : '';
          return '\n' + ' '.repeat(indent * 2) + '<' + tag + attrs + '>' + nl;
        });
        
        // 줄바꿈 처리
        let lines = html.split('\n');
        for (let i = 0; i < lines.length; i++) {
          let line = lines[i];
          if (line.match(/<\/(\w+)>/)) indent -= 1;
          formatted += ' '.repeat(Math.max(0, indent * 2)) + line + '\n';
          if (line.match(/<(\w+)([^>]*)[^/]>/) && !line.match(/<(br|hr|img|input|link|meta)([^>]*)>/)) indent += 1;
        }
        
        return formatted;
      }
      
      // 포맷팅된 HTML 출력
      console.log(formatHTML(contentArea.innerHTML));
      
      // 500ms 후 에디터 HTML 다시 출력 (지연된 변경사항 확인용)
      setTimeout(() => {
        console.log('%c500ms 후 에디터 HTML 상태', 'background: #333; color: #8BC34A; font-size: 16px;');
        console.log(formatHTML(contentArea.innerHTML));
      }, 500);
      return true;
    } catch (error) {
      console.error('폰트 적용 중 오류 발생:', error);
      return false;
    }
  }
  
  // 폰트 플러그인 등록
  LiteEditor.registerPlugin('fontFamily', {
    customRender: function(toolbar, contentArea) {
      // 1. 폰트 버튼 컨테이너 생성 (셀렉트 박스 스타일)
      const fontContainer = document.createElement('div');
      fontContainer.className = 'lite-editor-font-button';
      fontContainer.setAttribute('title', 'Font Family');
      fontContainer.style.position = 'relative';
      
      // 2. 버튼 아이콘 추가
      const icon = document.createElement('i');
      icon.className = 'material-icons';
      icon.textContent = 'font_download';
      icon.style.fontSize = '18px';
      icon.style.marginRight = '5px';
      fontContainer.appendChild(icon);
      
      // 3. Font Family 텍스트 추가
      const fontText = document.createElement('span');
      fontText.textContent = 'Font Family';
      fontText.style.fontSize = '14px';
      fontContainer.appendChild(fontText);
      
      // 4. 드롭다운 화살표 추가
      const arrowIcon = document.createElement('i');
      arrowIcon.className = 'material-icons';
      arrowIcon.textContent = 'arrow_drop_down';
      arrowIcon.style.fontSize = '18px';
      arrowIcon.style.marginLeft = '5px';
      fontContainer.appendChild(arrowIcon);
      
      // 5. 드롭다운 메뉴 생성 - 정렬 플러그인처럼 처리
      const dropdownMenu = document.createElement('div');
      dropdownMenu.id = 'font-family-dropdown';
      dropdownMenu.className = 'lite-editor-font-dropdown';
      dropdownMenu.style.position = 'fixed'; // fixed 포지션 사용
      dropdownMenu.style.zIndex = '2147483647'; // 최대 z-index 값
      dropdownMenu.style.backgroundColor = '#fff';
      dropdownMenu.style.border = '1px solid #ccc';
      dropdownMenu.style.borderRadius = '4px';
      dropdownMenu.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
      dropdownMenu.style.maxHeight = '300px';
      dropdownMenu.style.minWidth = '200px';
      dropdownMenu.style.overflowY = 'auto';
      dropdownMenu.style.padding = '8px 0';
      
      // 4. 폰트 목록 정의
      const fonts = [
        // 한글 폰트 그룹 (상단)
        { type: 'group_header', name: '한글 폰트' },
        { type: 'divider' },
        { name: '바탕', value: 'Batang, Batangche, serif' },
        { name: '굴림', value: 'Gulim, sans-serif' },
        { name: '맑은 고딕', value: 'Malgun Gothic, AppleGothic, sans-serif' },
        { name: 'Noto Sans KR', value: 'Noto Sans KR, sans-serif' },
        { name: '나눔고딕', value: 'Nanum Gothic, sans-serif' },
        { name: '서울나무', value: 'Seoul Namsan, sans-serif' },
        
        // 구분선
        { type: 'divider' },
        
        // 코딩 폰트 그룹 (중단)
        { type: 'group_header', name: '코딩 폰트' },
        { type: 'divider' },
        { name: 'IBM Plex Mono', value: 'IBM Plex Mono, monospace' },
        { name: 'Source Code Pro', value: 'Source Code Pro, monospace' },
        { name: 'JetBrains Mono', value: 'JetBrains Mono, monospace' },
        { name: 'Hack', value: 'Hack, monospace' },
        { name: 'Fira Code', value: 'Fira Code, monospace' },
        { name: 'Consolas', value: 'Consolas, monospace' },
        
        // 구분선
        { type: 'divider' },
        
        // 영문 폰트 그룹 (하단)
        { type: 'group_header', name: '영문 폰트' },
        { type: 'divider' },
        { name: 'Arial', value: 'Arial, sans-serif' },
        { name: 'Helvetica', value: 'Helvetica, sans-serif' },
        { name: 'Times New Roman', value: 'Times New Roman, serif' },
        { name: 'Georgia', value: 'Georgia, serif' },
        { name: 'Courier New', value: 'Courier New, monospace' },
        { name: 'Roboto', value: 'Roboto, sans-serif' },
        { name: 'Montserrat', value: 'Montserrat, sans-serif' }
      ];
      
      // 5. 드롭다운에 폰트 목록 추가
      
      // 폰트 목록 추가
      fonts.forEach(font => {
        // 구분선 처리
        if (font.type === 'divider') {
          const divider = document.createElement('hr');
          divider.className = 'lite-editor-font-divider';
          // 인라인 스타일 일부 유지 (위치 관련)
          divider.style.margin = '5px 0';
          // 색상과 관련된 스타일은 CSS로 이동
          dropdownMenu.appendChild(divider);
          return;
        }
        
        // 그룹 헤더 처리
        if (font.type === 'group_header') {
          const header = document.createElement('div');
          header.textContent = font.name;
          header.style.fontWeight = 'bold';
          header.style.padding = '5px 10px';
          header.style.color = '#666';
          header.style.fontSize = '12px';
          dropdownMenu.appendChild(header);
          return;
        }
        
        // 폰트 아이템 추가
        const fontItem = document.createElement('div');
        fontItem.textContent = font.name;
        fontItem.style.padding = '5px 10px';
        fontItem.style.cursor = 'pointer';
        fontItem.style.fontFamily = font.value;
        
        // 호버 이벤트
        fontItem.addEventListener('mouseover', () => {
          fontItem.style.backgroundColor = '#e9e9e9';
        });
        
        fontItem.addEventListener('mouseout', () => {
          fontItem.style.backgroundColor = '';
        });
        
        // 클릭 이벤트 - 폰트 적용 (heading 플러그인과 동일한 방식으로 수정)
        fontItem.addEventListener('click', (e) => {
          e.preventDefault();
          // e.stopPropagation() 제거 - 이벤트 전파 허용
          console.log('폰트 선택함:', font.name, font.value);
          
          // 1. 선택 영역 처리 - heading 플러그인과 동일한 방식 적용
          if (window.liteEditorSelection) {
            // 1-1. 선택 영역 저장
            window.liteEditorSelection.save();
            
            // 1-2. 에디터 포커스
            contentArea.focus();
            
            // 1-3. 선택 영역 복원
            window.liteEditorSelection.restore();
            console.log('선택 영역 저장 및 복원됨');
          }
          
          // 2. 에디터에 포커스
          contentArea.focus();
          
          // 3. 폰트 스타일 적용을 위한 스타일 주입
          injectFontFamilyStyles();
          
          // 4. 폰트 적용 - 코딩 폰트를 위한 연장 지원
          // 폰트 이름 각관호를 추가해서 정확히 전달
          console.log(`Applying font: ${font.name} with value: ${font.value}`);
          
          // 코딩 폰트 특별 처리 (IBM Plex Mono, Fira Code 등)
          if (font.name.includes('Mono') || font.name.includes('Code') || font.name.includes('Hack')) {
            // 1. CSS 클래스를 사용한 호환성 높은 적용 (코딩 폰트용)
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              
              // 선택된 텍스트 감싸는 span 생성
              const span = document.createElement('span');
              span.style.fontFamily = font.value;
              span.className = 'lite-editor-coding-font';
              
              // 선택된 텍스트를 span 안에 넣기
              const fragment = range.extractContents();
              span.appendChild(fragment);
              range.insertNode(span);
              
              // 선택 영역 업데이트
              selection.removeAllRanges();
              const newRange = document.createRange();
              newRange.selectNode(span);
              selection.addRange(newRange);
              
              console.log(`코딩 폰트 '${font.name}' applied using span element`);
            }
          } else {
            // 2. 일반 폰트는 기본 execCommand 사용
            document.execCommand('fontName', false, font.value);
            console.log(`Regular font '${font.name}' applied with execCommand`);
          }
          
          // 5. 드롭다운 메뉴 닫기 (align 플러그인과 동일한 방식)
          dropdownMenu.style.display = 'none';
          arrowIcon.textContent = 'arrow_drop_down';
          
          // 6. 선택 영역 재저장 (align 플러그인과 동일한 방식)
          if (window.liteEditorSelection) {
            window.liteEditorSelection.save();
          }
          
          // 7. UI 업데이트 - 현재 선택된 폰트 표시
          fontText.textContent = font.name;
          console.log('폰트 적용 완료 :', font.name);
        });
        
        dropdownMenu.appendChild(fontItem);
      });
      
      // 6. 드롭다운을 document.body에 직접 추가 (align과 동일하게 처리)
      document.body.appendChild(dropdownMenu);
      
      // 7. 버튼 클릭 이벤트 - 드롭다운 토글 (heading 플러그인과 동일하게 구현)
      fontContainer.addEventListener('click', (e) => {
        e.preventDefault();
        // e.stopPropagation() 제거 - heading과 동일하게 이벤트 전파 허용
        console.log('Font container clicked');
        
        // 중요: 드롭다운 열기 전에 선택 영역 저장 및 복원 (heading과 동일하게 처리)
        if (window.liteEditorSelection) {
          // 1. 선택 영역 저장
          window.liteEditorSelection.save();
          
          // 2. 에디터 포커스
          contentArea.focus();
          
          // 3. 선택 영역 복원 (중요: 이 스텝이 heading에는 있지만 fontFamily에는 없었음)
          window.liteEditorSelection.restore();
          console.log('폰트 메뉴 선택 전 선택 영역 저장 및 복원');
        }
        
        // 다른 모든 드롭다운 먼저 닫기 (align과 동일한 방식)
        document.querySelectorAll('.lite-editor-dropdown-menu.show, .lite-editor-font-dropdown.show').forEach(menu => {
          if (menu !== dropdownMenu) menu.style.display = 'none';
        });
        
        // 폰트 드롭다운 토글 (이전과 다르게 style.display 대신 클래스 활용)
        const isVisible = dropdownMenu.style.display === 'block';
        
        if (!isVisible) {
          // 드롭다운 표시
          dropdownMenu.style.display = 'block';
          
          // 버튼 위치를 기준으로 드롭다운 배치
          const buttonRect = fontContainer.getBoundingClientRect();
          
          // 절대 위치로 계산 (align과 동일한 방식)
          dropdownMenu.style.top = (buttonRect.bottom + window.scrollY) + 'px';
          dropdownMenu.style.left = buttonRect.left + 'px';
          
          // 화살표 바꾸기
          arrowIcon.textContent = 'arrow_drop_up';
        } else {
          // 드롭다운 숨기기
          dropdownMenu.style.display = 'none';
          arrowIcon.textContent = 'arrow_drop_down';
        }
      });
      
      // 8. body 클릭 시 드롭다운 닫기
      document.addEventListener('click', (e) => {
        // 클릭이 폰트 컨테이너나 드롭다운 외부에서 발생했는지 확인
        if (!fontContainer.contains(e.target) && !dropdownMenu.contains(e.target)) {
          dropdownMenu.style.display = 'none';
          fontContainer.style.borderColor = '#ddd';
          fontContainer.style.backgroundColor = '#fff';
          arrowIcon.textContent = 'arrow_drop_down';
        }
      });
      
      return fontContainer;
    }
  });
})();
