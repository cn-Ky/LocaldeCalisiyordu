#pragma once
#include <QMainWindow>
#include "../core/Models.h"
#include "CodeHighlighter.h"

class QListWidget;
class QPlainTextEdit;
class QLabel;
class QListWidgetItem;

class ProjectEditorWindow : public QMainWindow {
    Q_OBJECT
public:
    // readOnly: görüntüleyen kişi projenin sahibi değilse true (yalnızca
    // herkese açık projeler için mümkündür; private projeler zaten
    // ProjectService::listFeed ile başkasına hiç görünmez).
    ProjectEditorWindow(const Project &project, bool readOnly, QWidget *parent = nullptr);

private slots:
    void fileSelectionChanged(QListWidgetItem *current, QListWidgetItem *previous);
    void saveCurrentFile();
    void addNewFile();
    void deleteCurrentFile();
    void markDirty();

private:
    void buildUi();
    void reloadFileList();
    void loadFileIntoEditor(int index);
    bool maybeSaveBeforeSwitch();
    CodeHighlighter::Mode highlighterModeFor(const QString &type) const;
    void updateWindowTitle();

    Project m_project;
    bool m_readOnly;

    QListWidget *m_fileList;
    QPlainTextEdit *m_editor;
    QLabel *m_statusLabel;
    CodeHighlighter *m_highlighter;

    QList<ProjectFile> m_files;
    int m_currentIndex = -1;
    bool m_dirty = false;
    bool m_loadingFile = false; // programatik setPlainText sırasında markDirty'yi bastırmak için
};
