/**
 * LiteEditor Code Languages Data
 * 코드 블록 플러그인에서 지원하는 언어 목록
 */

/**
 * 지원되는 프로그래밍 언어 목록
 * Speed Highlight 라이브러리와 호환되는 언어들
 */
const CODE_LANGUAGES = [
    { value: "auto", label: "Auto Detect" },
    { value: "bash", label: "Bash" },
    { value: "c", label: "C" },
    { value: "css", label: "CSS" },
    { value: "docker", label: "Docker" },
    { value: "go", label: "Go" },
    { value: "html", label: "HTML" },
    { value: "http", label: "HTTP" },
    { value: "java", label: "Java" },
    { value: "js", label: "JavaScript" },
    { value: "json", label: "JSON" },
    { value: "md", label: "Markdown" },
    { value: "plain", label: "Plain Text" },
    { value: "py", label: "Python" },
    { value: "rs", label: "Rust" },
    { value: "sql", label: "SQL" },
    { value: "ts", label: "TypeScript" },
    { value: "xml", label: "XML" },
    { value: "yaml", label: "YAML" }
  ];
  
  // 전역 객체에 추가하여 다른 파일에서 사용 가능하도록 함
  if (typeof window !== 'undefined') {
    window.LiteEditorCodeData = {
      CODE_LANGUAGES,
      
      /**
       * 언어 코드로 언어 정보 찾기
       * @param {string} value - 언어 코드 (예: 'js', 'py')
       * @returns {Object|null} 언어 정보 또는 null
       */
      getLanguageByValue: function(value) {
        return CODE_LANGUAGES.find(lang => lang.value === value) || null;
      },
      
      /**
       * 모든 언어 목록 가져오기
       * @returns {Array} 언어 목록 배열
       */
      getAllLanguages: function() {
        return [...CODE_LANGUAGES];
      },
      
      /**
       * Auto Detect를 제외한 언어 목록 가져오기
       * @returns {Array} 실제 언어들만 포함된 배열
       */
      getActualLanguages: function() {
        return CODE_LANGUAGES.filter(lang => lang.value !== 'auto');
      }
    };
  }
  
  // Node.js 환경에서도 사용 가능하도록 export
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      CODE_LANGUAGES
    };
  }
  