import fs from "node:fs";
import path from "node:path";
import { parse, TYPE, type MessageFormatElement } from "@formatjs/icu-messageformat-parser";

export type Catalogue = Record<string, unknown>;
export type CatalogueProblem = {
  locale: string;
  key: string;
  problem: "missing" | "extra" | "invalid" | "arguments";
  detail?: string;
};

/** namespace/file name -> parsed JSON, for one locale directory. */
export function readCatalogue(dir: string): Catalogue {
  return Object.fromEntries(
    fs
      .readdirSync(dir)
      .filter((file) => file.endsWith(".json"))
      .map((file) => [file.replace(/\.json$/, ""), JSON.parse(fs.readFileSync(path.join(dir, file), "utf-8"))]),
  );
}

export function flattenMessages(value: unknown, prefix = "", out = new Map<string, string>()): Map<string, string> {
  if (typeof value === "string") {
    out.set(prefix, value);
  } else if (typeof value === "object" && value !== null) {
    for (const [key, child] of Object.entries(value)) flattenMessages(child, prefix ? `${prefix}.${key}` : key, out);
  }
  return out;
}

function collectArguments(elements: MessageFormatElement[], names: Set<string>): void {
  for (const element of elements) {
    if (element.type === TYPE.argument || element.type === TYPE.number || element.type === TYPE.date || element.type === TYPE.time) {
      names.add(element.value);
    } else if (element.type === TYPE.plural || element.type === TYPE.select) {
      names.add(element.value);
      for (const option of Object.values(element.options)) collectArguments(option.value, names);
    } else if (element.type === TYPE.tag) {
      names.add(element.value);
      collectArguments(element.children, names);
    }
  }
}

/** Sorted placeholder, plural/select and rich-text tag names a message uses. */
export function messageArguments(message: string): string[] {
  const names = new Set<string>();
  collectArguments(parse(message), names);
  return [...names].sort();
}

function tryArguments(message: string): string[] | Error {
  try {
    return messageArguments(message);
  } catch (error) {
    return error as Error;
  }
}

/** Every locale must have exactly the source's keys, valid ICU, and the same arguments. */
export function checkCatalogues(source: Catalogue, others: Record<string, Catalogue>): CatalogueProblem[] {
  const problems: CatalogueProblem[] = [];
  const sourceMessages = flattenMessages(source);
  for (const [locale, catalogue] of Object.entries(others)) {
    const messages = flattenMessages(catalogue);
    for (const [key, sourceMessage] of sourceMessages) {
      const message = messages.get(key);
      if (message === undefined) {
        problems.push({ locale, key, problem: "missing" });
        continue;
      }
      const args = tryArguments(message);
      if (args instanceof Error) {
        problems.push({ locale, key, problem: "invalid", detail: args.message });
        continue;
      }
      const expected = tryArguments(sourceMessage);
      if (expected instanceof Error) {
        problems.push({ locale: "source", key, problem: "invalid", detail: expected.message });
      } else if (expected.join() !== args.join()) {
        problems.push({ locale, key, problem: "arguments", detail: `expected [${expected}] got [${args}]` });
      }
    }
    for (const key of messages.keys()) {
      if (!sourceMessages.has(key)) problems.push({ locale, key, problem: "extra" });
    }
  }
  return problems;
}
