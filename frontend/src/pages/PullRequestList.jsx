import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api.js';
import Window from '../components/Window.jsx';
import Button98 from '../components/Button98.jsx';
import InfoDialog from '../components/InfoDialog.jsx';

const STATUS_LABEL = { open: 'Açık', merged: 'Birleştirildi', closed: 'Kapatıldı' };

export default function PullRequestList() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pulls, setPulls] = useState([]);
  const [project, setProject] = useState(null);
  const [showHelp, setShowHelp] = useState(false);

  function load() {
    api.get(`/projects/${id}`).then((res) => setProject(res.data.project));
    api.get(`/pulls/project/${id}`).then((res) => setPulls(res.data.pulls));
  }

  useEffect(load, [id]);

  const menu = [
    { label: 'Dosya', items: [{ label: 'Projeye Dön', icon: 'fa-solid fa-arrow-left', onClick: () => navigate(`/projects/${id}`) }] },
    { label: 'Görünüm', items: [{ label: 'Yenile', icon: 'fa-solid fa-rotate', onClick: load }] },
    { label: 'Yardım', items: [{ label: 'Hakkında', icon: 'fa-solid fa-circle-info', onClick: () => setShowHelp(true) }] },
  ];

  return (
    <Window
      icon={<i className="fa-solid fa-code-pull-request" />}
      title={`Pull Request'ler: ${project?.title || ''}`}
      menu={menu}
      statusLeft={`${pulls.length} kayıt`}
    >
      {showHelp && (
        <InfoDialog title="Pull Request'ler Hakkında" onClose={() => setShowHelp(false)}>
          <p>Bu listede projeye gönderilen tüm değişiklik önerileri görünür. Bir kayda tıklayarak diff'i inceleyebilir, yorum yazabilir, birleştirebilir ya da kapatabilirsin.</p>
        </InfoDialog>
      )}
      <div className="toolbar">
        <Button98 onClick={() => navigate(`/projects/${id}`)}><i className="fa-solid fa-arrow-left icon-inline" />Projeye Dön</Button98>
      </div>
      {pulls.length === 0 ? (
        <div className="empty-state">
          <div className="glyph"><i className="fa-solid fa-code-pull-request" /></div>
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
