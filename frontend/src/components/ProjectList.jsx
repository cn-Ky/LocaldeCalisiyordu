import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api.js';
import Window from './Window.jsx';
import Button98 from './Button98.jsx';

export default function ProjectList({ mode }) {
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    const params = mode === 'mine' ? { mine: 'true' } : (search ? { search } : {});
    api.get('/projects', { params })
      .then((res) => setProjects(res.data.projects))
      .finally(() => setLoading(false));
  }, [mode, search]);

  const title = mode === 'mine' ? 'Projelerim' : 'Klasör: Genel Projeler';

  return (
    <Window
      icon={mode === 'mine' ? '🗂️' : '🌐'}
      title={`${title} — Localde Çalışıyordu`}
      menu={['Dosya', 'Düzen', 'Görünüm', 'Yardım']}
      statusLeft={`${projects.length} öğe`}
      statusRight={loading ? 'Yükleniyor…' : 'Hazır'}
    >
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
        <Button98 variant="primary" onClick={() => navigate('/projects/new')}>📄 Yeni Proje</Button98>
      </div>

      {!loading && projects.length === 0 && (
        <div className="empty-state">
          <div className="glyph">🗔</div>
          <div>{mode === 'mine' ? 'Henüz projen yok.' : 'Hiç proje bulunamadı.'}</div>
        </div>
      )}

      <div className="icon-grid">
        {projects.map((p) => (
          <div key={p.id} className="icon-item" onDoubleClick={() => navigate(`/projects/${p.id}`)} onClick={(e) => e.detail === 2 && navigate(`/projects/${p.id}`)}>
            <div className="glyph">{p.visibility === 'private' ? '🔒' : '📁'}</div>
            <div className="name">{p.title}</div>
            <div className="meta">@{p.owner?.username} · ⭐{p.stars}</div>
          </div>
        ))}
      </div>
      <p className="hint" style={{ marginTop: 12 }}>Bir projeyi açmak için üzerine çift tıkla.</p>
    </Window>
  );
}
