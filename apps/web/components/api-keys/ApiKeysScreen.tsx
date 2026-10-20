"use client";

import { useState } from "react";
import { ApiKeyList } from "./ApiKeyList";
import { CreateKeyDialog } from "./CreateKeyDialog";
import { RevealKeyDialog } from "./RevealKeyDialog";
import { McpConnectCard } from "@/components/mcp/McpConnectCard";

export function ApiKeysScreen() {
  const [createOpen, setCreateOpen] = useState(false);
  const [plaintext, setPlaintext] = useState<string | null>(null);

  return (
    <>
      <ApiKeyList onCreateClick={() => setCreateOpen(true)} />
      <McpConnectCard />
      <CreateKeyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={setPlaintext}
      />
      <RevealKeyDialog plaintext={plaintext} onClose={() => setPlaintext(null)} />
    </>
  );
}
