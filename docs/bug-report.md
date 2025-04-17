# 2025-04-15 버그 리포트 
## 버그 리포트 
1. clear formatting 기능 수행시에 선택된 블록의 html태그만 제거하는게 아니라 아래에 있는 태그도 제거하는 문제 발생 (해결완료)

2. 링크 삽입 후 해당 링크를 클릭해서 새창으로 열어야 하는데 현재 태그만 적용되어 있고 클릭 기능 수행이 안왬 (해결완료)
3. 테이블 UI 어긋나는 부분 수정 (Style, Line 셀렉트 박스에 화살표 다운 표시가 있어야 하고 레이어 크기가 어긋나 있으며, 테이블 레이어의 다룬곳 클릭시 Style과 Line의 레이어는 닫혀야 함) (해결완료)
4. 테이블 인서트시 table.js:584 Uncaught IndexSizeError: Failed to execute 'getRangeAt' on 'Selection': 0 is not a valid index.
    at insertTable (table.js:584:33)
    at HTMLButtonElement.<anonymous> (table.js:336:17)
insertTable	@	table.js:584
(익명)	@	table.js:336 
에러 발생 (해결 완료)

5. 블록 쿼드시 쉬프트 엔터는 블록쿼트가 늘어나는 기능이므로 정상동작하지만 엔터는 클록쿼트 태그 다음에 P로 넘어가야 함 
6. Heading 태그 작성시 hr 라인이 추가 되는 버그가 있음 
