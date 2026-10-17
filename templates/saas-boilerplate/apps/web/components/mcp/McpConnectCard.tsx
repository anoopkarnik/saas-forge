"use client";

import { useEffect, useState } from "react";
import { Button } from "@workspace/ui/components/shadcn/button";
import { useSiteConfig } from "@/components/site-config/SiteConfigProvider";

/** The name clients list the server under, e.g. "SaaS Forge" -> "saas-forge". */
export function mcpServerAlias(appName: string): string {
  return (
    appName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "app"
  );
}

/** How to connect an AI agent to /api/mcp with one of the user's API keys (mcp module). */
export function McpConnectCard() {
  const alias = mcpServerAlias(useSiteConfig()["branding.saasName"]);
  const [origin, setOrigin] = useState("https://your-app.example.com");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => setOrigin(window.location.origin), []);

  const endpoint = `${origin}/api/mcp`;
  const snippets = [
    {
      id: "claude",
      label: "Claude Code",
      code: `claude mcp add --transport http ${alias} ${endpoint} --header "Authorization: Bearer sk_..."`,
    },
    {
      id: "json",
      label: "Cursor, VS Code and other clients",
      code: JSON.stringify(
        { mcpServers: { [alias]: { url: endpoint, headers: { Authorization: "Bearer sk_..." } } } },
        null,
        2,
      ),
    },
  ];

  async function copy(id: string, code: string) {
    await navigator.clipboard.writeText(code);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <section aria-labelledby="mcp-connect" className="flex flex-col gap-3 rounded-md border p-4">
      <div>
        <h2 id="mcp-connect" className="text-lg font-semibold">Connect an AI agent</h2>
        <p className="text-sm text-muted-foreground">
          Agents such as Claude, Cursor and ChatGPT can read your account through the MCP endpoint{" "}
          <code>{endpoint}</code>. Use one of your API keys; each tool needs the scope it lists.
        </p>
      </div>
      {snippets.map((snippet) => (
        <div key={snippet.id} className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{snippet.label}</span>
            <Button size="sm" variant="outline" onClick={() => copy(snippet.id, snippet.code)}>
              {copied === snippet.id ? "Copied" : "Copy"}
            </Button>
          </div>
          <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
            <code>{snippet.code}</code>
          </pre>
        </div>
      ))}
    </section>
  );
}
