import { Router } from 'express';
import multer from 'multer';
import db from '../db.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });
const router = Router();

function slugify(title) {
  return title.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 60) || 'proje';
}

function typeFromExt(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  return ext === 'html' || ext === 'htm' ? 'html' : ext === 'css' ? 'css' : ext === 'js' ? 'js' : null;
}

async function getFilesFor(projectId) {
  return db.prepare('SELECT id, filename, type, content, position FROM project_files WHERE project_id = ? ORDER BY position ASC, id ASC').all(projectId);
}

async function projectWithOwner(row) {
  const owner = await db.prepare('SELECT id, username FROM users WHERE id = ?').get(row.owner_id);
  return { ...row, owner };
}

function canView(project, userId) {
  return project.visibility === 'public' || (userId && project.owner_id === userId);
}

router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { mine, search, owner, feed } = req.query;
    const uid = req.user?.id || null;
    let rows;
    if (mine === 'true') {
      if (!uid) return res.status(401).json({ error: 'Oturum açmanız gerekiyor.' });
      rows = await db.prepare('SELECT * FROM projects WHERE owner_id = ? ORDER BY updated_at DESC').all(uid);
    } else if (feed === 'following') {
      if (!uid) return res.status(401).json({ error: 'Oturum açmanız gerekiyor.' });
      rows = await db.prepare("SELECT p.* FROM projects p JOIN follows f ON f.followee_id = p.owner_id WHERE f.follower_id = ? AND p.visibility = 'public' ORDER BY p.updated_at DESC LIMIT 100").all(uid);
    } else if (owner) {
      const ownerUser = await db.prepare('SELECT id FROM users WHERE username = ?').get(owner);
      if (!ownerUser) return res.json({ projects: [] });
      rows = (await db.prepare('SELECT * FROM projects WHERE owner_id = ? ORDER BY updated_at DESC').all(ownerUser.id)).filter((p) => canView(p, uid));
    } else {
      rows = await db.prepare("SELECT * FROM projects WHERE visibility = 'public' ORDER BY updated_at DESC LIMIT 100").all();
      if (search) {
        const term = search.toLowerCase();
        rows = rows.filter((p) => p.title.toLowerCase().includes(term) || (p.description || '').toLowerCase().includes(term));
      }
    }
    return res.json({ projects: await Promise.all(rows.map(projectWithOwner)) });
  } catch (error) { return next(error); }
});

router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const project = await db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (!project) return res.status(404).json({ error: 'Proje bulunamadı.' });
    if (!canView(project, req.user?.id || null)) return res.status(403).json({ error: 'Bu proje özel.' });
    return res.json({ project: await projectWithOwner(project), files: await getFilesFor(project.id) });
  } catch (error) { return next(error); }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { title, description = '', visibility = 'public', files = [] } = req.body || {};
    if (!title || !title.trim()) return res.status(400).json({ error: 'Başlık gerekli.' });
    if (!['public', 'private'].includes(visibility)) return res.status(400).json({ error: 'Geçersiz görünürlük.' });
    const defaultFiles = files.length ? files : [
      { filename: 'index.html', type: 'html', content: '<h1>Merhaba, Localde Çalışıyordu!</h1>' },
      { filename: 'style.css', type: 'css', content: 'body { font-family: sans-serif; }' },
      { filename: 'script.js', type: 'js', content: "console.log('merhaba');" },
    ];
    const project = await db.transaction(async (tx) => {
      const info = await tx.prepare('INSERT INTO projects (owner_id, title, slug, description, visibility) VALUES (?, ?, ?, ?, ?)').run(req.user.id, title.trim(), `${slugify(title)}-${Date.now().toString(36)}`, description, visibility);
      const projectId = info.lastInsertRowid;
      for (const [index, file] of defaultFiles.entries()) await tx.prepare('INSERT INTO project_files (project_id, filename, type, content, position) VALUES (?, ?, ?, ?, ?)').run(projectId, file.filename, file.type, file.content || '', index);
      return tx.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    });
    return res.status(201).json({ project: await projectWithOwner(project), files: await getFilesFor(project.id) });
  } catch (error) { return next(error); }
});

