import { z } from "zod";
import { validateSetupCoverage } from "./coverage";
import { BRIEF_FIELDS, type SourcePack } from "./types";

const text = z.string().trim().min(1).max(3000);
const short = z.string().trim().min(1).max(200);
const ids = z.array(short).max(30);
export const briefAnswersSchema = z
  .object({
    audience: text,
    journey: text,
    setup: text,
    os: text,
    launch: text,
  })
  .strict();
const question = z
  .object({ id: z.enum(BRIEF_FIELDS), question: text, suggestion: text })
  .strict();
export const generatedTaskSchema = z
  .object({
    key: z.string().regex(/^[a-z0-9][a-z0-9._-]{0,79}$/),
    anchorId: short,
    title: z.string().trim().min(1).max(160),
    purpose: text,
    instructions: z.array(text).min(1).max(6),
    technicalDetails: z.array(text).max(6),
    commandIds: ids,
    filePaths: ids,
    acceptance: z.array(text).min(1).max(6),
    verification: text,
    fixes: z.array(text).min(1).max(6),
    sourceIds: ids.min(1),
    dependencies: ids,
  })
  .strict();
export const agentResultSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("interview"),
      summary: text,
      questions: z.array(question).max(3),
    })
    .strict(),
  z
    .object({
      kind: z.literal("generate"),
      tasks: z.array(generatedTaskSchema).max(80),
    })
    .strict(),
  z
    .object({
      kind: z.literal("help"),
      answer: z.string().trim().min(1).max(6000),
      sourceIds: ids.min(1),
    })
    .strict(),
]);

