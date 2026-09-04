import { Router } from 'express';
import db from '../db.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = Router();

async function withAuthor(pr) {
  const author = await db.prepare('SELECT id, username FROM users WHERE id = ?').get(pr.author_id);
  return { ...pr, author };
}

function getPrFiles(prId, connection = db) {
  return connection.prepare('SELECT filename, type, content FROM pull_request_files WHERE pull_request_id = ?').all(prId);
}

router.get('/project/:projectId', optionalAuth, async (req, res, next) => {
  try {
    const project = await db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Proje bulunamadı.' });
    const rows = await db.prepare('SELECT * FROM pull_requests WHERE project_id = ? ORDER BY created_at DESC').all(project.id);
    return res.json({ pulls: await Promise.all(rows.map(withAuthor)) });
  } catch (error) { return next(error); }
});

router.post('/project/:projectId', requireAuth, async (req, res, next) => {
  try {
    const project = await db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Proje bulunamadı.' });
    const { title, description = '', files } = req.body || {};
    if (!title || !title.trim()) return res.status(400).json({ error: 'Başlık gerekli.' });
    if (!Array.isArray(files) || !files.length) return res.status(400).json({ error: 'En az bir dosya değişikliği gerekli.' });
    const result = await db.transaction(async (tx) => {
      const info = await tx.prepare('INSERT INTO pull_requests (project_id, author_id, title, description) VALUES (?, ?, ?, ?)').run(project.id, req.user.id, title.trim(), description);
      for (const file of files) await tx.prepare('INSERT INTO pull_request_files (pull_request_id, filename, type, content) VALUES (?, ?, ?, ?)').run(info.lastInsertRowid, file.filename, file.type, file.content || '');
      return tx.prepare('SELECT * FROM pull_requests WHERE id = ?').get(info.lastInsertRowid);
    });
    return res.status(201).json({ pull: await withAuthor(result), files: await getPrFiles(result.id) });
  } catch (error) { return next(error); }
});

router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const pr = await db.prepare('SELECT * FROM pull_requests WHERE id = ?').get(req.params.id);
    if (!pr) return res.status(404).json({ error: 'Pull request bulunamadı.' });
    const project = await db.prepare('SELECT * FROM projects WHERE id = ?').get(pr.project_id);
    const currentFiles = await db.prepare('SELECT filename, type, content FROM project_files WHERE project_id = ?').all(project.id);
    const proposedFiles = await getPrFiles(pr.id);
    const comments = await db.prepare('SELECT prc.*, u.username FROM pull_request_comments prc JOIN users u ON u.id = prc.author_id WHERE prc.pull_request_id = ? ORDER BY prc.created_at ASC').all(pr.id);
    return res.json({ pull: await withAuthor(pr), project: { id: project.id, title: project.title, owner_id: project.owner_id }, currentFiles, proposedFiles, comments });
  } catch (error) { return next(error); }
});

router.post('/:id/comment', requireAuth, async (req, res, next) => {
  try {
    const pr = await db.prepare('SELECT * FROM pull_requests WHERE id = ?').get(req.params.id);
    if (!pr) return res.status(404).json({ error: 'Pull request bulunamadı.' });
    const { body } = req.body || {};
    if (!body || !body.trim()) return res.status(400).json({ error: 'Yorum boş olamaz.' });
    await db.prepare('INSERT INTO pull_request_comments (pull_request_id, author_id, body) VALUES (?, ?, ?)').run(pr.id, req.user.id, body.trim());
    const comments = await db.prepare('SELECT prc.*, u.username FROM pull_request_comments prc JOIN users u ON u.id = prc.author_id WHERE prc.pull_request_id = ? ORDER BY prc.created_at ASC').all(pr.id);
    return res.status(201).json({ comments });
  } catch (error) { return next(error); }
});

router.post('/:id/merge', requireAuth, async (req, res, next) => {
  try {
    const pr = await db.prepare('SELECT * FROM pull_requests WHERE id = ?').get(req.params.id);
    if (!pr) return res.status(404).json({ error: 'Pull request bulunamadı.' });
    if (pr.status !== 'open') return res.status(400).json({ error: 'Bu pull request zaten kapatılmış.' });
    const project = await db.prepare('SELECT * FROM projects WHERE id = ?').get(pr.project_id);
    if (project.owner_id !== req.user.id) return res.status(403).json({ error: 'Sadece proje sahibi birleştirebilir.' });
    const proposed = await getPrFiles(pr.id);
    await db.transaction(async (tx) => {
      for (const file of proposed) {
        const existing = await tx.prepare('SELECT id FROM project_files WHERE project_id = ? AND filename = ?').get(project.id, file.filename);
        if (existing) await tx.prepare('UPDATE project_files SET content = ?, type = ? WHERE id = ?').run(file.content, file.type, existing.id);
        else {
          const maxPos = (await tx.prepare('SELECT COALESCE(MAX(position), -1) AS m FROM project_files WHERE project_id = ?').get(project.id)).m;
          await tx.prepare('INSERT INTO project_files (project_id, filename, type, content, position) VALUES (?, ?, ?, ?, ?)').run(project.id, file.filename, file.type, file.content, Number(maxPos) + 1);
        }
      }
      await tx.prepare('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(project.id);
      await tx.prepare("UPDATE pull_requests SET status = 'merged', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(pr.id);
    });
    const updated = await db.prepare('SELECT * FROM pull_requests WHERE id = ?').get(pr.id);
    return res.json({ pull: await withAuthor(updated) });
  } catch (error) { return next(error); }
});

router.post('/:id/close', requireAuth, async (req, res, next) => {
  try {
    const pr = await db.prepare('SELECT * FROM pull_requests WHERE id = ?').get(req.params.id);
    if (!pr) return res.status(404).json({ error: 'Pull request bulunamadı.' });
    const project = await db.prepare('SELECT * FROM projects WHERE id = ?').get(pr.project_id);
    if (project.owner_id !== req.user.id && pr.author_id !== req.user.id) return res.status(403).json({ error: 'Bu işlemi yapma yetkiniz yok.' });
    if (pr.status !== 'open') return res.status(400).json({ error: 'Bu pull request zaten kapatılmış.' });
    await db.prepare("UPDATE pull_requests SET status = 'closed', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(pr.id);
    const updated = await db.prepare('SELECT * FROM pull_requests WHERE id = ?').get(pr.id);
    return res.json({ pull: await withAuthor(updated) });
  } catch (error) { return next(error); }
});

export default router;
