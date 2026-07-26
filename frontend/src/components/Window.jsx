export default function Window({ icon = '🗔', title, menu, statusLeft, statusRight, children, width }) {
  return (
    <div className="win98-window bevel-raised" style={width ? { width } : undefined}>
      <div className="win98-titlebar">
        <div className="win98-titlebar-text">
          <span className="win98-titlebar-icon">{icon}</span>
          <span>{title}</span>
        </div>
        <div className="win98-titlebar-controls">
          <div className="win98-tbtn bevel-raised">_</div>
          <div className="win98-tbtn bevel-raised">□</div>
          <div className="win98-tbtn bevel-raised">×</div>
        </div>
      </div>
      {menu && (
        <div className="win98-menubar">
          {menu.map((m) => <span key={m}>{m}</span>)}
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
