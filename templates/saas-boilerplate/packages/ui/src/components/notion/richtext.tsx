import React from "react";

export function renderRichText(richText: any[] = []) {
  return richText.map((t, idx) => {
    const plain = t.plain_text ?? "";
    const a = t.annotations ?? {};

    let content: React.ReactNode = plain;

    if (a.code) {
      content = (
        <code key={idx} className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-sm text-primary">
          {content}
        </code>
      );
    }
    if (a.bold) {
      content = <strong key={idx} className="font-semibold">{content}</strong>;
    }
    if (a.italic) {
      content = <em key={idx}>{content}</em>;
    }
    if (a.strikethrough) {
      content = <s key={idx} className="opacity-80">{content}</s>;
    }
    if (a.underline) {
      content = <u key={idx} className="underline decoration-primary/50 underline-offset-4">{content}</u>;
    }

    if (t.href) {
      content = (
        <a key={idx} href={t.href} target="_blank" rel="noreferrer" className="text-primary underline-offset-4 hover:underline font-medium transition-colors">
          {content}
        </a>
      );
    }

    return <React.Fragment key={idx}>{content}</React.Fragment>;
  });
}
