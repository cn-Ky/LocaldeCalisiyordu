import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api.js';
import Window from '../components/Window.jsx';
import Button98 from '../components/Button98.jsx';

const STATUS_LABEL = { open: 'Açık', merged: 'Birleştirildi', closed: 'Kapatıldı' };

export default function PullRequestList() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pulls, setPulls] = useState([]);
  const [project, setProject] = useState(null);

  useEffect(() => {
    api.get(`/projects/${id}`).then((res) => setProject(res.data.project));
    api.get(`/pulls/project/${id}`).then((res) => setPulls(res.data.pulls));
  }, [id]);

  return (
    <Window
      icon="🔀"
      title={`Pull Request'ler: ${project?.title || ''}`}
      menu={['Dosya', 'Düzen', 'Görünüm']}
      statusLeft={`${pulls.length} kayıt`}
    >
      <div className="toolbar">
        <Button98 onClick={() => navigate(`/projects/${id}`)}>← Projeye Dön</Button98>
      </div>
      {pulls.length === 0 ? (
        <div className="empty-state">
          <div className="glyph">🔀</div>
          <div>Henüz pull request yok.</div>
        </div>
      ) : (
        <table className="list98">
          <thead>
            <tr><th>Başlık</th><th>Yazar</th><th>Durum</th><th>Tarih</th></tr>
          </thead>
          <tbody>
            {pulls.map((p) => (
              <tr key={p.id} onClick={() => navigate(`/pulls/${p.id}`)}>
                <td>{p.title}</td>
                <td>@{p.author?.username}</td>
                <td><span className={`badge ${p.status}`}>{STATUS_LABEL[p.status]}</span></td>
                <td>{new Date(p.created_at).toLocaleDateString('tr-TR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Window>
  );
}
