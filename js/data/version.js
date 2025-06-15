/**
 * LiteEditor 버전 정보
 * 프로젝트 버전, 기능, 단축키 등의 정보를 관리합니다.
 */

window.LiteEditorVersion = {
  // 현재 버전
  version: 'v1.0.81',
  
  // 릴리즈 날짜
  releaseDate: '2025-01-09',
  
  // 주요 기능 목록
  features: [
    '리치 텍스트 편집',
    '플러그인 기반 확장성',
    '단축키 지원',
    '실시간 프리뷰',
    '이미지 드래그 앤 드롭',
    '체크리스트',
    '코드 하이라이팅',
    '테이블 편집',
    '링크 및 미디어 삽입'
  ],
  
  // 지원 브라우저
  supportedBrowsers: [
    'Chrome 80+',
    'Firefox 75+',
    'Safari 13+',
    'Edge 80+'
  ],
  
  // ✅ 수정: 실제 구현된 단축키로 업데이트
  shortcuts: {
    // 텍스트 서식
    'Cmd+B / Ctrl+B': '굵게',
    'Cmd+I / Ctrl+I': '기울임',
    'Cmd+U / Ctrl+U': '밑줄',
    'Cmd+Shift+S / Ctrl+Shift+S': '취소선',
    
    // 헤딩
    'Alt+Cmd+1 / Alt+Ctrl+1': '제목 1 (H1)',
    'Alt+Cmd+2 / Alt+Ctrl+2': '제목 2 (H2)',
    'Alt+Cmd+3 / Alt+Ctrl+3': '제목 3 (H3)',
    'Alt+Cmd+4 / Alt+Ctrl+4': '본문 (P)',
    
    // ✅ 수정: 정렬 단축키 업데이트
    'Cmd+Shift+L / Ctrl+Shift+L': '왼쪽 정렬',
    'Cmd+Shift+E / Ctrl+Shift+E': '중앙 정렬',
    'Cmd+Shift+R / Ctrl+Shift+R': '오른쪽 정렬',
    'Cmd+Shift+J / Ctrl+Shift+J': '양쪽 정렬',
    
    // 목록
    'Cmd+Shift+7 / Ctrl+Shift+7': '번호 목록',
    'Cmd+Shift+8 / Ctrl+Shift+8': '불릿 목록', 
    'Cmd+Shift+9 / Ctrl+Shift+9': '체크리스트',
    
    // 편집
    'Cmd+Z / Ctrl+Z': '실행 취소',
    'Cmd+Shift+Z / Ctrl+Shift+Z': '재실행',
    'Cmd+Shift+\\ / Ctrl+Shift+\\': '서식 제거',
    
    // 삽입
    'Alt+Shift+B': '인용구',
    'Alt+Shift+H': '수평선',
    'Alt+Shift+C': '인라인 코드',
    
    // 들여쓰기
    'Tab': '들여쓰기',
    'Shift+Tab': '내어쓰기'
  },
  
  // ✅ 수정: 업데이트 내역 추가
  updates: [
    {
      version: 'v1.0.75',
      date: '2025-01-09',
      changes: [
        '정렬 플러그인 단축키 충돌 해결 (Cmd+Shift+R 브라우저 새로고침 보장)',
        '정렬 기능 선택 영역 복원 버그 수정',
        'layerManager 선택 영역 무한 복원 문제 해결',
        '포커스 기반 단축키 활성화 로직 개선',
        'content 영역 밖 클릭 시 완전한 상태 초기화 구현'
      ]
    },
    {
      version: 'v1.0.74',
      date: '2025-01-08', 
      changes: [
        'reset.js 플러그인 리팩토링 (782라인 → 504라인, 46% 단축)',
        '데드 코드 제거 및 중복 로직 통합',
        'blockquote reset 후 커서 위치 복원 문제 해결',
        'PluginUtil.selection 활용한 선택 영역 처리 개선'
      ]
    },
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
