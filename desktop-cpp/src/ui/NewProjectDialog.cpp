#include "NewProjectDialog.h"

#include <QFormLayout>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QLineEdit>
#include <QTextEdit>
#include <QRadioButton>
#include <QDialogButtonBox>
#include <QPushButton>
#include <QLabel>

NewProjectDialog::NewProjectDialog(QWidget *parent) : QDialog(parent) {
    setWindowTitle("Yeni Proje");
    setMinimumWidth(360);

    auto *root = new QVBoxLayout(this);
    auto *form = new QFormLayout;

    m_title = new QLineEdit;
    m_description = new QTextEdit;
    m_description->setFixedHeight(80);

    form->addRow("Başlık", m_title);
    form->addRow("Açıklama", m_description);

    auto *visRow = new QHBoxLayout;
    m_publicRadio = new QRadioButton("Herkese Açık");
    m_privateRadio = new QRadioButton("Özel");
    m_publicRadio->setChecked(true);
    visRow->addWidget(m_publicRadio);
    visRow->addWidget(m_privateRadio);
    form->addRow("Görünürlük", visRow);

    root->addLayout(form);

    auto *buttons = new QDialogButtonBox(QDialogButtonBox::Ok | QDialogButtonBox::Cancel);
    buttons->button(QDialogButtonBox::Ok)->setText("Oluştur");
    buttons->button(QDialogButtonBox::Cancel)->setText("Vazgeç");
    connect(buttons, &QDialogButtonBox::accepted, this, &QDialog::accept);
    connect(buttons, &QDialogButtonBox::rejected, this, &QDialog::reject);
    root->addWidget(buttons);
}

QString NewProjectDialog::title() const { return m_title->text().trimmed(); }
QString NewProjectDialog::description() const { return m_description->toPlainText(); }
QString NewProjectDialog::visibility() const { return m_privateRadio->isChecked() ? "private" : "public"; }
