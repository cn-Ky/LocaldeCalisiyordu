import { Router } from 'express';
import db from '../db.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = Router();

function withAuthor(pr) {
  const author = db.prepare('SELECT id, username FROM users WHERE id = ?').get(pr.author_id);
  return { ...pr, author };
}

function getPrFiles(prId) {
  return db.prepare('SELECT filename, type, content FROM pull_request_files WHERE pull_request_id = ?').all(prId);
}

// Bir projenin PR listesi
router.get('/project/:projectId', optionalAuth, (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.projectId);
  if (!project) return res.status(404).json({ error: 'Proje bulunamadı.' });
  const rows = db.prepare('SELECT * FROM pull_requests WHERE project_id = ? ORDER BY created_at DESC').all(project.id);
  res.json({ pulls: rows.map(withAuthor) });
});

// Yeni PR oluştur: hedef proje + önerilen dosya içerikleri
router.post('/project/:projectId', requireAuth, (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.projectId);
  if (!project) return res.status(404).json({ error: 'Proje bulunamadı.' });
  const { title, description = '', files } = req.body || {};
  if (!title || !title.trim()) return res.status(400).json({ error: 'Başlık gerekli.' });
  if (!Array.isArray(files) || !files.length) return res.status(400).json({ error: 'En az bir dosya değişikliği gerekli.' });

  const info = db.prepare(
    'INSERT INTO pull_requests (project_id, author_id, title, description) VALUES (?, ?, ?, ?)'
  ).run(project.id, req.user.id, title.trim(), description);
  const prId = info.lastInsertRowid;

  const insertFile = db.prepare('INSERT INTO pull_request_files (pull_request_id, filename, type, content) VALUES (?, ?, ?, ?)');
  files.forEach(f => insertFile.run(prId, f.filename, f.type, f.content || ''));

  const pr = db.prepare('SELECT * FROM pull_requests WHERE id = ?').get(prId);
  res.status(201).json({ pull: withAuthor(pr), files: getPrFiles(prId) });
});

router.get('/:id', optionalAuth, (req, res) => {
  const pr = db.prepare('SELECT * FROM pull_requests WHERE id = ?').get(req.params.id);
  if (!pr) return res.status(404).json({ error: 'Pull request bulunamadı.' });
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(pr.project_id);
  const currentFiles = db.prepare('SELECT filename, type, content FROM project_files WHERE project_id = ?').all(project.id);
  const proposedFiles = getPrFiles(pr.id);
  const comments = db.prepare(
    'SELECT prc.*, u.username FROM pull_request_comments prc JOIN users u ON u.id = prc.author_id WHERE prc.pull_request_id = ? ORDER BY prc.created_at ASC'
  ).all(pr.id);
  res.json({ pull: withAuthor(pr), project: { id: project.id, title: project.title, owner_id: project.owner_id }, currentFiles, proposedFiles, comments });
});

router.post('/:id/comment', requireAuth, (req, res) => {
  const pr = db.prepare('SELECT * FROM pull_requests WHERE id = ?').get(req.params.id);
  if (!pr) return res.status(404).json({ error: 'Pull request bulunamadı.' });
  const { body } = req.body || {};
  if (!body || !body.trim()) return res.status(400).json({ error: 'Yorum boş olamaz.' });
  db.prepare('INSERT INTO pull_request_comments (pull_request_id, author_id, body) VALUES (?, ?, ?)').run(pr.id, req.user.id, body.trim());
  const comments = db.prepare(
    'SELECT prc.*, u.username FROM pull_request_comments prc JOIN users u ON u.id = prc.author_id WHERE prc.pull_request_id = ? ORDER BY prc.created_at ASC'
  ).all(pr.id);
  res.status(201).json({ comments });
});

router.post('/:id/merge', requireAuth, (req, res) => {
  const pr = db.prepare('SELECT * FROM pull_requests WHERE id = ?').get(req.params.id);
  if (!pr) return res.status(404).json({ error: 'Pull request bulunamadı.' });
  if (pr.status !== 'open') return res.status(400).json({ error: 'Bu pull request zaten kapatılmış.' });
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(pr.project_id);
  if (project.owner_id !== req.user.id) return res.status(403).json({ error: 'Sadece proje sahibi birleştirebilir.' });

  const proposed = getPrFiles(pr.id);
  const tx = db.transaction(() => {
    for (const f of proposed) {
      const existing = db.prepare('SELECT id FROM project_files WHERE project_id = ? AND filename = ?').get(project.id, f.filename);
      if (existing) {
        db.prepare('UPDATE project_files SET content = ?, type = ? WHERE id = ?').run(f.content, f.type, existing.id);
      } else {
        const maxPos = db.prepare('SELECT COALESCE(MAX(position), -1) AS m FROM project_files WHERE project_id = ?').get(project.id).m;
        db.prepare('INSERT INTO project_files (project_id, filename, type, content, position) VALUES (?, ?, ?, ?, ?)')
          .run(project.id, f.filename, f.type, f.content, maxPos + 1);
      }
    }
    db.prepare('UPDATE projects SET updated_at = datetime(\'now\') WHERE id = ?').run(project.id);
    db.prepare('UPDATE pull_requests SET status = \'merged\', updated_at = datetime(\'now\') WHERE id = ?').run(pr.id);
  });
  tx();

  const updated = db.prepare('SELECT * FROM pull_requests WHERE id = ?').get(pr.id);
  res.json({ pull: withAuthor(updated) });
});

router.post('/:id/close', requireAuth, (req, res) => {
  const pr = db.prepare('SELECT * FROM pull_requests WHERE id = ?').get(req.params.id);
  if (!pr) return res.status(404).json({ error: 'Pull request bulunamadı.' });
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(pr.project_id);
  if (project.owner_id !== req.user.id && pr.author_id !== req.user.id) {
    return res.status(403).json({ error: 'Bu işlemi yapma yetkiniz yok.' });
  }
  if (pr.status !== 'open') return res.status(400).json({ error: 'Bu pull request zaten kapatılmış.' });
  db.prepare('UPDATE pull_requests SET status = \'closed\', updated_at = datetime(\'now\') WHERE id = ?').run(pr.id);
  const updated = db.prepare('SELECT * FROM pull_requests WHERE id = ?').get(pr.id);
  res.json({ pull: withAuthor(updated) });
});

export default router;
