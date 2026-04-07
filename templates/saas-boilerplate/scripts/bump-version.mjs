import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

const repoRoot = process.cwd();

const targetFiles = [
    {
        path: "package.json",
        update(data, version) {
            data.version = version;
        },
    },
    {
        path: "apps/web/package.json",
        update(data, version) {
            data.version = version;
        },
    },
    {
        path: "apps/desktop/package.json",
        update(data, version) {
            data.version = version;
        },
    },
    {
        path: "apps/mobile/package.json",
        update(data, version) {
            data.version = version;
        },
    },
    {
        path: "apps/mobile/app.json",
        update(data, version) {
            if (data && data.expo) {
                data.expo.version = version;
            }
        },
    },
    {
        path: "template-overrides/saas-boilerplate/package.json",
        update(data, version) {
            data.version = version;
        },
    },
    {
        path: "template-sync.manifest.json",
        update(data, version) {
            data.templateVersion = version;
        },
    },
];

function parseArgs() {
    const args = process.argv.slice(2);
    let version = null;
    let dryRun = false;

    for (let index = 0; index < args.length; index += 1) {
        const arg = args[index];

        if (!arg) {
            continue;
        }

        if (arg === "--version" && args[index + 1]) {
            version = args[index + 1] ?? null;
            index += 1;
            continue;
        }

        if (arg === "--dry-run") {
            dryRun = true;
            continue;
        }

        if (!arg.startsWith("-") && !version) {
            version = arg;
            continue;
        }
    }

    if (!version) {
        console.error(
            "Usage: pnpm version:bump --version <semver>\n   or: pnpm version:bump <semver> [--dry-run]"
        );
        process.exit(1);
    }

    return { version, dryRun };
}

function assertValidSemver(version) {
    const semverPattern =
        /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

    if (!semverPattern.test(version)) {
        console.error(`Invalid semver version: ${version}`);
        process.exit(1);
    }
}

function readJson(relativePath) {
    const filePath = path.join(repoRoot, relativePath);
    if (!fs.existsSync(filePath)) {
        return null;
    }
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(relativePath, contents) {
    const filePath = path.join(repoRoot, relativePath);
    fs.writeFileSync(filePath, `${JSON.stringify(contents, null, 2)}\n`);
}

function runSyncStage() {
    execFileSync("node", ["scripts/sync-template.mjs", "--stage"], {
        cwd: repoRoot,
        stdio: "inherit",
    });
}

const { version, dryRun } = parseArgs();
assertValidSemver(version);

const currentVersion = readJson("package.json")?.version ?? "unknown";

if (dryRun) {
    console.log("Dry run - no files will be changed.");
    console.log(`Current workspace version: ${currentVersion}`);
    console.log(`Next workspace version:    ${version}`);
    console.log("Files to update:");
    for (const target of targetFiles) {
        console.log(`- ${target.path}`);
    }
    console.log("Then it would run: node scripts/sync-template.mjs --stage");
    process.exit(0);
}

for (const target of targetFiles) {
    const json = readJson(target.path);
    if (json) {
        target.update(json, version);
        writeJson(target.path, json);
    } else {
        console.warn(`File not found, skipping: ${target.path}`);
    }
}

console.log(`Running sync stage...`);
runSyncStage();

console.log(`Workspace apps and boilerplate updated from ${currentVersion} to ${version}.`);
console.log("Updated release metadata in:");
for (const target of targetFiles) {
    console.log(`- ${target.path}`);
}
console.log("Refreshed managed template and staged template via sync-template --stage.");
