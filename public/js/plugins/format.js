/**
 * LiteEditor Format - Legacy Format File
 * 이 파일은 후반 호환을 위해 유지합니다.
 * 실제 기능은 각각 서식 플러그인 파일로 분리되었습니다.
 */

(function() {
  // 이미 각 플러그인이 파일 분리되어 있으므로 필요한 호환성 코드만 유지

  // 플러그인이 실제로 분리된 이후에도 format.js를 사용하는 기존 코드를 위해
  // 각 플러그인을 호출할 수 있도록 처리
  const getPlugin = function(name) {
    return LiteEditor.plugins[name];
  };

  // 플러그인 인터페이스 호환성 유지
  const formatActions = {
    'bold': function(contentArea) {
      const boldPlugin = getPlugin('bold');
      if (boldPlugin && boldPlugin.action) {
        boldPlugin.action(contentArea);
      }
    },
    'italic': function(contentArea) {
      const italicPlugin = getPlugin('italic');
      if (italicPlugin && italicPlugin.action) {
        italicPlugin.action(contentArea);
      }
    },
    'underline': function(contentArea) {
      const underlinePlugin = getPlugin('underline');
      if (underlinePlugin && underlinePlugin.action) {
        underlinePlugin.action(contentArea);
      }
    },
    'strike': function(contentArea) {
      const strikePlugin = getPlugin('strike');
      if (strikePlugin && strikePlugin.action) {
        strikePlugin.action(contentArea);
      }
    },
    'code': function(contentArea) {
      const codePlugin = getPlugin('code');
      if (codePlugin && codePlugin.action) {
        codePlugin.action(contentArea);
      }
    },
    'blockquote': function(contentArea) {
      const blockquotePlugin = getPlugin('blockquote');
      if (blockquotePlugin && blockquotePlugin.action) {
        blockquotePlugin.action(contentArea);
      }
    }
  };

  // 호환성을 위한 포맷 행위 객체 노출
  window.LiteEditorFormatActions = formatActions;

  // 로그 메세지
  console.info('LiteEditor: 서식 기능이 플러그인으로 분리되었습니다. 각 서식 플러그인 파일을 사용하세요.');
})();
