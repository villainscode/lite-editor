/**
 * 선택 영역 관리 유틸리티
 */
const SelectionManager = {
    /**
     * 선택 영역을 저장하고 임시 wrapper로 감싸기
     * @returns {Object} { success: boolean, range: Range|null }
     */
    saveSelection: function() {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
            return { success: false, range: null };
        }
        
        const range = selection.getRangeAt(0).cloneRange();
        const isTextSelected = !selection.isCollapsed && selection.toString().trim().length > 0;
        
        if (isTextSelected) {
            try {
                const wrapper = document.createElement('span');
                wrapper.setAttribute('data-temp-selection', 'true');
                range.surroundContents(wrapper);
                return { success: true, range: wrapper, isTextSelected: true };
            } catch (e) {
                console.warn('선택 영역 감싸기 실패:', e);
                return { success: false, range: null };
            }
        } else {
            return { success: true, range: range, isTextSelected: false };
        }
    },
    
    /**
     * 저장된 선택 영역 복원
     * @param {Node} savedRange - 저장된 선택 영역
     * @param {boolean} isTextSelected - 텍스트 선택 여부
     * @returns {boolean} 성공 여부
     */
    restoreSelection: function(savedRange, isTextSelected) {
        if (!savedRange) return false;
        
        try {
            const selection = window.getSelection();
            selection.removeAllRanges();
            
            if (isTextSelected) {
                const range = document.createRange();
                range.selectNodeContents(savedRange);
                selection.addRange(range);
            } else {
                selection.addRange(savedRange);
            }
            
            return true;
        } catch (e) {
            console.warn('선택 영역 복원 실패:', e);
            return false;
        }
    },
    
    /**
     * 임시 wrapper 제거
     */
    cleanupSelection: function() {
        const wrapper = document.querySelector('[data-temp-selection]');
        if (wrapper) {
            const parent = wrapper.parentNode;
            while (wrapper.firstChild) {
                parent.insertBefore(wrapper.firstChild, wrapper);
            }
            parent.removeChild(wrapper);
        }
    }
};

// 전역으로 노출
window.LiteEditorSelection = SelectionManager; 