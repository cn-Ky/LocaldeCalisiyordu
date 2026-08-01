#include <QApplication>
#include <QFile>
#include <QMessageBox>
#include <QTextStream>
#include <QIcon>

#include "core/Database.h"
#include "core/PasswordHasher.h"
#include "ui/LoginWindow.h"
#include "ui/MainWindow.h"

int main(int argc, char *argv[]) {
    QApplication app(argc, argv);
    QApplication::setApplicationName("Localde Çalışıyordu");
    QApplication::setApplicationVersion(APP_VERSION);
    QApplication::setOrganizationName("LocaldeCalisiyordu");
    QApplication::setWindowIcon(QIcon(":/app-icon.png"));

    if (!PasswordHasher::init()) {
        QMessageBox::critical(nullptr, "Başlatma Hatası", "Güvenlik kütüphanesi (libsodium) başlatılamadı.");
        return 1;
    }
    if (!Database::init()) {
        QMessageBox::critical(nullptr, "Başlatma Hatası", "Veritabanı açılamadı.");
        return 1;
    }

    // style.qss artık Qt kaynak sistemine (qrc) gömülü — kurulum sonrası
    // ayrı bir dosyaya bağımlılık yok. Geliştirme sırasında qrc derlenmemiş
    // olabileceğinden kaynak ağacındaki dosyaya düşülüyor (fallback).
    QFile styleFile(":/style.qss");
    if (!styleFile.exists()) styleFile.setFileName(SOURCE_STYLE_PATH);
    if (styleFile.open(QIODevice::ReadOnly | QIODevice::Text)) {
        app.setStyleSheet(QTextStream(&styleFile).readAll());
    }

    auto *loginWindow = new LoginWindow;
    MainWindow *mainWindow = nullptr;

    auto showMain = [&]() {
        if (!mainWindow) {
            mainWindow = new MainWindow;
            QObject::connect(mainWindow, &MainWindow::loggedOut, [&]() {
                mainWindow->hide();
                loginWindow->show();
            });
        } else {
            mainWindow->reloadProjects();
        }
        loginWindow->hide();
        mainWindow->show();
    };

    QObject::connect(loginWindow, &LoginWindow::authenticated, showMain);

    loginWindow->show();
    return app.exec();
}
