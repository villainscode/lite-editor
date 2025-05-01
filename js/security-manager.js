/**
 * LiteEditor Security Manager
 * 보안 관련 기능을 관리하는 모듈
 */

const LiteEditorSecurity = (function() {
  // 허용된 도메인 목록 (기본값)
  const DEFAULT_ALLOWED_DOMAINS = [
    'youtube.com',
    'www.youtube.com',
    'youtu.be',
    'vimeo.com',
    'player.vimeo.com',
    'dailymotion.com',
    'www.dailymotion.com'
  ];
  
  // 사용자 정의 허용 도메인
  let customAllowedDomains = [];
  
  // 모든 허용된 도메인 (기본 + 사용자 정의)
  let allowedDomains = [...DEFAULT_ALLOWED_DOMAINS];
  
  /**
   * 도메인이 허용 목록에 있는지 확인
   * @param {string} url - 확인할 URL
   * @returns {boolean} 허용 여부
   */
  function isDomainAllowed(url) {
    if (!url) return false;
    
    try {
      // URL 파싱
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      
      // 도메인 확인
      return allowedDomains.some(allowedDomain => {
        // 정확한 도메인 일치 또는 서브도메인 확인
        return domain === allowedDomain || 
               domain.endsWith('.' + allowedDomain);
      });
    } catch (e) {
      console.warn('URL 파싱 오류:', e);
      return false;
    }
  }
  
  /**
   * 허용된 도메인 목록에 새 도메인 추가
   * @param {string|string[]} domains - 추가할 도메인 또는 도메인 배열
   */
  function addAllowedDomain(domains) {
    const domainsArray = Array.isArray(domains) ? domains : [domains];
    
    domainsArray.forEach(domain => {
      // 도메인 형식 정리 (프로토콜, 경로 등 제거)
      let cleanDomain = domain;
      
      try {
        if (domain.includes('://')) {
          cleanDomain = new URL(domain).hostname;
        }
      } catch (e) {
        // URL 파싱 실패 시 그대로 사용
      }
      
      // 중복 확인 후 추가
      if (!allowedDomains.includes(cleanDomain)) {
        customAllowedDomains.push(cleanDomain);
        allowedDomains.push(cleanDomain);
      }
    });
  }
  
  /**
   * 허용된 도메인 목록에서 도메인 제거
   * @param {string|string[]} domains - 제거할 도메인 또는 도메인 배열
   */
  function removeAllowedDomain(domains) {
    const domainsArray = Array.isArray(domains) ? domains : [domains];
    
    domainsArray.forEach(domain => {
      // 사용자 정의 목록에서 제거
      customAllowedDomains = customAllowedDomains.filter(d => d !== domain);
      
      // 기본 도메인은 제거할 수 없음
      if (!DEFAULT_ALLOWED_DOMAINS.includes(domain)) {
        allowedDomains = allowedDomains.filter(d => d !== domain);
      }
    });
  }
  
  /**
   * 모든 허용된 도메인 목록 가져오기
   * @returns {string[]} 허용된 도메인 목록
   */
  function getAllowedDomains() {
    return [...allowedDomains];
  }
  
  /**
   * 사용자 정의 허용 도메인 목록 가져오기
   * @returns {string[]} 사용자 정의 허용 도메인 목록
   */
  function getCustomAllowedDomains() {
    return [...customAllowedDomains];
  }
  
  /**
   * 기본 허용 도메인 목록 가져오기
   * @returns {string[]} 기본 허용 도메인 목록
   */
  function getDefaultAllowedDomains() {
    return [...DEFAULT_ALLOWED_DOMAINS];
  }
  
  /**
   * 허용된 도메인 목록 초기화 (사용자 정의 목록만 초기화)
   */
  function resetAllowedDomains() {
    customAllowedDomains = [];
    allowedDomains = [...DEFAULT_ALLOWED_DOMAINS];
  }
  
  /**
   * 안전한 iframe 생성
   * @param {string} url - iframe에 로드할 URL
   * @param {Object} options - iframe 옵션
   * @returns {HTMLIFrameElement|null} 생성된 iframe 요소 또는 null
   */
  function createSafeIframe(url, options = {}) {
    // 도메인 확인
    if (!isDomainAllowed(url)) {
      console.warn(`보안 정책: 허용되지 않은 도메인 - ${url}`);
      return null;
    }
    
    // iframe 생성
    const iframe = document.createElement('iframe');
    
    // 기본 보안 속성 설정
    iframe.setAttribute('loading', 'lazy');
    iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    
    // URL 설정
    iframe.src = url;
    
    // 추가 옵션 적용
    if (options.width) iframe.width = options.width;
    if (options.height) iframe.height = options.height;
    if (options.title) iframe.title = options.title;
    if (options.allow) iframe.allow = options.allow;
    if (options.allowFullscreen) iframe.allowFullscreen = options.allowFullscreen;
    
    return iframe;
  }
  
  /**
   * YouTube URL에서 안전한 임베드 HTML 생성
   * @param {string} videoId - YouTube 비디오 ID
   * @param {Object} options - 옵션
   * @returns {string} 안전한 임베드 HTML
   */
  function createSafeYouTubeEmbed(videoId, options = {}) {
    if (!videoId) return '';
    
    const width = options.width || '100%';
    const height = options.height || '100%';
    const params = options.params || 'enablejsapi=0&rel=0&modestbranding=1';
    
    return `
      <iframe 
        width="${width}" 
        height="${height}" 
        src="https://www.youtube.com/embed/${videoId}?${params}" 
        title="YouTube video player" 
        frameborder="0" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
        allowfullscreen
        loading="lazy"
        referrerpolicy="strict-origin-when-cross-origin"
      ></iframe>
    `;
  }
  
  // 공개 API
  return {
    isDomainAllowed,
    addAllowedDomain,
    removeAllowedDomain,
    getAllowedDomains,
    getCustomAllowedDomains,
    getDefaultAllowedDomains,
    resetAllowedDomains,
    createSafeIframe,
    createSafeYouTubeEmbed
  };
})();

// 전역 스코프에 노출
if (typeof window !== 'undefined') {
  window.LiteEditorSecurity = LiteEditorSecurity;
}
