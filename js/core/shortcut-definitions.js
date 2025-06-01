/**
 * LiteEditor 단축키 정의
 * 모든 단축키를 한 곳에서 관리
 * Version 1.0.0
 */

// 🎯 업계 표준 기반 단축키 매핑 (맥 우선, 윈도우 호환)
const SHORTCUT_DEFINITIONS = {
  // 📝 텍스트 서식 (잘 동작하는 기존 키들 유지)
  bold: {
    key: 'b',
    cmd: true,
    description: '굵게',
    priority: 10
  },
  
  italic: {
    key: 'i', 
    cmd: true,
    description: '기울임',
    priority: 10
  },
  
  underline: {
    key: 'u',
    cmd: true, 
    description: '밑줄',
    priority: 10
  },
  
  strike: {
    key: 's',
    cmd: true,
    shift: true,
    description: '취소선',
    priority: 10
  },

  // 🏷️ 헤딩 (Typora 방식 - 더 안전)
  heading1: {
    key: '1',
    cmd: true,
    description: '제목 1',
    priority: 8
  },
  
  heading2: {
    key: '2',
    cmd: true,
    description: '제목 2',
    priority: 8
  },
  
  heading3: {
    key: '3',
    cmd: true,
    description: '제목 3',
    priority: 8
  },
  
  paragraph: {
    key: '4',
    cmd: true,
    description: '본문',
    priority: 8
  },

  code: {
    key: 'e',
    cmd: true,
    shift: true,
    description: '코드 (⌘+Shift+e)',
    priority: 9
  },
  
  blockquote: {
    key: "'",
    cmd: true,
    shift: true,
    description: '인용구',
    priority: 9
  },

  // 📋 리스트 
  bulletList: {
    key: 'u', 
    cmd: true,
    shift: true,
    description: '불릿 목록 (⌘+Shift+,)',
    priority: 7
  },
  
  numberedList: {
    key: 'o',  
    cmd: true,
    shift: true,
    description: '번호 목록 (⌘+Shift+.)',
    priority: 7
  },
  
  checkList: {
    key: 'k',  
    cmd: true,
    shift: true,
    description: '체크리스트 (⌘+Shift+/)',
    priority: 7
  },
  
  // ⬅️➡️ 정렬 (Cmd+Option 조합 - 맥에서 안전)
  alignLeft: {
    key: 'l',
    cmd: true,
    alt: true,
    description: '왼쪽 정렬',
    priority: 6
  },
  
  alignCenter: {
    key: 'c',
    cmd: true,
    alt: true,
    description: '가운데 정렬',
    priority: 6
  },
  
  alignRight: {
    key: 'r',
    cmd: true,
    alt: true,
    description: '오른쪽 정렬',
    priority: 6
  },
  
  alignJustify: {
    key: 'j',
    cmd: true,
    alt: true,
    description: '양쪽 정렬',
    priority: 6
  },

  // 🔗 레이어 단축키
  link: {
    key: 'l',
    cmd: true,
    shift: true,
    description: '링크 삽입',
    priority: 9
  },
  
  // 🔄 편집 (시스템 기본값들 - 건드리지 않음)
  undo: {
    key: 'z',
    cmd: true,
    description: '실행 취소',
    priority: 15
  },
  
  redo: {
    key: 'z',
    cmd: true,
    shift: true,
    description: '다시 실행',
    priority: 15
  },

  // 📐 들여쓰기 (Tab 키 유지 - 시스템과 충돌 없음)
  indent: {
    key: 'Tab',
    description: '들여쓰기',
    priority: 12
  },
  
  outdent: {
    key: 'Tab',
    shift: true,
    description: '내어쓰기',
    priority: 12
  },

  // 🧹 포맷 제거
  reset: {
    key: '\\',
    cmd: true,
    shift: true,
    description: '서식 제거',
    priority: 5
  }
};

// 플러그인별 단축키 매핑 (수정된 버전)
const PLUGIN_SHORTCUT_MAP = {
  'bold': ['bold'],
  'italic': ['italic'], 
  'underline': ['underline'],
  'strike': ['strike'],
  'heading': ['heading1', 'heading2', 'heading3', 'paragraph'],
  'link': ['link'],
  'imageUpload': ['image'],
  'code': ['code'],
  'blockquote': ['blockquote'],
  'unorderedList': ['bulletList'],    // ✅ bulletList → unorderedList
  'orderedList': ['numberedList'],    // ✅ numberedList → orderedList  
  'checkList': ['checkList'],         // ✅ 이미 일치함
  'align': ['alignLeft', 'alignCenter', 'alignRight', 'alignJustify'],
  'formatIndent': ['indent', 'outdent'],
  'undo': ['undo'],
  'redo': ['redo'],
  'reset': ['reset']
};

// 전역으로 노출
window.SHORTCUT_DEFINITIONS = SHORTCUT_DEFINITIONS;
window.PLUGIN_SHORTCUT_MAP = PLUGIN_SHORTCUT_MAP; 