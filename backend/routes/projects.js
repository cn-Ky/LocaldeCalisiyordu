import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../db.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

const router = Router();

function slugify(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60) || 'proje';
}

function typeFromExt(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  if (ext === 'html' || ext === 'htm') return 'html';
  if (ext === 'css') return 'css';
  if (ext === 'js') return 'js';
  return null;
}

function getFilesFor(projectId) {
  return db.prepare('SELECT id, filename, type, content, position FROM project_files WHERE project_id = ? ORDER BY position ASC, id ASC').all(projectId);
}

function projectWithOwner(row) {
  const owner = db.prepare('SELECT id, username FROM users WHERE id = ?').get(row.owner_id);
  return { ...row, owner };
}

function canView(project, userId) {
  if (project.visibility === 'public') return true;
  return userId && project.owner_id === userId;
}

// Listeleme: herkese açık projeler + (istek atan kişi için) kendi private projeleri
router.get('/', optionalAuth, (req, res) => {
  const { mine, search, owner } = req.query;
  const uid = req.user ? req.user.id : null;

  let rows;
  if (mine === 'true') {
    if (!uid) return res.status(401).json({ error: 'Oturum açmanız gerekiyor.' });
    rows = db.prepare('SELECT * FROM projects WHERE owner_id = ? ORDER BY updated_at DESC').all(uid);
  } else if (owner) {
    const ownerUser = db.prepare('SELECT id FROM users WHERE username = ?').get(owner);
    if (!ownerUser) return res.json({ projects: [] });
    rows = db.prepare('SELECT * FROM projects WHERE owner_id = ? ORDER BY updated_at DESC').all(ownerUser.id)
      .filter(p => canView(p, uid));
  } else {
    rows = db.prepare('SELECT * FROM projects WHERE visibility = ? ORDER BY updated_at DESC LIMIT 100').all('public');
    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter(p => p.title.toLowerCase().includes(s) || (p.description || '').toLowerCase().includes(s));
    }
  }

  res.json({ projects: rows.map(projectWithOwner) });
});

router.get('/:id', optionalAuth, (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Proje bulunamadı.' });
  const uid = req.user ? req.user.id : null;
  if (!canView(project, uid)) return res.status(403).json({ error: 'Bu proje özel.' });
  res.json({ project: projectWithOwner(project), files: getFilesFor(project.id) });
});

router.post('/', requireAuth, (req, res) => {
  const { title, description = '', visibility = 'public', files = [] } = req.body || {};
  if (!title || !title.trim()) return res.status(400).json({ error: 'Başlık gerekli.' });
  if (!['public', 'private'].includes(visibility)) return res.status(400).json({ error: 'Geçersiz görünürlük.' });

  const slug = slugify(title) + '-' + Date.now().toString(36);
  const info = db.prepare(
    'INSERT INTO projects (owner_id, title, slug, description, visibility) VALUES (?, ?, ?, ?, ?)'
  ).run(req.user.id, title.trim(), slug, description, visibility);

  const projectId = info.lastInsertRowid;
  const defaultFiles = files.length ? files : [
    { filename: 'index.html', type: 'html', content: '<h1>Merhaba, Localde Çalışıyordu!</h1>' },
    { filename: 'style.css', type: 'css', content: 'body { font-family: sans-serif; }' },
    { filename: 'script.js', type: 'js', content: "console.log('merhaba');" },
  ];
  const insertFile = db.prepare('INSERT INTO project_files (project_id, filename, type, content, position) VALUES (?, ?, ?, ?, ?)');
  defaultFiles.forEach((f, i) => insertFile.run(projectId, f.filename, f.type, f.content || '', i));

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  res.status(201).json({ project: projectWithOwner(project), files: getFilesFor(projectId) });
});