const secretPattern =
  /(?:-----BEGIN [A-Z ]*PRIVATE KEY-----|\b(?:sk_live_|sk_test_|sk-proj-|sk-ant-|sk-or-|sk-|nvapi-|gh[pousr]_|xox[baprs]-)[A-Za-z0-9_-]{8,}|\b(?:AKIA|ASIA)[A-Z0-9]{16}\b|(?:postgres(?:ql)?|mysql|redis):\/\/(?![.,;:!?)](?:\s|$))[^\s"'<>`]+|[a-z][a-z0-9+.-]*:\/\/[^\s/:]+:[^\s/@]+@|\b[A-Z][A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|API_KEY)\s*=\s*[^\s<>]+|\b(?:api[_-]?key|secret|password|access[_-]?token)\s*[=:]\s*['"]?(?!\s|['"]?(?:your|example|placeholder|change|<))[A-Za-z0-9_+/=-]{16,})/i;
export function assertNoSecrets(value: unknown) {
  if (proseStrings(value).some((text) => secretPattern.test(text)))
    throw new Error(
      "Remove credentials and connection strings before sharing this information with AI.",
    );
}

function proseStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(proseStrings);
  if (value && typeof value === "object")
    return Object.values(value).flatMap(proseStrings);
  return [];
}

/** Commands belong in explicit allowlisted command slots, never invented prose. */
export function validateGuideProse(value: unknown, pack: SourcePack) {
  assertNoSecrets(value);
  const approvedCommands = new Set(pack.commands.map((item) => item.command));
  const approvedLabels = new Set(
    pack.commands.map((item) => item.label.toLowerCase()),
  );
  const commands =
    /(?<![\w-])(?:pnpm|npm|npx|yarn|bun|uv|pip3?|docker|git|curl|wget|sudo|chmod|chown|rm|cp|mv|mkdir|bash|sh|psql|pg_dump|prisma|openssl|node|python3?|ssh|scp|export|eval|exec|cd|cat|echo|ls|whoami|powershell|cmd\.exe|rg|sed|snapcraft|dd|reboot|tee|shutdown|mkfs|truncate)(?=\s|$|[`.,;])/g;
  const approvedCommandAction = (action: string) => {
    const located = action.replace(
      / (?:from|in) (?:the )?(?:project|repository|repo) root$/,
      "",
    );
    for (const command of approvedCommands) {
      if (located === command) return true;
      if (!action.startsWith(command + " ")) continue;
      const explanation = action.slice(command.length + 1).toLowerCase();
      const safe =
        /^(?:interactively(?: to [a-z ,'-]+)?|(?:to|after|when|once|if) [a-z ,'-]+)$/.test(
          explanation,
        ) &&
        !commands.test(explanation) &&
        !/\b(?:run|execute|type|paste|enter|invoke|use)\b/.test(explanation);
      commands.lastIndex = 0;
      if (safe) return true;
    }
    return false;
  };
  const vocabulary = new Set(
    [
      ...pack.sources.map((source) => source.excerpt),
      ...pack.anchors.flatMap((anchor) => [
        anchor.title,
        anchor.purpose,
        ...anchor.instructions,
      ]),
      ...pack.commands.map((command) => command.label),
      "a an the to and or for in on from against with after before when once if is are not again as only",
    ].flatMap((text) => text.toLowerCase().match(/[a-z]+/g) ?? []),
  );
  for (let prose of proseStrings(value)) {
    for (const match of prose.matchAll(
      /\b(?:use|add|allow|set|open)\b[^.!?\n]{0,100}0\.0\.0\.0\/0/gi,
    )) {
      if (
        !/(?:do not|don't|never|avoid)\s*$/i.test(prose.slice(0, match.index))
      )
        throw new Error(
          "AI instructions include unsupported unrestricted database access.",
        );
    }
    if (prose.includes("REVISE_FROM_SOURCE"))
      throw new Error(
        "AI instructions are incomplete. Request a corrected draft.",
      );
    // A bare database URI format name is not a file path or a connection string.
    prose = prose.replace(
      /\b(?:postgres(?:ql)?|mysql|redis):\/\/(?=$|\s|[.,;:!?](?:\s|$))/g,
      " ",
    );
    for (const found of prose.matchAll(/https?:\/\/[^\s"<>`]+/g)) {
      const url = found[0].replace(/[.,;:!?)']+$/, "");
      if (!pack.sources.some((source) => source.url === url))
        throw new Error("AI instructions reference an unsupported website.");
      prose = prose.replace(found[0], " ");
    }
    if (/https?:\/\/|\$\(|```|&&|\|\||(?:^|\s)[|;](?:\s|$)/.test(prose))
      throw new Error(
        "AI instructions contain unsupported shell syntax or websites.",
      );
    if (
      [...prose.matchAll(/\b(?:delete|remove|wipe|erase|overwrite)\b/gi)].some(
        (match) =>
          !/(?:do not|don't|never|avoid)\s*$/i.test(
            prose.slice(0, match.index),
          ),
      ) &&
      pack.paths.some((path) => prose.includes(path)) &&
      !pack.anchors.some((anchor) =>
        anchor.instructions.some(
          (instruction) => instruction.trim() === prose.trim(),
        ),
      )
    ) {
      throw new Error(
        "AI instructions include an unsupported destructive file action.",
      );
    }
    for (const match of prose.matchAll(/`([^`]+)`/g)) {
      if (
        !approvedCommands.has(match[1]!) &&
        !pack.paths.includes(match[1]!) &&
        !pack.envKeys.includes(match[1]!)
      )
        throw new Error("AI instructions contain unsupported inline code.");
    }
    // Catch unknown executables too: a finite executable blacklist cannot protect
    // instructions such as 'Run dd ...'. Human-readable approved labels are valid.
    for (const command of pack.commands) {
      if (!/\b(?:run|execute|type|paste|enter|invoke)\b/i.test(command.label))
        continue;
      const escaped = command.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      prose = prose.replace(
        new RegExp("(?:\\bthe )?(['\"])" + escaped + "\\1 command", "gi"),
        "the supplied command",
      );
    }
    for (const match of prose.matchAll(
      /\b(?:run|execute|type|paste|enter|invoke|use\s+(?:the\s+)?(?:shell|terminal)\s+command)(?:\s*:\s*|\s+)([^\n`]+)/gi,
    )) {
      const action = match[1]!.trim().replace(/[.,;:!?"')]+$/, "");
      let normalized = action.toLowerCase().replace(/^["']|["']$/g, "");
      const purpose = / to ([a-z ,'-]+)$/.exec(normalized);
      if (
        purpose &&
        (purpose[1]!.match(/[a-z]+/g) ?? []).every((word) =>
          vocabulary.has(word),
        ) &&
        !/\b(?:run|execute|type|paste|enter|invoke|use)\b|--/.test(purpose[1]!)
      )
        normalized = normalized.slice(0, purpose.index);
      const label = normalized
        .replace(/^the\s+|\s+command$/g, "")
        .replace(/^["']|["']$/g, "");
      const naturalActions = new Set([
        "locally",
        "the app",
        "your app",
        "the application",
        "your application",
        "the project",
        "your project",
        "the starter",
        "the python companion",
        "the desktop client",
        "the mobile client",
      ]);
      const fullLabel = match[0]
        .trim()
        .replace(/[.,;:!?"')]+$/, "")
        .toLowerCase();
      if (/^type\b/i.test(match[0]) && /^(?:is|are) /.test(normalized))
        continue;
      const quotedLabel = normalized.match(
        /^(?:the )?['"]([^'"]+)['"] command(?: shown)?(?: below| above)?(?: (?:from|in) (?:your|the) project root(?: folder)?)?(?: to ([a-z ,'-]+))?$/,
      );
      if (quotedLabel && approvedLabels.has(quotedLabel[1]!)) {
        const purpose = quotedLabel[2] ?? "";
        const safe =
          !commands.test(purpose) &&
          !/\b(?:run|execute|type|paste|enter|invoke|use)\b/.test(purpose);
        commands.lastIndex = 0;
        if (safe) continue;
      }
      const aliases: Array<[string, boolean]> = [
        ["the python api", approvedCommands.has("pnpm --dir apps/backend dev")],
        ["python api", approvedCommands.has("pnpm --dir apps/backend dev")],
        ["the command", approvedCommands.size > 0],
        ["this", approvedCommands.size > 0],
        [
          "the development server",
          [...approvedCommands].some((command) => command.endsWith(" dev")),
        ],
        ["the interactive doctor", approvedCommands.has("pnpm doctor")],
        ["local doctor", approvedCommands.has("pnpm doctor")],
        ["the local doctor", approvedCommands.has("pnpm doctor")],
        ["doctor", approvedCommands.has("pnpm doctor")],
        ["doctor check", approvedCommands.has("pnpm doctor")],
        [
          "performance audits",
          pack.envKeys.includes("GOOGLE_PAGESPEED_API_KEY"),
        ],
        ["desktop client", pack.project.platforms.includes("desktop")],
        ["mobile client", pack.project.platforms.includes("mobile")],
        ["desktop", pack.project.platforms.includes("desktop")],
        ["mobile", pack.project.platforms.includes("mobile")],
        ["ios simulator", pack.project.platforms.includes("mobile")],
        ["android emulator", pack.project.platforms.includes("mobile")],
        ["android", pack.project.platforms.includes("mobile")],
        ["ios", pack.project.platforms.includes("mobile")],
        [
          "the doctor export",
          [...approvedCommands].some((command) =>
            command.includes(" doctor --json"),
          ),
        ],
        ["the install dependencies task", approvedCommands.has("pnpm install")],
      ];
      aliases.push(["the install step", approvedCommands.has("pnpm install")]);
      const naturalReference = aliases.some(([name, applicable]) => {
        if (
          !applicable ||
          !(normalized === name || normalized.startsWith(name + " "))
        )
          return false;
        const tail = normalized.slice(name.length).trim();
        const safe =
          (!tail ||
            /^(?:(?:first|again|interactively)|(?:again|first|after|if|and|from|to|so) [a-z_ ,'-]+)$/.test(
              tail,
            )) &&
          !commands.test(tail) &&
          !/\b(?:run|execute|type|paste|enter|invoke|use)\b|--/.test(tail);
        commands.lastIndex = 0;
        return safe;
      });
      if (naturalReference) continue;
      // Copying a private value into a known file is an edit, not shell execution.
      const escapePattern = (text: string) =>
        text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const fileTargets = [
        "(?:(?:your|the|an) )?(?:environment|env) files?",
        ...pack.paths.map((path) => escapePattern(path.toLowerCase())),
      ].join("|");
      const privateFileEdit = new RegExp(
        "^(it|them|(?:the|your) [a-z _'-]{1,100}?)(?: into (?:" +
          fileTargets +
          ")(?: later| next| in the (?:next|following) task|,? and save)?| after the (?:existing )?equals sign(?:,? and save)?|,? and save| without line breaks)$",
      ).exec(normalized);
      if (privateFileEdit && /^(?:paste|type|enter)\b/i.test(match[0])) {
        const operand = privateFileEdit[1]!;
        const safe =
          /\b(?:values?|token|key|secret|url|connection string|it|them)\b/.test(
            operand,
          ) &&
          !commands.test(operand) &&
          !/\b(?:run|execute|type|paste|enter|invoke|use|into|after)\b|--/.test(
            operand,
          );
        commands.lastIndex = 0;
        if (safe) continue;
      }
      if (pack.envKeys.length && /^(?:paste|type|enter)\b/i.test(match[0])) {
        const settingEdit = new RegExp(
          "^(it|them|(?:the|your) [a-z _'-]{1,100}?) (?:into|in) " +
            "(?:the )?(?:existing )?(?:" +
            pack.envKeys
              .map((key) => escapePattern(key.toLowerCase()))
              .join("|") +
            ")\\b",
        ).exec(normalized);
        const safe =
          settingEdit &&
          /\b(?:values?|token|key|secret|url|connection string|it|them)\b/.test(
            settingEdit[1]!,
          ) &&
          !commands.test(normalized) &&
          !/\b(?:run|execute|type|paste|enter|invoke|shell|terminal|command)\b|--/.test(
            normalized,
          );
        commands.lastIndex = 0;
        if (safe) continue;
      }
      const sourceSentence = pack.anchors.some((anchor) =>
        anchor.instructions.some(
          (sentence) => sentence.trim() === prose.trim(),
        ),
      );
      const [actionReference, ...conditions] = normalized.split(" if ");
      const reference = actionReference!
        .replace(/ (?:from|in) (?:the )?(?:project|repository|repo) root$/, "")
        .replace(/ again$/, "");
      const condition = conditions.join(" if ");
      const safeCondition =
        !/\b(?:run|execute|type|paste|enter|invoke|use)\b/.test(condition) &&
        !commands.test(condition);
      commands.lastIndex = 0;
      const commandNames = new Set<string>();
      const nounNames: Record<string, string> = {
        generate: "generation",
        migrate: "migration",
        install: "installation",
        test: "tests",
      };
      for (const command of approvedCommands) {
        const named = command.match(
          /^(?:pnpm|npm|uv|docker|openssl) (?:(?:--dir \S+|--silent) )?([a-z-]+)\b/,
        );
        if (named) {
          commandNames.add(named[1]!);
          commandNames.add(nounNames[named[1]!] ?? named[1]!);
        }
      }
      for (const command of pack.commands) {
        const verb = command.label.toLowerCase().split(" ")[0]!;
        commandNames.add(verb);
        commandNames.add(nounNames[verb] ?? verb);
      }
      const namedReference = [...commandNames].some(
        (name) => reference === `the ${name} command`,
      );
      const copyReference =
        reference === "the copy" &&
        ([...approvedCommands].some((command) => command.startsWith("cp ")) ||
          pack.anchors.some((anchor) =>
            anchor.instructions.some((sentence) => /\bcopy\s/i.test(sentence)),
          ));
      const temporalReference =
        /^(?:after|when|once|if)\s/.test(normalized) &&
        !/\b(?:run|execute|type|paste|enter|invoke|use)\b/.test(normalized) &&
        !commands.test(normalized);
      commands.lastIndex = 0;
      const meta = normalized.match(
        /^the ([a-z]+(?: [a-z]+){0,2}) command\b|^the (doctor|copy)\b/,
      );
      const metaWords = meta ? (meta[1] ?? meta[2]!).split(" ") : [];
      const sourceCopy =
        metaWords.includes("copy") &&
        pack.anchors.some((anchor) =>
          anchor.instructions.some((sentence) => /\bcopy\s/i.test(sentence)),
        );
      const metaReference =
        !!meta &&
        (metaWords.some((word) => commandNames.has(word)) || sourceCopy) &&
        metaWords.every(
          (word) => vocabulary.has(word) || commandNames.has(word),
        ) &&
        !commands.test(normalized) &&
        !/\b(?:run|execute|type|paste|enter|invoke|use)\b/.test(normalized);
      commands.lastIndex = 0;
      const commandReference =
        approvedCommands.size > 0 &&
        safeCondition &&
        (namedReference ||
          metaReference ||
          copyReference ||
          temporalReference ||
          /^the (?:(?:provided|listed|supplied|associated|approved|selected|following) )?commands?(?: (?:below|above|for this task|shown(?: below| above)?|in (?:the )?(?:order shown|project root)))?$/.test(
            reference,
          ));
      if (approvedLabels.has(fullLabel) || sourceSentence || commandReference)
        continue;
      const words = normalized.match(/[a-z]+/g) ?? [];
      const groundedHeading =
        words.length >= 3 &&
        /^[a-z ,'-]+$/.test(normalized) &&
        words.every((word) => vocabulary.has(word)) &&
        !commands.test(normalized) &&
        !words.some((word) =>
          [
            "command",
            "commands",
            "shell",
            "terminal",
            "script",
            "executable",
            "binary",
            "tool",
            "run",
            "execute",
            "invoke",
          ].includes(word),
        );
      commands.lastIndex = 0;
      if (
        !approvedCommandAction(action) &&
        !groundedHeading &&
        !approvedLabels.has(label) &&
        !naturalActions.has(normalized)
      )
        throw new Error(
          "AI instructions contain an unsupported command. Request a corrected draft.",
        );
    }
    for (const match of prose.matchAll(/\bshell command\s*:?\s+([^\n`]+)/gi)) {
      const command = match[1]!.trim().replace(/[.,;:!?"')]+$/, "");
      if (!approvedCommands.has(command))
        throw new Error("AI instructions contain an unsupported command.");
    }
    for (const found of prose.matchAll(commands)) {
      const prefix = prose.slice(0, found.index);
      const executableContext =
        /(?:^|\n)\s*$|\b(?:use|command|terminal|shell)\s*:?\s*$/i.test(prefix);
      if (executableContext) {
        const command = prose
          .slice(found.index)
          .split(/[\n`]/, 1)[0]!
          .trim()
          .replace(/[.,:!?"')]+$/, "");
        const description = new RegExp(
          "^" +
            found[0].replaceAll(".", "\\.") +
            " (?:uses|handles|manages|generates|checks|reads|writes|creates|keeps|resolves|is|helps|provides|installs|runs)\\b",
        ).test(command);
        if (
          description &&
          /(?:^|\n)\s*$/.test(prefix) &&
          [...approvedCommands].some((item) => item.startsWith(found[0] + " "))
        )
          continue;
        if (!approvedCommandAction(command))
          throw new Error(
            "AI instructions contain an unsupported command. Request a corrected draft.",
          );
      }
    }
    for (const command of [...approvedCommands].sort(
      (a, b) => b.length - a.length,
    ))
      prose = prose.replaceAll(command, " ");
    prose = prose.replace(commands, " ");
    for (const name of ["Node.js", "Next.js"])
      prose = prose.replaceAll(name, " ");
    const paths =
      /(?<![\w])[A-Za-z]:\\[\w.@()[\]\\/-]+|(?<![\w:])(?:~?\/|\.\.?\/)[\w.@()[\]/-]+|(?<![\w])(?:apps|packages|scripts|\.github|scaffold-modules|scaffold-providers|templates|docs|src|tests|node_modules|etc)\/[\w.@()[\]/-]+|(?<![\w])(?:\.[A-Za-z][\w.-]*|[\w-]+\.[a-z][a-z0-9]{0,9})\b|(?<![\w])(?:Dockerfile|Makefile|Procfile)(?:\.[\w.-]+)?\b/g;
    for (const found of prose.matchAll(paths)) {
      const path = found[0].replace(/[.,:!?"')]+$/, "");
      if (!pack.paths.includes(path))
        throw new Error("AI instructions reference an unsupported file path.");
    }
  }
}

export function validateAgentResult(
  value: unknown,
  pack: SourcePack,
  expectedKind?: string,
) {
  assertNoSecrets(value);
  const result = agentResultSchema.parse(value);
  if (expectedKind && result.kind !== expectedKind)
    throw new Error("AI returned the wrong operation result.");
  const sources = new Set(pack.sources.map((source) => source.id));
  if (result.kind === "generate") {
    const anchors = new Map(pack.anchors.map((anchor) => [anchor.id, anchor]));
    const commands = new Set(pack.commands.map((command) => command.id));
    const seen = new Set<string>();
    const actions = new Set<string>();
    for (const task of result.tasks) {
      const anchor = anchors.get(task.anchorId);
      if (
        !anchor ||
        pack.completedAnchors.includes(task.anchorId) ||
        pack.serverCheckAnchors?.includes(task.anchorId)
      )
        throw new Error("AI included an unsupported or completed task.");
      if (seen.has(task.key) || task.dependencies.some((key) => !seen.has(key)))
        throw new Error(
          "AI task dependencies must refer to earlier, unique tasks.",
        );
      seen.add(task.key);
      if (
        !task.sourceIds.includes(anchor.sourceIds[0]!) ||
        task.sourceIds.some((id) => !sources.has(id))
      )
        throw new Error("AI task references unknown or unrelated guidance.");
      if (
        task.commandIds.some((id) => !commands.has(id)) ||
        task.filePaths.some((path) => !pack.paths.includes(path))
      )
        throw new Error("AI task contains unsupported commands or paths.");
      const action = JSON.stringify([
        task.anchorId,
        task.instructions.map((line) => line.trim().toLowerCase()),
        [...task.commandIds].sort(),
        [...task.filePaths].sort(),
      ]);
      if (actions.has(action))
        throw new Error(
          "AI included a repeated action. Request a revised checklist.",
        );
      actions.add(action);
      validateGuideProse(
        {
          title: task.title,
          purpose: task.purpose,
          instructions: task.instructions,
          technicalDetails: task.technicalDetails,
          acceptance: task.acceptance,
          verification: task.verification,
          fixes: task.fixes,
        },
        pack,
      );
    }
    for (const anchor of pack.anchors)
      if (
        !pack.completedAnchors.includes(anchor.id) &&
        !pack.serverCheckAnchors?.includes(anchor.id) &&
        !result.tasks.some((task) => task.anchorId === anchor.id)
      )
        throw new Error("AI omitted a required part of this stage.");
    validateSetupCoverage(result.tasks, pack);
  } else if (result.kind === "help") {
    if (result.sourceIds.some((id) => !sources.has(id)))
      throw new Error("AI help references unknown guidance.");
    validateGuideProse(result.answer, pack);
  } else {
    if (
      new Set(result.questions.map((item) => item.id)).size !==
      result.questions.length
    )
      throw new Error("AI repeated an interview question.");
    validateGuideProse(
      [
        result.summary,
        ...result.questions.flatMap((item) => [item.question, item.suggestion]),
      ],
      pack,
    );
  }
  return result;
}
