import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isElectron, minimizeWindow, toggleMaximizeWindow, closeWindow, onMaximizedChange } from '../lib/electron.js';

export default function Window({ icon, title, menu, statusLeft, statusRight, children, width }) {
  const [openMenu, setOpenMenu] = useState(null);
  const [maximized, setMaximized] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpenMenu(null);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // Electron'da gerçek pencere büyütme/küçültme durumunu simge ile senkron tut.
  useEffect(() => {
    if (!isElectron) return undefined;
    return onMaximizedChange(setMaximized);
  }, []);

  function handleMinimize() {
    if (isElectron) return minimizeWindow();
    navigate(-1);
  }
  function handleMaximize() {
    if (isElectron) return toggleMaximizeWindow();
    setMaximized((m) => !m);
  }
  function handleClose() {
    if (isElectron) return closeWindow();
    navigate('/explore');
  }

  return (
    <div
      className={'win98-window bevel-raised' + (maximized ? ' maximized' : '')}
      style={!maximized && width ? { width, maxWidth: '94vw' } : undefined}
    >
      <div className="win98-titlebar">
        <div className="win98-titlebar-text">
          {icon && <span className="win98-titlebar-icon">{icon}</span>}
          <span>{title}</span>
        </div>
        <div className="win98-titlebar-controls">
          <div className="win98-tbtn bevel-raised" title="Küçült" onClick={handleMinimize}><i className="fa-solid fa-window-minimize" /></div>
          <div className="win98-tbtn bevel-raised" title={maximized ? 'Eski Boyuta Getir' : 'Büyüt'} onClick={handleMaximize}>
            <i className={maximized ? 'fa-regular fa-window-restore' : 'fa-regular fa-square'} />
          </div>
          <div className="win98-tbtn bevel-raised" title="Kapat" onClick={handleClose}><i className="fa-solid fa-xmark" /></div>
        </div>
      </div>
      {menu && menu.length > 0 && (
        <div className="win98-menubar" ref={ref}>
          {menu.map((m) => (
            <div className="menubar-item" key={m.label}>
              <span
                onClick={() => setOpenMenu(openMenu === m.label ? null : m.label)}
                style={openMenu === m.label ? { background: 'var(--accent)', color: 'var(--text-inverse)' } : undefined}
              >
                {m.label}
              </span>
              {openMenu === m.label && (
                <div className="menu-dropdown">
                  {m.items.map((it, i) => it.sep ? (
                    <div className="menu-dropdown-sep" key={`sep-${i}`} />
                  ) : (
                    <div
                      key={it.label}
                      className={'menu-dropdown-item' + (it.disabled ? ' disabled' : '')}
                      onClick={() => { if (it.disabled) return; setOpenMenu(null); it.onClick?.(); }}
                    >
                      {it.icon && <i className={it.icon} />}
                      <span>{it.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="win98-body">{children}</div>
      {(statusLeft || statusRight) && (
        <div className="win98-statusbar">
          <span>{statusLeft}</span>
          <span>{statusRight}</span>
        </div>
      )}
    </div>
  );
}
