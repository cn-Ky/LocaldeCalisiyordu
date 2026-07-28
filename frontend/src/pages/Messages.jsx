import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { apiErrorMessage } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Window from '../components/Window.jsx';
import Button98 from '../components/Button98.jsx';
import Avatar from '../components/Avatar.jsx';
import InfoDialog from '../components/InfoDialog.jsx';

export default function Messages() {
  const { username } = useParams();
  const { user: me } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [thread, setThread] = useState(null);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const bottomRef = useRef(null);

  function loadConversations() {
    api.get('/messages/conversations').then((res) => setConversations(res.data.conversations)).catch(() => {});
  }

  function loadThread() {
    if (!username) { setThread(null); return; }
    api.get(`/messages/with/${username}`)
      .then((res) => { setThread(res.data); loadConversations(); })
      .catch((e) => setError(apiErrorMessage(e, 'Konuşma yüklenemedi.')));
  }

  useEffect(loadConversations, []);
  useEffect(() => { setError(''); loadThread(); }, [username]);

  // Açık konuşmayı hafifçe periyodik yenile (basit "canlı" his için)
  useEffect(() => {
    if (!username) return;
    const t = setInterval(loadThread, 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'nearest' });
  }, [thread]);

  async function send() {
    if (!text.trim() || !username) return;
    const body = text;
    setText('');
    try {
      await api.post(`/messages/with/${username}`, { body });
      loadThread();
    } catch (e) {
      setError(apiErrorMessage(e, 'Mesaj gönderilemedi.'));
    }
  }

  const menu = [
    { label: 'Görünüm', items: [{ label: 'Yenile', icon: 'fa-solid fa-rotate', onClick: () => { loadConversations(); loadThread(); } }] },
    { label: 'Yardım', items: [{ label: 'Hakkında', icon: 'fa-solid fa-circle-info', onClick: () => setShowHelp(true) }] },
  ];

  return (
    <Window
      icon={<i className="fa-solid fa-envelope" />}
      title="Mesajlar — Localde Çalışıyordu"
      menu={menu}
      statusLeft={`${conversations.length} konuşma`}
    >
      {showHelp && (
        <InfoDialog title="Mesajlar Hakkında" onClose={() => setShowHelp(false)}>
          <p>Takip ettiğin ya da etmediğin herkese doğrudan mesaj gönderebilirsin. Bir profile gidip "Mesaj Gönder" diyerek de yeni bir konuşma başlatabilirsin.</p>
        </InfoDialog>
      )}
      {error && <div className="error-box">{error}</div>}

      <div className="messages-layout">
        <div className="conv-list bevel-sunken" style={{ padding: 4 }}>
          {conversations.length === 0 && <p className="hint" style={{ padding: 8 }}>Henüz konuşman yok.</p>}
          {conversations.map((c) => (
            <div
              key={c.user.id}
              className={'conv-item' + (c.user.username === username ? ' active' : '')}
              onClick={() => navigate(`/messages/${c.user.username}`)}
            >
              <Avatar username={c.user.username} size={28} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="conv-name">@{c.user.username}</div>
                <div className="conv-preview">{c.lastMessage.body}</div>
              </div>
              {c.unread > 0 && <span className="unread-dot" title={`${c.unread} okunmamış`} />}
            </div>
          ))}
        </div>

        <div className="thread-pane bevel-sunken" style={{ padding: 8 }}>
          {!username && (
            <div className="empty-state">
              <div className="glyph"><i className="fa-regular fa-comments" /></div>
              <div>Soldan bir konuşma seç ya da bir profile gidip mesaj gönder.</div>
            </div>
          )}
          {username && thread && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Avatar username={thread.user.username} size={26} />
                <span
                  className="user-link"
                  style={{ fontWeight: 700 }}
                  onClick={() => navigate(`/u/${thread.user.username}`)}
                >
                  @{thread.user.username}
                </span>
              </div>
              <div className="thread-messages">
                {thread.messages.length === 0 && <p className="hint">Henüz mesaj yok, ilk mesajı sen gönder.</p>}
                {thread.messages.map((m) => (
                  <div key={m.id} className={'msg-bubble' + (m.sender_id === me.id ? ' mine' : ' theirs')}>
                    {m.body}
                    <span className="msg-time">{new Date(m.created_at).toLocaleString('tr-TR')}</span>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <div className="thread-compose">
                <input
                  className="input98"
                  style={{ flex: 1 }}
                  placeholder="Bir mesaj yaz…"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
                />
                <Button98 variant="primary" onClick={send}><i className="fa-solid fa-paper-plane icon-inline" />Gönder</Button98>
              </div>
            </>
          )}
        </div>
      </div>
    </Window>
  );
}
