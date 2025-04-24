<!-- 전체 워크플로우 (add + commit + push) -->
./gitx "[prefix] : Your commit message"

<!-- 변경사항 추가 및 커밋만 수행 -->
./gitx commit "[prefix] : Your commit"

<!-- 푸시만 수행 -->
./gitx push

<!-- 로컬 변경사항 버리기 (reset --hard, clean -fd) -->
./gitx discard

<!-- 현재 브랜치를 main 브랜치로 병합-->
./gitx merge

<!-- 모든 원격 저장소 fetch (git fetch --all) -->
./gitx fetch                          
<!-- 현재 버전 v.1.0 >