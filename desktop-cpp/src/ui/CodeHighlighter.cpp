#include "CodeHighlighter.h"

// Renkler frontend/src/styles/win98.css içindeki tasarım tokenlarıyla
// (accent cyan, danger red vb.) uyumlu tutuldu.
namespace {
QTextCharFormat makeFormat(const QColor &color, bool bold = false) {
    QTextCharFormat f;
    f.setForeground(color);
    if (bold) f.setFontWeight(QFont::Bold);
    return f;
}
}

CodeHighlighter::CodeHighlighter(Mode mode, QTextDocument *parent)
    : QSyntaxHighlighter(parent), m_mode(mode) {
    setMode(mode);
}

void CodeHighlighter::setMode(Mode mode) {
    m_mode = mode;
    m_rules.clear();
    m_commentStart = QRegularExpression();
    m_commentEnd = QRegularExpression();

    switch (m_mode) {
        case Mode::Html: setupHtmlRules(); break;
        case Mode::Css:  setupCssRules();  break;
        case Mode::Js:   setupJsRules();   break;
        case Mode::PlainText: break;
    }
    rehighlight();
}

void CodeHighlighter::setupHtmlRules() {
    const QTextCharFormat tagFormat = makeFormat(QColor("#00e6ff"), true);
    const QTextCharFormat attrFormat = makeFormat(QColor("#f5c451"));
    const QTextCharFormat stringFormat = makeFormat(QColor("#7ee08c"));
    const QTextCharFormat commentFormat = makeFormat(QColor("#6a6f96"));

    // <tag veya </tag
    m_rules.append({QRegularExpression(R"(</?[A-Za-z][A-Za-z0-9-]*)"), tagFormat});
    // kapanış >, />
    m_rules.append({QRegularExpression(R"(/?>)"), tagFormat});
    // attribute="value" / attribute='value'
    m_rules.append({QRegularExpression(R"("[^"]*"|'[^']*')"), stringFormat});
    // attribute adı
    m_rules.append({QRegularExpression(R"(\b[a-zA-Z-]+(?==))"), attrFormat});
    // <!-- yorum -->
    m_rules.append({QRegularExpression(R"(<!--[\s\S]*?-->)"), commentFormat});
}

void CodeHighlighter::setupCssRules() {
    const QTextCharFormat selectorFormat = makeFormat(QColor("#00e6ff"), true);
    const QTextCharFormat propertyFormat = makeFormat(QColor("#f5c451"));
    const QTextCharFormat valueFormat = makeFormat(QColor("#7ee08c"));
    const QTextCharFormat commentFormat = makeFormat(QColor("#6a6f96"));

    // özellik-adı:
    m_rules.append({QRegularExpression(R"([a-zA-Z-]+(?=\s*:))"), propertyFormat});
    // : değer;  içindeki değer kısmı (basit yaklaşım: ':' sonrası ';' öncesi)
    m_rules.append({QRegularExpression(R"(:[^;{}]+)"), valueFormat});
    // .class, #id, tag seçicileri (satır başında ya da { öncesinde)
    m_rules.append({QRegularExpression(R"((^|\s)[.#]?[a-zA-Z][a-zA-Z0-9_-]*(?=\s*\{))"), selectorFormat});
    // renkler #fff #00e6ff
    m_rules.append({QRegularExpression(R"(#[0-9a-fA-F]{3,8}\b)"), valueFormat});

    m_commentStart = QRegularExpression(R"(/\*)");
    m_commentEnd = QRegularExpression(R"(\*/)");
    m_commentFormat = commentFormat;
}

void CodeHighlighter::setupJsRules() {
    const QTextCharFormat keywordFormat = makeFormat(QColor("#00e6ff"), true);
    const QTextCharFormat stringFormat = makeFormat(QColor("#7ee08c"));
    const QTextCharFormat numberFormat = makeFormat(QColor("#f5c451"));
    const QTextCharFormat commentFormat = makeFormat(QColor("#6a6f96"));
    const QTextCharFormat functionFormat = makeFormat(QColor("#ff9c6a"));

    static const QStringList keywords = {
        "const", "let", "var", "function", "return", "if", "else", "for", "while",
        "do", "switch", "case", "break", "continue", "class", "extends", "new",
        "this", "super", "typeof", "instanceof", "null", "undefined", "true",
        "false", "import", "export", "default", "from", "as", "try", "catch",
        "finally", "throw", "async", "await", "yield", "delete", "in", "of",
        "static", "get", "set", "void"
    };
    for (const QString &kw : keywords) {
        m_rules.append({QRegularExpression("\\b" + kw + "\\b"), keywordFormat});
    }

    // fonksiyon çağrısı: isim(
    m_rules.append({QRegularExpression(R"(\b[A-Za-z_$][A-Za-z0-9_$]*(?=\s*\())"), functionFormat});
    // sayılar
    m_rules.append({QRegularExpression(R"(\b\d+(\.\d+)?\b)"), numberFormat});
    // dizeler: '...', "...", `...`
    m_rules.append({QRegularExpression(R"('[^'\\]*(\\.[^'\\]*)*'|"[^"\\]*(\\.[^"\\]*)*"|`[^`\\]*(\\.[^`\\]*)*`)"), stringFormat});
    // tek satır yorum
    m_rules.append({QRegularExpression(R"(//[^\n]*)"), commentFormat});

    m_commentStart = QRegularExpression(R"(/\*)");
    m_commentEnd = QRegularExpression(R"(\*/)");
    m_commentFormat = commentFormat;
}

void CodeHighlighter::highlightBlock(const QString &text) {
    for (const Rule &rule : m_rules) {
        auto it = rule.pattern.globalMatch(text);
        while (it.hasNext()) {
            const QRegularExpressionMatch match = it.next();
            setFormat(match.capturedStart(), match.capturedLength(), rule.format);
        }
    }

    // Çok satırlı /* ... */ yorum takibi (CSS/JS için).
    if (m_commentStart.pattern().isEmpty()) {
        setCurrentBlockState(0);
        return;
    }

    setCurrentBlockState(0);
    int startIndex = 0;
    if (previousBlockState() != 1) {
        startIndex = text.indexOf(m_commentStart);
    }

    while (startIndex >= 0) {
        const QRegularExpressionMatch endMatch = m_commentEnd.match(text, startIndex);
        int endIndex = endMatch.capturedStart();
        int length;
        if (endIndex == -1) {
            setCurrentBlockState(1);
            length = text.length() - startIndex;
        } else {
            length = endIndex - startIndex + endMatch.capturedLength();
        }
        setFormat(startIndex, length, m_commentFormat);
        startIndex = text.indexOf(m_commentStart, startIndex + length);
    }
}
