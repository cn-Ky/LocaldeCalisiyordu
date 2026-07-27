import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { apiErrorMessage } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Window from '../components/Window.jsx';
import Button98 from '../components/Button98.jsx';
import DiffView from '../components/DiffView.jsx';
import InfoDialog from '../components/InfoDialog.jsx';

const STATUS_LABEL = { open: 'Açık', merged: 'Birleştirildi', closed: 'Kapatıldı' };

export default function PullRequestDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  function load() {
    api.get(`/pulls/${id}`).then((res) => setData(res.data)).catch((e) => setError(apiErrorMessage(e)));
  }
  useEffect(load, [id]);

  if (error) return <Window icon={<i className="fa-solid fa-triangle-exclamation" />} title="Hata"><div className="error-box">{error}</div></Window>;
  if (!data) return <Window icon={<i className="fa-solid fa-hourglass-half" />} title="Yükleniyor…"><p>Yükleniyor…</p></Window>;

  const { pull, project, currentFiles, proposedFiles, comments } = data;
  const isTargetOwner = user && user.id === project.owner_id;
  const isAuthor = user && user.id === pull.author_id;

  async function merge() {
    setBusy(true);
    try {
      await api.post(`/pulls/${id}/merge`);
      load();
    } catch (e) { setError(apiErrorMessage(e, 'Birleştirme başarısız.')); } finally { setBusy(false); }
  }
  async function close() {
    setBusy(true);
    try {
      await api.post(`/pulls/${id}/close`);
      load();
    } catch (e) { setError(apiErrorMessage(e, 'Kapatma başarısız.')); } finally { setBusy(false); }
  }
  async function sendComment() {
    if (!comment.trim()) return;
    await api.post(`/pulls/${id}/comment`, { body: comment });
    setComment('');
    load();
  }

  const menu = [
    { label: 'Dosya', items: [{ label: 'Listeye Dön', icon: 'fa-solid fa-arrow-left', onClick: () => navigate(`/projects/${project.id}/pulls`) }] },
    { label: 'Görünüm', items: [{ label: 'Yenile', icon: 'fa-solid fa-rotate', onClick: load }] },
    { label: 'Yardım', items: [{ label: 'Hakkında', icon: 'fa-solid fa-circle-info', onClick: () => setShowHelp(true) }] },
  ];

  return (
    <Window
      icon={<i className="fa-solid fa-code-pull-request" />}
      title={`#${pull.id} ${pull.title} — ${project.title}`}
      menu={menu}
      statusLeft={<span className={`badge ${pull.status}`}>{STATUS_LABEL[pull.status]}</span>}
      statusRight={`@${pull.author?.username}`}
    >
      {showHelp && (
        <InfoDialog title="Pull Request Detayı Hakkında" onClose={() => setShowHelp(false)}>
          <p>Değişiklikleri dosya dosya diff olarak inceleyebilirsin (yeşil: eklenen, kırmızı: kaldırılan). Hedef projenin sahibiysen birleştirebilir ya da kapatabilirsin.</p>
        </InfoDialog>
      )}
      {error && <div className="error-box">{error}</div>}
      <p className="hint">{pull.description || 'Açıklama yok.'}</p>

      <div className="btn98-row" style={{ margin: '10px 0' }}>
        <Button98 onClick={() => navigate(`/projects/${project.id}/pulls`)}>
          <i className="fa-solid fa-arrow-left icon-inline" />Listeye Dön
        </Button98>
        {pull.status === 'open' && isTargetOwner && (
          <Button98 variant="primary" onClick={merge} disabled={busy}>
            <i className="fa-solid fa-check icon-inline" />Birleştir (Merge)
          </Button98>
        )}
        {pull.status === 'open' && (isTargetOwner || isAuthor) && (
          <Button98 variant="danger" onClick={close} disabled={busy}>
            <i className="fa-solid fa-xmark icon-inline" />Kapat
          </Button98>
        )}
      </div>

      <div className="section-title">DEĞİŞİKLİKLER</div>
      {proposedFiles.map((f) => (
        <DiffView
          key={f.filename}
          filename={f.filename}
          oldContent={currentFiles.find((cf) => cf.filename === f.filename)?.content || ''}
          newContent={f.content}
        />
      ))}

      <div className="section-title" style={{ marginTop: 16 }}>YORUMLAR</div>
      <div className="bevel-sunken" style={{ padding: 10, maxHeight: 220, overflowY: 'auto', marginBottom: 10 }}>
        {comments.length === 0 && <p className="hint">Henüz yorum yok.</p>}
        {comments.map((c) => (
          <div key={c.id} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12 }}><strong style={{ color: 'var(--accent)' }}>@{c.username}</strong> <span className="hint">{new Date(c.created_at).toLocaleString('tr-TR')}</span></div>
            <div style={{ fontSize: 13 }}>{c.body}</div>
          </div>
        ))}
      </div>
      {user && (
        <div style={{ display: 'flex', gap: 6 }}>
          <input className="input98" style={{ flex: 1 }} placeholder="Bir yorum yaz…" value={comment} onChange={(e) => setComment(e.target.value)} />
          <Button98 onClick={sendComment}><i className="fa-solid fa-paper-plane icon-inline" />Gönder</Button98>
        </div>
      )}
    </Window>
  );
}
