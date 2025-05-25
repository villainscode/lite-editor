# LiteEditor Media Plugin 보안 시스템 통합 및 성능 최적화

## 📋 개요

LiteEditor의 media.js 플러그인에 통합 보안 시스템을 적용하고, 다중 플랫폼 동영상 지원을 구현하며, 리사이즈 성능 문제를 해결한 개발 기록입니다.

## 🎯 목표

1. **보안 시스템 통합**: security-manager.js와 videoList.js를 활용한 통합 보안 검증
2. **다중 플랫폼 지원**: YouTube, Vimeo, Dailymotion, 카카오TV, 네이버TV 지원
3. **성능 최적화**: MutationObserver로 인한 리사이즈 버벅임 문제 해결
4. **코드 표준화**: imageUpload.js와 동일한 패턴으로 리사이즈 구현

## 🏗️ 아키텍처 설계

### 1. 파일 구조
```
js/
├── data/
│   └── videoList.js          # 허용 도메인 목록 (순수 데이터)
├── plugins/
│   └── media.js              # 동영상 플러그인 (메인)
└── security-manager.js       # 보안 검증 로직
```

### 2. 데이터 분리 원칙
- **videoList.js**: 사용자가 수정 가능한 순수 데이터만 포함
- **security-manager.js**: URL 패턴 검사, 플랫폼 감지 등 로직 담당
- **media.js**: UI 및 에디터 통합 기능

## 📝 구현 상세

### 1. videoList.js 생성

**목적**: 허용된 동영상 도메인 목록을 중앙 관리

```javascript
/**
 * LiteEditor Video Data
 * 동영상 관련 허용 도메인 목록
 */

// 허용된 동영상 도메인 목록
const ALLOWED_VIDEO_DOMAINS = [
  // YouTube 계열
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'm.youtube.com',
  
  // Vimeo 계열
  'vimeo.com',
  'player.vimeo.com',
  
  // Wistia 계열
  'wistia.com',
  'fast.wistia.net',
  'fast.wistia.com',
  
  // Dailymotion 계열
  'dailymotion.com',
  'geo.dailymotion.com',
  
  // 카카오TV
  'tv.kakao.com',
  
  // 네이버TV
  'tv.naver.com',
  'naver.me'  // 단축 URL
];

// 전역 스코프에 노출
if (typeof window !== 'undefined') {
  window.LiteEditorVideoData = {
    ALLOWED_VIDEO_DOMAINS
  };
}
```

### 2. security-manager.js 확장

**주요 추가 기능**:
- 동영상 플랫폼 감지
- 플랫폼별 임베드 URL 생성
- 네이버 단축 URL 처리

```javascript
/**
 * 플랫폼별 URL 패턴 정의
 */
const VIDEO_PLATFORM_PATTERNS = {
  youtube: [
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/))([A-Za-z0-9_-]{11})(?:&|\?|$|\/|#)/,
    /(?:youtu\.be\/)([A-Za-z0-9_-]{11})(?:&|\?|$|\/|#)?/,
    /(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})(?:&|\?|$|\/|#)?/
  ],
  
  vimeo: [
    /(?:vimeo\.com\/)(\d+)(?:\/([a-zA-Z0-9]+))?/,
    /(?:player\.vimeo\.com\/video\/)(\d+)(?:\?h=([a-zA-Z0-9]+))?/
  ],
  
  wistia: [
    /(?:fast\.wistia\.(?:net|com)\/embed\/iframe\/)([a-zA-Z0-9]+)/,
    /(?:wistia\.com\/medias\/)([a-zA-Z0-9]+)/
  ],
  
  dailymotion: [
    /(?:dailymotion\.com\/video\/)([a-zA-Z0-9]+)/,
    /(?:geo\.dailymotion\.com\/player(?:\/[a-zA-Z0-9]+)?\.html\?video=)([a-zA-Z0-9]+)/
  ],
  
  kakao: [
    /(?:tv\.kakao\.com\/v\/)([0-9]+)/
  ],
  
  naver: [
    /(?:tv\.naver\.com\/v\/)([0-9]+)/,
    /(?:naver\.me\/)([a-zA-Z0-9]+)/  // 단축 URL 지원
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
  
  // ... 기타 플랫폼 설정
};

/**
 * 동영상 플랫폼 감지 함수
 */
function detectVideoPlatform(url) {
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
 */
function createEmbedUrl(platform, videoId, options = {}) {
  const config = VIDEO_EMBED_CONFIG[platform];
  if (!config) return '';
  
  const params = options.params || config.defaultParams;
  const paramString = params ? `?${params}` : '';
  
  return `${config.baseUrl}${videoId}${paramString}`;
}
```

