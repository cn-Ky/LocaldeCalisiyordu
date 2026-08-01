#include "MainWindow.h"
#include "NewProjectDialog.h"
#include "ProjectEditorWindow.h"
#include "../core/ProjectService.h"
#include "../core/Session.h"

#include <QWidget>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QTableWidget>
#include <QTableWidgetItem>
#include <QAbstractItemView>
#include <QHeaderView>
#include <QLabel>
#include <QPushButton>
#include <QMessageBox>
#include <QToolBar>
#include <QApplication>

MainWindow::MainWindow(QWidget *parent) : QMainWindow(parent) {
    setWindowTitle("Localde Çalışıyordu");
    resize(900, 600);
    buildUi();
    reloadProjects();
}

void MainWindow::buildUi() {
    auto *central = new QWidget;
    auto *root = new QVBoxLayout(central);

    // Üst çubuk: uygulama adı solda, kullanıcı bilgisi + çıkış sağda.
    auto *topBar = new QHBoxLayout;
    auto *appLabel = new QLabel("Localde Çalışıyordu");
    appLabel->setObjectName("appTitle");
    topBar->addWidget(appLabel);
    topBar->addStretch();

    m_userLabel = new QLabel;
    topBar->addWidget(m_userLabel);

    auto *newProjectBtn = new QPushButton("Yeni Proje");
    connect(newProjectBtn, &QPushButton::clicked, this, &MainWindow::createProject);
    topBar->addWidget(newProjectBtn);

    auto *refreshBtn = new QPushButton("Yenile");
    connect(refreshBtn, &QPushButton::clicked, this, &MainWindow::reloadProjects);
    topBar->addWidget(refreshBtn);

    auto *logoutBtn = new QPushButton("Çıkış Yap");
    connect(logoutBtn, &QPushButton::clicked, this, &MainWindow::logout);
    topBar->addWidget(logoutBtn);

    auto *aboutBtn = new QPushButton("Hakkında");
    connect(aboutBtn, &QPushButton::clicked, this, [this]() {
        QMessageBox::about(this, "Localde Çalışıyordu Hakkında",
            QString("<b>Localde Çalışıyordu</b> — sürüm %1<br><br>"
                    "Native masaüstü istemcisi (Qt6 / C++).<br>"
                    "Backend yok — SQLite'a doğrudan bağlanır.<br>"
                    "Şifreler Argon2id (libsodium) ile hashlenir.")
                .arg(QApplication::applicationVersion()));
    });
    topBar->addWidget(aboutBtn);

    root->addLayout(topBar);

    m_table = new QTableWidget(0, 5);
    m_table->setHorizontalHeaderLabels({"Başlık", "Sahibi", "Görünürlük", "Yıldız", "Güncellendi"});
    m_table->horizontalHeader()->setStretchLastSection(true);
    m_table->horizontalHeader()->setSectionResizeMode(0, QHeaderView::Stretch);
    m_table->setEditTriggers(QAbstractItemView::NoEditTriggers);
    m_table->setSelectionBehavior(QAbstractItemView::SelectRows);
    m_table->setSelectionMode(QAbstractItemView::SingleSelection);
    connect(m_table, &QTableWidget::cellDoubleClicked, this, &MainWindow::openProject);
    root->addWidget(m_table);

    setCentralWidget(central);
}

void MainWindow::reloadProjects() {
    const int uid = Session::instance().currentUser().id;
    m_userLabel->setText(QString("@%1").arg(Session::instance().currentUser().username));

    const QList<Project> projects = ProjectService::listFeed(uid);
    m_projects = projects;
    m_table->setRowCount(projects.size());
    for (int row = 0; row < projects.size(); ++row) {
        const Project &p = projects[row];
        m_table->setItem(row, 0, new QTableWidgetItem(p.title));
        m_table->setItem(row, 1, new QTableWidgetItem("@" + p.ownerUsername));
        m_table->setItem(row, 2, new QTableWidgetItem(p.visibility == "public" ? "Herkese Açık" : "Özel"));
        m_table->setItem(row, 3, new QTableWidgetItem(QString::number(p.stars)));
        m_table->setItem(row, 4, new QTableWidgetItem(p.updatedAt));
    }
}

void MainWindow::createProject() {
    NewProjectDialog dlg(this);
    if (dlg.exec() != QDialog::Accepted) return;

    const int uid = Session::instance().currentUser().id;
    const ProjectResult result = ProjectService::create(uid, dlg.title(), dlg.description(), dlg.visibility());
    if (!result.ok) {
        QMessageBox::warning(this, "Proje oluşturulamadı", result.error);
        return;
    }
    reloadProjects();
}

void MainWindow::logout() {
    Session::instance().logout();
    emit loggedOut();
}

void MainWindow::openProject(int row, int column) {
    Q_UNUSED(column);
    if (row < 0 || row >= m_projects.size()) return;

    const Project &project = m_projects[row];
    const bool readOnly = project.ownerId != Session::instance().currentUser().id;

    // Pencereyi 'this' parent'sız açıyoruz ki bağımsız bir üst pencere
    // olarak kalsın; kapanınca kendi kendini silsin.
    auto *editor = new ProjectEditorWindow(project, readOnly);
    editor->setAttribute(Qt::WA_DeleteOnClose);
    editor->show();
}