router.put('/:id', requireAuth, (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Proje bulunamadı.' });
  if (project.owner_id !== req.user.id) return res.status(403).json({ error: 'Bu projeyi düzenleme yetkiniz yok.' });

  const { title, description, visibility, files } = req.body || {};
  db.prepare(
    'UPDATE projects SET title = COALESCE(?, title), description = COALESCE(?, description), visibility = COALESCE(?, visibility), updated_at = datetime(\'now\') WHERE id = ?'
  ).run(title ?? null, description ?? null, visibility ?? null, project.id);

  if (Array.isArray(files)) {
    const del = db.prepare('DELETE FROM project_files WHERE project_id = ?');
    const insertFile = db.prepare('INSERT INTO project_files (project_id, filename, type, content, position) VALUES (?, ?, ?, ?, ?)');
    const tx = db.transaction((fs) => {
      del.run(project.id);
      fs.forEach((f, i) => insertFile.run(project.id, f.filename, f.type, f.content || '', i));
    });
    tx(files);
  }

  const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(project.id);
  res.json({ project: projectWithOwner(updated), files: getFilesFor(project.id) });
});

router.delete('/:id', requireAuth, (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Proje bulunamadı.' });
  if (project.owner_id !== req.user.id) return res.status(403).json({ error: 'Bu projeyi silme yetkiniz yok.' });
  db.prepare('DELETE FROM projects WHERE id = ?').run(project.id);
  res.json({ ok: true });
});

router.post('/:id/fork', requireAuth, (req, res) => {
  const source = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!source) return res.status(404).json({ error: 'Proje bulunamadı.' });
  if (!canView(source, req.user.id)) return res.status(403).json({ error: 'Bu proje özel.' });

  const slug = slugify(source.title) + '-fork-' + Date.now().toString(36);
  const info = db.prepare(
    'INSERT INTO projects (owner_id, title, slug, description, visibility, parent_id) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(req.user.id, source.title, slug, source.description, 'public', source.id);
  const newId = info.lastInsertRowid;

  const files = getFilesFor(source.id);
  const insertFile = db.prepare('INSERT INTO project_files (project_id, filename, type, content, position) VALUES (?, ?, ?, ?, ?)');
  files.forEach(f => insertFile.run(newId, f.filename, f.type, f.content, f.position));

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(newId);
  res.status(201).json({ project: projectWithOwner(project), files: getFilesFor(newId) });
});

// Doğrudan dosya yükleme (html/css/js) - proje sahibi
router.post('/:id/upload', requireAuth, upload.array('files', 10), (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Proje bulunamadı.' });
  if (project.owner_id !== req.user.id) return res.status(403).json({ error: 'Bu projeye dosya yükleme yetkiniz yok.' });

  const uploaded = [];
  for (const f of req.files || []) {
    const type = typeFromExt(f.originalname);
    if (!type) continue;
    const content = f.buffer.toString('utf-8');
    const existing = db.prepare('SELECT id FROM project_files WHERE project_id = ? AND filename = ?').get(project.id, f.originalname);
    if (existing) {
      db.prepare('UPDATE project_files SET content = ? WHERE id = ?').run(content, existing.id);
    } else {
      const maxPos = db.prepare('SELECT COALESCE(MAX(position), -1) AS m FROM project_files WHERE project_id = ?').get(project.id).m;
      db.prepare('INSERT INTO project_files (project_id, filename, type, content, position) VALUES (?, ?, ?, ?, ?)')
        .run(project.id, f.originalname, type, content, maxPos + 1);
    }
    uploaded.push(f.originalname);
  }
  db.prepare('UPDATE projects SET updated_at = datetime(\'now\') WHERE id = ?').run(project.id);
  res.json({ uploaded, files: getFilesFor(project.id) });
});

router.post('/:id/star', requireAuth, (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Proje bulunamadı.' });
  db.prepare('UPDATE projects SET stars = stars + 1 WHERE id = ?').run(project.id);
  const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(project.id);
  res.json({ project: projectWithOwner(updated) });
});

export default router;
