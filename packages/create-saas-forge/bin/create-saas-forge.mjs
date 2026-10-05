#!/usr/bin/env node
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";
import { runCredits, runLogin, runNew, runUpgrade } from "../src/commands.mjs";

const HELP = `Usage:
  create-saas-forge [new] <dir> [--modules billing,ai] [--platforms web,mobile] [--name <name>] [--yes] [--install]
  create-saas-forge new <dir> --project <slug>      Download a saved project
  create-saas-forge upgrade [--add ai_agents] [--tier tier-3] [--provider payment_gateway=dodo] [--dry-run] [--yes]
  create-saas-forge credits
  create-saas-forge login

Options: --api-key <key> (or SAAS_FORGE_API_KEY), --url <server> (or SAAS_FORGE_URL)`;

const { values: flags, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    modules: { type: "string" },
    platforms: { type: "string" },
    name: { type: "string" },
    project: { type: "string" },
    add: { type: "string" },
    tier: { type: "string" },
    provider: { type: "string", multiple: true },
    "api-key": { type: "string" },
    url: { type: "string" },
    yes: { type: "boolean", short: "y" },
    install: { type: "boolean" },
    "dry-run": { type: "boolean" },
    help: { type: "boolean", short: "h" },
  },
});

const rl = process.stdin.isTTY ? createInterface({ input: process.stdin, output: process.stdout }) : null;
const io = {
  cwd: process.cwd(),
  env: process.env,
  interactive: !!rl,
  ask: (question) => (rl ? rl.question(question) : Promise.resolve("")),
  log: (line) => console.log(line),
};

const [first, ...rest] = positionals;
try {
  if (flags.help) console.log(HELP);
  else if (first === "upgrade") await runUpgrade(flags, io);
  else if (first === "credits") await runCredits(flags, io);
  else if (first === "login") await runLogin(flags, io);
  else if (first === "new") await runNew(rest[0], flags, io);
  else await runNew(first, flags, io);
} catch (err) {
  console.error(`\x1b[31m${err.message}\x1b[0m`);
  process.exitCode = 1;
} finally {
  rl?.close();
}
