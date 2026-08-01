#pragma once
#include <QString>
#include <QList>
#include "Models.h"

struct FileResult {
    bool ok = false;
    QString error;
    ProjectFile file;
};

class FileService {
public:
    static QList<ProjectFile> listForProject(int projectId);

    // filename'in uzantısından tipi çıkarır (backend/routes/projects.js#typeFromExt
    // ile aynı davranış). Desteklenmeyen bir uzantı verilirse boş dize döner.
    static QString typeFromExt(const QString &filename);

    static FileResult addFile(int projectId, const QString &filename, const QString &content);
    static bool updateContent(int fileId, const QString &content);
    static bool remove(int fileId);
};
