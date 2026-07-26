// Proje dosyalarından (html/css/js/lib) tek bir çalıştırılabilir HTML dokümanı üretir.
export function buildPreviewDoc(files = []) {
  const html = files.find((f) => f.type === 'html')?.content || '';
  const css = files.filter((f) => f.type === 'css').map((f) => f.content).join('\n');
  const js = files.filter((f) => f.type === 'js').map((f) => f.content).join('\n');
  const libs = files.filter((f) => f.type === 'lib');

  const cssLibs = libs.filter((l) => /\.css($|\?)/i.test(l.content));
  const jsLibs = libs.filter((l) => !/\.css($|\?)/i.test(l.content));

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
${cssLibs.map((l) => `<link rel="stylesheet" href="${l.content}">`).join('\n')}
${jsLibs.map((l) => `<script src="${l.content}"></script>`).join('\n')}
<style>${css}</style>
</head>
<body>
${html}
<script>
window.onerror = function (msg, src, line, col) {
  console.error('Önizleme hatası:', msg, 'satır', line);
};
<\/script>
<script>
try {
${js}
} catch (e) { console.error('Önizleme JS hatası:', e); }
<\/script>
</body>
</html>`;
}
