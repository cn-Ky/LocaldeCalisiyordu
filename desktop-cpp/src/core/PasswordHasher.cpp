#include "PasswordHasher.h"

#include <sodium.h>
#include <QByteArray>

bool PasswordHasher::init() {
    return sodium_init() >= 0;
}

QString PasswordHasher::hash(const QString &plainPassword) {
    const QByteArray pw = plainPassword.toUtf8();
    char out[crypto_pwhash_STRBYTES];

    if (crypto_pwhash_str(
            out,
            pw.constData(),
            static_cast<unsigned long long>(pw.size()),
            crypto_pwhash_OPSLIMIT_MODERATE,
            crypto_pwhash_MEMLIMIT_MODERATE) != 0) {
        // Bellek yetersiz vb. — çok nadir, sistem kaynak sıkıntısı demektir.
        return QString();
    }
    return QString::fromLatin1(out);
}

bool PasswordHasher::verify(const QString &hashStr, const QString &plainPassword) {
    const QByteArray hashBytes = hashStr.toLatin1();
    const QByteArray pw = plainPassword.toUtf8();
    return crypto_pwhash_str_verify(
               hashBytes.constData(),
               pw.constData(),
               static_cast<unsigned long long>(pw.size())) == 0;
}
