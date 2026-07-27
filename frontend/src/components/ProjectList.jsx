import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api.js';
import Window from './Window.jsx';
import Button98 from './Button98.jsx';
import InfoDialog from './InfoDialog.jsx';

export default function ProjectList({ mode }) {
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const navigate = useNavigate();

  function load() {
    setLoading(true);
    const params = mode === 'mine' ? { mine: 'true' } : (search ? { search } : {});
    api.get('/projects', { params })
      .then((res) => setProjects(res.data.projects))
      .finally(() => setLoading(false));
  }

  useEffect(load, [mode, search]);

  const title = mode === 'mine' ? 'Projelerim' : 'Klasör: Genel Projeler';

  const menu = [
    {
      label: 'Dosya',
      items: [
        { label: 'Yeni Proje', icon: 'fa-solid fa-file-circle-plus', onClick: () => navigate('/projects/new') },
      ],
    },
    {
      label: 'Görünüm',
      items: [
        { label: 'Yenile', icon: 'fa-solid fa-rotate', onClick: load },
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
      icon={<i className={mode === 'mine' ? 'fa-solid fa-folder-open' : 'fa-solid fa-earth-americas'} />}
      title={`${title} — Localde Çalışıyordu`}
      menu={menu}
      statusLeft={`${projects.length} öğe`}
      statusRight={loading ? 'Yükleniyor…' : 'Hazır'}
    >
      {showHelp && (
        <InfoDialog title="Hakkında" onClose={() => setShowHelp(false)}>
          <p>{mode === 'mine' ? 'Burada yalnızca kendi projelerin listelenir.' : 'Herkese açık tüm projeleri burada keşfedebilirsin.'} Bir projeyi açmak için üzerine çift tıkla.</p>
        </InfoDialog>
      )}
      <div className="toolbar">
        {mode !== 'mine' && (
          <input
            className="input98"
            placeholder="Projelerde ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 240 }}
          />
        )}
        <div className="spacer" />
        <Button98 variant="primary" onClick={() => navigate('/projects/new')}>
          <i className="fa-solid fa-file-circle-plus icon-inline" />Yeni Proje
        </Button98>
      </div>

      {!loading && projects.length === 0 && (
        <div className="empty-state">
          <div className="glyph"><i className="fa-regular fa-folder-open" /></div>
          <div>{mode === 'mine' ? 'Henüz projen yok.' : 'Hiç proje bulunamadı.'}</div>
        </div>
      )}

      <div className="icon-grid">
        {projects.map((p) => (
          <div key={p.id} className="icon-item" onDoubleClick={() => navigate(`/projects/${p.id}`)} onClick={(e) => e.detail === 2 && navigate(`/projects/${p.id}`)}>
            <div className="glyph"><i className={p.visibility === 'private' ? 'fa-solid fa-lock' : 'fa-solid fa-folder'} /></div>
            <div className="name">{p.title}</div>
            <div className="meta">@{p.owner?.username} · <i className="fa-solid fa-star" style={{ color: 'var(--warning)' }} /> {p.stars}</div>
          </div>
        ))}
      </div>
      <p className="hint" style={{ marginTop: 12 }}>Bir projeyi açmak için üzerine çift tıkla.</p>
    </Window>
  );
}