### 3. media.js 리팩토링

#### 3.1 보안 시스템 통합

```javascript
/**
 * 동영상 URL 유효성 검사 (통합 보안 시스템 활용)
 */
function isValidVideoUrl(url) {
  if (!url || typeof url !== 'string') return false;
  
  // 1. 기본 URL 형식 검사 (security-manager.js 활용)
  if (typeof LiteEditorSecurity !== 'undefined' && LiteEditorSecurity.isValidUrl) {
    if (!LiteEditorSecurity.isValidUrl(url)) {
      return false;
    }
  }
  
  // 2. 동영상 도메인 허용 목록 검사 (security-manager.js 활용)
  if (typeof LiteEditorSecurity !== 'undefined' && LiteEditorSecurity.isVideoUrlAllowed) {
    return LiteEditorSecurity.isVideoUrlAllowed(url);
  }
  
  // 3. 폴백: videoList.js 직접 참조
  if (typeof window.LiteEditorVideoData !== 'undefined') {
    try {
      const urlObj = new URL(url);
      const allowedDomains = window.LiteEditorVideoData.ALLOWED_VIDEO_DOMAINS || [];
      return allowedDomains.some(domain => 
        urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
      );
    } catch (e) {
      return false;
    }
  }
  
  // 4. 최종 폴백: 기본 YouTube 도메인만 허용
  return /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)/i.test(url);
}
```

#### 3.2 다중 플랫폼 지원

```javascript
/**
 * 동영상 삽입 (통합 보안 시스템 활용)
 */
function insertVideo(url, contentArea) {
  try {
    // 1. URL 유효성 검사
    if (!isValidVideoUrl(url)) {
      errorHandler.showUserAlert('P903');
      return;
    }
    
    // 2. 네이버 단축 URL 체크
    if (/naver\.me\//.test(url)) {
      alert('네이버 단축 URL(naver.me)은 지원되지 않습니다.\ntv.naver.com의 전체 URL을 사용해주세요.');
      return;
    }
    
    // 3. 플랫폼 감지
    const platformInfo = detectVideoPlatform(url);
    if (!platformInfo) {
      errorHandler.showUserAlert('P903');
      return;
    }
    
    // 4. iframe 요소 생성
    const iframe = createVideoIframe(platformInfo.platform, platformInfo.id);
    
    // ... 나머지 삽입 로직
  } catch (error) {
    errorHandler.logError('MediaPlugin', errorHandler.codes.PLUGINS.MEDIA.INSERT, error);
    errorHandler.showUserAlert('P901');
  }
}
```

#### 3.3 플랫폼별 iframe 생성

```javascript
/**
 * 플랫폼별 iframe 요소 생성 (통합 보안 시스템 활용)
 */
function createVideoIframe(platform, videoId) {
  // 임베드 URL 생성
  const embedUrl = createEmbedUrl(platform, videoId);
  
  if (!embedUrl) {
    throw new Error(`지원되지 않는 플랫폼: ${platform}`);
  }
  
  // security-manager.js의 createSafeIframe 활용
  if (typeof LiteEditorSecurity !== 'undefined' && LiteEditorSecurity.createSafeIframe) {
    const iframe = LiteEditorSecurity.createSafeIframe(embedUrl, {
      width: '100%',
      height: '100%',
      title: `${platform} video player`,
      allow: getVideoAllowAttributes(platform),
      allowFullscreen: true
    });
    
    if (iframe) return iframe;
  }
  
  // 폴백: 직접 생성
  return util.dom.createElement('iframe', {
    width: '100%',
    height: '100%',
    src: embedUrl,
    title: `${platform} video player`,
    frameBorder: '0',
    allow: getVideoAllowAttributes(platform),
    allowFullscreen: true,
    loading: 'lazy',
    referrerPolicy: 'strict-origin-when-cross-origin'
  });
}
```

