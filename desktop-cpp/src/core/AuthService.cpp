#include "AuthService.h"
#include "Database.h"
#include "PasswordHasher.h"

#include <QSqlQuery>
#include <QSqlError>
#include <QRegularExpression>
#include <QVariant>

bool AuthService::isValidUsername(const QString &username) {
    // backend/routes/auth.js ile birebir aynı kural: 3-20 karakter, harf/rakam/_/-.
    static const QRegularExpression re("^[a-zA-Z0-9_-]{3,20}$");
    return re.match(username).hasMatch();
}

AuthResult AuthService::registerUser(const QString &username, const QString &password) {
    AuthResult result;

    if (username.isEmpty() || password.isEmpty()) {
        result.error = "Kullanıcı adı ve şifre gerekli.";
        return result;
    }
    if (!isValidUsername(username)) {
        result.error = "Kullanıcı adı 3-20 karakter olmalı, sadece harf/rakam/_/- içerebilir.";
        return result;
    }
    if (password.size() < 6) {
        result.error = "Şifre en az 6 karakter olmalı.";
        return result;
    }

    QSqlQuery check(Database::instance());
    check.prepare("SELECT id FROM users WHERE username = ?");
    check.addBindValue(username);
    check.exec();
    if (check.next()) {
        result.error = "Bu kullanıcı adı zaten alınmış.";
        return result;
    }

    const QString hashed = PasswordHasher::hash(password);
    if (hashed.isEmpty()) {
        result.error = "Şifre işlenirken beklenmeyen bir hata oluştu.";
        return result;
    }

    QSqlQuery insert(Database::instance());
    insert.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)");
    insert.addBindValue(username);
    insert.addBindValue(hashed);
    if (!insert.exec()) {
        result.error = "Kullanıcı oluşturulamadı: " + insert.lastError().text();
        return result;
    }

    const int newId = insert.lastInsertId().toInt();
    QSqlQuery fetch(Database::instance());
    fetch.prepare("SELECT id, username, bio, created_at FROM users WHERE id = ?");
    fetch.addBindValue(newId);
    fetch.exec();
    fetch.next();

    result.ok = true;
    result.user.id = fetch.value("id").toInt();
    result.user.username = fetch.value("username").toString();
    result.user.bio = fetch.value("bio").toString();
    result.user.createdAt = fetch.value("created_at").toString();
    return result;
}

AuthResult AuthService::login(const QString &username, const QString &password) {
    AuthResult result;

    if (username.isEmpty() || password.isEmpty()) {
        result.error = "Kullanıcı adı ve şifre gerekli.";
        return result;
    }

    QSqlQuery q(Database::instance());
    q.prepare("SELECT id, username, bio, created_at, password_hash FROM users WHERE username = ?");
    q.addBindValue(username);
    q.exec();

    if (!q.next()) {
        result.error = "Kullanıcı adı veya şifre hatalı.";
        return result;
    }

    const QString storedHash = q.value("password_hash").toString();
    if (!PasswordHasher::verify(storedHash, password)) {
        result.error = "Kullanıcı adı veya şifre hatalı.";
        return result;
    }

    result.ok = true;
    result.user.id = q.value("id").toInt();
    result.user.username = q.value("username").toString();
    result.user.bio = q.value("bio").toString();
    result.user.createdAt = q.value("created_at").toString();
    return result;
}
