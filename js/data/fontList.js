/**
 * LiteEditor Font List Data
 * 폰트 목록 데이터 파일
 */

// 전역 네임스페이스에 폰트 데이터 등록
window.LiteEditorFontData = {
  // 폰트 목록 가져오기
  getFonts: function() {
    return [
      // 한글 폰트 그룹 (상단)
      { type: 'group_header', name: '한글 폰트' },
      { type: 'divider' },
      { name: '바탕체', value: 'Batang, Batangche, serif' },
      { name: '굴림체', value: 'Gulim, sans-serif' },
      { name: '맑은 고딕', value: 'Malgun Gothic, AppleGothic, sans-serif' },
      { name: 'Noto Sans KR', value: 'Noto Sans KR, sans-serif' },
      { name: 'Do Hyeon', value: '"Do Hyeon", sans-serif' },
      { name: 'Black Han Sans', value: '"Black Han Sans", sans-serif' },
      
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
  }
};
