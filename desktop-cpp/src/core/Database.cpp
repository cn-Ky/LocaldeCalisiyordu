#include "Database.h"

#include <QDir>
#include <QStandardPaths>
#include <QSqlQuery>
#include <QSqlError>
#include <QDebug>

QString Database::userDataDbPath() {
    const QByteArray override = qgetenv("LOCALDE_DB_PATH");
    if (!override.isEmpty()) return QString::fromLocal8Bit(override);

    const QString dir = QStandardPaths::writableLocation(QStandardPaths::AppDataLocation);
    QDir().mkpath(dir);
    return dir + "/data.sqlite";
}

QSqlDatabase &Database::instance() {
    static QSqlDatabase db = QSqlDatabase::addDatabase("QSQLITE", "localde_main");
    return db;
}

bool Database::init() {
    QSqlDatabase &db = instance();
    db.setDatabaseName(userDataDbPath());
    if (!db.open()) {
        qCritical() << "Veritabanı açılamadı:" << db.lastError().text();
        return false;
    }

    QSqlQuery pragma(db);
    pragma.exec("PRAGMA journal_mode = WAL");
    pragma.exec("PRAGMA foreign_keys = ON");

    createSchema();
    return true;
}

void Database::createSchema() {
    QSqlQuery q(instance());

    // NOT: Bu şema backend/db.js (Node/Express sürümü) ile birebir aynıdır;
    // aynı .sqlite dosyası her iki istemci tarafından da okunabilir.
    q.exec(R"(
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          bio TEXT DEFAULT '',
          created_at TEXT DEFAULT (datetime('now'))
        )
    )");

    q.exec(R"(
        CREATE TABLE IF NOT EXISTS projects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          slug TEXT NOT NULL,
          description TEXT DEFAULT '',
          visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','private')),
          parent_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
          stars INTEGER DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        )
    )");

    q.exec(R"(
        CREATE TABLE IF NOT EXISTS project_files (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          filename TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('html','css','js','lib')),
          content TEXT DEFAULT '',
          position INTEGER DEFAULT 0
        )
    )");

    q.exec(R"(
        CREATE TABLE IF NOT EXISTS pull_requests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          description TEXT DEFAULT '',
          status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','merged','closed')),
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        )
    )");

    q.exec(R"(
        CREATE TABLE IF NOT EXISTS pull_request_files (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          pull_request_id INTEGER NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
          filename TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('html','css','js','lib')),
          content TEXT DEFAULT ''
        )
    )");

    q.exec(R"(
        CREATE TABLE IF NOT EXISTS pull_request_comments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          pull_request_id INTEGER NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
          author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          body TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now'))
        )
    )");

    q.exec(R"(
        CREATE TABLE IF NOT EXISTS follows (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          followee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TEXT DEFAULT (datetime('now')),
          UNIQUE(follower_id, followee_id)
        )
    )");

    q.exec(R"(
        CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          body TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now')),
          read_at TEXT
        )
    )");

    q.exec("CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id)");
    q.exec("CREATE INDEX IF NOT EXISTS idx_files_project ON project_files(project_id)");
    q.exec("CREATE INDEX IF NOT EXISTS idx_pr_project ON pull_requests(project_id)");
    q.exec("CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id)");
    q.exec("CREATE INDEX IF NOT EXISTS idx_follows_followee ON follows(followee_id)");
    q.exec("CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id)");
    q.exec("CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id)");
}
