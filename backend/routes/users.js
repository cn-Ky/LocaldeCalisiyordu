import { Router } from 'express';
import db from '../db.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = Router();

function publicUser(u) {
  return { id: u.id, username: u.username, bio: u.bio || '', created_at: u.created_at };
}

async function counts(userId) {
  const followers = (await db.prepare('SELECT COUNT(*) AS c FROM follows WHERE followee_id = ?').get(userId)).c;
  const following = (await db.prepare('SELECT COUNT(*) AS c FROM follows WHERE follower_id = ?').get(userId)).c;
  return { followers: Number(followers), following: Number(following) };
}

router.get('/:username', optionalAuth, async (req, res, next) => {
  try {
  const user = await db.prepare('SELECT * FROM users WHERE username = ?').get(req.params.username);
  if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
  const uid = req.user ? req.user.id : null;
  const isOwn = uid === user.id;
  const isFollowing = uid
    ? !!(await db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND followee_id = ?').get(uid, user.id))
    : false;

  const projects = isOwn
    ? await db.prepare('SELECT * FROM projects WHERE owner_id = ? ORDER BY updated_at DESC').all(user.id)
    : await db.prepare("SELECT * FROM projects WHERE owner_id = ? AND visibility = 'public' ORDER BY updated_at DESC").all(user.id);

  res.json({
    user: publicUser(user),
    ...(await counts(user.id)),
    isOwn,
    isFollowing,
    projects,
  });
  } catch (error) { return next(error); }
});

router.put('/me/bio', requireAuth, async (req, res, next) => {
  try {
  const { bio = '' } = req.body || {};
  await db.prepare('UPDATE users SET bio = ? WHERE id = ?').run(String(bio).slice(0, 300), req.user.id);
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  return res.json({ user: publicUser(user) });
  } catch (error) { return next(error); }
});

router.post('/:username/follow', requireAuth, async (req, res, next) => {
  try {
  const target = await db.prepare('SELECT * FROM users WHERE username = ?').get(req.params.username);
  if (!target) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
  if (target.id === req.user.id) return res.status(400).json({ error: 'Kendini takip edemezsin.' });
  try {
    await db.prepare('INSERT INTO follows (follower_id, followee_id) VALUES (?, ?)').run(req.user.id, target.id);
  } catch {
    // zaten takip ediyor olabilir, sessizce geç
  }
  return res.json({ ...(await counts(target.id)), isFollowing: true });
  } catch (error) { return next(error); }
});

router.delete('/:username/follow', requireAuth, async (req, res, next) => {
  try {
  const target = await db.prepare('SELECT * FROM users WHERE username = ?').get(req.params.username);
  if (!target) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
  await db.prepare('DELETE FROM follows WHERE follower_id = ? AND followee_id = ?').run(req.user.id, target.id);
  return res.json({ ...(await counts(target.id)), isFollowing: false });
  } catch (error) { return next(error); }
});

router.get('/:username/followers', async (req, res, next) => {
  try {
  const target = await db.prepare('SELECT * FROM users WHERE username = ?').get(req.params.username);
  if (!target) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
  const rows = await db.prepare(`
    SELECT u.id, u.username, u.bio FROM follows f
    JOIN users u ON u.id = f.follower_id
    WHERE f.followee_id = ? ORDER BY f.created_at DESC
  `).all(target.id);
  return res.json({ users: rows });
  } catch (error) { return next(error); }
});

router.get('/:username/following', async (req, res, next) => {
  try {
  const target = await db.prepare('SELECT * FROM users WHERE username = ?').get(req.params.username);
  if (!target) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
  const rows = await db.prepare(`
    SELECT u.id, u.username, u.bio FROM follows f
    JOIN users u ON u.id = f.followee_id
    WHERE f.follower_id = ? ORDER BY f.created_at DESC
  `).all(target.id);
  return res.json({ users: rows });
  } catch (error) { return next(error); }
});

export default router;
