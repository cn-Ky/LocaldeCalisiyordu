import { createTheme } from '@uiw/codemirror-themes';
import { tags as t } from '@lezer/highlight';
import { EditorView } from '@codemirror/view';

// "Localde Çalışıyordu" karanlık Win98/neon paletiyle uyumlu özel CodeMirror teması.
export const win98CmTheme = createTheme({
  theme: 'dark',
  settings: {
    background: '#0d0e18',
    foreground: '#e8e8f0',
    caret: '#00e6ff',
    selection: 'rgba(0, 230, 255, 0.25)',
    selectionMatch: 'rgba(0, 230, 255, 0.15)',
    lineHighlight: 'rgba(255, 255, 255, 0.045)',
    gutterBackground: '#121320',
    gutterForeground: '#5c5e78',
    gutterBorder: '#232540',
    gutterActiveForeground: '#00e6ff',
    fontFamily: 'Consolas, "SFMono-Regular", Menlo, Monaco, "Courier New", monospace',
  },
  styles: [
    { tag: t.comment, color: '#767ba0', fontStyle: 'italic' },
    { tag: [t.string, t.special(t.string)], color: '#ff7ab8' },
    { tag: [t.number, t.bool, t.null], color: '#54e08c' },
    { tag: [t.keyword, t.controlKeyword, t.operatorKeyword], color: '#00e6ff', fontWeight: 'bold' },
    { tag: t.operator, color: '#8beaf7' },
    { tag: [t.className, t.typeName, t.definition(t.typeName)], color: '#ffcf4d' },
    { tag: t.propertyName, color: '#8beaf7' },
    { tag: t.variableName, color: '#e8e8f0' },
    { tag: t.tagName, color: '#00e6ff' },
    { tag: t.attributeName, color: '#ff2e88' },
    { tag: t.angleBracket, color: '#767ba0' },
    { tag: [t.bracket, t.paren, t.squareBracket], color: '#a7a9c4' },
    { tag: t.function(t.variableName), color: '#8beaf7' },
    { tag: t.meta, color: '#767ba0' },
    { tag: t.invalid, color: '#ff5c5c' },
  ],
});

// Yazı boyutu, dolgu ve etkileşim vurgularını ayrı bir uzantı olarak ekliyoruz.
// Arkaplan rengi, editörün boş (satırsız) alanlarıyla dolu alanları arasında
// tutarsızlık olmasın diye tüm alt bileşenlere (scroller/content/gutters)
// açıkça ve aynı şekilde veriliyor.
export const win98CmExtras = EditorView.theme({
  '&': { fontSize: '14.5px', backgroundColor: '#0d0e18', height: '100%' },
  '.cm-scroller': { lineHeight: '1.55', backgroundColor: '#0d0e18' },
  '.cm-content': { padding: '10px 6px', caretColor: '#00e6ff', backgroundColor: '#0d0e18', minHeight: '100%' },
  '.cm-gutters': { paddingRight: '10px', backgroundColor: '#121320', minHeight: '100%' },
  '.cm-activeLine': { backgroundColor: 'rgba(255,255,255,0.045)' },
  '.cm-activeLineGutter': { backgroundColor: 'rgba(0,230,255,0.08)' },
  '.cm-matchingBracket': { backgroundColor: 'rgba(255,46,136,0.28)', outline: '1px solid #ff2e88' },
  '.cm-selectionMatch': { backgroundColor: 'rgba(0,230,255,0.15)' },
});
