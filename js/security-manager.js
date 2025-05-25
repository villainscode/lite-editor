/**
 * LiteEditor Security Manager
 * 동영상 보안 관련 기능을 관리하는 모듈
 */

const LiteEditorSecurity = (function() {
  // 사용자 정의 허용 도메인
  let customAllowedDomains = [];
  
  // ✅ 모든 허용된 도메인 목록 가져오기 (함수명 통일)
  function getAllowedDomainsList() {
    const videoDomains = window.LiteEditorVideoData?.ALLOWED_VIDEO_DOMAINS || [];
    return [...videoDomains, ...customAllowedDomains];
  }
  
  /**
   * 플랫폼별 URL 패턴 정의
   */
  const VIDEO_PLATFORM_PATTERNS = {
    youtube: [
      // 일반 유튜브 링크
      /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/))([A-Za-z0-9_-]{11})(?:&|\?|$|\/|#)/,
      // 짧은 링크
      /(?:youtu\.be\/)([A-Za-z0-9_-]{11})(?:&|\?|$|\/|#)?/,
      // 쇼츠 링크
      /(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})(?:&|\?|$|\/|#)?/
    ],
    
    vimeo: [
      // 일반 Vimeo 링크
      /(?:vimeo\.com\/)(\d+)(?:\/([a-zA-Z0-9]+))?/,
      // 임베드 링크
      /(?:player\.vimeo\.com\/video\/)(\d+)(?:\?h=([a-zA-Z0-9]+))?/
    ],
    
    wistia: [
      // Wistia 임베드 링크
      /(?:fast\.wistia\.(?:net|com)\/embed\/iframe\/)([a-zA-Z0-9]+)/,
      // Wistia 미디어 링크
      /(?:wistia\.com\/medias\/)([a-zA-Z0-9]+)/
    ],
    
    dailymotion: [
      // 일반 Dailymotion 링크
      /(?:dailymotion\.com\/video\/)([a-zA-Z0-9]+)/,
      // 임베드 링크
      /(?:geo\.dailymotion\.com\/player(?:\/[a-zA-Z0-9]+)?\.html\?video=)([a-zA-Z0-9]+)/
    ],
    
    kakao: [
      // 카카오TV 링크: https://tv.kakao.com/v/455367854
      /(?:tv\.kakao\.com\/v\/)([0-9]+)/
    ],
    
    naver: [
      // 네이버TV 링크: https://tv.naver.com/v/77160696
      /(?:tv\.naver\.com\/v\/)([0-9]+)/,
      // 네이버 단축 링크: https://naver.me/FeNzXpoH (다시 추가!)
      /(?:naver\.me\/)([a-zA-Z0-9]+)/
    ]
  };

  /**
   * 플랫폼별 임베드 설정
   */
  const VIDEO_EMBED_CONFIG = {
    youtube: {
      baseUrl: 'https://www.youtube.com/embed/',
      defaultParams: 'enablejsapi=0&rel=0&modestbranding=1',
      allowAttributes: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
    },
    
    vimeo: {
      baseUrl: 'https://player.vimeo.com/video/',
      defaultParams: '',
      allowAttributes: 'autoplay; fullscreen; picture-in-picture'
    },
    
    wistia: {
      baseUrl: 'https://fast.wistia.net/embed/iframe/',
      defaultParams: '',
      allowAttributes: 'autoplay; fullscreen'
    },
    
    dailymotion: {
      baseUrl: 'https://geo.dailymotion.com/player.html?video=',
      defaultParams: '',
      allowAttributes: 'autoplay; fullscreen; picture-in-picture'
    },
    
    kakao: {
      baseUrl: 'https://tv.kakao.com/embed/player/cliplink/',
      defaultParams: '',
      allowAttributes: 'autoplay; fullscreen'
    },
    
    naver: {
      baseUrl: 'https://tv.naver.com/embed/',
      defaultParams: '',
      allowAttributes: 'autoplay; fullscreen'
    }
  };
  
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
      const allowedDomains = getAllowedDomainsList();
      
      // 도메인 확인
      return allowedDomains.some(allowedDomain => {
        // 정확한 도메인 일치 또는 서브도메인 확인
        return domain === allowedDomain || 
               domain.endsWith('.' + allowedDomain);
      });
    } catch (e) {
      errorHandler.logError('SecurityManager', errorHandler.codes.SECURITY.URL_PARSE, e);
      return false;
    }
  }

  /**
   * 동영상 URL 도메인 검증 함수
   * @param {string} url - 검증할 URL
   * @returns {boolean} - 허용된 도메인인지 여부
   */
  function isVideoUrlAllowed(url) {
    try {
      const urlObj = new URL(url);
      const videoDomains = getAllowedDomainsList();
      return videoDomains.some(domain => 
        urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
      );
    } catch {
      return false;
    }
  }

  /**
   * 동영상 플랫폼 감지 함수
   * @param {string} url - 분석할 URL
   * @returns {Object|null} - 플랫폼 정보 또는 null
   */
  function detectVideoPlatform(url) {
    // URL에서 불필요한 @ 기호 제거
    url = url.replace(/^@/, '');
    
    // 네이버 단축 URL 감지 시 null 반환 (별도 처리)
    if (/naver\.me\//.test(url)) {
      return null;
    }
    
    for (const [platform, patterns] of Object.entries(VIDEO_PLATFORM_PATTERNS)) {
      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
          return {
            platform,
            id: match[1],
            hash: match[2] || null,
            originalUrl: url
          };
        }
      }
    }
    
    return null;
  }

  /**
   * 플랫폼별 임베드 URL 생성
   * @param {string} platform - 플랫폼 이름
   * @param {string} videoId - 비디오 ID
   * @param {Object} options - 추가 옵션
   * @returns {string} 임베드 URL
   */
  function createEmbedUrl(platform, videoId, options = {}) {
    const config = VIDEO_EMBED_CONFIG[platform];
    if (!config) return '';
    
    const params = options.params || config.defaultParams;
    const paramString = params ? `?${params}` : '';
    
    return `${config.baseUrl}${videoId}${paramString}`;
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
      const allDomains = getAllowedDomainsList();
      if (!allDomains.includes(cleanDomain)) {
        customAllowedDomains.push(cleanDomain);
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
      // 사용자 정의 목록에서만 제거 (기본 도메인과 비디오 도메인은 제거 불가)
      customAllowedDomains = customAllowedDomains.filter(d => d !== domain);
    });
  }
  
  /**
   * ✅ 모든 허용된 도메인 목록 가져오기 (공개 API)
   * @returns {string[]} 허용된 도메인 목록
   */
  function getAllowedDomains() {
    return getAllowedDomainsList();
  }
  
  /**
   * 사용자 정의 허용 도메인 목록 가져오기
   * @returns {string[]} 사용자 정의 허용 도메인 목록
   */
  function getCustomAllowedDomains() {
    return [...customAllowedDomains];
  }
  
  /**
   * ✅ 동영상 허용 도메인 목록 가져오기
   * @returns {string[]} 동영상 허용 도메인 목록
   */
  function getVideoAllowedDomains() {
    return window.LiteEditorVideoData?.ALLOWED_VIDEO_DOMAINS || [];
  }
  
  /**
   * 허용된 도메인 목록 초기화 (사용자 정의 목록만 초기화)
   */
  function resetAllowedDomains() {
    customAllowedDomains = [];
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
      errorHandler.logError('SecurityManager', errorHandler.codes.SECURITY.DOMAIN_NOT_ALLOWED, url);      
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
  
  /**
   * 이미지 URL 유효성 검사
   * @param {string} url - 검사할 이미지 URL
   * @returns {boolean} 유효성 여부
   */
  function isValidImageUrl(url) {
    if (!url) return false;
    
    // HTML 태그 감지 (간단한 방법)
    if (url.indexOf('<') !== -1 || url.indexOf('>') !== -1) {
      return false;
    }
    
    try {
      // 기본 URL 형식 검사
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      
      // 허용된 이미지 확장자 검사
      const imageUrlRegex = /\.(jpg|jpeg|png|gif|webp|svg)($|\?|\/)/i;
      
      // 차단할 확장자 검사
      const blockedExtensionRegex = /\.(html|js|php|jsp|exe|dll|sh|bat|py)$/i;
      
      return imageUrlRegex.test(path) && !blockedExtensionRegex.test(path);
    } catch (e) {
      errorHandler.logError('SecurityManager', errorHandler.codes.SECURITY.URL_PARSE, e);
      return false;
    }
  }
  
  /**
   * 일반 URL 유효성 검사 (XSS 방지)
   * @param {string} url - 검사할 URL
   * @returns {boolean} 유효성 여부
   */
  function isValidUrl(url) {
    if (!url) return false;
    
    // URL 디코딩 시도
    let decodedUrl;
    try {
      decodedUrl = decodeURIComponent(url);
    } catch (e) {
      decodedUrl = url;
    }
    
    // 1. HTML 태그 및 위험한 문자 감지 (원본 및 디코딩된 URL 모두 검사)
    if (/<[\s\S]*?>/i.test(url) || /<[\s\S]*?>/i.test(decodedUrl) || 
        /[<>]/i.test(url) || /[<>]/i.test(decodedUrl)) {
      return false;
    }
    
    // 2. 위험한 URL 인코딩 패턴 감지
    if (/%(?:3C|3E|00|0A|0D|27|22|60|28|29)/i.test(url)) {
      return false;
    }
    
    // 3. 위험한 프로토콜 차단
    if (/^(?:javascript|data|vbscript|file):/i.test(url) || 
        /^(?:javascript|data|vbscript|file):/i.test(decodedUrl)) {
      return false;
    }
    
    // 4. 위험한 자바스크립트 키워드 검사
    const dangerousKeywords = /\b(?:script|alert|eval|confirm|prompt|on\w+\s*=)/i;
    if (dangerousKeywords.test(url) || dangerousKeywords.test(decodedUrl)) {
      return false;
    }
    
    // 5. 기존 URL 형식 검증
    const domainRegex = /^(https?:\/\/)?(([a-zA-Z0-9\u3131-\u314E\uAC00-\uD7A3-]+\.)+([a-zA-Z\u3131-\u314E\uAC00-\uD7A3]{2,}))(:\d+)?(\/[^\s]*)?(\?.*)?$/;
    const invalidPrefixRegex = /^(https?:\/\/)?(wwww\.|ww\.|w{5,}\.|w{1,2}\.)/i;
    return domainRegex.test(url) && !invalidPrefixRegex.test(url);
  }
  
  // 공개 API
  return {
    isDomainAllowed,
    isValidImageUrl,
    isValidUrl,
    addAllowedDomain,
    removeAllowedDomain,
    getAllowedDomains,           // ✅ 공개 API
    getAllowedDomainsList,       // ✅ 내부/외부 모두 사용 가능
    getCustomAllowedDomains,
    getVideoAllowedDomains,      // ✅ 추가
    resetAllowedDomains,
    createSafeIframe,
    createSafeYouTubeEmbed,
    // 새로 추가된 동영상 관련 함수들
    isVideoUrlAllowed,
    detectVideoPlatform,
    createEmbedUrl,
    VIDEO_PLATFORM_PATTERNS,
    VIDEO_EMBED_CONFIG
  };
})();

// 전역 스코프에 노출
if (typeof window !== 'undefined') {
  window.LiteEditorSecurity = LiteEditorSecurity;
}
