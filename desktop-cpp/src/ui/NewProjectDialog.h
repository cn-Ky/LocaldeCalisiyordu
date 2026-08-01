#pragma once
#include <QDialog>

class QLineEdit;
class QTextEdit;
class QRadioButton;
class QLabel;

class NewProjectDialog : public QDialog {
    Q_OBJECT
public:
    explicit NewProjectDialog(QWidget *parent = nullptr);

    QString title() const;
    QString description() const;
    QString visibility() const; // "public" | "private"

private:
    QLineEdit *m_title;
    QTextEdit *m_description;
    QRadioButton *m_publicRadio;
    QRadioButton *m_privateRadio;
};
