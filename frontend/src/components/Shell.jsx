import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const APPS = [
  { path: '/explore', label: 'Keşfet', icon: 'fa-solid fa-earth-americas' },
  { path: '/projects/new', label: 'Yeni Proje', icon: 'fa-solid fa-file-circle-plus' },
  { path: '/my-projects', label: 'Projelerim', icon: 'fa-solid fa-folder-open' },
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
            <div className="start-menu-item" onClick={() => go('/explore')}><i className="fa-solid fa-earth-americas icon-inline" />Keşfet</div>
            <div className="start-menu-item" onClick={() => go('/my-projects')}><i className="fa-solid fa-folder-open icon-inline" />Projelerim</div>
            <div className="start-menu-item" onClick={() => go('/projects/new')}><i className="fa-solid fa-file-circle-plus icon-inline" />Yeni Proje Oluştur</div>
            <div className="start-menu-sep" />
            <div className="start-menu-item" onClick={() => go('/explore')}><i className="fa-solid fa-user icon-inline" />{user?.username}</div>
            <div className="start-menu-sep" />
            <div className="start-menu-item" onClick={() => { setMenuOpen(false); logout(); navigate('/login'); }}>
              <i className="fa-solid fa-right-from-bracket icon-inline" />Oturumu Kapat
            </div>
          </div>
        </div>
      )}

      <div className="taskbar">
        <div
          className={'start-btn' + (menuOpen ? ' open' : '')}
          onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
        >
          <i className="fa-solid fa-grip icon-inline" />Başlat
        </div>
        <div className="taskbar-apps">
          {APPS.map((a) => (
            <div
              key={a.path}
              className={'taskbar-app' + (location.pathname === a.path ? ' active' : '')}
              onClick={() => go(a.path)}
            >
              <i className={a.icon + ' icon-inline'} />{a.label}
            </div>
          ))}
        </div>
        <div className="taskbar-clock"><i className="fa-regular fa-clock icon-inline" />{clock}</div>
      </div>
    </div>
  );
}
