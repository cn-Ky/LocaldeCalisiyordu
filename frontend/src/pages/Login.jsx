import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Window from '../components/Window.jsx';
import Button98 from '../components/Button98.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await login(username, password);
    setLoading(false);
    if (res.ok) navigate('/explore');
    else setError(res.error);
  }

  return (
    <div className="desktop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Window icon={<i className="fa-solid fa-key" />} title="Oturum Aç — Localde Çalışıyordu" width="360px" statusLeft="Hazır">
        <div className="brand-title" style={{ marginBottom: 14 }}><i className="fa-solid fa-window-restore icon-inline" />Localde Çalışıyordu</div>
        {error && <div className="error-box">{error}</div>}
        <form onSubmit={submit}>
          <div className="field">
            <label>Kullanıcı adı</label>
            <input className="input98" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
          </div>
          <div className="field">
            <label>Şifre</label>
            <input className="input98" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="btn98-row" style={{ marginTop: 6 }}>
            <Button98 variant="primary" type="submit" disabled={loading}>{loading ? 'Giriş yapılıyor…' : 'Giriş Yap'}</Button98>
            <Link to="/register"><Button98 type="button">Hesap Oluştur</Button98></Link>
          </div>
        </form>
      </Window>
    </div>
  );
}
