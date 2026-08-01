#include "ProjectEditorWindow.h"
#include "NewFileDialog.h"
#include "../core/FileService.h"

#include <QListWidget>
#include <QPlainTextEdit>
#include <QLabel>
#include <QToolBar>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QWidget>
#include <QSplitter>
#include <QMessageBox>
#include <QFont>
#include <QFontDatabase>

ProjectEditorWindow::ProjectEditorWindow(const Project &project, bool readOnly, QWidget *parent)
    : QMainWindow(parent), m_project(project), m_readOnly(readOnly) {
    resize(1000, 650);
    buildUi();
    updateWindowTitle();
    reloadFileList();
}

void ProjectEditorWindow::updateWindowTitle() {
    QString title = QString("%1 — Kod Editörü").arg(m_project.title);
    if (m_readOnly) title += " (salt okunur — @" + m_project.ownerUsername + ")";
    if (m_dirty) title += " *";
    setWindowTitle(title);
}

void ProjectEditorWindow::buildUi() {
    auto *toolbar = addToolBar("Araçlar");
    toolbar->setMovable(false);

    auto *saveAction = toolbar->addAction("Kaydet");
    connect(saveAction, &QAction::triggered, this, &ProjectEditorWindow::saveCurrentFile);
    saveAction->setEnabled(!m_readOnly);
    saveAction->setShortcut(QKeySequence::Save);

    auto *newFileAction = toolbar->addAction("Yeni Dosya");
    connect(newFileAction, &QAction::triggered, this, &ProjectEditorWindow::addNewFile);
    newFileAction->setEnabled(!m_readOnly);

    auto *deleteAction = toolbar->addAction("Dosyayı Sil");
    connect(deleteAction, &QAction::triggered, this, &ProjectEditorWindow::deleteCurrentFile);
    deleteAction->setEnabled(!m_readOnly);

    auto *central = new QWidget;
    auto *root = new QVBoxLayout(central);
    root->setContentsMargins(0, 0, 0, 0);

    auto *splitter = new QSplitter;

    m_fileList = new QListWidget;
    m_fileList->setMaximumWidth(220);
    connect(m_fileList, &QListWidget::currentItemChanged, this, &ProjectEditorWindow::fileSelectionChanged);
    splitter->addWidget(m_fileList);

    m_editor = new QPlainTextEdit;
    m_editor->setReadOnly(m_readOnly);
    const QFont mono = QFontDatabase::systemFont(QFontDatabase::FixedFont);
    m_editor->setFont(mono);
    m_editor->setTabStopDistance(4 * m_editor->fontMetrics().horizontalAdvance(' '));
    connect(m_editor, &QPlainTextEdit::textChanged, this, &ProjectEditorWindow::markDirty);
    splitter->addWidget(m_editor);

    splitter->setStretchFactor(0, 0);
    splitter->setStretchFactor(1, 1);
    root->addWidget(splitter, 1);

    m_statusLabel = new QLabel(" ");
    m_statusLabel->setContentsMargins(6, 3, 6, 3);
    root->addWidget(m_statusLabel);

    setCentralWidget(central);

    m_highlighter = new CodeHighlighter(CodeHighlighter::Mode::PlainText, m_editor->document());
}

void ProjectEditorWindow::reloadFileList() {
    m_files = FileService::listForProject(m_project.id);
    m_fileList->clear();
    for (const ProjectFile &f : m_files) {
        m_fileList->addItem(f.filename);
    }
    if (!m_files.isEmpty()) {
        m_loadingFile = true;
        m_fileList->setCurrentRow(0);
        m_loadingFile = false;
        loadFileIntoEditor(0);
    }
}

CodeHighlighter::Mode ProjectEditorWindow::highlighterModeFor(const QString &type) const {
    if (type == "html") return CodeHighlighter::Mode::Html;
    if (type == "css") return CodeHighlighter::Mode::Css;
    if (type == "js") return CodeHighlighter::Mode::Js;
    return CodeHighlighter::Mode::PlainText;
}

void ProjectEditorWindow::loadFileIntoEditor(int index) {
    if (index < 0 || index >= m_files.size()) return;
    m_loadingFile = true;
    m_editor->setPlainText(m_files[index].content);
    m_editor->document()->setModified(false);
    m_loadingFile = false;

    m_highlighter->setMode(highlighterModeFor(m_files[index].type));
    m_currentIndex = index;
    m_dirty = false;
    m_statusLabel->setText(QString("%1 — %2").arg(m_files[index].filename, m_files[index].type.toUpper()));
    updateWindowTitle();
}

void ProjectEditorWindow::markDirty() {
    if (m_loadingFile) return;
    if (!m_dirty) {
        m_dirty = true;
        updateWindowTitle();
    }
}

bool ProjectEditorWindow::maybeSaveBeforeSwitch() {
    if (!m_dirty || m_readOnly || m_currentIndex < 0) return true;

    const auto choice = QMessageBox::question(
        this, "Kaydedilmemiş değişiklikler",
        QString("\"%1\" dosyasında kaydedilmemiş değişiklikler var. Kaydedilsin mi?").arg(m_files[m_currentIndex].filename),
        QMessageBox::Yes | QMessageBox::No);
    if (choice == QMessageBox::Yes) {
        saveCurrentFile();
    }
    return true;
}

void ProjectEditorWindow::fileSelectionChanged(QListWidgetItem *current, QListWidgetItem *previous) {
    Q_UNUSED(previous);
    if (!current) return;
    maybeSaveBeforeSwitch();
    const int row = m_fileList->row(current);
    loadFileIntoEditor(row);
}

void ProjectEditorWindow::saveCurrentFile() {
    if (m_readOnly || m_currentIndex < 0) return;
    const QString content = m_editor->toPlainText();
    if (!FileService::updateContent(m_files[m_currentIndex].id, content)) {
        QMessageBox::warning(this, "Kaydedilemedi", "Dosya kaydedilirken bir hata oluştu.");
        return;
    }
    m_files[m_currentIndex].content = content;
    m_dirty = false;
    m_editor->document()->setModified(false);
    updateWindowTitle();
    m_statusLabel->setText(QString("%1 — kaydedildi ✔").arg(m_files[m_currentIndex].filename));
}

void ProjectEditorWindow::addNewFile() {
    if (m_readOnly) return;
    NewFileDialog dlg(this);
    if (dlg.exec() != QDialog::Accepted) return;

    const FileResult result = FileService::addFile(m_project.id, dlg.filename(), "");
    if (!result.ok) {
        QMessageBox::warning(this, "Dosya oluşturulamadı", result.error);
        return;
    }
    reloadFileList();
    for (int i = 0; i < m_files.size(); ++i) {
        if (m_files[i].id == result.file.id) {
            m_fileList->setCurrentRow(i);
            break;
        }
    }
}

void ProjectEditorWindow::deleteCurrentFile() {
    if (m_readOnly || m_currentIndex < 0) return;
    if (m_files.size() <= 1) {
        QMessageBox::information(this, "Silinemedi", "Bir projede en az bir dosya kalmalı.");
        return;
    }
    const auto choice = QMessageBox::question(
        this, "Dosyayı sil",
        QString("\"%1\" dosyasını silmek istediğinize emin misiniz?").arg(m_files[m_currentIndex].filename),
        QMessageBox::Yes | QMessageBox::No);
    if (choice != QMessageBox::Yes) return;

    FileService::remove(m_files[m_currentIndex].id);
    reloadFileList();
}
