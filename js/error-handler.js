/**
 * LiteEditor 오류 관리 모듈 (error-handler.js)
 * 에디터 전체에서 사용되는 중앙화된 오류 처리 시스템
 */

// 즉시 실행 함수로 캡슐화
(function() {
    // 에러 처리 유틸리티
    const errorHandler = {
        // 에러 코드 정의
        codes: {
            // 공통 에러
            COMMON: {
                SELECTION_RESTORE: 'E001',
                SELECTION_SAVE: 'E002',
                ELEMENT_NOT_FOUND: 'E003',
                DEBUG: 'E004',
                INIT: 'E005',
                SELECTION_GET: 'E006',
                KEY_EVENT: 'E007',
                PASTE: 'E008',
                FOCUS: 'E009',
                OPERATION_IN_PROGRESS: 'E010',
                INVALID_RANGE: 'E011',
                SCRIPT_LOAD: 'E012'
            },
            // 보안 관련 에러
            SECURITY: {
                URL_PARSE: 'S001',
                DOMAIN_NOT_ALLOWED: 'S002'
            },
            // 플러그인별 에러
            PLUGINS: {
                REGISTER: 'P001',
                DATA_LOAD: 'P002',
                ALIGN: {
                    APPLY: 'P101',
                    REMOVE: 'P102'
                },
                FONT: {
                    APPLY: 'P201',
                    LOAD: 'P202'
                },
                FORMAT: {
                    APPLY: 'P301',
                    EXECUTE: 'P302',
                    NO_SELECTION: 'P303'
                },
                CODE: {
                    APPLY: 'P401',
                    EXECUTE: 'P402',
                    LOAD: 'P403',
                    INSERT: 'P404'
                },
                COLOR: {
                    LOAD: 'P501'
                },
                LIST: {
                    APPLY: 'P601',
                    INDENT: 'P602',
                    OUTDENT: 'P603'
                },
                LINK: {
                    APPLY: 'P701',
                    DEBUG: 'P702'
                },
                IMAGE: {
                    DEBUG: 'P801',
                    EDITOR_NOT_FOUND: 'P802'
                },
                MEDIA: {
                    INSERT: 'P901'
                },
                RESET: {
                    FORMAT: 'P1001',
                    BLOCK: 'P1002',
                    NODE_REMOVED: 'P1003',
                    NO_SELECTION: 'P1004',
                    NO_TEXT: 'P1005',
                    CURSOR: 'P1006'
                }
            }
        },

        // 에러 메시지
        messages: {
            // 공통 에러 메시지
            E001: '선택 영역 복원 실패',
            E002: '선택 영역 저장 실패',
            E003: '요소를 찾을 수 없음',
            E004: '디버그 정보',
            E005: '초기화 완료',
            E006: '선택 영역을 가져올 수 없음',
            E007: '키 이벤트 처리 실패',
            E008: '붙여넣기 처리 실패',
            E009: '포커스 설정 실패',
            E010: '이미 작업이 진행 중입니다',
            E011: '유효하지 않은 Range 객체',
            E012: '스크립트 로드 실패',
            
            // 보안 관련 에러 메시지
            S001: 'URL 파싱 실패',
            S002: '허용되지 않은 도메인',
            
            // 플러그인 공통 에러 메시지
            P001: '플러그인 등록 실패',
            P002: '데이터 로드 실패',
            
            // 플러그인별 에러 메시지
            P101: '정렬 적용 실패',
            P102: '정렬 제거 실패',
            P201: '글꼴 적용 실패',
            P202: '글꼴 데이터 로드 실패',
            P301: '서식 적용 실패',
            P302: '서식 실행 실패',
            P303: '서식 적용 실패 - 선택된 텍스트 없음',
            P401: '코드 서식 적용 실패',
            P402: '코드 서식 실행 실패',
            P403: '코드 데이터 로드 실패',
            P404: '코드 삽입 실패',
            P501: '색상 데이터 로드 실패',
            P601: '리스트 적용 실패',
            P602: '리스트 들여쓰기 실패',
            P603: '리스트 내어쓰기 실패',
            P701: '링크 적용 실패',
            P702: '링크 디버그 정보',
            P801: '이미지 디버그 정보',
            P802: '에디터 요소를 찾을 수 없음',
            P901: '미디어 삽입 실패',
            P1001: '서식 초기화 실패',
            P1002: '블록 요소 처리 실패',
            P1003: '노드 제거 오류',
            P1004: '선택 영역 없음',
            P1005: '선택된 텍스트 없음',
            P1006: '커서 위치 설정 실패'
        },

        // 에러 로깅
        logError: function(context, errorCode, error) {
            const message = `[${context}] ${this.messages[errorCode] || '알 수 없는 오류'}`;
            console.error(message, error || '');
        },

        // 정보성 로깅
        logInfo: function(context, message) {
            console.log(`[${context}] INFO: ${message}`);
        },

        // 디버깅 로깅
        logDebug: function(context, message) {
            if (window.DEBUG_MODE) {  // 디버그 모드일 때만 출력
                console.log(`[${context}] DEBUG: ${message}`);
            }
        },
        
        // 경고 로깅
        logWarning: function(context, message, data) {
            console.warn(`[${context}] WARNING: ${message}`, data || '');
        },
        
        // 성능 로깅 (타이밍 측정)
        logPerformance: function(context, operation, startTime) {
            if (window.DEBUG_MODE) {
                const duration = performance.now() - startTime;
                console.log(`[${context}] PERFORMANCE: ${operation} - ${duration.toFixed(2)}ms`);
            }
        },
        
        // 오류 코드 생성 헬퍼
        getErrorCode: function(category, subCategory, type) {
            try {
                return this.codes[category][subCategory][type];
            } catch (e) {
                return '알 수 없는 에러 코드';
            }
        },
        
        // 개발 모드에서만 상세 로그 출력
        logDev: function(context, message, data) {
            if (window.DEBUG_MODE && window.DEVELOPER_MODE) {
                console.log(
                    `%c[DEV: ${context}] ${message}`, 
                    'color: #9C27B0; font-weight: bold;', 
                    data || ''
                );
            }
        }
    };

    // 전역으로 노출
    window.errorHandler = errorHandler;
    
    // 디버깅 모드 설정
    window.DEBUG_MODE = window.DEBUG_MODE !== undefined ? window.DEBUG_MODE : true;
    
    // 개발자 모드 설정 (더 상세한 로그)
    window.DEVELOPER_MODE = window.DEVELOPER_MODE !== undefined ? window.DEVELOPER_MODE : false;
    
    // 초기화 메시지
    if (window.DEBUG_MODE) {
        console.log('%c[ErrorHandler] 오류 처리 시스템 초기화 완료', 'color: #4CAF50; font-weight: bold;');
    }
})();
