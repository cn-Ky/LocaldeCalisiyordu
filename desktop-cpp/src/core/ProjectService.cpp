#include "ProjectService.h"
#include "Database.h"

#include <QSqlQuery>
#include <QSqlError>
#include <QRegularExpression>
#include <QDateTime>
#include <QVariant>

QString ProjectService::slugify(const QString &title) {
    // backend/routes/projects.js#slugify ile aynı davranış.
    QString s = title.toLower().trimmed();
    s.replace(QRegularExpression("[^a-z0-9\\s-]"), "");
    s.replace(QRegularExpression("\\s+"), "-");
    s.replace(QRegularExpression("-+"), "-");
    s = s.left(60);
    if (s.isEmpty()) s = "proje";
    return s;
}

static Project rowToProject(QSqlQuery &q) {
    Project p;
    p.id = q.value("id").toInt();
    p.ownerId = q.value("owner_id").toInt();
    p.ownerUsername = q.value("owner_username").toString();
    p.title = q.value("title").toString();
    p.slug = q.value("slug").toString();
    p.description = q.value("description").toString();
    p.visibility = q.value("visibility").toString();
    p.stars = q.value("stars").toInt();
    p.createdAt = q.value("created_at").toString();
    p.updatedAt = q.value("updated_at").toString();
    return p;
}

QList<Project> ProjectService::listFeed(int viewerId) {
    QList<Project> out;
    QSqlQuery q(Database::instance());
    if (viewerId > 0) {
        q.prepare(R"(
            SELECT p.*, u.username AS owner_username FROM projects p
            JOIN users u ON u.id = p.owner_id
            WHERE p.visibility = 'public' OR p.owner_id = ?
            ORDER BY p.updated_at DESC
        )");
        q.addBindValue(viewerId);
    } else {
        q.prepare(R"(
            SELECT p.*, u.username AS owner_username FROM projects p
            JOIN users u ON u.id = p.owner_id
            WHERE p.visibility = 'public'
            ORDER BY p.updated_at DESC
        )");
    }
    q.exec();
    while (q.next()) out.append(rowToProject(q));
    return out;
}

QList<Project> ProjectService::listMine(int ownerId) {
    QList<Project> out;
    QSqlQuery q(Database::instance());
    q.prepare(R"(
        SELECT p.*, u.username AS owner_username FROM projects p
        JOIN users u ON u.id = p.owner_id
        WHERE p.owner_id = ?
        ORDER BY p.updated_at DESC
    )");
    q.addBindValue(ownerId);
    q.exec();
    while (q.next()) out.append(rowToProject(q));
    return out;
}

ProjectResult ProjectService::create(int ownerId, const QString &title,
                                      const QString &description, const QString &visibility) {
    ProjectResult result;

    if (title.trimmed().isEmpty()) {
        result.error = "Başlık gerekli.";
        return result;
    }
    if (visibility != "public" && visibility != "private") {
        result.error = "Geçersiz görünürlük.";
        return result;
    }

    const QString slug = slugify(title) + "-" + QString::number(QDateTime::currentMSecsSinceEpoch(), 36);

    QSqlQuery insert(Database::instance());
    insert.prepare(R"(
        INSERT INTO projects (owner_id, title, slug, description, visibility)
        VALUES (?, ?, ?, ?, ?)
    )");
    insert.addBindValue(ownerId);
    insert.addBindValue(title.trimmed());
    insert.addBindValue(slug);
    insert.addBindValue(description);
    insert.addBindValue(visibility);
    if (!insert.exec()) {
        result.error = "Proje oluşturulamadı: " + insert.lastError().text();
        return result;
    }
    const int projectId = insert.lastInsertId().toInt();

    // backend/routes/projects.js ile aynı varsayılan dosyalar.
    struct DefaultFile { QString filename, type, content; };
    const QList<DefaultFile> defaults = {
        {"index.html", "html", "<h1>Merhaba, Localde Çalışıyordu!</h1>"},
        {"style.css", "css", "body { font-family: sans-serif; }"},
        {"script.js", "js", "console.log('merhaba');"},
    };
    QSqlQuery insertFile(Database::instance());
    insertFile.prepare(R"(
        INSERT INTO project_files (project_id, filename, type, content, position)
        VALUES (?, ?, ?, ?, ?)
    )");
    int pos = 0;
    for (const auto &f : defaults) {
        insertFile.addBindValue(projectId);
        insertFile.addBindValue(f.filename);
        insertFile.addBindValue(f.type);
        insertFile.addBindValue(f.content);
        insertFile.addBindValue(pos++);
        insertFile.exec();
    }

    QSqlQuery fetch(Database::instance());
    fetch.prepare(R"(
        SELECT p.*, u.username AS owner_username FROM projects p
        JOIN users u ON u.id = p.owner_id
        WHERE p.id = ?
    )");
    fetch.addBindValue(projectId);
    fetch.exec();
    fetch.next();

    result.ok = true;
    result.project = rowToProject(fetch);
    return result;
}
