import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { apiErrorMessage } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Window from '../components/Window.jsx';
import Button98 from '../components/Button98.jsx';
import CodeEditorPane from '../components/CodeEditorPane.jsx';
import PreviewFrame from '../components/PreviewFrame.jsx';

const DEFAULT_FILES = [
  { filename: 'index.html', type: 'html', content: '<h1>Merhaba, dünya!</h1>\n<p>Kodlamaya başla.</p>' },
  { filename: 'style.css', type: 'css', content: 'body {\n  font-family: sans-serif;\n  background: #111;\n  color: #eee;\n}' },
  { filename: 'script.js', type: 'js', content: "console.log('Localde Çalışıyordu üzerinde çalışıyor!');" },
];

function typeFromExt(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  if (ext === 'html' || ext === 'htm') return 'html';
  if (ext === 'css') return 'css';
  if (ext === 'js') return 'js';
  return null;
}

export default function Editor() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const [title, setTitle] = useState('Adsız Proje');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [files, setFiles] = useState(DEFAULT_FILES);
  const [activeIdx, setActiveIdx] = useState(0);
  const [libUrl, setLibUrl] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [previewFiles, setPreviewFiles] = useState(DEFAULT_FILES);
  const [ownerId, setOwnerId] = useState(null);
  const [parentId, setParentId] = useState(null);

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/projects/${id}`)
      .then((res) => {
        setTitle(res.data.project.title);
        setDescription(res.data.project.description || '');
        setVisibility(res.data.project.visibility);
        setOwnerId(res.data.project.owner_id);
        setParentId(res.data.project.parent_id);
        setFiles(res.data.files);
        setPreviewFiles(res.data.files);
      })
      .catch((e) => setError(apiErrorMessage(e, 'Proje yüklenemedi.')))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  useEffect(() => {
    const t = setTimeout(() => setPreviewFiles(files), 400);
    return () => clearTimeout(t);
  }, [files]);

  if (isEdit && ownerId && user && ownerId !== user.id) {
    navigate(`/projects/${id}`);
    return null;
  }

  const codeFiles = files.filter((f) => f.type !== 'lib');
  const libFiles = files.filter((f) => f.type === 'lib');
  const active = codeFiles[activeIdx] || codeFiles[0];

  function updateActiveContent(content) {
    setFiles((prev) => prev.map((f) => (f === active ? { ...f, content } : f)));
  }

  function addFile() {
    const name = window.prompt('Dosya adı (örn: about.html, theme.css, app.js):');
    if (!name) return;
    const type = typeFromExt(name);
    if (!type) { setError('Sadece .html, .css ve .js dosyaları desteklenir.'); return; }
    if (files.some((f) => f.filename === name)) { setError('Bu isimde bir dosya zaten var.'); return; }
    setFiles((prev) => [...prev, { filename: name, type, content: '' }]);
    setActiveIdx(codeFiles.length);
  }

  function removeFile(filename) {
    if (files.filter((f) => f.type !== 'lib').length <= 1) return;
    setFiles((prev) => prev.filter((f) => f.filename !== filename));
    setActiveIdx(0);
  }

  function addLib() {
    if (!libUrl.trim()) return;
    setFiles((prev) => [...prev, { filename: libUrl.trim(), type: 'lib', content: libUrl.trim() }]);
    setLibUrl('');
  }

  function removeLib(url) {
    setFiles((prev) => prev.filter((f) => !(f.type === 'lib' && f.content === url)));
  }

  function handleUploadClick() { fileInputRef.current?.click(); }

  async function handleFilesChosen(e) {
    const chosen = Array.from(e.target.files || []);
    for (const file of chosen) {
      const type = typeFromExt(file.name);
      if (!type) continue;
      const content = await file.text();
      setFiles((prev) => {
        const exists = prev.some((f) => f.filename === file.name);
        if (exists) return prev.map((f) => (f.filename === file.name ? { ...f, content } : f));
        return [...prev, { filename: file.name, type, content }];
      });
    }
    e.target.value = '';
    setNotice(`${chosen.length} dosya yüklendi.`);
  }

  async function save(publish) {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      if (isEdit) {
        await api.put(`/projects/${id}`, { title, description, visibility, files });
        setNotice('Proje kaydedildi.');
      } else {
        const res = await api.post('/projects', { title, description, visibility, files });
        navigate(`/projects/${res.data.project.id}/edit`);
      }
    } catch (e) {
      setError(apiErrorMessage(e, 'Kaydedilemedi.'));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!window.confirm('Bu proje kalıcı olarak silinsin mi?')) return;
    await api.delete(`/projects/${id}`);
    navigate('/my-projects');
  }

  if (loading) return <Window icon="⏳" title="Yükleniyor…"><p>Proje yükleniyor…</p></Window>;

  return (
    <Window
      icon="🛠️"
      title={`${isEdit ? 'Düzenle' : 'Yeni Proje'}: ${title} — Localde Çalışıyordu`}
      menu={['Dosya', 'Düzen', 'Görünüm', 'Yardım']}
      statusLeft={visibility === 'public' ? 'Herkese açık' : 'Özel'}
      statusRight={saving ? 'Kaydediliyor…' : 'Hazır'}
    >
      {error && <div className="error-box">{error}</div>}
      {notice && <div className="hint" style={{ marginBottom: 10 }}>✅ {notice}</div>}

      <div className="toolbar">
        <input className="input98" style={{ width: 220 }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Proje başlığı" />
        <input className="input98" style={{ flex: 1, minWidth: 160 }} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Kısa açıklama" />
        <label className="radio98">
          <input type="radio" checked={visibility === 'public'} onChange={() => setVisibility('public')} /> Herkese Açık
        </label>
        <label className="radio98">
          <input type="radio" checked={visibility === 'private'} onChange={() => setVisibility('private')} /> Özel
        </label>
        <Button98 variant="primary" onClick={() => save(false)} disabled={saving}>💾 Kaydet</Button98>
        {isEdit && parentId && <Button98 onClick={() => navigate(`/projects/${id}/pulls/new`)}>➕ Üst Projeye PR Gönder</Button98>}
        {isEdit && <Button98 variant="danger" onClick={remove}>🗑️ Sil</Button98>}
      </div>

      <div className="editor-layout">
        <div className="editor-filetree">
          <div className="section-title">DOSYALAR</div>
          {codeFiles.map((f, i) => (
            <div key={f.filename} className={'filetree-item' + (active === f ? ' active' : '')} onClick={() => setActiveIdx(i)}>
              <span>{f.type === 'html' ? '📄' : f.type === 'css' ? '🎨' : '⚙️'} {f.filename}</span>
              {codeFiles.length > 1 && <span onClick={(e) => { e.stopPropagation(); removeFile(f.filename); }}>×</span>}
            </div>
          ))}
          <Button98 onClick={addFile}>+ Dosya</Button98>
          <input ref={fileInputRef} type="file" multiple accept=".html,.htm,.css,.js" style={{ display: 'none' }} onChange={handleFilesChosen} />
          <Button98 onClick={handleUploadClick}>📤 Bilgisayardan Yükle</Button98>

          <div className="section-title" style={{ marginTop: 16 }}>KÜTÜPHANELER (CDN)</div>
          {libFiles.map((l) => (
            <div key={l.content} className="filetree-item">
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>🔗 {l.content.split('/').pop()}</span>
              <span onClick={() => removeLib(l.content)}>×</span>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 4 }}>
            <input className="input98" style={{ flex: 1 }} placeholder="https://cdn.../lib.js" value={libUrl} onChange={(e) => setLibUrl(e.target.value)} />
            <Button98 onClick={addLib}>Ekle</Button98>
          </div>
          <p className="hint">jQuery, Bootstrap, GSAP gibi kütüphanelerin CDN linkini ekleyebilirsin.</p>
        </div>

        <div className="editor-pane">
          <div className="section-title">{active?.filename || 'Dosya seçilmedi'}</div>
          {active && (
            <CodeEditorPane type={active.type} value={active.content} onChange={updateActiveContent} />
          )}
        </div>

        <div className="preview-pane">
          <div className="section-title">CANLI ÖNİZLEME</div>
          <PreviewFrame files={previewFiles} />
        </div>
      </div>
    </Window>
  );
}
