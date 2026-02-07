import React from "react";
import { renderRichText } from "./richtext";

function Block({ block }: { block: any }) {
  const type = block.type;

  switch (type) {
    case "paragraph":
      return <p className="my-2 leading-7">{renderRichText(block.paragraph?.rich_text)}</p>;

    case "heading_1":
      return <h1 className="mt-8 mb-4 text-3xl font-semibold">{renderRichText(block.heading_1?.rich_text)}</h1>;

    case "heading_2":
      return <h2 className="mt-6 mb-3 text-2xl font-semibold">{renderRichText(block.heading_2?.rich_text)}</h2>;

    case "heading_3":
      return <h3 className="mt-4 mb-2 text-xl font-semibold">{renderRichText(block.heading_3?.rich_text)}</h3>;

    case "bulleted_list_item":
      return (
        <li className="my-1">
          {renderRichText(block.bulleted_list_item?.rich_text)}
          {block.children?.length ? <Blocks blocks={block.children} /> : null}
        </li>
      );

    case "numbered_list_item":
      return (
        <li className="my-1">
          {renderRichText(block.numbered_list_item?.rich_text)}
          {block.children?.length ? <Blocks blocks={block.children} /> : null}
        </li>
      );

    case "to_do":
      return (
        <div className="my-2 flex items-start gap-2">
          <input type="checkbox" checked={!!block.to_do?.checked} readOnly className="mt-1" />
          <div>
            <div className={block.to_do?.checked ? "line-through opacity-70" : ""}>
              {renderRichText(block.to_do?.rich_text)}
            </div>
            {block.children?.length ? <Blocks blocks={block.children} /> : null}
          </div>
        </div>
      );

    case "toggle":
      return (
        <details className="my-2">
          <summary className="cursor-pointer">
            {renderRichText(block.toggle?.rich_text)}
          </summary>
          <div className="ml-4 mt-2">
            {block.children?.length ? <Blocks blocks={block.children} /> : null}
          </div>
        </details>
      );

    case "quote":
      return (
        <blockquote className="my-3 border-l-4 pl-4 italic opacity-90">
          {renderRichText(block.quote?.rich_text)}
          {block.children?.length ? <Blocks blocks={block.children} /> : null}
        </blockquote>
      );

    case "divider":
      return <hr className="my-6" />;

    case "callout":
      return (
        <div className="my-3 rounded-lg border p-3">
          <div className="font-medium">{renderRichText(block.callout?.rich_text)}</div>
          {block.children?.length ? <div className="ml-2 mt-2"><Blocks blocks={block.children} /></div> : null}
        </div>
      );

    case "code":
      return (
        <pre className="my-3 overflow-x-auto rounded-lg border p-3 text-sm">
          <code>{(block.code?.rich_text ?? []).map((t: any) => t.plain_text).join("")}</code>
        </pre>
      );

    case "image": {
      const img = block.image;
      // Works for external images. File URLs expire unless you proxy/cach them.
      const url = img?.type === "external" ? img.external?.url : img?.file?.url;
      return url ? (
        <figure className="my-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="Notion image" className="max-w-full rounded-lg border" />
        </figure>
      ) : null;
    }

    case "bookmark": {
      const url = block.bookmark?.url;
      return url ? (
        <a href={url} target="_blank" rel="noreferrer" className="my-2 block underline">
          {url}
        </a>
      ) : null;
    }

    default:
      // fallback for unsupported blocks
      return (
        <div className="my-2 rounded border p-2 text-sm opacity-70">
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
        <ul key={`ul-${i}`} className="my-2 list-disc pl-6">
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
        <ol key={`ol-${i}`} className="my-2 list-decimal pl-6">
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
