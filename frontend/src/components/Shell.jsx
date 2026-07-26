import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const APPS = [
  { path: '/explore', label: 'Keşfet', icon: '🌐' },
  { path: '/projects/new', label: 'Yeni Proje', icon: '📄' },
  { path: '/my-projects', label: 'Projelerim', icon: '🗂️' },
];

function useClock() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000 * 30);
    return () => clearInterval(t);
  }, []);
  return time.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

export default function Shell({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const clock = useClock();

  function go(path) {
    setMenuOpen(false);
    navigate(path);
  }

  return (
    <div className="desktop" onClick={() => menuOpen && setMenuOpen(false)}>
      <div className="desktop-content">{children}</div>

      {menuOpen && (
        <div className="start-menu bevel-raised" onClick={(e) => e.stopPropagation()}>
          <div className="start-menu-rail">LOCALDE ÇALIŞIYORDU</div>
          <div className="start-menu-items">
            <div className="start-menu-item" onClick={() => go('/explore')}>🌐 Keşfet</div>
            <div className="start-menu-item" onClick={() => go('/my-projects')}>🗂️ Projelerim</div>
            <div className="start-menu-item" onClick={() => go('/projects/new')}>📄 Yeni Proje Oluştur</div>
            <div className="start-menu-sep" />
            <div className="start-menu-item" onClick={() => go('/explore')}>👤 {user?.username}</div>
            <div className="start-menu-sep" />
            <div className="start-menu-item" onClick={() => { setMenuOpen(false); logout(); navigate('/login'); }}>🔒 Oturumu Kapat</div>
          </div>
        </div>
      )}

      <div className="taskbar">
        <div
          className={'start-btn' + (menuOpen ? ' open' : '')}
          onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
        >
          ▦ Başlat
        </div>
        <div className="taskbar-apps">
          {APPS.map((a) => (
            <div
              key={a.path}
              className={'taskbar-app' + (location.pathname === a.path ? ' active' : '')}
              onClick={() => go(a.path)}
            >
              {a.icon} {a.label}
            </div>
          ))}
        </div>
        <div className="taskbar-clock">🕒 {clock}</div>
      </div>
    </div>
  );
}
