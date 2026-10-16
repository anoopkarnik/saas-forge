import type { z } from "zod";
import type { ApiKeyScope } from "@workspace/auth/api-keys";

/** The API key's user and scopes, resolved before any tool runs. */
export type McpCaller = { userId: string; scopes: readonly string[] };

/** A failure the agent can act on; its message is shown to the model as-is. */
export class McpToolError extends Error {}

export type McpTool<S extends z.ZodObject = z.ZodObject> = {
  name: string;
  title: string;
  description: string;
  /** The API-key scope the tool needs; checked before it runs. */
  scope: ApiKeyScope;
  readOnly: boolean;
  input: S;
  run: (input: z.infer<S>, caller: McpCaller) => Promise<unknown>;
};

/** Defines a tool with typed input; the list holding it only needs the erased shape. */
export const defineMcpTool = <S extends z.ZodObject>(definition: McpTool<S>) =>
  definition as unknown as McpTool;
