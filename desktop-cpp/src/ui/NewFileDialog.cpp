#include "NewFileDialog.h"

#include <QFormLayout>
#include <QVBoxLayout>
#include <QLineEdit>
#include <QLabel>
#include <QDialogButtonBox>
#include <QPushButton>

NewFileDialog::NewFileDialog(QWidget *parent) : QDialog(parent) {
    setWindowTitle("Yeni Dosya");
    setMinimumWidth(300);

    auto *root = new QVBoxLayout(this);
    auto *form = new QFormLayout;

    m_filename = new QLineEdit;
    m_filename->setPlaceholderText("orn. about.html");
    form->addRow("Dosya adı", m_filename);

    auto *hint = new QLabel("Sadece .html, .css ve .js dosyaları desteklenir.");
    hint->setObjectName("errorLabel");
    hint->setWordWrap(true);
    form->addRow(hint);

    root->addLayout(form);

    auto *buttons = new QDialogButtonBox(QDialogButtonBox::Ok | QDialogButtonBox::Cancel);
    buttons->button(QDialogButtonBox::Ok)->setText("Oluştur");
    buttons->button(QDialogButtonBox::Cancel)->setText("Vazgeç");
    connect(buttons, &QDialogButtonBox::accepted, this, &QDialog::accept);
    connect(buttons, &QDialogButtonBox::rejected, this, &QDialog::reject);
    root->addWidget(buttons);

    connect(m_filename, &QLineEdit::returnPressed, this, &QDialog::accept);
}

QString NewFileDialog::filename() const { return m_filename->text().trimmed(); }
