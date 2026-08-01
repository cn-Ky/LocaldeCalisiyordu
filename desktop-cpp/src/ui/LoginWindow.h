#pragma once
#include <QWidget>

class QLineEdit;
class QLabel;
class QTabWidget;

class LoginWindow : public QWidget {
    Q_OBJECT
public:
    explicit LoginWindow(QWidget *parent = nullptr);

signals:
    void authenticated();

private slots:
    void handleLogin();
    void handleRegister();

private:
    QWidget *buildLoginTab();
    QWidget *buildRegisterTab();

    QTabWidget *m_tabs;

    QLineEdit *m_loginUsername;
    QLineEdit *m_loginPassword;
    QLabel *m_loginError;

    QLineEdit *m_regUsername;
    QLineEdit *m_regPassword;
    QLineEdit *m_regPasswordConfirm;
    QLabel *m_regError;
};
