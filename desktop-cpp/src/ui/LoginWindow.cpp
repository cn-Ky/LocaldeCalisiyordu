#include "LoginWindow.h"
#include "../core/AuthService.h"
#include "../core/Session.h"

#include <QVBoxLayout>
#include <QFormLayout>
#include <QTabWidget>
#include <QLineEdit>
#include <QPushButton>
#include <QLabel>

LoginWindow::LoginWindow(QWidget *parent) : QWidget(parent) {
    setWindowTitle("Localde Çalışıyordu — Giriş");
    setMinimumWidth(360);

    auto *root = new QVBoxLayout(this);

    auto *title = new QLabel("Localde Çalışıyordu");
    title->setObjectName("appTitle");
    title->setAlignment(Qt::AlignCenter);
    root->addWidget(title);

    m_tabs = new QTabWidget(this);
    m_tabs->addTab(buildLoginTab(), "Giriş Yap");
    m_tabs->addTab(buildRegisterTab(), "Kayıt Ol");
    root->addWidget(m_tabs);
}

QWidget *LoginWindow::buildLoginTab() {
    auto *w = new QWidget;
    auto *form = new QFormLayout(w);

    m_loginUsername = new QLineEdit;
    m_loginPassword = new QLineEdit;
    m_loginPassword->setEchoMode(QLineEdit::Password);
    m_loginError = new QLabel;
    m_loginError->setObjectName("errorLabel");
    m_loginError->setWordWrap(true);

    form->addRow("Kullanıcı adı", m_loginUsername);
    form->addRow("Şifre", m_loginPassword);
    form->addRow(m_loginError);

    auto *submit = new QPushButton("Giriş Yap");
    connect(submit, &QPushButton::clicked, this, &LoginWindow::handleLogin);
    connect(m_loginPassword, &QLineEdit::returnPressed, this, &LoginWindow::handleLogin);
    form->addRow(submit);

    return w;
}

QWidget *LoginWindow::buildRegisterTab() {
    auto *w = new QWidget;
    auto *form = new QFormLayout(w);

    m_regUsername = new QLineEdit;
    m_regPassword = new QLineEdit;
    m_regPassword->setEchoMode(QLineEdit::Password);
    m_regPasswordConfirm = new QLineEdit;
    m_regPasswordConfirm->setEchoMode(QLineEdit::Password);
    m_regError = new QLabel;
    m_regError->setObjectName("errorLabel");
    m_regError->setWordWrap(true);

    form->addRow("Kullanıcı adı", m_regUsername);
    form->addRow("Şifre", m_regPassword);
    form->addRow("Şifre (tekrar)", m_regPasswordConfirm);
    form->addRow(m_regError);

    auto *submit = new QPushButton("Kayıt Ol");
    connect(submit, &QPushButton::clicked, this, &LoginWindow::handleRegister);
    connect(m_regPasswordConfirm, &QLineEdit::returnPressed, this, &LoginWindow::handleRegister);
    form->addRow(submit);

    return w;
}

void LoginWindow::handleLogin() {
    m_loginError->clear();
    const AuthResult result = AuthService::login(m_loginUsername->text().trimmed(), m_loginPassword->text());
    if (!result.ok) {
        m_loginError->setText(result.error);
        return;
    }
    Session::instance().login(result.user);
    emit authenticated();
}

void LoginWindow::handleRegister() {
    m_regError->clear();
    if (m_regPassword->text() != m_regPasswordConfirm->text()) {
        m_regError->setText("Şifreler eşleşmiyor.");
        return;
    }
    const AuthResult result = AuthService::registerUser(m_regUsername->text().trimmed(), m_regPassword->text());
    if (!result.ok) {
        m_regError->setText(result.error);
        return;
    }
    Session::instance().login(result.user);
    emit authenticated();
}
