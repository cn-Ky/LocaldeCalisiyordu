import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { apiErrorMessage } from '../api.js';
import Window from '../components/Window.jsx';
import Button98 from '../components/Button98.jsx';
import CodeEditorPane from '../components/CodeEditorPane.jsx';
import PreviewFrame from '../components/PreviewFrame.jsx';

function fileIcon(type) {
  if (type === 'html') return 'fa-brands fa-html5';
  if (type === 'css') return 'fa-brands fa-css3-alt';
  return 'fa-brands fa-js';
}

export default function EditorWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [files, setFiles] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [viewMode, setViewMode] = useState('code'); // 'code' | 'preview'
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved | error
  const [error, setError] = useState('');
  const skipAutosave = useRef(true);

  useEffect(() => {
    api.get(`/projects/${id}`)
      .then((res) => {
        setTitle(res.data.project.title);
        setFiles(res.data.files);
      })
      .catch((e) => setError(apiErrorMessage(e, 'Proje yüklenemedi.')))
      .finally(() => setLoading(false));
  }, [id]);

  // Değişiklikleri sessizce (debounce ile) otomatik kaydet.
  useEffect(() => {
    if (skipAutosave.current) { skipAutosave.current = false; return; }
    const t = setTimeout(async () => {
      setSaveState('saving');
      try {
        await api.put(`/projects/${id}`, { files });
        setSaveState('saved');
      } catch {
        setSaveState('error');
      }
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  async function saveNow() {
    setSaveState('saving');
    try {
      await api.put(`/projects/${id}`, { files });
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  }

  if (loading) return <Window icon={<i className="fa-solid fa-hourglass-half" />} title="Yükleniyor…"><p>Workspace yükleniyor…</p></Window>;
  if (error) return <Window icon={<i className="fa-solid fa-triangle-exclamation" />} title="Hata"><div className="error-box">{error}</div></Window>;

  const codeFiles = files.filter((f) => f.type !== 'lib');
  const active = codeFiles[activeIdx] || codeFiles[0];

  function updateActiveContent(content) {
    setFiles((prev) => prev.map((f) => (f === active ? { ...f, content } : f)));
  }

  const statusText = {
    idle: 'Hazır',
    saving: 'Kaydediliyor…',
    saved: 'Kaydedildi ✓',
    error: 'Kaydetme hatası!',
  }[saveState];

  return (
    <Window
      icon={<i className="fa-solid fa-laptop-code" />}
      title={`Kod Editörü: ${title} — Localde Çalışıyordu`}
      width="100%"
      statusLeft={active?.filename || ''}
      statusRight={statusText}
    >
      {error && <div className="error-box">{error}</div>}

      <div className="toolbar">
        <Button98 onClick={() => navigate(`/projects/${id}/edit`)}>
          <i className="fa-solid fa-arrow-left icon-inline" />Proje Ayarlarına Dön
        </Button98>
        <div className="spacer" />
        <Button98 variant="primary" onClick={saveNow}>
          <i className="fa-solid fa-floppy-disk icon-inline" />Kaydet
        </Button98>
      </div>

      <div className="workspace-layout">
        <div className="workspace-sidebar">
          {codeFiles.map((f, i) => (
            <div
              key={f.filename}
              className={'workspace-file-tab' + (active === f ? ' active' : '')}
              onClick={() => { setActiveIdx(i); setViewMode('code'); }}
              title={f.filename}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <i className={fileIcon(f.type) + ' icon-inline'} />{f.filename}
              </span>
            </div>
          ))}
        </div>

        <div className="workspace-main">
          {viewMode === 'code' ? (
            active && <CodeEditorPane type={active.type} value={active.content} onChange={updateActiveContent} />
          ) : (
            <PreviewFrame files={files} />
          )}
        </div>
      </div>

      <div className="workspace-bottombar">
        <div
          className={'workspace-toggle-btn' + (viewMode === 'code' ? ' active' : '')}
          onClick={() => setViewMode('code')}
        >
          <i className="fa-solid fa-code" />Kod Editörü
        </div>
        <div
          className={'workspace-toggle-btn' + (viewMode === 'preview' ? ' active' : '')}
          onClick={() => setViewMode('preview')}
        >
          <i className="fa-solid fa-play" />Canlı Önizleme
        </div>
        <div className="spacer" />
        <span className="hint">Değişiklikler otomatik olarak kaydedilir.</span>
      </div>
    </Window>
  );
}
