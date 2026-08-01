#include "FileService.h"
#include "Database.h"

#include <QSqlQuery>
#include <QSqlError>
#include <QVariant>

QString FileService::typeFromExt(const QString &filename) {
    const QString ext = filename.section('.', -1).toLower();
    if (ext == "html" || ext == "htm") return "html";
    if (ext == "css") return "css";
    if (ext == "js") return "js";
    return QString();
}

QList<ProjectFile> FileService::listForProject(int projectId) {
    QList<ProjectFile> out;
    QSqlQuery q(Database::instance());
    q.prepare(R"(
        SELECT id, project_id, filename, type, content, position
        FROM project_files WHERE project_id = ?
        ORDER BY position ASC, id ASC
    )");
    q.addBindValue(projectId);
    q.exec();
    while (q.next()) {
        ProjectFile f;
        f.id = q.value("id").toInt();
        f.projectId = q.value("project_id").toInt();
        f.filename = q.value("filename").toString();
        f.type = q.value("type").toString();
        f.content = q.value("content").toString();
        f.position = q.value("position").toInt();
        out.append(f);
    }
    return out;
}

FileResult FileService::addFile(int projectId, const QString &filename, const QString &content) {
    FileResult result;

    if (filename.trimmed().isEmpty()) {
        result.error = "Dosya adı gerekli.";
        return result;
    }
    const QString type = typeFromExt(filename);
    if (type.isEmpty()) {
        result.error = "Sadece .html, .css ve .js dosyaları desteklenir.";
        return result;
    }

    QSqlQuery dup(Database::instance());
    dup.prepare("SELECT id FROM project_files WHERE project_id = ? AND filename = ?");
    dup.addBindValue(projectId);
    dup.addBindValue(filename);
    dup.exec();
    if (dup.next()) {
        result.error = "Bu isimde bir dosya zaten var.";
        return result;
    }

    QSqlQuery maxPos(Database::instance());
    maxPos.prepare("SELECT COALESCE(MAX(position), -1) + 1 FROM project_files WHERE project_id = ?");
    maxPos.addBindValue(projectId);
    maxPos.exec();
    maxPos.next();
    const int nextPos = maxPos.value(0).toInt();

    QSqlQuery insert(Database::instance());
    insert.prepare(R"(
        INSERT INTO project_files (project_id, filename, type, content, position)
        VALUES (?, ?, ?, ?, ?)
    )");
    insert.addBindValue(projectId);
    insert.addBindValue(filename);
    insert.addBindValue(type);
    insert.addBindValue(content);
    insert.addBindValue(nextPos);
    if (!insert.exec()) {
        result.error = "Dosya eklenemedi: " + insert.lastError().text();
        return result;
    }

    result.ok = true;
    result.file.id = insert.lastInsertId().toInt();
    result.file.projectId = projectId;
    result.file.filename = filename;
    result.file.type = type;
    result.file.content = content;
    result.file.position = nextPos;
    return result;
}

bool FileService::updateContent(int fileId, const QString &content) {
    QSqlQuery q(Database::instance());
    q.prepare("UPDATE project_files SET content = ? WHERE id = ?");
    q.addBindValue(content);
    q.addBindValue(fileId);
    return q.exec();
}

bool FileService::remove(int fileId) {
    QSqlQuery q(Database::instance());
    q.prepare("DELETE FROM project_files WHERE id = ?");
    q.addBindValue(fileId);
    return q.exec();
}
