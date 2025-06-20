/**
 * LiteEditor Version Information
 * 버전 정보 및 플러그인 목록
 * 최종 업데이트: 2025-06-20
 */

window.LiteEditorVersion = {
  // 현재 버전
  version: 'v1.0.86',
  
  // 개발자 정보
  developer: 'Code Villain',
  
  // 플러그인 목록
  plugins: {
    // 실행 취소/되돌리기
    history: ['historyInit', 'undo', 'redo', 'reset'],
    
    // 폰트 서식
    fonts: ['fontFamily', 'heading', 'fontColor', 'highlight'],
    
    // 텍스트 서식
    formatting: ['bold', 'italic', 'underline', 'strike'],
    
    // 오브젝트 삽입
    objects: ['link', 'imageUpload', 'table', 'media'],
    
    // 인용 및 코드
    quotes: ['line', 'blockquote', 'code', 'codeBlock'],
    
    // 목록
    lists: ['bulletList', 'numberedList', 'checkList'],
    
    // 정렬과 인덴트
    layout: ['align', 'formatIndent']
  },
  
  // 단축키 목록 (실제 구현 기준)
  shortcuts: {
    // 텍스트 서식
    'Ctrl+B / ⌘+B': '굵게',
    'Ctrl+I / ⌘+I': '기울임',
    'Ctrl+U / ⌘+U': '밑줄',
    'Ctrl+Shift+S / ⌘+Shift+S': '취소선',
    
    // 헤딩
    'Ctrl+Alt+1 / ⌘+⌥+1': '제목 1',
    'Ctrl+Alt+2 / ⌘+⌥+2': '제목 2',
    'Ctrl+Alt+3 / ⌘+⌥+3': '제목 3',
    'Ctrl+Alt+4 / ⌘+⌥+4': '본문',
    
    // 정렬
    'Ctrl+Shift+L / ⌘+Shift+L': '왼쪽 정렬',
    'Ctrl+Shift+E / ⌘+Shift+E': '중앙 정렬',
    'Ctrl+Shift+R / ⌘+Shift+R': '오른쪽 정렬',
    'Ctrl+Shift+J / ⌘+Shift+J': '양쪽 정렬',
    
    // 목록
    'Ctrl+Shift+8 / ⌘+Shift+8': '불릿 목록',
    'Ctrl+Shift+7 / ⌘+Shift+7': '번호 목록',
    'Ctrl+Shift+9 / ⌘+Shift+9': '체크리스트',
    
    // 편집 도구
    'Ctrl+Z / ⌘+Z': '실행 취소',
    'Ctrl+Shift+Z / ⌘+Shift+Z': '재실행',
    'Ctrl+Shift+\\ / ⌘+Shift+\\': '서식 제거',
    
    // 콘텐츠 삽입
    'Alt+Shift+B': '인용구',
    'Alt+Shift+C': '인라인 코드',
    'Alt+Shift+H': '수평선',
    
    // 들여쓰기
    'Tab': '들여쓰기',
    'Shift+Tab': '내어쓰기'
  },
  
  // 미구현 단축키 (개발 예정)
  upcomingShortcuts: {
    // v1.1 예정
    '⌘+K / Ctrl+K': '링크 삽입',
    '⌘+M / Ctrl+M': '미디어 삽입',
    '⌘+Shift+K / Ctrl+Shift+K': '코드 블록',
    
    // v1.2 예정
    '⌘+Shift+I / Ctrl+Shift+I': '이미지 삽입',
    '⌘+Shift+T / Ctrl+Shift+T': '테이블 삽입',
    
    // v1.3 예정
    '⌘+F / Ctrl+F': '찾기/바꾸기',
    '⌘+D / Ctrl+D': '줄 복제',
    '⌘+L / Ctrl+L': '줄 선택'
  },
  
  // 업데이트 내역
  updates: [
    {
      version: 'v1.0.86',
      date: '2025-06-20',
      changes: [
        '붙여넣기 기능 개선 - 플러그인 내부 input/textarea 영역에서 정상 동작',
        '코드블록 레이어 포커싱 문제 해결',
        '단축키 시스템 전면 개선 및 충돌 해결',
        '정렬 단축키 수정 (⌘+Shift+E로 중앙 정렬)',
        '플러그인별 독립적인 키보드 이벤트 처리',
        'core.js paste 이벤트 최적화로 전체 에디터 성능 향상',
        '서식 제거(Reset) 단축키 추가 (⌘+Shift+\\)',
        '단축키 치트시트 UI 개선 및 미구현 기능 표시'
      ]
    },
    {
      version: 'v1.0.85',
      date: '2025-06-08',
      changes: [
        '코드블록 플러그인 안정성 개선',
        '이미지 업로드 오류 수정',
        '테이블 편집 기능 향상',
        '메모리 누수 방지 코드 추가'
      ]
    },
    {
      version: 'v1.0.72',
      date: '2025-05-17',
      changes: [
        '단축키 기능 추가 및 개선',
        '이미지 드래그 앤 드롭 기능 추가',
        '체크리스트 토글 기능 개선',
        '버그 수정 및 성능 최적화'
      ]
    },
    {
      version: 'v1.0.1',
      date: '2025-05-01',
      changes: [
        '헤딩 플러그인 Enter 키 처리 개선',
        '폰트 색상 선택 UI 개선',
        '정렬 기능 안정성 향상',
        '브라우저 호환성 개선'
      ]
    },
    {
      version: 'v1.0.0',
      date: '2025-05-01',
      changes: [
        '초기 버전 출시',
        '기본 편집 기능 구현',
        '플러그인 시스템 구축',
        '툴바 및 UI 디자인 완성'
      ]
    }
  ],
  
  // 로드맵
  roadmap: [
    {
      version: 'v1.1',
      plannedDate: '2025-07-15',
      features: [
        '링크 삽입 단축키 (⌘+K)',
        '미디어 삽입 단축키 (⌘+M)',
        '코드 블록 단축키 (⌘+Shift+K)',
        '플러그인 성능 최적화'
      ]
    },
    {
      version: 'v1.2',
      plannedDate: '2025-08-30',
      features: [
        '이미지 삽입 단축키 (⌘+Shift+I)',
        '테이블 삽입 단축키 (⌘+Shift+T)',
        '드래그 앤 드롭 개선',
        '모바일 지원 강화'
      ]
    },
    {
      version: 'v1.3',
      plannedDate: '2025-10-15',
      features: [
        '찾기/바꾸기 기능 (⌘+F)',
        '줄 복제 (⌘+D)',
        '다중 커서 지원',
        '협업 기능 베타'
      ]
    }
  ]
};
