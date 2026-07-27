export default function InfoDialog({ title = 'Hakkında', onClose, children }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="dialog98" onClick={(e) => e.stopPropagation()}>
        <div className="win98-window bevel-raised">
          <div className="win98-titlebar">
            <div className="win98-titlebar-text">
              <span className="win98-titlebar-icon"><i className="fa-solid fa-circle-info" /></span>
              <span>{title}</span>
            </div>
            <div className="win98-titlebar-controls">
              <div className="win98-tbtn bevel-raised" onClick={onClose}><i className="fa-solid fa-xmark" /></div>
            </div>
          </div>
          <div className="win98-body">
            {children}
            <div className="btn98-row" style={{ marginTop: 12 }}>
              <button type="button" className="btn98 primary" onClick={onClose}>Tamam</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
