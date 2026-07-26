import { useMemo } from 'react';
import { buildPreviewDoc } from '../lib/preview.js';

export default function PreviewFrame({ files, refreshKey }) {
  const doc = useMemo(() => buildPreviewDoc(files), [files, refreshKey]);
  return (
    <div className="preview-frame-wrap bevel-sunken">
      <iframe
        key={refreshKey}
        title="Canlı Önizleme"
        srcDoc={doc}
        sandbox="allow-scripts allow-modals allow-forms allow-popups"
      />
    </div>
  );
}
