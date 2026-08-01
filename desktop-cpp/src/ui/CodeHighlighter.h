#pragma once
#include <QSyntaxHighlighter>
#include <QRegularExpression>
#include <QTextCharFormat>
#include <QVector>

class CodeHighlighter : public QSyntaxHighlighter {
    Q_OBJECT
public:
    enum class Mode { Html, Css, Js, PlainText };

    explicit CodeHighlighter(Mode mode, QTextDocument *parent = nullptr);
    void setMode(Mode mode);

protected:
    void highlightBlock(const QString &text) override;

private:
    struct Rule {
        QRegularExpression pattern;
        QTextCharFormat format;
    };

    void setupHtmlRules();
    void setupCssRules();
    void setupJsRules();

    Mode m_mode;
    QVector<Rule> m_rules;

    // Çok satırlı /* ... */ yorumları için (CSS/JS).
    QRegularExpression m_commentStart;
    QRegularExpression m_commentEnd;
    QTextCharFormat m_commentFormat;
};