## 🚨 성능 문제 해결

### 문제 상황
동영상 리사이즈 시 버벅임과 중간에 멈추는 현상 발생

### 원인 분석
1. **MutationObserver 오버헤드**: 리사이즈 중 style 속성 변경마다 트리거
2. **iframe 렌더링 부하**: 외부 동영상 로드 + 복잡한 DOM 구조
3. **이벤트 처리 빈도**: 수십~수백 번의 불필요한 에디터 이벤트 발생

### 해결 방법

#### Before (문제 코드)
```javascript
// ❌ 문제: MutationObserver가 리사이즈마다 실행됨
function setupVideoObserver(wrapper, contentArea) {
  const observer = new MutationObserver(mutations => {
    if (util.editor && util.editor.dispatchEditorEvent) {
      util.editor.dispatchEditorEvent(contentArea);  // 🚨 매우 무거운 작업
    }
  });
  
  observer.observe(wrapper, {
    attributes: true,
    attributeFilter: ['style']  // 🚨 style 변경마다 트리거
  });
}

// insertVideo 함수에서 호출
setupVideoObserver(wrapper, contentArea);  // ❌ 제거 필요
```

#### After (해결 코드)
```javascript
// ✅ 해결: 리사이즈 완료 후에만 한 번 실행
function setupVideoResizeHandle(wrapper, resizeHandle) {
  let isResizing = false;
  let startX, startY, startWidth, startHeight;

  function handleResize(e) {
    if (!isResizing) return;
    
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    
    const newWidth = startWidth + deltaX;
    const newHeight = startHeight + deltaY;
    
    if (newWidth > 100 && newHeight > 60) {
      wrapper.style.width = newWidth + 'px';
      wrapper.style.height = newHeight + 'px';
    }
  }

  function stopResize() {
    if (!isResizing) return;
    
    wrapper.removeAttribute('data-resizing');
    isResizing = false;
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
    
    // ✅ 리사이즈 완료 후에만 에디터 이벤트 발생
    const contentArea = document.querySelector('.lite-editor-content');
    if (contentArea && util.editor && util.editor.dispatchEditorEvent) {
      util.editor.dispatchEditorEvent(contentArea);
    }
  }

  resizeHandle.addEventListener('mousedown', (e) => {
    wrapper.setAttribute('data-resizing', 'true');
    
    e.preventDefault();
    e.stopPropagation();
    
    isResizing = true;
    startX = e.clientX;
    startY = e.clientY;
    
    const rect = wrapper.getBoundingClientRect();
    startWidth = rect.width;
    startHeight = rect.height;
    
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
  });
}
```

### 성능 개선 결과
- **리사이즈 부드러움**: imageUpload.js와 동일한 수준
- **이벤트 발생 횟수**: 수백 번 → 1번 (리사이즈 완료 시)
- **메모리 사용량**: MutationObserver 제거로 대폭 감소

## 🔧 네이버 단축 URL 처리

### 문제
`https://naver.me/FeNzXpoH` 형태의 단축 URL은 CORS 정책으로 인해 리다이렉트 추적 불가

### 해결 방법
사용자에게 명확한 안내 메시지 제공

```javascript
// 2. 네이버 단축 URL 체크
if (/naver\.me\//.test(url)) {
  alert('네이버 단축 URL(naver.me)은 지원되지 않습니다.\ntv.naver.com의 전체 URL을 사용해주세요.');
  return;
}
```

## 📋 지원 플랫폼 및 URL 패턴

### YouTube
- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/shorts/VIDEO_ID`

### Vimeo
- `https://vimeo.com/VIDEO_ID`
- `https://player.vimeo.com/video/VIDEO_ID`

### Wistia
- `https://fast.wistia.net/embed/iframe/VIDEO_ID`
- `https://wistia.com/medias/VIDEO_ID`

### Dailymotion
- `https://dailymotion.com/video/VIDEO_ID`
- `https://geo.dailymotion.com/player.html?video=VIDEO_ID`

### 카카오TV
- `https://tv.kakao.com/v/VIDEO_ID`

