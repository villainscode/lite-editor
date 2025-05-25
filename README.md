# LiteEditor
[![License](https://img.shields.io/badge/license-Custom--Non--Commercial-blue.svg)](LICENSE)

## 🚀 개발 환경 설정

### 사용 가능한 명령어

```bash
# 개발 환경 (타임스탬프 캐시 버스팅)
npm run dev          # 포트 8080에서 개발 서버 시작
npm start           # 기본 개발 서버 시작

# 프로덕션 환경 (버전 기반 캐시 버스팅)  
npm run serve:prod  # 포트 3000에서 프로덕션 서버 시작

# 빌드
npm run build       # 프로덕션 빌드 실행
```

### 환경별 접속 URL

- **개발 환경**: http://localhost:8080
- **프로덕션 환경**: http://localhost:3000

### 환경 강제 설정

URL 파라미터로 환경을 강제로 설정할 수 있습니다:
- `http://localhost:8080?env=development`
- `http://localhost:8080?env=production`

### 캐시 버스팅 전략

- **개발 환경**: 타임스탬프 기반 (`?t=1234567890`)
- **프로덕션 환경**: 버전 기반 (`?v=1.0.05`)

## 📋 개요

LiteEditor는 웹 페이지에 쉽게 통합할 수 있는 경량 리치 텍스트 에디터입니다. JavaScript와 CSS만으로 구현되어 높은 호환성을 제공하며, 플러그인 기반 구조로 필요한 기능만 선택하여 사용할 수 있습니다. 에디터 영역의 툴바와 내용을 작성하는 컨텐츠 영역을 통합하거나, 분리해서 사용할 수 있습니다.

## 🛠️ 설치 방법

### 분리 모드 (권장)

```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <link rel="stylesheet" href="css/loader.css">
</head>
<body>
    <div class="lite-editor" id="main-editor">
        <div id="lite-editor-toolbar"></div>
        <div id="lite-editor-content" contenteditable="true">
            <p>내용을 입력하세요...</p>
        </div>
    </div>

    <script src="js/loader.js"></script>
    <script>
    document.addEventListener('lite-editor-loaded', function() {
        LiteEditor.init('#lite-editor-content', {
            separatedMode: true,
            toolbarTarget: '#lite-editor-toolbar',
            plugins: ['bold', 'italic', 'underline', 'link', 'reset']
        });
    });
    </script>
</body>
</html>
```

### 통합 모드

```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <link rel="stylesheet" href="css/loader.css">
</head>
<body>
    <div id="editor">기존 내용</div>

    <script src="js/loader.js"></script>
    <script>
    document.addEventListener('lite-editor-loaded', function() {
        LiteEditor.init('#editor', {
            plugins: ['bold', 'italic', 'underline', 'link', 'reset']
        });
    });
    </script>
</body>
</html>
```

## ✨ 에디터 기능 목록

- **굵게** - 텍스트를 굵게 표시
- **기울임** - 텍스트를 기울임꼴로 표시
- **밑줄** - 텍스트에 밑줄 추가
- **취소선** - 텍스트에 취소선 추가
- **폰트 패밀리** - 다양한 글꼴 선택
- **폰트 색상** - 텍스트 색상 변경
- **하이라이트** - 텍스트 배경색 변경
- **제목 스타일** - H1~H6 제목 태그 적용
- **텍스트 정렬** - 좌/중/우/양쪽 정렬
- **들여쓰기** - 들여쓰기 및 내어쓰기
- **순서 없는 목록** - 불릿 리스트 생성
- **순서 있는 목록** - 번호 리스트 생성
- **체크리스트** - 체크박스 리스트 생성
- **하이퍼링크** - 링크 삽입 및 편집
- **이미지 업로드** - 이미지 삽입 및 리사이즈
- **테이블** - 테이블 생성 및 편집
- **동영상** - 다중 플랫폼 동영상 삽입
- **인용구** - 블록쿼트 생성
- **인라인 코드** - 코드 서식 적용
- **코드 블록** - 코드 블록 및 구문 강조
- **수평선** - 구분선 삽입
- **실행 취소** - 이전 작업으로 되돌리기
- **다시 실행** - 취소한 작업 다시 실행
- **서식 제거** - 모든 서식 제거

## 🎯 제품 설명 및 특징

### 주요 특징
- **경량화**: 최소한의 리소스로 최대 성능 제공
- **플러그인 기반**: 필요한 기능만 선택하여 사용
- **높은 호환성**: 모든 모던 브라우저 지원
- **쉬운 통합**: 간단한 HTML/JS 코드로 즉시 사용
- **분리 모드**: 툴바와 콘텐츠 영역을 자유롭게 배치
- **키보드 단축키**: 주요 기능에 대한 단축키 지원
- **다중 플랫폼 동영상 첨부**: YouTube, Vimeo, 카카오TV 등 동영상 지원
- **실시간 미리보기**: 폰트, 색상 등 실시간 미리보기
- **이미지 링크, 파일 첨부 형태 지원**: 이미지 크기 조절, 위치 조정 지원 

### 기술적 특징
- **순수 JavaScript**: 외부 프레임워크 의존성 없음
- **모듈화 설계**: 각 기능이 독립적인 플러그인으로 구성
- **캐시 버스팅**: 개발/프로덕션 환경별 캐시 전략
- **보안 강화**: XSS 방지 및 URL 검증 시스템
- **오류 처리**: 통합 오류 처리 및 디버깅 시스템

## 🚀 로드맵

- [ ] HTML/Rich 모드 전환
- [ ] HTML/Markdown 가져오기/내보내기
- [ ] 수학 수식 편집기
- [ ] 차트 생성 도구
- [ ] 템플릿 양식 지원 
- [ ] 코드 하이라이팅 개선
- [ ] 모바일 최적화
- [ ] 다국어 지원 확장

## 🤝 기여하기

LiteEditor 프로젝트에 기여하는 방법:

1. 이 저장소를 포크하세요
2. 새 기능 브랜치를 만드세요 (`git checkout -b feature/amazing-feature`)
3. 변경사항을 커밋하세요 (`git commit -m 'Add some amazing feature'`)
4. 브랜치에 푸시하세요 (`git push origin feature/amazing-feature`)
5. Pull Request를 생성하세요

## 📄 라이센스

이 프로젝트는 Apache License 2.0 with Commons Clause 라이센스에 따라 배포됩니다. 자세한 내용은 [LICENSE](./LICENSE) 파일을 참조하세요.

## 📞 문의

- **이메일**: teamsubnote@gmail.com
- **웹사이트**: https://v0-interactive-landing-page-omega.vercel.app/
- **서브노트앱**: https://subnote.cc
- **이슈**: GitHub Issues를 통해 버그 리포트나 기능 요청을 해주세요

---

**개발팀**: subnote lite-editor team in korea  
**버전**: v1.0.05  
**최종 업데이트**: 2025-05-25

