import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { apiErrorMessage } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Window from '../components/Window.jsx';
import Button98 from '../components/Button98.jsx';
import CodeEditorPane from '../components/CodeEditorPane.jsx';
import PreviewFrame from '../components/PreviewFrame.jsx';
import InfoDialog from '../components/InfoDialog.jsx';
import { POPULAR_LIBS } from '../lib/popularLibs.js';

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

function fileIcon(type) {
  if (type === 'html') return 'fa-brands fa-html5';
  if (type === 'css') return 'fa-brands fa-css3-alt';
  return 'fa-brands fa-js';
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
  const [previewKey, setPreviewKey] = useState(0);
  const [ownerId, setOwnerId] = useState(null);
  const [parentId, setParentId] = useState(null);
  const [showHelp, setShowHelp] = useState(false);

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

  function addLibByUrl(url) {
    const clean = url.trim();
    if (!clean) return;
    if (files.some((f) => f.type === 'lib' && f.content === clean)) return;
    setFiles((prev) => [...prev, { filename: clean, type: 'lib', content: clean }]);
  }

  function addLib() {
    addLibByUrl(libUrl);
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

  async function save() {
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

  const menu = [
    {
      label: 'Dosya',
      items: [
        { label: 'Kaydet', icon: 'fa-solid fa-floppy-disk', onClick: save },
        { label: 'Bilgisayardan Yükle', icon: 'fa-solid fa-upload', onClick: handleUploadClick },
        { sep: true },
        ...(isEdit ? [{ label: 'Projeyi Sil', icon: 'fa-solid fa-trash', onClick: remove }] : []),
        { label: 'Kapat', icon: 'fa-solid fa-xmark', onClick: () => navigate('/my-projects') },
      ],
    },
    {
      label: 'Düzen',
      items: [
        { label: 'Yeni Dosya Ekle', icon: 'fa-solid fa-file-circle-plus', onClick: addFile },
        { label: 'Aktif Dosyayı Sil', icon: 'fa-solid fa-trash', disabled: codeFiles.length <= 1, onClick: () => active && removeFile(active.filename) },
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

  if (loading) {
    return <Window icon={<i className="fa-solid fa-hourglass-half" />} title="Yükleniyor…"><p>Proje yükleniyor…</p></Window>;
  }

  return (
    <Window
      icon={<i className="fa-solid fa-screwdriver-wrench" />}
      title={`${isEdit ? 'Düzenle' : 'Yeni Proje'}: ${title} — Localde Çalışıyordu`}
      menu={menu}
      statusLeft={visibility === 'public' ? 'Public' : 'Private'}
      statusRight={saving ? 'Kaydediliyor…' : 'Hazır'}
    >
      {showHelp && (
        <InfoDialog title="Editör Hakkında" onClose={() => setShowHelp(false)}>
          <p>Sol panelden dosya ekleyip düzenleyebilir, kütüphane ekleyebilir, görünürlüğü seçebilirsin. Orta panel kod editörü, sağ panel canlı önizlemedir. Değişiklikler yaklaşık 400ms sonra önizlemeye otomatik yansır.</p>
        </InfoDialog>
      )}
      {error && <div className="error-box">{error}</div>}
      {notice && <div className="hint" style={{ marginBottom: 10 }}><i className="fa-solid fa-circle-check icon-inline" style={{ color: 'var(--success)' }} />{notice}</div>}

      <div className="toolbar">
        <input className="input98" style={{ width: 220 }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Proje başlığı" />
        <input className="input98" style={{ flex: 1, minWidth: 160 }} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Kısa açıklama" />
        <Button98 variant="primary" onClick={save} disabled={saving}><i className="fa-solid fa-floppy-disk icon-inline" />Kaydet</Button98>
        {isEdit && parentId && (
          <Button98 onClick={() => navigate(`/projects/${id}/pulls/new`)}>
            <i className="fa-solid fa-code-pull-request icon-inline" />Üst Projeye PR Gönder
          </Button98>
        )}
        {isEdit && (
          <Button98 variant="danger" onClick={remove}><i className="fa-solid fa-trash icon-inline" />Sil</Button98>
        )}
      </div>

      <div className="editor-layout">
        <div className="editor-filetree">
          <div className="section-title">GÖRÜNÜRLÜK</div>
          <div className="visibility-toggle">
            <div
              className={'visibility-btn' + (visibility === 'public' ? ' active public' : '')}
              onClick={() => setVisibility('public')}
            >
              <i className="fa-solid fa-earth-americas" /> Public
            </div>
            <div
              className={'visibility-btn' + (visibility === 'private' ? ' active private' : '')}
              onClick={() => setVisibility('private')}
            >
              <i className="fa-solid fa-lock" /> Private
            </div>
          </div>

          <div className="section-title" style={{ marginTop: 10 }}>DOSYALAR</div>
          {codeFiles.map((f, i) => (
            <div key={f.filename} className={'filetree-item' + (active === f ? ' active' : '')} onClick={() => setActiveIdx(i)}>
              <span><i className={fileIcon(f.type) + ' icon-inline'} />{f.filename}</span>
              {codeFiles.length > 1 && (
                <i className="fa-solid fa-xmark" onClick={(e) => { e.stopPropagation(); removeFile(f.filename); }} />
              )}
            </div>
          ))}
          <Button98 onClick={addFile}><i className="fa-solid fa-plus icon-inline" />Dosya</Button98>
          <input ref={fileInputRef} type="file" multiple accept=".html,.htm,.css,.js" style={{ display: 'none' }} onChange={handleFilesChosen} />
          <Button98 onClick={handleUploadClick}><i className="fa-solid fa-upload icon-inline" />Bilgisayardan Yükle</Button98>

          <div className="section-title" style={{ marginTop: 16 }}>KÜTÜPHANELER</div>
          {libFiles.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              {libFiles.map((l) => (
                <div key={l.content} className="filetree-item">
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}><i className="fa-solid fa-link icon-inline" />{l.content.split('/').pop()}</span>
                  <i className="fa-solid fa-xmark" onClick={() => removeLib(l.content)} />
                </div>
              ))}
            </div>
          )}
          <div className="lib-grid">
            {POPULAR_LIBS.map((lib) => {
              const added = libFiles.some((f) => f.content === lib.url);
              return (
                <div
                  key={lib.url}
                  className={'lib-btn' + (added ? ' added' : '')}
                  onClick={() => !added && addLibByUrl(lib.url)}
                  title={added ? `${lib.name} zaten eklendi` : `${lib.name} ekle`}
                >
                  <i className={lib.icon} />
                  <span>{lib.name}</span>
                </div>
              );
            })}
          </div>
          <div className="custom-lib-row">
            <input className="input98" placeholder="Özel CDN linki (https://…)" value={libUrl} onChange={(e) => setLibUrl(e.target.value)} />
            <Button98 onClick={addLib}><i className="fa-solid fa-plus icon-inline" />Özel Linki Ekle</Button98>
          </div>
        </div>

        <div className="editor-pane">
          <div className="section-title">{active?.filename || 'Dosya seçilmedi'}</div>
          {active && (
            <CodeEditorPane type={active.type} value={active.content} onChange={updateActiveContent} />
          )}
        </div>

        <div className="preview-pane">
          <div className="section-title">CANLI ÖNİZLEME</div>
          <PreviewFrame files={previewFiles} refreshKey={previewKey} />
        </div>
      </div>
    </Window>
  );
}
