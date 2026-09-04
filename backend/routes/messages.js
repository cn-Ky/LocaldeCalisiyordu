import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

function otherUserId(row, meId) {
  return row.sender_id === meId ? row.recipient_id : row.sender_id;
}

// Konuşma listesi: her karşı taraf için en son mesaj + okunmamış sayısı
router.get('/conversations', requireAuth, async (req, res, next) => {
  try {
  const meId = req.user.id;
  const rows = await db.prepare(
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

  const conversations = await Promise.all(Array.from(map.values()).map(async (c) => {
    const u = await db.prepare('SELECT id, username FROM users WHERE id = ?').get(c.otherId);
    return { user: u, lastMessage: c.lastMessage, unread: c.unread };
  }));
  return res.json({ conversations });
  } catch (error) { return next(error); }
});

// Bir kullanıcıyla olan tüm mesaj geçmişi (açıldığında okunmuş sayılır)
router.get('/with/:username', requireAuth, async (req, res, next) => {
  try {
  const other = await db.prepare('SELECT * FROM users WHERE username = ?').get(req.params.username);
  if (!other) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
  const meId = req.user.id;

  const messages = await db.prepare(`
    SELECT * FROM messages
    WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)
    ORDER BY created_at ASC
  `).all(meId, other.id, other.id, meId);

  await db.prepare('UPDATE messages SET read_at = CURRENT_TIMESTAMP WHERE sender_id = ? AND recipient_id = ? AND read_at IS NULL')
    .run(other.id, meId);

  return res.json({ user: { id: other.id, username: other.username }, messages });
  } catch (error) { return next(error); }
});

router.post('/with/:username', requireAuth, async (req, res, next) => {
  try {
  const other = await db.prepare('SELECT * FROM users WHERE username = ?').get(req.params.username);
  if (!other) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
  if (other.id === req.user.id) return res.status(400).json({ error: 'Kendine mesaj gönderemezsin.' });
  const { body } = req.body || {};
  if (!body || !body.trim()) return res.status(400).json({ error: 'Mesaj boş olamaz.' });

  const info = await db.prepare('INSERT INTO messages (sender_id, recipient_id, body) VALUES (?, ?, ?)')
    .run(req.user.id, other.id, body.trim());
  const message = await db.prepare('SELECT * FROM messages WHERE id = ?').get(info.lastInsertRowid);
  return res.status(201).json({ message });
  } catch (error) { return next(error); }
});

export default router;
