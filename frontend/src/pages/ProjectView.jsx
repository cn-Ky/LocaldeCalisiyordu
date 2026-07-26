import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { apiErrorMessage } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Window from '../components/Window.jsx';
import Button98 from '../components/Button98.jsx';
import CodeEditorPane from '../components/CodeEditorPane.jsx';
import PreviewFrame from '../components/PreviewFrame.jsx';

export default function ProjectView() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [files, setFiles] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    api.get(`/projects/${id}`)
      .then((res) => { setProject(res.data.project); setFiles(res.data.files); })
      .catch((e) => setError(apiErrorMessage(e, 'Proje yüklenemedi.')));
  }

  useEffect(load, [id]);

  if (error) return <Window icon="⚠️" title="Hata"><div className="error-box">{error}</div></Window>;
  if (!project) return <Window icon="⏳" title="Yükleniyor…"><p>Proje yükleniyor…</p></Window>;

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

  return (
    <Window
      icon={project.visibility === 'private' ? '🔒' : '📁'}
      title={`${project.title} — @${project.owner?.username}`}
      menu={['Dosya', 'Düzen', 'Görünüm', 'Yardım']}
      statusLeft={project.visibility === 'private' ? 'Özel proje' : 'Herkese açık'}
      statusRight={`⭐ ${project.stars}`}
    >
      {error && <div className="error-box">{error}</div>}
      <div className="toolbar">
        <span className={`badge ${project.visibility}`}>{project.visibility === 'public' ? 'Herkese Açık' : 'Özel'}</span>
        <span className="hint">{project.description}</span>
        <div className="spacer" />
        {isOwner ? (
          <Button98 variant="primary" onClick={() => navigate(`/projects/${id}/edit`)}>✏️ Düzenle</Button98>
        ) : (
          <>
            <Button98 onClick={star}>⭐ Yıldızla</Button98>
            <Button98 variant="primary" onClick={fork} disabled={busy}>🍴 Fork'la</Button98>
          </>
        )}
        <Button98 onClick={() => navigate(`/projects/${id}/pulls`)}>🔀 Pull Request'ler</Button98>
        {isOwner && project.parent_id && (
          <Button98 onClick={() => navigate(`/projects/${id}/pulls/new`)}>➕ Üst Projeye PR Gönder</Button98>
        )}
      </div>

      <div className="editor-layout">
        <div className="editor-filetree">
          <div className="section-title">DOSYALAR</div>
          {codeFiles.map((f, i) => (
            <div key={f.filename} className={'filetree-item' + (active === f ? ' active' : '')} onClick={() => setActiveIdx(i)}>
              <span>{f.type === 'html' ? '📄' : f.type === 'css' ? '🎨' : '⚙️'} {f.filename}</span>
            </div>
          ))}
        </div>
        <div className="editor-pane">
          <div className="section-title">{active?.filename}</div>
          {active && <CodeEditorPane type={active.type} value={active.content} readOnly />}
        </div>
        <div className="preview-pane">
          <div className="section-title">CANLI ÖNİZLEME</div>
          <PreviewFrame files={files} />
        </div>
      </div>
    </Window>
  );
}
