
# Worklog
파일명은 {@date}-{@function이름}-worklog.md 로 docs 폴더 하위에 그날의 작업 기록을 남겨놓는다. 
현재 기준 작업 브랜치를 기록하고 오늘 수정사항, 추가사항, 남은 사항들을 아래의 형식에 맞춰 바꿔준다.

## 2025-04-13 (작업한 날짜)

### 수정 완료 사항 
1. Do Hyeon, Black Han Sans 폰트 추가 - fontFamily.js
2. 이미지 업로드 레이아웃 수정 - imageUpload.js


## 2025-04-26 

### 수정 완료 사항 
/docs/20250411-worklog.md
/docs/20250413-link-worklog.md
/docs/20250415-table-worklog.md
/docs/20250418-bugfix-worklog.md
/docs/20250427-onoff-line-worklog.md
/docs/20250428-media-worklog.md
/docs/20250501-bugfix-worklog.md
/docs/20250502-worklog.md

## 2025-04-27 

### 수정 완료 사항 
1. html 에서 아이콘 on off 기능으로 통합 표시 하도록 변경 
2. media 기능 추가 - 유튜브 링크 가능하도록 추가 (레이어 통일성 유지 - link.js 참고)
3. code highlight 적용 (speed-highlight.js)

### 추가 개발 사항 
- [x] 이미지 업로드 후 이미지 사이즈 조절 기능 추가 함  (완료)
- [x] link 선택시 에디터 선택 블록 원복 수정 해야 함 
- [ ] link 빈 칸으로 입력시 alert 창에서 엔터 누를 경우 메시지 창이 계속 나오는 버그 수정해야 함(엔터 클릭시 link layer는 유지하고 alert box만 닫히게)
- [x] url 입력값 체크할 때 alert 엔터 누를 때 경고 레이어가 계속 뜨는 버그 (닫혀야함) 수정 필요 
- [x] 스크롤 이동시 link와 image upload의 레이어는 고정값인데 나머지는 간격이 벌어지는 버그 수정 해야 함 
- [x] 테이블 컬럼 사이즈 고정과 변경 (https://codepen.io/validide/pen/aOKLNo) 
- [x] 동영상 첨부 기능 추가 (완료)
- [x] 동영상 레이어 링크 형태로 플로팅 레이어가 뜨도록 변경 필요 (완료)
- [ ] 동영상 오브젝트 크기 조절 가능하도록 수정 (완료)
- [x] index.html에서 에디터의 너비와 높이를 지정하여 에디터의 크기를 변경할 수 있도록 수정, 높이의 경우 내용이 길어지면 스크롤링이 되어야 함 
- [x] 코드 하일라이팅 기능 추가해야함 (https://highlightjs.org/#usage 참고) 
- [x] 테이블 컬럼 사이즈 고정과 변경 (https://codepen.io/validide/pen/aOKLNo) 
- [ ] font family의 경우 font manager를 따로 빼서 추가, 삭제 할 수 있도록 분리/관리 해야함 
- [ ] rich 화면 모드와 html 소스 보기 모드 탭을 구현해야 함
- [ ] 테이블 ok 버튼 클릭시 공통 경고 메시지 출력하기 
- [ ] 이미지 업로드 역시 공통 경고 메시지 출력하기 
- [ ] 이미지 레이어와 테이블 레이어의 경우 닫힘 기능이 상호간에 영향을 주는 버그가 있으므로 개선해야 함 
- [ ] 다른 플로팅 레이어를 링크 레이어 처럼 위치가 바뀌지 않도록 변경해야 함 
- [ ] 이미지 업로드 기능 (public 폴더에 이미지 업로드, 파일명 리플레이스 해서 반환하는 함수) 추가 
- [ ] html 모드, wysiwyg 모드 구분, 탭 형태로 하단에 구분 해야 함 
- [ ] html export, import 기능 추가 
- [ ] SqlLite 내장 작업 추가 
- [ ] 이미지 업로드 서버측 개발해야 함 (DB 연동)



## 버그 리포트 
- [x] clear formatting 기능 수행시에 선택된 블록의 html태그만 제거하는게 아니라 아래에 있는 태그도 제거하는 문제 발생 (해결완료)
- [x] 링크 삽입 후 해당 링크를 클릭해서 새창으로 열어야 하는데 현재 태그만 적용되어 있고 클릭 기능 수행이 안됌 (해결완료)
- [x] 테이블 UI 어긋나는 부분 수정 (Style, Line 셀렉트 박스에 화살표 다운 표시가 있어야 하고 레이어 크기가 어긋나 있으며, 테이블 레이어의 다룬곳 클릭시 Style과 Line의 레이어는 닫혀야 함) (해결완료)
- [x] 테이블 인서트시 table.js:584 Uncaught IndexSizeError: Failed to execute 'getRangeAt' on 'Selection': 0 is not a valid index.
    at insertTable (table.js:584:33)
    at HTMLButtonElement.<anonymous> (table.js:336:17)
insertTable	@	table.js:584
(익명)	@	table.js:336 에러 발생 (해결 완료)
- [x] list 태그 분리 및 css 적용 필요 (해결 완료)
- [x] 블록 쿼드시 쉬프트 엔터는 쿼트블록이 늘어나야 하고, 기본 클릭시 생성되는 쿼트 블록은 내부에 포커스가 있어야 한다. (해결완료)
- [ ] 테이블은 그리드 형태로 컬럼의 열을 조절할 수 있어야 한다. 또 컬럼별로 비율이 정확히 나눠져서 균등한 width를 갖도록 해야 하는데 현재는 컨텐츠의 길이에 따라 다른 컬럼의 너비가 줄어드는 형태로 되어있다. 
- [ ] Heading 태그 작성시 hr 라인이 추가 되는 버그가 있음 
- [ ] 레이어 뜨는 방식 통일해야 함 (link.js 방식처럼 스크롤과 상관없이 아이콘 밑에 레이어가 뜨도록 변경) - 현재 Font-family만 적용, 추가로 디버깅 해야함 (버그있음)
- [ ] 서식 제거시에 일부 블럭형 (리스트 등)에 서식 제거가 안되는 버그 해결해야 함 (동영상, 이미지, 테이블, 코드블럭은 delete 로 개체를 삭제할 수 있음)


### 유의사항 
1. index.html에 class="lite-editor-content" 추가할 경우 에디터 아이콘 깨짐 






