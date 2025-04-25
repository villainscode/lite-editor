/**
 * LiteEditor Check List Plugin Stub
 */
(function() {
  // Create a single checklist item for current selection
  function createChecklist(contentArea) {
    const selection = PluginUtil.selection.getSafeSelection();
    if (!selection || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    if (!selectedText.trim()) return;

    // Remove selected content and build checklist item
    range.deleteContents();
    const container = PluginUtil.dom.createElement('div', { className: 'flex items-start checklist-item' });
    const checkbox = PluginUtil.dom.createElement('input', {
      type: 'checkbox',
      className: 'form-checkbox h-5 w-5 text-primary peer transition'
    });
    const label = PluginUtil.dom.createElement('label', {
      className: 'ml-3 text-gray-800 peer-checked:line-through peer-checked:text-gray-400',
      textContent: selectedText
    });
    container.appendChild(checkbox);
    container.appendChild(label);
    range.insertNode(container);
    PluginUtil.selection.moveCursorTo(label.firstChild || label, 0);
  }

  // Register plugin stub
  PluginUtil.registerPlugin('checkList', {
    title: 'Check List',
    icon: 'checklist',
    action: function(contentArea, button, event) {
      if (event) { event.preventDefault(); event.stopPropagation(); }
      contentArea.focus();
      if (window.liteEditorSelection) {
        window.liteEditorSelection.save();
        window.liteEditorSelection.restore();
      }
      createChecklist(contentArea);
      if (window.liteEditorSelection) window.liteEditorSelection.save();
    }
  });
})();
