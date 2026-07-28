import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { apiErrorMessage } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Window from '../components/Window.jsx';
import Button98 from '../components/Button98.jsx';
import Avatar from '../components/Avatar.jsx';
import InfoDialog from '../components/InfoDialog.jsx';

export default function Profile() {
  const { username } = useParams();
  const { user: me } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [bioDraft, setBioDraft] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  function load() {
    api.get(`/users/${username}`)
      .then((res) => { setData(res.data); setBioDraft(res.data.user.bio || ''); })
      .catch((e) => setError(apiErrorMessage(e, 'Kullanıcı bulunamadı.')));
  }

  useEffect(() => { setData(null); setError(''); load(); }, [username]);

  if (error) return <Window icon={<i className="fa-solid fa-triangle-exclamation" />} title="Hata"><div className="error-box">{error}</div></Window>;
  if (!data) return <Window icon={<i className="fa-solid fa-hourglass-half" />} title="Yükleniyor…"><p>Profil yükleniyor…</p></Window>;

  const { user, followers, following, isOwn, isFollowing, projects } = data;

  async function toggleFollow() {
    setBusy(true);
    try {
      const res = isFollowing
        ? await api.delete(`/users/${username}/follow`)
        : await api.post(`/users/${username}/follow`);
      setData((d) => ({ ...d, followers: res.data.followers, isFollowing: res.data.isFollowing }));
    } catch (e) {
      setError(apiErrorMessage(e, 'İşlem başarısız.'));
    } finally {
      setBusy(false);
    }
  }

  async function saveBio() {
    try {
      const res = await api.put('/users/me/bio', { bio: bioDraft });
      setData((d) => ({ ...d, user: { ...d.user, bio: res.data.user.bio } }));
      setEditingBio(false);
    } catch (e) {
      setError(apiErrorMessage(e, 'Bio güncellenemedi.'));
    }
  }

  const menu = [
    { label: 'Dosya', items: [{ label: 'Keşfete Dön', icon: 'fa-solid fa-arrow-left', onClick: () => navigate('/explore') }] },
    { label: 'Görünüm', items: [{ label: 'Yenile', icon: 'fa-solid fa-rotate', onClick: load }] },
    { label: 'Yardım', items: [{ label: 'Hakkında', icon: 'fa-solid fa-circle-info', onClick: () => setShowHelp(true) }] },
  ];

  return (
    <Window
      icon={<i className="fa-solid fa-id-card" />}
      title={`Profil: @${user.username} — Localde Çalışıyordu`}
      menu={menu}
      statusLeft={`${projects.length} proje`}
      statusRight={isOwn ? 'Bu senin profilin' : ''}
    >
      {showHelp && (
        <InfoDialog title="Profil Hakkında" onClose={() => setShowHelp(false)}>
          <p>Kullanıcıları takip edebilir, onlara mesaj gönderebilir ve paylaştıkları herkese açık projeleri görebilirsin. Takip ettiğin kişilerin yeni projeleri Keşfet ekranındaki "Takip Ettiklerim" sekmesinde görünür.</p>
        </InfoDialog>
      )}
      {error && <div className="error-box">{error}</div>}

      <div className="profile-header">
        <Avatar username={user.username} size={64} />
        <div className="profile-meta">
          <div className="profile-username">@{user.username}</div>
          <div className="profile-stats">
            <span><strong>{followers}</strong> takipçi</span>
            <span><strong>{following}</strong> takip edilen</span>
            <span><strong>{projects.length}</strong> proje</span>
          </div>

          {editingBio ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <textarea
                className="input98"
                rows={2}
                style={{ width: 320 }}
                value={bioDraft}
                onChange={(e) => setBioDraft(e.target.value)}
                maxLength={300}
              />
              <div className="btn98-row">
                <Button98 variant="primary" onClick={saveBio}><i className="fa-solid fa-check icon-inline" />Kaydet</Button98>
                <Button98 onClick={() => { setEditingBio(false); setBioDraft(user.bio || ''); }}>İptal</Button98>
              </div>
            </div>
          ) : (
            <p className="profile-bio">{user.bio || (isOwn ? 'Henüz bir bio eklemedin.' : 'Bu kullanıcı henüz bir bio eklemedi.')}</p>
          )}

          <div className="profile-actions">
            {isOwn ? (
              !editingBio && <Button98 onClick={() => setEditingBio(true)}><i className="fa-solid fa-pen icon-inline" />Bio'yu Düzenle</Button98>
            ) : (
              <>
                <Button98 variant="primary" onClick={toggleFollow} disabled={busy}>
                  <i className={(isFollowing ? 'fa-solid fa-user-check' : 'fa-solid fa-user-plus') + ' icon-inline'} />
                  {isFollowing ? 'Takip Ediliyor' : 'Takip Et'}
                </Button98>
                <Button98 onClick={() => navigate(`/messages/${user.username}`)}>
                  <i className="fa-solid fa-envelope icon-inline" />Mesaj Gönder
                </Button98>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="section-title">{isOwn ? 'TÜM PROJELERİM' : 'HERKESE AÇIK PROJELER'}</div>
      {projects.length === 0 ? (
        <div className="empty-state">
          <div className="glyph"><i className="fa-regular fa-folder-open" /></div>
          <div>{isOwn ? 'Henüz projen yok.' : 'Bu kullanıcının herkese açık projesi yok.'}</div>
        </div>
      ) : (
        <div className="icon-grid">
          {projects.map((p) => (
            <div key={p.id} className="icon-item" onDoubleClick={() => navigate(`/projects/${p.id}`)} onClick={(e) => e.detail === 2 && navigate(`/projects/${p.id}`)}>
              <div className="glyph"><i className={p.visibility === 'private' ? 'fa-solid fa-lock' : 'fa-solid fa-folder'} /></div>
              <div className="name">{p.title}</div>
              <div className="meta"><i className="fa-solid fa-star" style={{ color: 'var(--warning)' }} /> {p.stars}</div>
            </div>
          ))}
        </div>
      )}
    </Window>
  );
}
