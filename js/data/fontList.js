/**
 * LiteEditor Font List Data
 * Font list data file with i18n support
 */

// Register font data in global namespace
window.LiteEditorFontData = {
  // Browser language detection function
  detectLanguage: function() {
    try {
      const lang = navigator.language || navigator.userLanguage;
      return lang.substring(0, 2); // Extract language code (e.g., 'ko-KR' → 'ko')
    } catch (e) {
      return 'ko'; // Default to Korean on error
    }
  },

  // Get font list according to browser language
  getFonts: function() {
    const currentLang = this.detectLanguage();
    // Use English labels for non-Korean languages
    return currentLang === 'ko' ? this.koFonts : this.enFonts;
  },

  // Korean font list
  koFonts: [
    { name: '시스템 기본 폰트', value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' },
    
    // Divider
    { type: 'divider' },
    
    // Korean fonts group (top)
    { type: 'group_header', name: '한글 폰트' },
    { type: 'divider' },
    { name: '굴림체', value: 'Gulim, sans-serif' },
    { name: '바탕체', value: 'Batang, Batangche, serif' },
    { name: '맑은 고딕', value: 'Malgun Gothic, AppleGothic, sans-serif' },
    { name: 'Noto Sans KR', value: 'Noto Sans KR, sans-serif' },
    { name: 'Do Hyeon', value: '"Do Hyeon", sans-serif' },
    { name: 'Black Han Sans', value: '"Black Han Sans", sans-serif' },
    
    // Divider
    { type: 'divider' },
    
    // Coding fonts group (middle)
    { type: 'group_header', name: '코딩 폰트' },
    { type: 'divider' },
    { name: 'IBM Plex Mono', value: 'IBM Plex Mono, monospace' },
    { name: 'Source Code Pro', value: 'Source Code Pro, monospace' },
    { name: 'JetBrains Mono', value: 'JetBrains Mono, monospace' },
    { name: 'Hack', value: 'Hack, monospace' },
    { name: 'Fira Code', value: 'Fira Code, monospace' },
    { name: 'Consolas', value: 'Consolas, monospace' },
    
    // Divider
    { type: 'divider' },
    
    // English fonts group (bottom)
    { type: 'group_header', name: '영문 폰트' },
    { type: 'divider' },
    { name: 'Arial', value: 'Arial, sans-serif' },
    { name: 'Helvetica', value: 'Helvetica, sans-serif' },
    { name: 'Times New Roman', value: 'Times New Roman, serif' },
    { name: 'Georgia', value: 'Georgia, serif' },
    { name: 'Courier New', value: 'Courier New, monospace' },
    { name: 'Roboto', value: 'Roboto, sans-serif' },
    { name: 'Montserrat', value: 'Montserrat, sans-serif' }
  ],

  // English font list (English fonts at the top)
  enFonts: [
    { name: 'System Default', value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' },
    
    // Divider
    { type: 'divider' },
    
    // English fonts group (moved to top)
    { type: 'group_header', name: 'English Fonts' },
    { type: 'divider' },
    { name: 'Arial', value: 'Arial, sans-serif' },
    { name: 'Helvetica', value: 'Helvetica, sans-serif' },
    { name: 'Times New Roman', value: 'Times New Roman, serif' },
    { name: 'Georgia', value: 'Georgia, serif' },
    { name: 'Courier New', value: 'Courier New, monospace' },
    { name: 'Roboto', value: 'Roboto, sans-serif' },
    { name: 'Montserrat', value: 'Montserrat, sans-serif' },
    
    // Divider
    { type: 'divider' },
    
    // Coding fonts group
    { type: 'group_header', name: 'Coding Fonts' },
    { type: 'divider' },
    { name: 'IBM Plex Mono', value: 'IBM Plex Mono, monospace' },
    { name: 'Source Code Pro', value: 'Source Code Pro, monospace' },
    { name: 'JetBrains Mono', value: 'JetBrains Mono, monospace' },
    { name: 'Hack', value: 'Hack, monospace' },
    { name: 'Fira Code', value: 'Fira Code, monospace' },
    { name: 'Consolas', value: 'Consolas, monospace' },
    
    // Divider
    { type: 'divider' },
    
    // Korean fonts group (moved to bottom)
    { type: 'group_header', name: 'Korean Fonts' },
    { type: 'divider' },
    { name: 'Gulim', value: 'Gulim, sans-serif' },
    { name: 'Batang', value: 'Batang, Batangche, serif' },
    { name: 'Malgun Gothic', value: 'Malgun Gothic, AppleGothic, sans-serif' },
    { name: 'Noto Sans KR', value: 'Noto Sans KR, sans-serif' },
    { name: 'Do Hyeon', value: '"Do Hyeon", sans-serif' },
    { name: 'Black Han Sans', value: '"Black Han Sans", sans-serif' }
  ]
};
