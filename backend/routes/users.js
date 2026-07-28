import { Router } from 'express';
import db from '../db.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = Router();

function publicUser(u) {
  return { id: u.id, username: u.username, bio: u.bio || '', created_at: u.created_at };
}

function counts(userId) {
  const followers = db.prepare('SELECT COUNT(*) AS c FROM follows WHERE followee_id = ?').get(userId).c;
  const following = db.prepare('SELECT COUNT(*) AS c FROM follows WHERE follower_id = ?').get(userId).c;
  return { followers, following };
}

router.get('/:username', optionalAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(req.params.username);
  if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
  const uid = req.user ? req.user.id : null;
  const isOwn = uid === user.id;
  const isFollowing = uid
    ? !!db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND followee_id = ?').get(uid, user.id)
    : false;

  const projects = isOwn
    ? db.prepare('SELECT * FROM projects WHERE owner_id = ? ORDER BY updated_at DESC').all(user.id)
    : db.prepare("SELECT * FROM projects WHERE owner_id = ? AND visibility = 'public' ORDER BY updated_at DESC").all(user.id);

  res.json({
    user: publicUser(user),
    ...counts(user.id),
    isOwn,
    isFollowing,
    projects,
  });
});

router.put('/me/bio', requireAuth, (req, res) => {
  const { bio = '' } = req.body || {};
  db.prepare('UPDATE users SET bio = ? WHERE id = ?').run(String(bio).slice(0, 300), req.user.id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: publicUser(user) });
});

router.post('/:username/follow', requireAuth, (req, res) => {
  const target = db.prepare('SELECT * FROM users WHERE username = ?').get(req.params.username);
  if (!target) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
  if (target.id === req.user.id) return res.status(400).json({ error: 'Kendini takip edemezsin.' });
  try {
    db.prepare('INSERT INTO follows (follower_id, followee_id) VALUES (?, ?)').run(req.user.id, target.id);
  } catch {
    // zaten takip ediyor olabilir, sessizce geç
  }
  res.json({ ...counts(target.id), isFollowing: true });
});

router.delete('/:username/follow', requireAuth, (req, res) => {
  const target = db.prepare('SELECT * FROM users WHERE username = ?').get(req.params.username);
  if (!target) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
  db.prepare('DELETE FROM follows WHERE follower_id = ? AND followee_id = ?').run(req.user.id, target.id);
  res.json({ ...counts(target.id), isFollowing: false });
});

router.get('/:username/followers', (req, res) => {
  const target = db.prepare('SELECT * FROM users WHERE username = ?').get(req.params.username);
  if (!target) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
  const rows = db.prepare(`
    SELECT u.id, u.username, u.bio FROM follows f
    JOIN users u ON u.id = f.follower_id
    WHERE f.followee_id = ? ORDER BY f.created_at DESC
  `).all(target.id);
  res.json({ users: rows });
});

router.get('/:username/following', (req, res) => {
  const target = db.prepare('SELECT * FROM users WHERE username = ?').get(req.params.username);
  if (!target) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
  const rows = db.prepare(`
    SELECT u.id, u.username, u.bio FROM follows f
    JOIN users u ON u.id = f.followee_id
    WHERE f.follower_id = ? ORDER BY f.created_at DESC
  `).all(target.id);
  res.json({ users: rows });
});

export default router;
