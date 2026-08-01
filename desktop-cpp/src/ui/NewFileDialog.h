#pragma once
#include <QDialog>

class QLineEdit;

class NewFileDialog : public QDialog {
    Q_OBJECT
public:
    explicit NewFileDialog(QWidget *parent = nullptr);
    QString filename() const;

private:
    QLineEdit *m_filename;
};
