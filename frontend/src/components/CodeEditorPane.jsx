import CodeMirror from '@uiw/react-codemirror';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import { win98CmTheme, win98CmExtras } from '../lib/codemirrorTheme.js';

const LANGS = { html: html(), css: css(), js: javascript() };

export default function CodeEditorPane({ type, value, onChange, readOnly }) {
  return (
    <div className="cm-editor-wrap bevel-sunken">
      <CodeMirror
        value={value}
        height="100%"
        theme={[win98CmTheme, win98CmExtras]}
        extensions={LANGS[type] ? [LANGS[type]] : []}
        onChange={onChange}
        editable={!readOnly}
        basicSetup={{ lineNumbers: true, foldGutter: true, autocompletion: true }}
      />
    </div>
  );
}
