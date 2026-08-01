// Bu dosya kalıcı test paketinin bir parçası değildir; geliştirme
// sırasında çekirdek servisleri (AuthService/ProjectService) arayüz
// olmadan hızlıca doğrulamak için kullanılan tek seferlik bir araçtır.
#include <QCoreApplication>
#include <QDebug>
#include "../core/Database.h"
#include "../core/PasswordHasher.h"
#include "../core/AuthService.h"
#include "../core/ProjectService.h"
#include "../core/FileService.h"

static int failures = 0;
#define CHECK(cond, msg) do { \
    const QString m = QString::fromUtf8(msg); \
    if (cond) { qInfo() << "[OK]  " << m; } \
    else { qCritical() << "[FAIL]" << m; failures++; } \
} while (0)

int main(int argc, char *argv[]) {
    QCoreApplication app(argc, argv);

    CHECK(PasswordHasher::init(), "libsodium init");
    CHECK(Database::init(), "veritabanı açıldı");

    // --- Kayıt ---
    auto reg = AuthService::registerUser("ayse_gelistirici", "gizli123");
    CHECK(reg.ok, "kayıt başarılı");
    CHECK(reg.user.username == "ayse_gelistirici", "kayıt sonrası kullanıcı adı doğru");

    auto regDup = AuthService::registerUser("ayse_gelistirici", "baskaSifre1");
    CHECK(!regDup.ok, "aynı kullanıcı adıyla ikinci kayıt reddedildi");

    auto regBadName = AuthService::registerUser("a", "gizli123");
    CHECK(!regBadName.ok, "çok kısa kullanıcı adı reddedildi");

    auto regBadPass = AuthService::registerUser("baska_kullanici", "123");
    CHECK(!regBadPass.ok, "çok kısa şifre reddedildi");

    // --- Giriş ---
    auto loginOk = AuthService::login("ayse_gelistirici", "gizli123");
    CHECK(loginOk.ok, "doğru şifreyle giriş başarılı");

    auto loginWrong = AuthService::login("ayse_gelistirici", "yanlisSifre");
    CHECK(!loginWrong.ok, "yanlış şifreyle giriş reddedildi");

    const int uid = loginOk.user.id;

    // --- Proje oluşturma ---
    auto proj1 = ProjectService::create(uid, "Merhaba Dünya", "İlk projem", "public");
    CHECK(proj1.ok, "public proje oluşturuldu");
    CHECK(!proj1.project.slug.isEmpty(), QString("slug üretildi: %1").arg(proj1.project.slug).toUtf8());

    auto proj2 = ProjectService::create(uid, "Gizli Projem", "kimse görmesin", "private");
    CHECK(proj2.ok, "private proje oluşturuldu");

    auto projBadTitle = ProjectService::create(uid, "   ", "", "public");
    CHECK(!projBadTitle.ok, "boş başlık reddedildi");

    // --- Listeleme ---
    auto feedAsOwner = ProjectService::listFeed(uid);
    CHECK(feedAsOwner.size() >= 2, "sahip olarak feed'de en az 2 proje görünüyor (public+private)");

    auto feedAsGuest = ProjectService::listFeed(-1);
    bool guestSeesPrivate = false;
    for (const auto &p : feedAsGuest) if (p.visibility == "private") guestSeesPrivate = true;
    CHECK(!guestSeesPrivate, "misafir private projeyi göremiyor");

    auto mine = ProjectService::listMine(uid);
    CHECK(mine.size() >= 2, "listMine kullanıcının tüm projelerini döndürüyor");

    // --- Dosya yönetimi ---
    CHECK(FileService::typeFromExt("about.html") == "html", "typeFromExt: .html -> html");
    CHECK(FileService::typeFromExt("main.js") == "js", "typeFromExt: .js -> js");
    CHECK(FileService::typeFromExt("readme.md").isEmpty(), "typeFromExt: desteklenmeyen uzantı reddedildi");

    auto initialFiles = FileService::listForProject(proj1.project.id);
    CHECK(initialFiles.size() == 3, "yeni projede 3 varsayılan dosya var");

    auto addFile = FileService::addFile(proj1.project.id, "about.html", "<p>hakkında</p>");
    CHECK(addFile.ok, "yeni dosya eklendi");

    auto addDup = FileService::addFile(proj1.project.id, "about.html", "tekrar");
    CHECK(!addDup.ok, "aynı isimde ikinci dosya reddedildi");

    auto addBadExt = FileService::addFile(proj1.project.id, "notes.txt", "x");
    CHECK(!addBadExt.ok, "desteklenmeyen uzantılı dosya reddedildi");

    CHECK(FileService::updateContent(addFile.file.id, "<p>güncellendi</p>"), "dosya içeriği güncellendi");
    auto afterUpdate = FileService::listForProject(proj1.project.id);
    bool foundUpdated = false;
    for (const auto &f : afterUpdate) {
        if (f.id == addFile.file.id && f.content == "<p>güncellendi</p>") foundUpdated = true;
    }
    CHECK(foundUpdated, "güncellenen içerik veritabanına yansıdı");

    CHECK(FileService::remove(addFile.file.id), "dosya silindi");
    auto afterDelete = FileService::listForProject(proj1.project.id);
    CHECK(afterDelete.size() == 3, "silme sonrası dosya sayısı 3'e döndü");

    if (failures == 0) {
        qInfo() << "\nTÜM TESTLER GEÇTİ ✔";
        return 0;
    } else {
        qCritical() << "\n" << failures << "TEST BAŞARISIZ ✘";
        return 1;
    }
}
