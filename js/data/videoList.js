/**
 * LiteEditor Video Data
 * 동영상 관련 데이터 및 설정
 */

/**
 * 허용된 동영상 도메인 목록
 * 보안을 위해 신뢰할 수 있는 동영상 플랫폼만 허용
 */
const ALLOWED_VIDEO_DOMAINS = [
    // YouTube 계열
    'youtube.com',
    'www.youtube.com',
    'youtu.be',
    'm.youtube.com',
    
    // Vimeo 계열
    'vimeo.com',
    'www.vimeo.com',
    'player.vimeo.com',
    
    // Wistia 계열
    'wistia.com',
    'www.wistia.com',
    'fast.wistia.net',
    'fast.wistia.com',
    
    // Dailymotion 계열
    'dailymotion.com',
    'www.dailymotion.com',
    'geo.dailymotion.com',
    
    // 카카오TV 계열
    'tv.kakao.com',
    'kakao.com',
    
    // 네이버TV 계열
    'tv.naver.com',
    'naver.me',
    'naver.com'
];

// 전역 객체에 추가하여 다른 파일에서 사용 가능하도록 함
if (typeof window !== 'undefined') {
    window.LiteEditorVideoData = {
        ALLOWED_VIDEO_DOMAINS
    };
}

// Node.js 환경에서도 사용 가능하도록 export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ALLOWED_VIDEO_DOMAINS
    };
}
