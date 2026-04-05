"use client";
import React from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { IconCheck, IconCopy } from "@tabler/icons-react";

type HeroCodeBlockProps = {
  language: string;
  code: string;
};

export const HeroCodeBlock = ({
  language,
  code
}: HeroCodeBlockProps) => {
  const [copied, setCopied] = React.useState(false);


  const copyToClipboard = async () => {
    const textToCopy = code ?? "";
    if (textToCopy) {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };


  return (
    <div className="relative rounded-lg bg-slate-900 p-4 font-mono text-sm flex justify-between items-center gap-4 w-[400px]">
      <SyntaxHighlighter
        language={language}
        style={atomDark}
        customStyle={{
          margin: 0,
          padding: 0,
          background: "transparent",
          fontSize: "0.875rem", // text-sm equivalent
        }}
        wrapLines={true}
        showLineNumbers={false}
        
        PreTag="div"
      >
        {String('$ ' + code)}
      </SyntaxHighlighter>
      <button
              onClick={copyToClipboard}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors font-sans"
            >
              {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
            </button>
      
    </div>
  );
};
