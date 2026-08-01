#pragma once
#include <QString>

// libsodium'un crypto_pwhash_str() (Argon2id, "moderate" limitler) ile
// şifre hash'leme. Web sürümü bcrypt kullanıyordu; masaüstü sürümde
// veritabanı tamamen yerel olduğundan hash formatını değiştirmek serbest
// (iki istemci aynı .sqlite dosyasını paylaşacaksa bu noktaya dikkat
// edilmeli — bkz. Readme).
class PasswordHasher {
public:
    // Uygulama başlangıcında bir kez çağrılmalı.
    static bool init();

    // Argon2id ile hashlenmiş, veritabanına yazılabilecek bir dize döner.
    static QString hash(const QString &plainPassword);

    // Hash, verilen şifreyle eşleşiyor mu?
    static bool verify(const QString &hashStr, const QString &plainPassword);
};
