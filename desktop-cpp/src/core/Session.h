#pragma once
#include "Models.h"

// Basit süreç-içi oturum durumu. Web sürümündeki JWT token mekanizması
// burada gerekmiyor: masaüstü istemcisi veritabanına doğrudan erişiyor,
// yani "backend"e ayrı bir güven sınırından kimlik kanıtlamaya gerek yok.
// "Beni hatırla" gibi bir kalıcı oturum istenirse QSettings'e son
// kullanıcı adı yazılabilir (parola asla diskte açık tutulmaz).
class Session {
public:
    static Session &instance();

    bool isLoggedIn() const { return m_currentUser.isValid(); }
    const User &currentUser() const { return m_currentUser; }

    void login(const User &user) { m_currentUser = user; }
    void logout() { m_currentUser = User(); }

private:
    Session() = default;
    User m_currentUser;
};
