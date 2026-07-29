import { useEffect, useState } from 'react';
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

export default function ProjectWorkspaceView() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [files, setFiles] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [viewMode, setViewMode] = useState('code'); // 'code' | 'preview'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/projects/${id}`)
      .then((res) => { setProject(res.data.project); setFiles(res.data.files); })
      .catch((e) => setError(apiErrorMessage(e, 'Proje yüklenemedi.')))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Window icon={<i className="fa-solid fa-hourglass-half" />} title="Yükleniyor…"><p>Yükleniyor…</p></Window>;
  if (error) return <Window icon={<i className="fa-solid fa-triangle-exclamation" />} title="Hata"><div className="error-box">{error}</div></Window>;

  const codeFiles = files.filter((f) => f.type !== 'lib');
  const active = codeFiles[activeIdx] || codeFiles[0];

  return (
    <Window
      icon={<i className="fa-solid fa-laptop-code" />}
      title={`Görüntüle: ${project.title} — Localde Çalışıyordu`}
      width="100%"
      statusLeft={active?.filename || ''}
      statusRight="Salt okunur"
    >
      <div className="toolbar">
        <Button98 onClick={() => navigate(`/projects/${id}`)}>
          <i className="fa-solid fa-arrow-left icon-inline" />Proje Bilgisine Dön
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
            active && <CodeEditorPane type={active.type} value={active.content} readOnly />
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
      </div>
    </Window>
  );
}