router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const project = await db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (!project) return res.status(404).json({ error: 'Proje bulunamadı.' });
    if (project.owner_id !== req.user.id) return res.status(403).json({ error: 'Bu projeyi düzenleme yetkiniz yok.' });
    const { title, description, visibility, files } = req.body || {};
    await db.transaction(async (tx) => {
      await tx.prepare('UPDATE projects SET title = COALESCE(?, title), description = COALESCE(?, description), visibility = COALESCE(?, visibility), updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(title ?? null, description ?? null, visibility ?? null, project.id);
      if (Array.isArray(files)) {
        await tx.prepare('DELETE FROM project_files WHERE project_id = ?').run(project.id);
        for (const [index, file] of files.entries()) await tx.prepare('INSERT INTO project_files (project_id, filename, type, content, position) VALUES (?, ?, ?, ?, ?)').run(project.id, file.filename, file.type, file.content || '', index);
      }
    });
    const updated = await db.prepare('SELECT * FROM projects WHERE id = ?').get(project.id);
    return res.json({ project: await projectWithOwner(updated), files: await getFilesFor(project.id) });
  } catch (error) { return next(error); }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const project = await db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (!project) return res.status(404).json({ error: 'Proje bulunamadı.' });
    if (project.owner_id !== req.user.id) return res.status(403).json({ error: 'Bu projeyi silme yetkiniz yok.' });
    await db.prepare('DELETE FROM projects WHERE id = ?').run(project.id);
    return res.json({ ok: true });
  } catch (error) { return next(error); }
});

router.post('/:id/fork', requireAuth, async (req, res, next) => {
  try {
    const source = await db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (!source) return res.status(404).json({ error: 'Proje bulunamadı.' });
    if (!canView(source, req.user.id)) return res.status(403).json({ error: 'Bu proje özel.' });
    const files = await getFilesFor(source.id);
    const project = await db.transaction(async (tx) => {
      const info = await tx.prepare('INSERT INTO projects (owner_id, title, slug, description, visibility, parent_id) VALUES (?, ?, ?, ?, ?, ?)').run(req.user.id, source.title, `${slugify(source.title)}-fork-${Date.now().toString(36)}`, source.description, 'public', source.id);
      for (const file of files) await tx.prepare('INSERT INTO project_files (project_id, filename, type, content, position) VALUES (?, ?, ?, ?, ?)').run(info.lastInsertRowid, file.filename, file.type, file.content, file.position);
      return tx.prepare('SELECT * FROM projects WHERE id = ?').get(info.lastInsertRowid);
    });
    return res.status(201).json({ project: await projectWithOwner(project), files: await getFilesFor(project.id) });
  } catch (error) { return next(error); }
});

router.post('/:id/upload', requireAuth, upload.array('files', 10), async (req, res, next) => {
  try {
    const project = await db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (!project) return res.status(404).json({ error: 'Proje bulunamadı.' });
    if (project.owner_id !== req.user.id) return res.status(403).json({ error: 'Bu projeye dosya yükleme yetkiniz yok.' });
    const uploaded = [];
    await db.transaction(async (tx) => {
      for (const file of req.files || []) {
        const type = typeFromExt(file.originalname);
        if (!type) continue;
        const content = file.buffer.toString('utf-8');
        const existing = await tx.prepare('SELECT id FROM project_files WHERE project_id = ? AND filename = ?').get(project.id, file.originalname);
        if (existing) await tx.prepare('UPDATE project_files SET content = ? WHERE id = ?').run(content, existing.id);
        else {
          const maxPos = (await tx.prepare('SELECT COALESCE(MAX(position), -1) AS m FROM project_files WHERE project_id = ?').get(project.id)).m;
          await tx.prepare('INSERT INTO project_files (project_id, filename, type, content, position) VALUES (?, ?, ?, ?, ?)').run(project.id, file.originalname, type, content, Number(maxPos) + 1);
        }
        uploaded.push(file.originalname);
      }
      await tx.prepare('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(project.id);
    });
    return res.json({ uploaded, files: await getFilesFor(project.id) });
  } catch (error) { return next(error); }
});

router.post('/:id/star', requireAuth, async (req, res, next) => {
  try {
    const project = await db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (!project) return res.status(404).json({ error: 'Proje bulunamadı.' });
    await db.prepare('UPDATE projects SET stars = stars + 1 WHERE id = ?').run(project.id);
    const updated = await db.prepare('SELECT * FROM projects WHERE id = ?').get(project.id);
    return res.json({ project: await projectWithOwner(updated) });
  } catch (error) { return next(error); }
});

export default router;
