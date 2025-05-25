/**
 * LiteEditor 환경 설정
 * 개발/프로덕션 환경별 설정 관리
 */

window.LiteEditorConfig = (function() {
  // 환경 감지 로직
  function detectEnvironment() {
    // 1. URL 파라미터 체크
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('env')) {
      return urlParams.get('env');
    }
    
    // 2. 호스트명 기반 감지
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || 
        hostname === '127.0.0.1' || 
        hostname.includes('dev.') ||
        hostname.includes('staging.')) {
      return 'development';
    }
    
    // 3. 포트 기반 감지
    const port = window.location.port;
    if (port === '8080' || port === '3000' || port === '5000') {
      return 'development';
    }
    
    // 4. 기본값: production
    return 'production';
  }
  
  const environment = detectEnvironment();
  const version = window.LiteEditorVersion?.version || 'v1.0.05';
  
  return {
    environment: environment,
    version: version,
    isDevelopment: environment === 'development',
    isProduction: environment === 'production',
    
    // 캐시 버스팅 설정
    cacheBusting: {
      enabled: true,
      strategy: environment === 'development' ? 'timestamp' : 'version'
    },
    
    // 디버그 설정
    debug: {
      enabled: environment === 'development',
      verbose: environment === 'development'
    },
    
    // API 설정 (필요시)
    api: {
      baseUrl: environment === 'development' 
        ? 'http://localhost:3000/api' 
        : 'https://api.liteeditor.com'
    }
  };
})(); 