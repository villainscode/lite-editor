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
        // 카카오TV 링크 (추후 패턴 분석 필요)
        /(?:tv\.kakao\.com\/)/
    ],
    
    naver: [
        // 네이버TV 링크 (추후 패턴 분석 필요)
        /(?:tv\.naver\.com\/)/,
        /(?:naver\.me\/)/
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
 * 동영상 URL 도메인 검증 함수
 * @param {string} url - 검증할 URL
 * @returns {boolean} - 허용된 도메인인지 여부
 */
function isVideoUrlAllowed(url) {
    try {
        const urlObj = new URL(url);
        return ALLOWED_VIDEO_DOMAINS.some(domain => 
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
