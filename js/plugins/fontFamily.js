/**
 * LiteEditor Font Family Plugin
 * Simplified version for displaying font list
 * Modified version - Fixed font application errors
 * Update - Using external data file with i18n support
 */

(function() {
  // PluginUtil reference
  const util = window.PluginUtil || {};
  
  // Global state variables
  let savedRange = null;          // Temporarily saved selection range
  
  // Save selection function (using util)
  function saveSelection() {
    savedRange = util.selection.saveSelection();
  }

  // Restore selection function (using util)
  function restoreSelection() {
    if (!savedRange) return false;
    return util.selection.restoreSelection(savedRange);
  }
  
  // Add font styles 
  function injectFontFamilyStyles() {
    // Load CSS file (if not already added)
    if (util.styles && util.styles.loadCssFile) {
      util.styles.loadCssFile('lite-editor-font-styles', 'css/plugins/fontFamily.css');
    }
  }
  
  /**
   * Font data loading function
   * Gets font list from external data file with i18n support
   * @returns {Array} Font list array
   */
  function loadFontData() {
    // Check if external data file is loaded
    if (window.LiteEditorFontData && typeof window.LiteEditorFontData.getFonts === 'function') {
      // Get font list from external data file
      return window.LiteEditorFontData.getFonts();
    } else {
      // Fallback: Return default font list if data file isn't loaded
      console.warn('Font data file not found. Using default font list.');
      return [
        { type: 'group_header', name: 'Default Fonts' },
        { type: 'divider' },
        { name: 'Arial', value: 'Arial, sans-serif' },
        { name: 'Times New Roman', value: 'Times New Roman, serif' },
        { name: 'Courier New', value: 'Courier New, monospace' }, 
        { name: 'Gulim', value: 'Gulim, sans-serif' },
      ];
    }
  }
  
  /**
   * Font data script loading function
   * Dynamically loads external font data file
   * @param {Function} callback - Callback function to execute after loading
   */
  function loadFontScript(callback) {
    // Execute callback immediately if already loaded
    if (window.LiteEditorFontData) {
      if (callback) callback();
      return;
    }
    
    // Load script
    const script = document.createElement('script');
    script.src = 'js/data/fontList.js';
    script.onload = function() {
      if (callback) callback();
    };
    script.onerror = function() {
      console.error('Failed to load font data file');
      if (callback) callback();
    };
    
    document.head.appendChild(script);
  }
  
  // Register font plugin
  LiteEditor.registerPlugin('fontFamily', {
    customRender: function(toolbar, contentArea) {
      // 1. Create font button container (select box style)
      const fontContainer = util.dom.createElement('div', {
        className: 'lite-editor-font-button',
        title: 'Font Family'
      }, {
        position: 'relative'
      });
      
      // 2. Add button icon
      const icon = util.dom.createElement('i', {
        className: 'material-icons',
        textContent: 'font_download'
      }, {
        fontSize: '18px',
        marginRight: '5px'
      });
      fontContainer.appendChild(icon);
      
      // 3. Add font family text
      const fontText = util.dom.createElement('span', {
        textContent: 'Font Family'
      }, {
        fontSize: '14px'
      });
      fontContainer.appendChild(fontText);
      
      // 4. Add dropdown arrow
      const arrowIcon = util.dom.createElement('i', {
        className: 'material-icons',
        textContent: 'arrow_drop_down'
      }, {
        fontSize: '18px',
        marginLeft: '5px'
      });
      fontContainer.appendChild(arrowIcon);
      
      // 5. Create dropdown menu - handle like align plugin
      const dropdownMenu = util.dom.createElement('div', {
        id: 'font-family-dropdown',
        className: 'lite-editor-font-dropdown'
      }, {
        position: 'absolute',
        zIndex: '2147483647',
        backgroundColor: '#fff',
        border: '1px solid #ccc',
        borderRadius: '4px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        maxHeight: '300px',
        minWidth: '200px',
        overflowY: 'auto',
        padding: '8px 0',
        display: 'none'
      });
      
      // Load external font data file and build dropdown menu
      loadFontScript(function() {
        // Get font list with i18n support
        const fonts = loadFontData();
        
        // Add font list to dropdown
        fonts.forEach(font => {
          // Handle divider
          if (font.type === 'divider') {
            const divider = util.dom.createElement('hr', {
              className: 'lite-editor-font-divider'
            }, {
              margin: '0'
            });
            dropdownMenu.appendChild(divider);
            return;
          }
          
          // Handle group header
          if (font.type === 'group_header') {
            const header = util.dom.createElement('div', {
              textContent: font.name
            }, {
              fontWeight: 'bold',
              padding: '5px 10px',
              color: '#666',
              fontSize: '12px',
              backgroundColor: '#f5f5f5'  // 옅은 회색 배경색 추가
            });
            dropdownMenu.appendChild(header);
            return;
          }
          
          // Add font item
          const fontItem = util.dom.createElement('div', {
            textContent: font.name
          }, {
            padding: '5px 10px',
            cursor: 'pointer',
            fontFamily: font.value,
            fontSize: '12px'  // Font size set to 12px
          });
          
          // Hover events
          fontItem.addEventListener('mouseover', () => {
            fontItem.style.backgroundColor = '#e9e9e9';
          });
          
          fontItem.addEventListener('mouseout', () => {
            fontItem.style.backgroundColor = '';
          });
          
          // Click event - Apply font (modified version)
          fontItem.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('Font selected:', font.name, font.value);
            
            // Save current scroll position
            const currentScrollY = window.scrollY;
            
            // Close dropdown
            dropdownMenu.style.display = 'none';
            arrowIcon.textContent = 'arrow_drop_down';
            fontContainer.classList.remove('active');
            
            // Focus editor (with scroll prevention option)
            try {
              contentArea.focus({ preventScroll: true });
            } catch (e) {
              // Some older browsers don't support preventScroll option
              contentArea.focus();
            }
            
            // Restore selection
            restoreSelection();
            
            // Inject styles for font application
            injectFontFamilyStyles();
            
            // Apply font
            console.log(`Applying font: ${font.name} with value: ${font.value}`);
            
            // Regular fonts use default execCommand
            document.execCommand('fontName', false, font.value);
            console.log(`Regular font '${font.name}' applied`);
            
            // Update UI
            fontText.textContent = font.name;
            
            // Restore scroll position (enhanced method)
            // Use requestAnimationFrame to restore scroll in next render cycle
            requestAnimationFrame(() => {
              // Apply longer delay (50ms)
              setTimeout(() => {
                window.scrollTo(window.scrollX, currentScrollY);
              }, 50);
            });
          });
          
          dropdownMenu.appendChild(fontItem);
        });
      });
      
      // 6. Add dropdown to document.body directly (same as align plugin)
      document.body.appendChild(dropdownMenu);
      
      // 7. Button click event - Toggle dropdown (updated)
      fontContainer.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Save current scroll position
        const currentScrollY = window.scrollY;
        
        // Close dropdown if open (toggle behavior)
        if (dropdownMenu.style.display === 'block') {
          dropdownMenu.style.display = 'none';
          arrowIcon.textContent = 'arrow_drop_down';
          fontContainer.classList.remove('active');
          return;
        }
        
        // Close all other dropdowns
        document.querySelectorAll('.lite-editor-dropdown-menu.show, .lite-editor-font-dropdown.show').forEach(menu => {
          if (menu !== dropdownMenu) menu.style.display = 'none';
        });
        
        // Save selection
        saveSelection();
        
        // Show dropdown
        dropdownMenu.style.display = 'block';
        
        // Add active style to button
        fontContainer.classList.add('active');
        
        // Set layer position
        if (util.layer && util.layer.setLayerPosition) {
          util.layer.setLayerPosition(dropdownMenu, fontContainer);
        } else {
          const buttonRect = fontContainer.getBoundingClientRect();
          dropdownMenu.style.top = (buttonRect.bottom + window.scrollY) + 'px';
          dropdownMenu.style.left = buttonRect.left + 'px';
        }
        
        // Change arrow
        arrowIcon.textContent = 'arrow_drop_up';
        
        // Restore scroll position (enhanced method)
        requestAnimationFrame(() => {
          setTimeout(() => {
            window.scrollTo(window.scrollX, currentScrollY);
          }, 50);
        });
      });
      
      // 8. Close dropdown on body click (updated)
      util.setupOutsideClickHandler(dropdownMenu, () => {
        dropdownMenu.style.display = 'none';
        arrowIcon.textContent = 'arrow_drop_down';
        fontContainer.classList.remove('active');
      }, [fontContainer]);
      
      return fontContainer;
    }
  });
})();
