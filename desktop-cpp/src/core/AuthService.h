#pragma once
#include <QString>
#include "Models.h"

struct AuthResult {
    bool ok = false;
    QString error;   // ok==false ise kullanıcıya gösterilecek Türkçe mesaj
    User user;
};

class AuthService {
public:
    static AuthResult registerUser(const QString &username, const QString &password);
    static AuthResult login(const QString &username, const QString &password);

private:
    static bool isValidUsername(const QString &username);
};
