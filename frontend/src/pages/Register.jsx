import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Window from '../components/Window.jsx';
import Button98 from '../components/Button98.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Şifreler eşleşmiyor.'); return; }
    setLoading(true);
    const res = await register(username, password);
    setLoading(false);
    if (res.ok) navigate('/explore');
    else setError(res.error);
  }

  return (
    <div className="desktop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Window icon={<i className="fa-solid fa-user-plus" />} title="Hesap Oluştur — Localde Çalışıyordu" width="360px" statusLeft="Hazır">
        <div className="brand-title" style={{ marginBottom: 14 }}><i className="fa-solid fa-window-restore icon-inline" />Localde Çalışıyordu</div>
        {error && <div className="error-box">{error}</div>}
        <form onSubmit={submit}>
          <div className="field">
            <label>Kullanıcı adı (3-20 karakter)</label>
            <input className="input98" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
          </div>
          <div className="field">
            <label>Şifre (en az 6 karakter)</label>
            <input className="input98" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="field">
            <label>Şifre (tekrar)</label>
            <input className="input98" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <div className="btn98-row" style={{ marginTop: 6 }}>
            <Button98 variant="primary" type="submit" disabled={loading}>{loading ? 'Oluşturuluyor…' : 'Hesap Oluştur'}</Button98>
            <Link to="/login"><Button98 type="button">Giriş Yap</Button98></Link>
          </div>
        </form>
      </Window>
    </div>
  );
}
