import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { apiErrorMessage } from '../api.js';
import Window from '../components/Window.jsx';
import Button98 from '../components/Button98.jsx';
import DiffView from '../components/DiffView.jsx';

export default function PullRequestNew() {
  const { id } = useParams(); // fork project id
  const navigate = useNavigate();
  const [fork, setFork] = useState(null);
  const [forkFiles, setForkFiles] = useState([]);
  const [parent, setParent] = useState(null);
  const [parentFiles, setParentFiles] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get(`/projects/${id}`).then((res) => {
      setFork(res.data.project);
      setForkFiles(res.data.files);
      setTitle(`${res.data.project.title} için güncelleme`);
      if (!res.data.project.parent_id) return;
      api.get(`/projects/${res.data.project.parent_id}`).then((r2) => {
        setParent(r2.data.project);
        setParentFiles(r2.data.files);
      });
    }).catch((e) => setError(apiErrorMessage(e, 'Proje yüklenemedi.')));
  }, [id]);

  if (error) return <Window icon={<i className="fa-solid fa-triangle-exclamation" />} title="Hata"><div className="error-box">{error}</div></Window>;
  if (!fork) return <Window icon={<i className="fa-solid fa-hourglass-half" />} title="Yükleniyor…"><p>Yükleniyor…</p></Window>;
  if (!fork.parent_id) {
    return (
      <Window icon={<i className="fa-solid fa-triangle-exclamation" />} title="Pull Request Gönderilemez">
        <p>Bu proje bir fork değil. Pull request göndermek için önce hedef projeyi fork'lamalı ve değişikliklerini orada yapmalısın.</p>
        <Button98 onClick={() => navigate(-1)}>Geri Dön</Button98>
      </Window>
    );
  }

  const changed = forkFiles.filter((f) => f.type !== 'lib').filter((f) => {
    const p = parentFiles.find((pf) => pf.filename === f.filename);
    return !p || p.content !== f.content;
  });

  async function submit() {
    if (!title.trim()) { setError('Başlık gerekli.'); return; }
    if (!changed.length) { setError('Üst projeye göre hiçbir değişiklik bulunamadı.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = await api.post(`/pulls/project/${fork.parent_id}`, {
        title, description,
        files: changed.map((f) => ({ filename: f.filename, type: f.type, content: f.content })),
      });
      navigate(`/pulls/${res.data.pull.id}`);
    } catch (e) {
      setError(apiErrorMessage(e, 'Pull request gönderilemedi.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Window icon={<i className="fa-solid fa-code-pull-request" />} title={`Pull Request Oluştur → ${parent?.title || '...'}`} menu={[
      { label: 'Dosya', items: [{ label: 'İptal', icon: 'fa-solid fa-xmark', onClick: () => navigate(-1) }] },
      { label: 'Yardım', items: [{ label: 'Hakkında', icon: 'fa-solid fa-circle-info', onClick: () => window.alert("Fork'undaki dosyalarla üst projedeki dosyalar karşılaştırılır. Sadece farklı olan dosyalar pull request'e dahil edilir.") }] },
    ]}>
      {error && <div className="error-box">{error}</div>}
      <div className="field">
        <label>Başlık</label>
        <input className="input98" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="field">
        <label>Açıklama</label>
        <textarea className="input98" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Bu pull request neyi değiştiriyor?" />
      </div>

      <div className="section-title">DEĞİŞİKLİKLER ({changed.length} dosya)</div>
      {changed.length === 0 && <p className="hint">Fork'undaki dosyalar üst projeyle birebir aynı. Önce editörde değişiklik yap.</p>}
      {changed.map((f) => (
        <DiffView
          key={f.filename}
          filename={f.filename}
          oldContent={parentFiles.find((pf) => pf.filename === f.filename)?.content || ''}
          newContent={f.content}
        />
      ))}

      <div className="btn98-row" style={{ marginTop: 10 }}>
        <Button98 variant="primary" onClick={submit} disabled={submitting}>
          <i className="fa-solid fa-code-pull-request icon-inline" />{submitting ? 'Gönderiliyor…' : 'Pull Request Gönder'}
        </Button98>
        <Button98 onClick={() => navigate(-1)}>İptal</Button98>
      </div>
    </Window>
  );
}
