import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

function otherUserId(row, meId) {
  return row.sender_id === meId ? row.recipient_id : row.sender_id;
}

// Konuşma listesi: her karşı taraf için en son mesaj + okunmamış sayısı
router.get('/conversations', requireAuth, (req, res) => {
  const meId = req.user.id;
  const rows = db.prepare(
    'SELECT * FROM messages WHERE sender_id = ? OR recipient_id = ? ORDER BY created_at DESC'
  ).all(meId, meId);

  const map = new Map();
  for (const m of rows) {
    const otherId = otherUserId(m, meId);
    if (!map.has(otherId)) {
      map.set(otherId, { otherId, lastMessage: m, unread: 0 });
    }
    if (m.recipient_id === meId && !m.read_at) {
      map.get(otherId).unread += 1;
    }
  }

  const conversations = Array.from(map.values()).map((c) => {
    const u = db.prepare('SELECT id, username FROM users WHERE id = ?').get(c.otherId);
    return { user: u, lastMessage: c.lastMessage, unread: c.unread };
  });
  res.json({ conversations });
});

// Bir kullanıcıyla olan tüm mesaj geçmişi (açıldığında okunmuş sayılır)
router.get('/with/:username', requireAuth, (req, res) => {
  const other = db.prepare('SELECT * FROM users WHERE username = ?').get(req.params.username);
  if (!other) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
  const meId = req.user.id;

  const messages = db.prepare(`
    SELECT * FROM messages
    WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)
    ORDER BY created_at ASC
  `).all(meId, other.id, other.id, meId);

  db.prepare("UPDATE messages SET read_at = datetime('now') WHERE sender_id = ? AND recipient_id = ? AND read_at IS NULL")
    .run(other.id, meId);

  res.json({ user: { id: other.id, username: other.username }, messages });
});

router.post('/with/:username', requireAuth, (req, res) => {
  const other = db.prepare('SELECT * FROM users WHERE username = ?').get(req.params.username);
  if (!other) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
  if (other.id === req.user.id) return res.status(400).json({ error: 'Kendine mesaj gönderemezsin.' });
  const { body } = req.body || {};
  if (!body || !body.trim()) return res.status(400).json({ error: 'Mesaj boş olamaz.' });

  const info = db.prepare('INSERT INTO messages (sender_id, recipient_id, body) VALUES (?, ?, ?)')
    .run(req.user.id, other.id, body.trim());
  const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ message });
});

export default router;
