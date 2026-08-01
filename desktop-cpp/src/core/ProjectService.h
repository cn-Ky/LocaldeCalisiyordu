#pragma once
#include <QString>
#include <QList>
#include "Models.h"

struct ProjectResult {
    bool ok = false;
    QString error;
    Project project;
};

class ProjectService {
public:
    // Herkese açık projeler + (verilen kullanıcıya aitse) kendi private projeleri.
    // viewerId <= 0 ise sadece public projeler döner (misafir görünümü).
    static QList<Project> listFeed(int viewerId);

    static QList<Project> listMine(int ownerId);

    static ProjectResult create(int ownerId, const QString &title,
                                 const QString &description, const QString &visibility);

private:
    static QString slugify(const QString &title);
};
