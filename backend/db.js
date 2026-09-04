import pg from 'pg';

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL tanımlı değil. Kalıcı PostgreSQL veritabanı bağlantısı gerekli.');
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

const schema = `
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  bio TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
  id BIGSERIAL PRIMARY KEY,
  owner_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT DEFAULT '',
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','private')),
  parent_id BIGINT REFERENCES projects(id) ON DELETE SET NULL,
  stars INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_files (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('html','css','js','lib')),
  content TEXT DEFAULT '',
  position INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS pull_requests (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  author_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','merged','closed')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pull_request_files (
  id BIGSERIAL PRIMARY KEY,
  pull_request_id BIGINT NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('html','css','js','lib')),
  content TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS pull_request_comments (
  id BIGSERIAL PRIMARY KEY,
  pull_request_id BIGINT NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
  author_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS follows (
  id BIGSERIAL PRIMARY KEY,
  follower_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followee_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(follower_id, followee_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  sender_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  read_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_files_project ON project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_pr_project ON pull_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_followee ON follows(followee_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
`;

function sqlWithParams(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

function statement(client, sql) {
  return {
    async get(...params) {
      const result = await client.query(sqlWithParams(sql), params);
      return result.rows[0];
    },
    async all(...params) {
      const result = await client.query(sqlWithParams(sql), params);
      return result.rows;
    },
    async run(...params) {
      let query = sqlWithParams(sql);
      if (/^\s*INSERT\s/i.test(query) && !/\sRETURNING\s/i.test(query)) query += ' RETURNING id';
      const result = await client.query(query, params);
      return { changes: result.rowCount, lastInsertRowid: result.rows[0]?.id };
    },
  };
}

const db = {
  prepare(sql) {
    return statement(pool, sql);
  },
  async exec(sql) {
    return pool.query(sql);
  },
  async transaction(callback) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const tx = { prepare: (sql) => statement(client, sql) };
      const result = await callback(tx);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
  async close() {
    await pool.end();
  },
};

await db.exec(schema);

export default db;
