import React from "react";
import { renderRichText } from "./richtext";
import { cn } from "../../lib/utils";

function Block({ block }: { block: any }) {
  const type = block.type;

  switch (type) {
    case "paragraph":
      return <p className="my-3 leading-7 text-foreground/90">{renderRichText(block.paragraph?.rich_text)}</p>;

    case "heading_1":
      return <h1 className="mt-10 mb-4 text-3xl font-bold tracking-tight text-foreground">{renderRichText(block.heading_1?.rich_text)}</h1>;

    case "heading_2":
      return <h2 className="mt-8 mb-3 text-2xl font-semibold tracking-tight text-foreground border-b border-border/40 pb-2">{renderRichText(block.heading_2?.rich_text)}</h2>;

    case "heading_3":
      return <h3 className="mt-6 mb-2 text-xl font-medium tracking-tight text-foreground">{renderRichText(block.heading_3?.rich_text)}</h3>;

    case "bulleted_list_item":
      return (
        <li className="my-1.5 leading-7 text-foreground/90 pl-1">
          {renderRichText(block.bulleted_list_item?.rich_text)}
          {block.children?.length ? <Blocks blocks={block.children} /> : null}
        </li>
      );

    case "numbered_list_item":
      return (
        <li className="my-1.5 leading-7 text-foreground/90 pl-1">
          {renderRichText(block.numbered_list_item?.rich_text)}
          {block.children?.length ? <Blocks blocks={block.children} /> : null}
        </li>
      );

    case "to_do":
      return (
        <div className="my-2 flex items-start gap-3 group">
          <input
            type="checkbox"
            checked={!!block.to_do?.checked}
            readOnly
            className="mt-1.5 h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground accent-primary cursor-default"
          />
          <div className="flex-1">
            <div className={cn("leading-7 transition-colors", block.to_do?.checked ? "line-through text-muted-foreground decoration-muted-foreground/50" : "text-foreground/90")}>
              {renderRichText(block.to_do?.rich_text)}
            </div>
            {block.children?.length ? <Blocks blocks={block.children} /> : null}
          </div>
        </div>
      );

    case "toggle":
      return (
        <details className="my-3 group">
          <summary className="cursor-pointer list-none flex items-center gap-2 font-medium text-foreground hover:text-primary transition-colors select-none">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right transition-transform group-open:rotate-90 text-muted-foreground"><path d="m9 18 6-6-6-6" /></svg>
            {renderRichText(block.toggle?.rich_text)}
          </summary>
          <div className="ml-6 mt-2 border-l-2 border-border/50 pl-4">
            {block.children?.length ? <Blocks blocks={block.children} /> : null}
          </div>
        </details>
      );

    case "quote":
      return (
        <blockquote className="my-6 border-l-4 border-primary/30 pl-4 py-1 italic text-muted-foreground bg-muted/10 rounded-r-lg">
          {renderRichText(block.quote?.rich_text)}
          {block.children?.length ? <Blocks blocks={block.children} /> : null}
        </blockquote>
      );

    case "divider":
      return <hr className="my-8 border-border/60" />;

    case "callout":
      return (
        <div className="my-4 rounded-lg border border-border/50 bg-muted/30 p-4 flex items-start gap-4 shadow-sm">
          {block.callout.icon?.emoji && <span className="text-xl flex-shrink-0">{block.callout.icon.emoji}</span>}
          <div className="flex-1">
            <div className="font-medium text-foreground/90">{renderRichText(block.callout?.rich_text)}</div>
            {block.children?.length ? <div className="mt-2"><Blocks blocks={block.children} /></div> : null}
          </div>
        </div>
      );

    case "code":
      return (
        <div className="my-4 relative group">
          <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Visual Copy Button Placeholder - logic would require state */}
            <div className="px-2 py-1 bg-white/10 text-white/70 text-xs rounded backdrop-blur-sm">Code</div>
          </div>
          <pre className="overflow-x-auto rounded-xl border border-zinc-700/50 bg-[#1e1e1e] p-4 text-sm text-zinc-100 shadow-md">
            <code className="font-mono leading-relaxed">{(block.code?.rich_text ?? []).map((t: any) => t.plain_text).join("")}</code>
          </pre>
          {block.code?.language && (
            <div className="absolute right-4 bottom-2 text-xs text-zinc-500 font-mono select-none">
              {block.code.language}
            </div>
          )}
        </div>
      );

    case "image": {
      const img = block.image;
      const url = img?.type === "external" ? img.external?.url : img?.file?.url;
      const caption = img?.caption?.length ? img.caption.map((c: any) => c.plain_text).join("") : null;

      return url ? (
        <figure className="my-6">
          <img src={url} alt={caption || "Notion image"} className="max-w-full rounded-xl border border-border shadow-md transition-all hover:scale-[1.005] duration-300" />
          {caption && <figcaption className="mt-2 text-center text-sm text-muted-foreground italic">{caption}</figcaption>}
        </figure>
      ) : null;
    }

    case "bookmark": {
      const url = block.bookmark?.url;
      return url ? (
        <a href={url} target="_blank" rel="noreferrer" className="my-3 block group">
          <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors shadow-sm">
            <div className="p-2 bg-primary/10 rounded-md text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-link"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
            </div>
            <span className="text-sm font-medium text-foreground/80 underline-offset-4 group-hover:underline truncate">{url}</span>
          </div>
        </a>
      ) : null;
    }

    default:
      return (
        <div className="my-2 rounded border border-dashed border-border/50 p-2 text-xs text-muted-foreground/50">
          Unsupported block: <span className="font-mono">{type}</span>
        </div>
      );
  }
}

// Groups consecutive list items into <ul>/<ol> like Notion does
export function Blocks({ blocks }: { blocks: any[] }) {
  const out: React.ReactNode[] = [];

  let i = 0;
  while (i < blocks.length) {
    const b = blocks[i];

    if (b.type === "bulleted_list_item") {
      const items: any[] = [];
      while (i < blocks.length && blocks[i].type === "bulleted_list_item") {
        items.push(blocks[i]);
        i++;
      }
      out.push(
        <ul key={`ul-${i}`} className="my-3 list-disc pl-6 marker:text-muted-foreground space-y-1">
          {items.map((it) => <Block key={it.id} block={it} />)}
        </ul>
      );
      continue;
    }

    if (b.type === "numbered_list_item") {
      const items: any[] = [];
      while (i < blocks.length && blocks[i].type === "numbered_list_item") {
        items.push(blocks[i]);
        i++;
      }
      out.push(
        <ol key={`ol-${i}`} className="my-3 list-decimal pl-6 marker:text-muted-foreground/80 space-y-1">
          {items.map((it) => <Block key={it.id} block={it} />)}
        </ol>
      );
      continue;
    }

    out.push(<Block key={b.id} block={b} />);
    i++;
  }

  return <div>{out}</div>;
}
