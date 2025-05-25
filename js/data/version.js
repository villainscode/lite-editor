/**
 * LiteEditor Version Information
 * 버전 정보 및 플러그인 목록
 * 최종 업데이트: 2025-05-17
 */

window.LiteEditorVersion = {
  // 현재 버전
  version: 'v1.0.04',
  
  // 개발자 정보
  developer: 'Code Villain',
  
  // 플러그인 목록
  plugins: {
    // 실행 취소/되돌리기
    history: ['historyInit', 'undo', 'redo', 'reset'],
    
    // 폰트 서식
    fonts: ['fontFamily', 'heading', 'fontColor', 'emphasis'],
    
    // 텍스트 서식
    formatting: ['bold', 'italic', 'underline', 'strike'],
    
    // 오브젝트 삽입
    objects: ['link', 'imageUpload', 'table', 'media'],
    
    // 인용 및 코드
    quotes: ['line', 'blockquote', 'code', 'codeBlock'],
    
    // 목록
    lists: ['unorderedList', 'orderedList', 'checkList'],
    
    // 정렬과 인덴트
    layout: ['align', 'formatIndent']
  },
  
  // 단축키 목록
  shortcuts: {
    // 텍스트 서식
    'Alt+B': '굵게',
    'Alt+I': '기울임',
    'Alt+U': '밑줄',
    'Alt+S': '취소선',
    
    // 헤딩
    'Alt+1': '제목 1',
    'Alt+2': '제목 2',
    'Alt+3': '제목 3',
    'Alt+4': '본문',
    
    // 정렬
    'Ctrl+Alt+L': '왼쪽 정렬',
    'Ctrl+Alt+C': '가운데 정렬',
    'Ctrl+Alt+R': '오른쪽 정렬',
    
    // 목록
    'Alt+U': '순서 없는 목록',
    'Alt+O': '순서 있는 목록',
    'Alt+K': '체크 목록',
    
    // 기타
    'Alt+Q': '인용구',
    'Alt+H': '수평선 삽입',
    'Alt+C': '코드 삽입'
  },
  
  // 업데이트 내역
  updates: [
    {
      version: 'v1.0.1',
      date: '2025-05-17',
      changes: [
        '단축키 기능 추가 및 개선',
        '이미지 드래그 앤 드롭 기능 추가',
        '체크리스트 토글 기능 개선',
        '버그 수정 및 성능 최적화'
      ]
    },
    {
      version: 'v1.0.0',
      date: '2025-05-01',
      changes: [
        '초기 버전 출시',
        '기본 편집 기능 구현',
        '플러그인 시스템 구축'
      ]
    }
  ]
};
