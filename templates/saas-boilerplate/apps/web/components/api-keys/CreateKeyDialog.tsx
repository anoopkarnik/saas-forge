"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CreateKeyDialog as CreateKeyDialogView } from "@workspace/ui/components/api-keys/CreateKeyDialog";
import { API_KEY_SCOPES } from "@workspace/auth/api-keys/scopes";
import { useTRPC } from "@/trpc/client";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (plaintext: string) => void;
};

export function CreateKeyDialog(props: Props) {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const create = useMutation(
    trpc.apiKey.create.mutationOptions({
      onSuccess: async () => {
        await qc.invalidateQueries({ queryKey: trpc.apiKey.list.queryKey() });
      },
    }),
  );

  return (
    <CreateKeyDialogView
      {...props}
      availableScopes={API_KEY_SCOPES}
      isPending={create.isPending}
      onCreate={async (input) => (await create.mutateAsync(input)).plaintext}
    />
  );
}
