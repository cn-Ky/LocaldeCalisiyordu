#pragma once
#include <QString>
#include <QSqlDatabase>

// Uygulamanın tek SQLite bağlantısını açar, şemayı (backend/db.js ile
// birebir aynı tablolar) oluşturur ve WAL + foreign_keys ayarlarını yapar.
// Veritabanı dosyası, kullanıcının işletim sistemi tarafından ayrılan
// kalıcı veri klasöründe tutulur (bkz. Database::userDataDbPath()).
class Database {
public:
    // Uygulama açılışında bir kez çağrılır. Başarısızlıkta false döner.
    static bool init();

    // Açık bağlantıyı döner (init() sonrası geçerlidir).
    static QSqlDatabase &instance();

    // Veritabanı dosyasının tam yolu (~/.local/share/... gibi OS'e özgü konum).
    static QString userDataDbPath();

private:
    static void createSchema();
};
