"use client";

import { useState } from "react";
import { ApiKeyList } from "./ApiKeyList";
import { CreateKeyDialog } from "./CreateKeyDialog";
import { RevealKeyDialog } from "./RevealKeyDialog";
// scaffold:begin mcp
import { McpConnectCard } from "@/components/mcp/McpConnectCard";
// scaffold:end mcp

export function ApiKeysScreen() {
  const [createOpen, setCreateOpen] = useState(false);
  const [plaintext, setPlaintext] = useState<string | null>(null);

  return (
    <>
      <ApiKeyList onCreateClick={() => setCreateOpen(true)} />
      {/* scaffold:begin mcp */}
      <McpConnectCard />
      {/* scaffold:end mcp */}
      <CreateKeyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={setPlaintext}
      />
      <RevealKeyDialog plaintext={plaintext} onClose={() => setPlaintext(null)} />
    </>
  );
}
