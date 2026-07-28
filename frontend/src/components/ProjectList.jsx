import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api.js';
import Window from './Window.jsx';
import Button98 from './Button98.jsx';
import InfoDialog from './InfoDialog.jsx';

export default function ProjectList({ mode, tabs }) {
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const navigate = useNavigate();

  function load() {
    setLoading(true);
    let params = {};
    if (mode === 'mine') params = { mine: 'true' };
    else if (mode === 'following') params = { feed: 'following' };
    else if (search) params = { search };
    api.get('/projects', { params })
      .then((res) => setProjects(res.data.projects))
      .finally(() => setLoading(false));
  }

  useEffect(load, [mode, search]);

  const titleMap = { mine: 'Projelerim', following: 'Takip Ettiklerim', public: 'Klasör: Genel Projeler' };
  const title = titleMap[mode] || titleMap.public;

  const menu = [
    { label: 'Dosya', items: [{ label: 'Yeni Proje', icon: 'fa-solid fa-file-circle-plus', onClick: () => navigate('/projects/new') }] },
    { label: 'Görünüm', items: [{ label: 'Yenile', icon: 'fa-solid fa-rotate', onClick: load }] },
    { label: 'Yardım', items: [{ label: 'Hakkında', icon: 'fa-solid fa-circle-info', onClick: () => setShowHelp(true) }] },
  ];

  return (
    <Window
      icon={<i className={mode === 'mine' ? 'fa-solid fa-folder-open' : mode === 'following' ? 'fa-solid fa-user-group' : 'fa-solid fa-earth-americas'} />}
      title={`${title} — Localde Çalışıyordu`}
      menu={menu}
      statusLeft={`${projects.length} öğe`}
      statusRight={loading ? 'Yükleniyor…' : 'Hazır'}
    >
      {showHelp && (
        <InfoDialog title="Hakkında" onClose={() => setShowHelp(false)}>
          <p>
            {mode === 'mine' && 'Burada yalnızca kendi projelerin listelenir.'}
            {mode === 'following' && 'Takip ettiğin kullanıcıların paylaştığı herkese açık projeler burada, en yeniden eskiye sıralanır.'}
            {mode === 'public' && 'Herkese açık tüm projeleri burada keşfedebilirsin.'}
            {' '}Bir projeyi açmak için üzerine çift tıkla.
          </p>
        </InfoDialog>
      )}

      {tabs}

      <div className="toolbar">
        {mode === 'public' && (
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
          <div>
            {mode === 'mine' && 'Henüz projen yok.'}
            {mode === 'following' && 'Takip ettiğin kimse henüz herkese açık proje paylaşmamış. Keşfet\'ten yeni insanlar bulup takip edebilirsin.'}
            {mode === 'public' && 'Hiç proje bulunamadı.'}
          </div>
        </div>
      )}

      <div className="icon-grid">
        {projects.map((p) => (
          <div key={p.id} className="icon-item" onDoubleClick={() => navigate(`/projects/${p.id}`)} onClick={(e) => e.detail === 2 && navigate(`/projects/${p.id}`)}>
            <div className="glyph"><i className={p.visibility === 'private' ? 'fa-solid fa-lock' : 'fa-solid fa-folder'} /></div>
            <div className="name">{p.title}</div>
            <div className="meta">
              <span className="user-link" onClick={(e) => { e.stopPropagation(); navigate(`/u/${p.owner?.username}`); }}>@{p.owner?.username}</span>
              {' · '}<i className="fa-solid fa-star" style={{ color: 'var(--warning)' }} /> {p.stars}
            </div>
          </div>
        ))}
      </div>
      <p className="hint" style={{ marginTop: 12 }}>Bir projeyi açmak için üzerine çift tıkla.</p>
    </Window>
  );
}
