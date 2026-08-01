#pragma once
#include <QMainWindow>
#include "../core/Models.h"

class QTableWidget;
class QLabel;
class QTableWidgetItem;

class MainWindow : public QMainWindow {
    Q_OBJECT
public:
    explicit MainWindow(QWidget *parent = nullptr);
    void reloadProjects();

signals:
    void loggedOut();

private slots:
    void createProject();
    void logout();
    void openProject(int row, int column);

private:
    void buildUi();

    QTableWidget *m_table;
    QLabel *m_userLabel;
    QList<Project> m_projects;
};
