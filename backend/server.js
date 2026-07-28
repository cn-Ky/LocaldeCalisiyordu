import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import pullRoutes from './routes/pulls.js';
import userRoutes from './routes/users.js';
import messageRoutes from './routes/messages.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true, name: 'Localde Çalışıyordu API' }));

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/pulls', pullRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);

app.use((req, res) => res.status(404).json({ error: 'Bulunamadı.' }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Sunucu hatası.' });
});

app.listen(PORT, () => {
  console.log(`Localde Çalışıyordu API http://localhost:${PORT} adresinde çalışıyor`);
});
