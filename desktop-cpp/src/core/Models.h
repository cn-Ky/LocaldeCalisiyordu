#pragma once
#include <QString>
#include <QDateTime>

struct User {
    int id = 0;
    QString username;
    QString bio;
    QString createdAt;

    bool isValid() const { return id > 0; }
};

struct Project {
    int id = 0;
    int ownerId = 0;
    QString ownerUsername;
    QString title;
    QString slug;
    QString description;
    QString visibility; // "public" | "private"
    int stars = 0;
    QString createdAt;
    QString updatedAt;
};

struct ProjectFile {
    int id = 0;
    int projectId = 0;
    QString filename;
    QString type; // "html" | "css" | "js" | "lib"
    QString content;
    int position = 0;
};
