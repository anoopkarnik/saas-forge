import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

function parseArgs() {
    const args = process.argv.slice(2);
    let release = "edge";
    let installLocally = false;

    for (let index = 0; index < args.length; index += 1) {
        const arg = args[index];
        if (arg === "--release" && args[index + 1]) {
            release = args[index + 1];
            index += 1;
        } else if (arg === "--install-locally") {
            installLocally = true;
        }
    }

    return { release, installLocally };
}

const { release, installLocally } = parseArgs();

const desktopPackageFile = path.join(repoRoot, "apps/desktop/package.json");
if (!fs.existsSync(desktopPackageFile)) {
    console.error("apps/desktop/package.json not found!");
    process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(desktopPackageFile, "utf8"));
const version = pkg.version;

if (!version) {
    console.error("Could not read version from apps/desktop/package.json!");
    process.exit(1);
}

// snapcraft uploads follow the format: saas-forge_<version>_amd64.snap
const snapFileName = `saas-forge_${version}_amd64.snap`;
const snapFilePath = path.join(repoRoot, `apps/desktop/dist/${snapFileName}`);

if (installLocally) {
    console.log(`Installing ${snapFileName} locally...`);
    execFileSync("sudo", ["snap", "install", snapFilePath, "--dangerous"], {
        cwd: repoRoot,
        stdio: "inherit",
    });
} else {
    console.log(`Publishing ${snapFileName} to snapstore under release: ${release}...`);
    execFileSync("snapcraft", ["upload", snapFilePath, `--release=${release}`], {
        cwd: repoRoot,
        stdio: "inherit",
    });
}