### 네이버TV
- `https://tv.naver.com/v/VIDEO_ID`
- `https://naver.me/SHORT_ID` (지원 안내 메시지)

## 🧪 테스트 URL 예제

### YouTube
```
https://www.youtube.com/watch?v=dQw4w9WgXcQ
https://youtu.be/dQw4w9WgXcQ
https://www.youtube.com/shorts/dQw4w9WgXcQ
```

### Vimeo
```
https://vimeo.com/123456789
https://player.vimeo.com/video/123456789
```

### 카카오TV
```
https://tv.kakao.com/v/455367854
```

### 네이버TV
```
https://tv.naver.com/v/77160696
https://naver.me/FeNzXpoH (안내 메시지)
```

## 🔄 로더 설정

### loader.js 수정
```javascript
// 동영상 데이터 파일 추가
'js/data/videoList.js',

// 보안 관리자는 기존 위치 유지
'js/security-manager.js',
```

## 📊 메모리 최적화

### WeakMap 기반 관리
```javascript
// ✅ 개선안: WeakMap 기반 cleanup 관리
const resizeCleanupMap = new WeakMap();

// cleanup 함수를 WeakMap에 저장
const cleanup = () => {
  document.removeEventListener('mousemove', handleResize);
  document.removeEventListener('mouseup', stopResize);
};

resizeCleanupMap.set(wrapper, cleanup);
```

### 플러그인 레벨 cleanup
```javascript
function cleanup() {
  // 모든 리사이즈 이벤트 정리
  resizeCleanupMap.forEach((cleanup, wrapper) => {
    cleanup();
  });
  
  // 전역 변수 초기화
  savedRange = null;
  isDropdownOpen = false;
}

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', cleanup);
```

## 🎨 UI 개선

### 다중 플랫폼 지원 표시
```javascript
// 헤더 텍스트
textContent: 'Enter video URL (YouTube, Vimeo, etc.)'

// 플레이스홀더
placeholder: 'https://www.youtube.com/watch?v=... or other video URL'
```

## 🔍 디버깅 및 로깅

### 선택 영역 로깅 유지
```javascript
// 현재 선택 영역 정보 로그 (debugging)
if (errorHandler.logSelectionOffsets) {
  const selectionInfo = errorHandler.logSelectionOffsets(contentArea);
  errorHandler.colorLog && errorHandler.colorLog(MODULE_NAME, '동영상 삽입 위치', selectionInfo, '#9c27b0');
}
```

## 📈 성능 비교

### Before vs After

| 항목 | Before | After |
|------|--------|-------|
| 리사이즈 부드러움 | 버벅임, 중단 | 매끄러움 |
| 이벤트 발생 횟수 | 수백 번 | 1번 |
| MutationObserver | 사용 | 제거 |
| 메모리 사용량 | 높음 | 최적화 |
| 지원 플랫폼 | YouTube만 | 6개 플랫폼 |

## 🚀 배포 체크리스트

- [x] videoList.js 생성 및 도메인 목록 정의
- [x] security-manager.js 동영상 기능 확장
- [x] media.js 보안 시스템 통합
- [x] MutationObserver 제거 및 성능 최적화
- [x] 다중 플랫폼 지원 구현
- [x] 네이버 단축 URL 안내 메시지
- [x] loader.js 설정 업데이트
- [x] 메모리 관리 최적화
- [x] UI 텍스트 다중 플랫폼 반영

## 🔮 향후 개선 사항

1. **플랫폼 확장**: TikTok, Instagram 등 추가 지원
2. **썸네일 미리보기**: URL 입력 시 썸네일 표시
3. **자동 크기 조정**: 플랫폼별 최적 비율 자동 설정
4. **오프라인 지원**: 로컬 동영상 파일 업로드 지원

## 📝 참고 사항

- 모든 변경사항은 기존 YouTube 기능과 하위 호환성 유지
- 보안 검증은 다층 구조로 구현 (security-manager.js → videoList.js → 폴백)
- 성능 최적화는 imageUpload.js 패턴을 참조하여 일관성 확보
- 네이버 단축 URL은 기술적 제약으로 인해 안내 메시지로 대체

---

**작성일**: 2025-05-24  
**작성자**: LiteEditor 개발팀  
**버전**: 1.0.0
