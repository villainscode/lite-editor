<!-- 전체 워크플로우 (add + commit + push) -->
./gitx "[prefix] : Your commit message"

<!-- 변경사항 추가 및 커밋만 수행 -->
./gitx commit "[prefix] : Your commit"

<!-- 푸시만 수행 -->
./gitx push

<!-- 로컬 변경사항 버리기 (reset --hard, clean -fd) -->
./gitx reset

<!-- 현재 브랜치를 main 브랜치로 병합-->
./gitx merge

<!-- 모든 원격 저장소 fetch (git fetch --all) -->
./gitx fetch

<!-- 새 브랜치 생성 및 체크아웃 -->
./gitx checkout [branch명]                

<!-- feature/2025-04-26 브랜치를 현재 브랜치에 병합하고 푸시 ./gitx merge-from feature/2025-04-26 -->
./gitx merge-from  [branch명]

