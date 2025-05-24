/**
 * LiteEditor 오류 및 디버그 관리 모듈 (error-handler.js)
 * 에디터 전체에서 사용되는 중앙화된 오류 처리 및 디버깅 시스템
 */

// 즉시 실행 함수로 캡슐화
(function() {
    // 에러 및 디버그 처리 유틸리티
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
                    INSERT: 'P404',
                    EMPTY_CODE: 'P405'
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
                    DEBUG: 'P702',
                    INVALID_URL: 'P703'
                },
                IMAGE: {
                    DEBUG: 'P801',
                    EDITOR_NOT_FOUND: 'P802',
                    INVALID_URL: 'P803'
                },
                MEDIA: {
                    INSERT: 'P901',
                    INVALID_URL: 'P902',
                    INVALID_YOUTUBE: 'P903'
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
            P403: '코드 하이라이트 라이브러리를 로드할 수 없습니다.',
            P404: '코드 블록을 삽입하는 중 오류가 발생했습니다.',
            P405: '코드를 입력해주세요.',
            P501: '색상 데이터 로드 실패',
            P601: '리스트 적용 실패',
            P602: '리스트 들여쓰기 실패',
            P603: '리스트 내어쓰기 실패',
            P701: '링크 적용 실패',
            P702: '링크 디버그 정보',
            P703: '유효한 URL을 입력해주세요.<BR>예시: https://example.com',
            P801: '이미지 디버그 정보',
            P802: '에디터 요소를 찾을 수 없음',
            P803: '유효한 이미지 URL을 입력해주세요',
            P901: '미디어 삽입 실패',
            P902: '유효하지 않은 동영상 URL입니다.<BR>HTML 태그는 허용되지 않습니다.',
            P903: '유효한 YouTube URL을 입력해주세요.<BR>Ex : https://www.youtube.com/watch?v=...',
            P1001: '서식 초기화 실패',
            P1002: '블록 요소 처리 실패',
            P1003: '노드 제거 오류',
            P1004: '선택 영역 없음',
            P1005: '선택된 텍스트 없음',
            P1006: '커서 위치 설정 실패',
            
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
        logDebug: function(context, message, data) {
            if (!window.DEBUG_MODE) return;
            console.log(
                `[${context}] DEBUG: ${message}`,
                data || ''
            );
        },
        
        // 경고 로깅
        logWarning: function(context, message, data) {
            console.warn(`[${context}] WARNING: ${message}`, data || '');
        },
        
        // 성능 로깅 (타이밍 측정)
        logPerformance: function(context, operation, startTime) {
            if (!window.DEBUG_MODE) return;
                const duration = performance.now() - startTime;
                console.log(`[${context}] PERFORMANCE: ${operation} - ${duration.toFixed(2)}ms`);
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
            if (!window.DEBUG_MODE || !window.DEVELOPER_MODE) return;
                console.log(
                    `%c[DEV: ${context}] ${message}`, 
                    'color: #9C27B0; font-weight: bold;', 
                    data || ''
                );
        },

        // debug-utils.js에서 통합되는 기능들
        
        /**
         * 색상 로그 출력 함수 (debug-utils.js의 debugLog와 동일)
         * @param {string} module 모듈명 (예: 'ALIGN', 'LINK' 등)
         * @param {string} message 출력할 메시지
         * @param {any} data 추가 데이터 (선택사항)
         * @param {string} color 로그 색상 (CSS 색상값)
         */
        colorLog: function(module, message, data, color = '#2196f3') {
            if (!window.DEBUG_MODE) return;
            
            console.log(
                `%c[${module}] ${message}`,
                `color:${color};font-weight:bold;`,
                data || ''
            );
        },

        /**
         * 화면에 디버깅 요소 표시
         * @param {string} message 표시할 메시지
         * @param {number} duration 표시 시간 (ms)
         * @param {string} bgColor 배경색
         * @param {string} textColor 텍스트 색상
         */
        showDebugElement: function(message, duration = 3000, bgColor = 'red', textColor = 'white') {
            if (!window.DEBUG_MODE) return;
            
            const debugElement = document.createElement('div');
            debugElement.textContent = message;
            debugElement.style.position = 'fixed';
            debugElement.style.top = '10px';
            debugElement.style.right = '10px';
            debugElement.style.backgroundColor = bgColor;
            debugElement.style.color = textColor;
            debugElement.style.padding = '10px';
            debugElement.style.zIndex = '999999';
            debugElement.style.fontWeight = 'bold';
            debugElement.style.borderRadius = '4px';
            document.body.appendChild(debugElement);
            
            setTimeout(() => {
                if (debugElement.parentNode) {
                    debugElement.parentNode.removeChild(debugElement);
                }
            }, duration);
        },

        /**
         * 에디터 선택 영역 정보 반환 유틸
         * @param {HTMLElement|string} target 편집 영역 요소 또는 CSS 선택자(기본 '#lite-editor')
         * @returns {{ start:number, end:number, text:string }|null}
         */
        getSelectionInfo: function(target = '#lite-editor') {
            const editor = typeof target === 'string' ? document.querySelector(target) : target;
            const sel = window.getSelection();
            if (!editor || !sel || sel.rangeCount === 0) return null;

            const range = sel.getRangeAt(0);
            if (range.collapsed) return { start: 0, end: 0, text: '' };

            const startRange = range.cloneRange();
            startRange.selectNodeContents(editor);
            startRange.setEnd(range.startContainer, range.startOffset);
            const start = startRange.toString().length;

            const endRange = range.cloneRange();
            endRange.selectNodeContents(editor);
            endRange.setEnd(range.endContainer, range.endOffset);
            const end = endRange.toString().length;

            const text = range.toString();

            return { start, end, text };
        },

        /**
         * 선택 영역 정보 상세 출력
         * @param {Range} range 선택 영역 Range 객체
         */
        logSelectionDetails: function(range) {
            if (!window.DEBUG_MODE || !range) return;
            
            const details = {
                startContainer: range.startContainer,
                startOffset: range.startOffset,
                endContainer: range.endContainer,
                endOffset: range.endOffset,
                commonAncestorContainer: range.commonAncestorContainer,
                text: range.toString()
            };
            
            this.colorLog('SELECTION_DETAILS', '선택 영역 상세 정보', details);
            return details;
        },

        /**
         * TreeWalker를 사용한 선택 영역 오프셋 계산
         * @param {HTMLElement|string} target 편집 영역 요소 또는 CSS 선택자(기본 '#lite-editor')
         * @returns {{ start:number, end:number }|null}
         */
        getSelectionOffsets: function(target = '#lite-editor') {
            const container = typeof target === 'string' ? document.querySelector(target) : target;
            if (!container) return null;
            
            const sel = window.getSelection();
            if (!sel.rangeCount) return null;
            const range = sel.getRangeAt(0);

            // container 내 전체 텍스트 노드를 순회하며 오프셋 누적
            let charIndex = 0, startOffset = -1, endOffset = -1;
            const treeWalker = document.createTreeWalker(
                container,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );

            while (treeWalker.nextNode()) {
                const node = treeWalker.currentNode;
                if (node === range.startContainer) {
                    startOffset = charIndex + range.startOffset;
                }
                if (node === range.endContainer) {
                    endOffset = charIndex + range.endOffset;
                    break;
                }
                charIndex += node.textContent.length;
            }
            
            // 선택이 커서(비선택)인 경우
            if (startOffset >= 0 && endOffset < 0) {
                endOffset = startOffset;
            }
            
            return startOffset >= 0 ? { start: startOffset, end: endOffset } : null;
        },

        /**
         * 선택 영역 정보를 콘솔에 출력
         * @param {HTMLElement|string} target 편집 영역 요소 또는 CSS 선택자(기본 '#lite-editor')
         */
        logSelectionOffsets: function(target = '#lite-editor') {
            if (!window.DEBUG_MODE) return;
            
            const offsets = this.getSelectionOffsets(target);
            if (!offsets) {
                this.colorLog('SELECTION', '선택된 영역이 없습니다.', null, '#f44336');
                return;
            }
            
            const selectedText = window.getSelection().toString();
            this.colorLog(
                'SELECTION', 
                `📌 selectionStart: ${offsets.start}, selectionEnd: ${offsets.end}`, 
                { text: selectedText }, 
                '#4caf50'
            );
            
            return { ...offsets, text: selectedText };
        },

        // 디버그 모드 설정 함수
        enableDebug: function() { 
            window.DEBUG_MODE = true;
            console.log('%c[Debug] 디버그 모드가 활성화되었습니다.', 'color: #4CAF50; font-weight: bold;');
        },
        
        disableDebug: function() { 
            window.DEBUG_MODE = false; 
            console.log('%c[Debug] 디버그 모드가 비활성화되었습니다.', 'color: #f44336; font-weight: bold;');
        },
        
        // 개발자 모드 설정
        enableDevMode: function() { 
            window.DEVELOPER_MODE = true;
            console.log('%c[Debug] 개발자 모드가 활성화되었습니다.', 'color: #9C27B0; font-weight: bold;');
        },
        
        disableDevMode: function() { 
            window.DEVELOPER_MODE = false;
            console.log('%c[Debug] 개발자 모드가 비활성화되었습니다.', 'color: #E91E63; font-weight: bold;');
        },

        // 선택 영역 변경 추적을 위한 새로운 메서드들
        selectionLog: {
            // 선택 영역 시작 로깅
            start: function(contentArea) {
                if (!window.DEBUG_MODE) return;
                errorHandler.colorLog(
                    'SELECTION',
                    '📝 선택 시작됨',
                    errorHandler.getSelectionInfo(contentArea),
                    '#ff9800'
                );
            },

            // 선택 영역 저장 시점 로깅
            save: function(contentArea) {
                if (!window.DEBUG_MODE) return;
                errorHandler.colorLog(
                    'SELECTION',
                    '💾 선택 영역 저장:',
                    errorHandler.getSelectionInfo(contentArea),
                    '#2196f3'
                );
            },

            // 선택 영역 복원 시점 로깅
            restore: function(contentArea) {
                if (!window.DEBUG_MODE) return;
                errorHandler.colorLog(
                    'SELECTION',
                    '🔄 선택 영역 복원:',
                    errorHandler.getSelectionInfo(contentArea),
                    '#4caf50'
                );
            },

            // 선택 영역 변경 시점 로깅
            change: function(contentArea, action) {
                if (!window.DEBUG_MODE) return;
                errorHandler.colorLog(
                    'SELECTION',
                    `✏️ ${action}:`,
                    errorHandler.getSelectionInfo(contentArea),
                    '#9c27b0'
                );
            },

            // 선택 영역 최종 상태 로깅
            final: function(contentArea) {
                if (!window.DEBUG_MODE) return;
                errorHandler.colorLog(
                    'SELECTION',
                    '📌 최종 선택 영역:',
                    errorHandler.getSelectionInfo(contentArea),
                    '#795548'
                );
            }
        },

        // 사용자 알림 (LiteEditorModal 래퍼)
        showUserAlert: function(errorCode, customMessage) {
            const message = customMessage || this.messages[errorCode] || '알 수 없는 오류가 발생했습니다.';
            
            if (typeof LiteEditorModal !== 'undefined' && LiteEditorModal.alert) {
                // HTML 지원 여부와 관계없이 LiteEditorModal 우선 사용
                const finalMessage = message.includes('<BR>') ? 
                    message.replace(/<BR>/gi, '\n').replace(/<[^>]*>/g, '') : message;
                LiteEditorModal.alert(finalMessage);
            } else {
                // 최후 fallback: 기본 alert
                const textMessage = message.replace(/<BR>/gi, '\n').replace(/<[^>]*>/g, '');
                alert(textMessage);
            }
        }
    };

    // 전역으로 노출
    window.errorHandler = errorHandler;
    
    // 이전 debug-utils.js와의 호환성을 위한 별칭
    window.DebugUtils = {
        debugLog: errorHandler.colorLog.bind(errorHandler),
        showDebugElement: errorHandler.showDebugElement.bind(errorHandler),
        getEditorSelectionInfo: errorHandler.getSelectionInfo.bind(errorHandler),
        logSelectionDetails: errorHandler.logSelectionDetails.bind(errorHandler),
        getSelectionOffsetsWithTreeWalker: errorHandler.getSelectionOffsets.bind(errorHandler),
        logSelectionOffsets: errorHandler.logSelectionOffsets.bind(errorHandler),
        enableDebug: errorHandler.enableDebug.bind(errorHandler),
        disableDebug: errorHandler.disableDebug.bind(errorHandler)
    };
    
    // 디버깅 모드 설정 (이전 설정 유지)
    window.DEBUG_MODE = window.DEBUG_MODE !== undefined ? window.DEBUG_MODE : true;
    
    // 개발자 모드 설정 (이전 설정 유지)
    window.DEVELOPER_MODE = window.DEVELOPER_MODE !== undefined ? window.DEVELOPER_MODE : false;
    
    // 초기화 메시지
    if (window.DEBUG_MODE) {
        console.log('%c[ErrorHandler] 오류 및 디버깅 시스템 초기화 완료', 'color: #4CAF50; font-weight: bold;');
    }
})();
