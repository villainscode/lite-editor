/**
 * LiteEditor Heading Plugin
 * 제목 및 정렬 관련 플러그인
 */

(function() {
  // PluginUtil 참조
  const util = window.PluginUtil || {};
  if (!util.selection) {
    console.error('HeadingPlugin: PluginUtil.selection이 필요합니다.');
  }
  
  // 전역 상태 변수
  let savedRange = null;
  let isDropdownOpen = false;
  
  // 선택 영역 저장/복원 함수
  function saveSelection() {
    savedRange = util.selection.saveSelection();
  }

  function restoreSelection() {
    if (!savedRange) return false;
    return util.selection.restoreSelection(savedRange);
  }  

  // 제목 플러그인
  LiteEditor.registerPlugin('heading', {
    title: 'Heading',
    icon: 'title',
    customRender: function(toolbar, contentArea) {
      // 제목 버튼 생성
      const headingButton = util.dom.createElement('button', {
        className: 'lite-editor-button lite-editor-heading-button',
        title: 'Heading'
      });
      
      // 아이콘 추가
      const icon = util.dom.createElement('i', {
        className: 'material-icons',
        textContent: 'title'
      });
      headingButton.appendChild(icon);
      
      // 드롭다운 생성
      const dropdownMenu = util.dom.createElement('div', {
        className: 'lite-editor-heading-dropdown lite-editor-dropdown-menu'
      }, {
        position: 'absolute',
        zIndex: '2147483647',
        backgroundColor: '#fff',
        border: '1px solid #ccc',
        borderRadius: '4px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        padding: '8px 0',
        display: 'none'
      });
      
      // 제목 레벨 옵션
      const headingLevels = [
        { text: 'Heading 1', tag: 'h1' },
        { text: 'Heading 2', tag: 'h2' },
        { text: 'Heading 3', tag: 'h3' },
        { text: 'Paragraph', tag: 'p' }
      ];
      
      // 각 제목 레벨에 대한 옵션 추가
      headingLevels.forEach(level => {
        const option = util.dom.createElement('div', {
          className: 'lite-editor-heading-option lite-editor-heading-' + level.tag,
          textContent: level.text
        });
        
        // 해당 태그에 맞는 스타일 적용
        switch (level.tag) {
          case 'h1':
            option.style.fontSize = '28px';
            option.style.fontWeight = 'bold';
            break;
          case 'h2':
            option.style.fontSize = '22px';
            option.style.fontWeight = 'bold';
            break;
          case 'h3':
            option.style.fontSize = '16px';
            option.style.fontWeight = 'bold';
            break;
          case 'p':
            option.style.fontSize = '14px';
            option.style.fontWeight = 'normal';
            break;
        }
        
        // 클릭 이벤트 - 공통 유틸리티 사용
        option.addEventListener('click', util.scroll.preservePosition((e) => {
          e.preventDefault();
          e.stopPropagation();
          
          try {
            contentArea.focus({ preventScroll: true });
          } catch (e) {
            contentArea.focus();
          }
          
          restoreSelection();
          
          const selection = util.selection.getSafeSelection();
          if (selection && selection.rangeCount > 0) {
            applyHeadingSimple(level.tag, selection, contentArea);
          }

          closeDropdown();
        }));
        
        dropdownMenu.appendChild(option);
      });
      
      document.body.appendChild(dropdownMenu);
      
      // 버튼 클릭 이벤트 - 공통 유틸리티 사용
      headingButton.addEventListener('click', util.scroll.preservePosition((e) => {
        e.preventDefault();
        e.stopPropagation();
        
        saveSelection();
        
        const isVisible = dropdownMenu.classList.contains('show');
        
        if (!isVisible) {
          util.activeModalManager.closeAll();
        }
        
        if (isVisible) {
          closeDropdown();
        } else {
          dropdownMenu.classList.add('show');
          dropdownMenu.style.display = 'block';
          headingButton.classList.add('active');
          isDropdownOpen = true;
          
          const buttonRect = headingButton.getBoundingClientRect();
          dropdownMenu.style.top = (buttonRect.bottom + window.scrollY) + 'px';
          dropdownMenu.style.left = buttonRect.left + 'px';
          
          dropdownMenu.closeCallback = () => {
            dropdownMenu.classList.remove('show');
            dropdownMenu.style.display = 'none';
            headingButton.classList.remove('active');
            isDropdownOpen = false;
          };
          
          util.activeModalManager.register(dropdownMenu);
          util.setupOutsideClickHandler(dropdownMenu, () => {
            closeDropdown();
          }, [headingButton]);
        }
      }));

      function closeDropdown() {
        dropdownMenu.classList.remove('show');
        dropdownMenu.style.display = 'none';
        headingButton.classList.remove('active');
        isDropdownOpen = false;
        util.activeModalManager.unregister(dropdownMenu);
      }

      return headingButton;
    }
  });

  // 헤딩 적용 함수
  function applyHeadingSimple(targetTag, selection, contentArea) {
    const range = selection.getRangeAt(0);
    let currentElement = findCurrentHeadingElement(range);
    
    if (!currentElement) {
      return;
    }
    
    const isFullSelection = isFullElementSelected(range, currentElement);
    
    if (isFullSelection) {
      changeEntireElement(currentElement, targetTag);
    } else {
      changeSelectedPortion(range, targetTag);
    }
    
    contentArea.dispatchEvent(new Event('input', { bubbles: true }));
  }
  
  // 전체 요소가 선택되었는지 판단
  function isFullElementSelected(range, element) {
    if (range.collapsed) return true;
    
    const selectedText = range.toString();
    const elementText = element.textContent;
    
    if (selectedText === elementText) return true;
    if (selectedText.replace(/\s+/g, '') === elementText.replace(/\s+/g, '')) return true;
    
    return false;
  }
  
  // 전체 요소 변경
  function changeEntireElement(currentElement, targetTag) {
    let newTag = targetTag;
    if (currentElement.nodeName === targetTag.toUpperCase()) {
      newTag = 'p';
    }
    
    const newElement = document.createElement(newTag.toUpperCase());
    newElement.innerHTML = currentElement.innerHTML;
    currentElement.parentNode.replaceChild(newElement, currentElement);
    
    const selection = util.selection.getSafeSelection();
    const newRange = document.createRange();
    newRange.selectNodeContents(newElement);
    selection.removeAllRanges();
    selection.addRange(newRange);
  }
  
  // 선택된 부분만 변경
  function changeSelectedPortion(range, targetTag) {
    const selectedContent = range.extractContents();
    const headingElement = document.createElement(targetTag.toUpperCase());
    headingElement.appendChild(selectedContent);
    range.insertNode(headingElement);
    
    const selection = util.selection.getSafeSelection();
    const newRange = document.createRange();
    newRange.selectNodeContents(headingElement);
    selection.removeAllRanges();
    selection.addRange(newRange);
  }
  
  // 현재 헤딩/단락 요소 찾기
  function findCurrentHeadingElement(range) {
    let container = range.commonAncestorContainer;
    
    if (container.nodeType === 3) {
      container = container.parentNode;
    }
    
    if (['H1', 'H2', 'H3', 'P'].includes(container.nodeName)) {
      return container;
    }
    
    const closest = container.closest('h1, h2, h3, p');
    
    // 만약 헤딩/단락 요소를 찾지 못했다면, 새 P 태그로 감싸기
    if (!closest) {
      return wrapInNewParagraph(range, container);
    }
    
    return closest;
  }

  // 새 P 태그로 감싸는 함수
  function wrapInNewParagraph(range, container) {
    // 선택된 텍스트가 div나 다른 컨테이너에 직접 있는 경우
    if (container.nodeName === 'DIV' || (container.classList && container.classList.contains('lite-editor-content'))) {
      // 선택된 텍스트 노드들을 P로 감싸기
      const selectedContent = range.extractContents();
      const newP = document.createElement('P');
      newP.appendChild(selectedContent);
      range.insertNode(newP);
      
      // 새 range 설정
      const newRange = document.createRange();
      newRange.selectNodeContents(newP);
      const selection = util.selection.getSafeSelection();
      selection.removeAllRanges();
      selection.addRange(newRange);
      
      return newP;
    }
    
    return null;
  }

  // 단축키로 사용할 헤딩 적용 함수 - 공통 유틸리티 사용
  function applyHeadingByShortcut(tag, contentArea) {
    const applyWithScroll = util.scroll.preservePosition(() => {
      saveSelection();
      
      try {
        contentArea.focus({ preventScroll: true });
      } catch (e) {
        contentArea.focus();
      }
      
      restoreSelection();
      
      const selection = util.selection.getSafeSelection();
      if (selection && selection.rangeCount > 0) {
        applyHeadingSimple(tag, selection, contentArea);
      }
    });
    
    applyWithScroll();
  }
  
  // 단축키 등록
  LiteEditor.registerShortcut('heading', {
    key: '1',
    alt: true,
    action: function(contentArea) {
      applyHeadingByShortcut('h1', contentArea);
    }
  });
  
  LiteEditor.registerShortcut('heading', {
    key: '2',
    alt: true,
    action: function(contentArea) {
      applyHeadingByShortcut('h2', contentArea);
    }
  });
  
  LiteEditor.registerShortcut('heading', {
    key: '3',
    alt: true,
    action: function(contentArea) {
      applyHeadingByShortcut('h3', contentArea);
    }
  });
  
  LiteEditor.registerShortcut('heading', {
    key: '4',
    alt: true,
    action: function(contentArea) {
      applyHeadingByShortcut('p', contentArea);
    }
  });
})();
