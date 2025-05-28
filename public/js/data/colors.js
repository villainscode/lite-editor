/**
 * LiteEditor Color Data
 * 색상 데이터 파일
 */

// 전역 네임스페이스에 색상 데이터 등록
window.LiteEditorColorData = {
  // 텍스트 색상 목록
  getFontColors: function() {
    return [
      '#000000', '#666666', '#999999', '#b7b7b7', '#d9d9d9', '#efefef', '#ffffff', 
      '#ffdcdc', '#ffbfbf', '#ff9292', '#ff5454', '#ff0000', '#db0000', '#b20000',
      '#d5ebff', '#b3d8ff', '#85bcff', '#5692ff', '#2f67ff', '#002aff', '#102d9f',
      '#eaffe4', '#d0ffc4', '#6bff50', '#15e600', '#0cb800', '#0d6d07', '#003400',
      '#f9ffc1', '#f8ff86', '#efee03', '#ffea00', '#d1ae00', '#a67d02', '#89610a'
    ];
  },
  
  // 배경색(하이라이트) 색상 목록
  getHighlightColors: function() {
    return [
      '#ffffcc', '#ffff00', '#ffecb3', '#ffcc00', '#d0f0c0', '#daf2f9', '#b1d6f7',
      '#ffd9cc', '#ffccff', '#e6d3ff', '#ccccff', '#e6ffcc', '#d9d9d9', '#bdbdbd'
    ];
  },
  
  // 색상 그룹 - 나중에 색상 그룹별로 분류할 경우 사용
  getColorGroups: function() {
    return {
      text: this.getFontColors(),
      background: this.getHighlightColors(),
      basic: ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'],
      grayscale: ['#000000', '#333333', '#666666', '#999999', '#cccccc', '#eeeeee', '#ffffff']
    };
  }
};
