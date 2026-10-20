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
  const [status, setStatus] = React.useState("");
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);


  const copyToClipboard = async () => {
    const textToCopy = code ?? "";
    if (textToCopy) {
      try {
        await navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setStatus("Command copied");
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), 2000);
      } catch {
        setStatus("Could not copy. Please select and copy the command manually.");
      }
    }
  };


  return (
    <div className="relative rounded-lg bg-slate-900 p-4 font-mono text-sm flex justify-between items-center gap-3 w-full max-w-[400px] min-w-0">
      <div className="min-w-0 flex-1 overflow-x-auto">
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
      </div>
      <button
              type="button" aria-label={copied ? "Command copied" : "Copy command"}
              onClick={copyToClipboard}
              className="flex size-11 shrink-0 items-center justify-center rounded-md text-zinc-300 hover:text-zinc-200 transition-colors font-sans"
            >
              {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
            </button>
      <span role="status" aria-atomic="true" className="sr-only">{status}</span>
    </div>
  );
};
