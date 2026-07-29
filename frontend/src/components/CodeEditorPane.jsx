import { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import { keymap } from '@codemirror/view';
import { Prec } from '@codemirror/state';
import { indentMore } from '@codemirror/commands';
import { acceptCompletion, completionStatus } from '@codemirror/autocomplete';
import { abbreviationTracker } from '@emmetio/codemirror6-plugin';
import { win98CmTheme, win98CmExtras } from '../lib/codemirrorTheme.js';

// Dosya tipine göre dil desteği. JS dosyalarında JSX de parse edilebilsin diye
// jsx:true veriyoruz — bu, "<div>" gibi Emmet abbreviation'larının JS içinde de
// tanınabilmesini sağlıyor.
const LANGS = { html: html(), css: css(), js: javascript({ jsx: true }) };

// Emmet, hangi "syntax" ile çalıştığını bilmek zorunda (dosya tipinden anlaşılmıyor).
// html -> HTML abbreviation'ları ("!", "div.card>ul>li*3" vb.)
// css  -> CSS abbreviation'ları ("m10", "df" vb.)
// js   -> jsx: sadece "<" ile başlayan abbreviation'ları tetikler, böylece normal
//         JS kodu yazarken (örn. "div" değişken adı) yanlışlıkla tetiklenmez.
const EMMET_SYNTAX = { html: 'html', css: 'css', js: 'jsx' };

// VS Code'daki davranışın aynısı: bir tamamlama/Emmet önerisi aktifken TAB onaylar;
// hiçbir öneri aktif değilse TAB normal girinti (indent) görevi görür. Öneriyi
// kabul etmeden yazmaya devam edilirse (veya Esc'e basılırsa) öneri otomatik kaybolur
// — bu, CodeMirror'ın autocomplete modülünün varsayılan davranışıdır.
const emmetTabKeymap = Prec.highest(
  keymap.of([
    {
      key: 'Tab',
      run(view) {
        if (completionStatus(view.state) === 'active') {
          return acceptCompletion(view);
        }
        return indentMore(view);
      },
    },
  ])
);

export default function CodeEditorPane({ type, value, onChange, readOnly }) {
  const extensions = useMemo(() => {
    const emmetSyntax = EMMET_SYNTAX[type];
    return [
      ...(LANGS[type] ? [LANGS[type]] : []),
      ...(emmetSyntax ? [abbreviationTracker({ syntax: emmetSyntax })] : []),
      emmetTabKeymap,
    ];
  }, [type]);

  return (
    <div className="cm-editor-wrap bevel-sunken">
      <CodeMirror
        value={value}
        height="100%"
        theme={[win98CmTheme, win98CmExtras]}
        extensions={extensions}
        onChange={onChange}
        editable={!readOnly}
        basicSetup={{ lineNumbers: true, foldGutter: true, autocompletion: true }}
      />
    </div>
  );
}
