import React from "react";

export function renderRichText(richText: any[] = []) {
  return richText.map((t, idx) => {
    const plain = t.plain_text ?? "";
    const a = t.annotations ?? {};
    const style: React.CSSProperties = {
      fontWeight: a.bold ? "600" : undefined,
      fontStyle: a.italic ? "italic" : undefined,
      textDecoration: [
        a.underline ? "underline" : "",
        a.strikethrough ? "line-through" : "",
      ].filter(Boolean).join(" "),
      fontFamily: a.code ? "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" : undefined,
      whiteSpace: "pre-wrap",
    };

    const content = <span style={style}>{plain}</span>;

    if (t.href) {
      return (
        <a key={idx} href={t.href} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>
          {content}
        </a>
      );
    }

    return <React.Fragment key={idx}>{content}</React.Fragment>;
  });
}
