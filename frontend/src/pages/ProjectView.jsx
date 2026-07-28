import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { apiErrorMessage } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Window from '../components/Window.jsx';
import Button98 from '../components/Button98.jsx';
import CodeEditorPane from '../components/CodeEditorPane.jsx';
import PreviewFrame from '../components/PreviewFrame.jsx';
import InfoDialog from '../components/InfoDialog.jsx';

function fileIcon(type) {
  if (type === 'html') return 'fa-brands fa-html5';
  if (type === 'css') return 'fa-brands fa-css3-alt';
  return 'fa-brands fa-js';
}

export default function ProjectView() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [files, setFiles] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  function load() {
    api.get(`/projects/${id}`)
      .then((res) => { setProject(res.data.project); setFiles(res.data.files); })
      .catch((e) => setError(apiErrorMessage(e, 'Proje yüklenemedi.')));
  }

  useEffect(load, [id]);

  if (error) return <Window icon={<i className="fa-solid fa-triangle-exclamation" />} title="Hata"><div className="error-box">{error}</div></Window>;
  if (!project) return <Window icon={<i className="fa-solid fa-hourglass-half" />} title="Yükleniyor…"><p>Proje yükleniyor…</p></Window>;

  const isOwner = user && user.id === project.owner_id;
  const codeFiles = files.filter((f) => f.type !== 'lib');
  const active = codeFiles[activeIdx] || codeFiles[0];

  async function fork() {
    setBusy(true);
    try {
      const res = await api.post(`/projects/${id}/fork`);
      navigate(`/projects/${res.data.project.id}/edit`);
    } catch (e) {
      setError(apiErrorMessage(e, 'Fork işlemi başarısız.'));
    } finally {
      setBusy(false);
    }
  }

  async function star() {
    try {
      const res = await api.post(`/projects/${id}/star`);
      setProject(res.data.project);
    } catch { /* sessiz geç */ }
  }

  const menu = [
    {
      label: 'Dosya',
      items: [
        isOwner
          ? { label: 'Düzenle', icon: 'fa-solid fa-pen', onClick: () => navigate(`/projects/${id}/edit`) }
          : { label: "Fork'la", icon: 'fa-solid fa-code-fork', onClick: fork },
        { label: 'Kapat', icon: 'fa-solid fa-xmark', onClick: () => navigate('/explore') },
      ],
    },
    {
      label: 'Görünüm',
      items: [
        { label: 'Önizlemeyi Yenile', icon: 'fa-solid fa-rotate', onClick: () => setPreviewKey((k) => k + 1) },
      ],
    },
    {
      label: 'Yardım',
      items: [
        { label: 'Hakkında', icon: 'fa-solid fa-circle-info', onClick: () => setShowHelp(true) },
      ],
    },
  ];

  return (
    <Window
      icon={<i className={project.visibility === 'private' ? 'fa-solid fa-lock' : 'fa-solid fa-folder-open'} />}
      title={<>{project.title} — <span className="user-link" onClick={() => navigate(`/u/${project.owner?.username}`)}>@{project.owner?.username}</span></>}
      menu={menu}
      statusLeft={project.visibility === 'private' ? 'Private' : 'Public'}
      statusRight={<><i className="fa-solid fa-star icon-inline" style={{ color: 'var(--warning)' }} />{project.stars}</>}
    >
      {showHelp && (
        <InfoDialog title="Proje Görünümü Hakkında" onClose={() => setShowHelp(false)}>
          <p>Bu proje salt okunur görüntüleniyor. Sahibi değilsen fork'layıp kendi kopyanda düzenleyebilir, sonra üst projeye pull request gönderebilirsin.</p>
        </InfoDialog>
      )}
      {error && <div className="error-box">{error}</div>}
      <div className="toolbar">
        <span className={`badge ${project.visibility}`}>{project.visibility === 'public' ? 'Public' : 'Private'}</span>
        <span className="hint">{project.description}</span>
        <div className="spacer" />
        {isOwner ? (
          <Button98 variant="primary" onClick={() => navigate(`/projects/${id}/edit`)}>
            <i className="fa-solid fa-pen icon-inline" />Düzenle
          </Button98>
        ) : (
          <>
            <Button98 onClick={star}><i className="fa-solid fa-star icon-inline" />Yıldızla</Button98>
            <Button98 variant="primary" onClick={fork} disabled={busy}>
              <i className="fa-solid fa-code-fork icon-inline" />Fork'la
            </Button98>
          </>
        )}
        <Button98 onClick={() => navigate(`/projects/${id}/pulls`)}>
          <i className="fa-solid fa-code-pull-request icon-inline" />Pull Request'ler
        </Button98>
        {isOwner && project.parent_id && (
          <Button98 onClick={() => navigate(`/projects/${id}/pulls/new`)}>
            <i className="fa-solid fa-plus icon-inline" />Üst Projeye PR Gönder
          </Button98>
        )}
      </div>

      <div className="editor-layout">
        <div className="editor-filetree">
          <div className="section-title">DOSYALAR</div>
          {codeFiles.map((f, i) => (
            <div key={f.filename} className={'filetree-item' + (active === f ? ' active' : '')} onClick={() => setActiveIdx(i)}>
              <span><i className={fileIcon(f.type) + ' icon-inline'} />{f.filename}</span>
            </div>
          ))}
        </div>
        <div className="editor-pane">
          <div className="section-title">{active?.filename}</div>
          {active && <CodeEditorPane type={active.type} value={active.content} readOnly />}
        </div>
        <div className="preview-pane">
          <div className="section-title">CANLI ÖNİZLEME</div>
          <PreviewFrame files={files} refreshKey={previewKey} />
        </div>
      </div>
    </Window>
  );
}
