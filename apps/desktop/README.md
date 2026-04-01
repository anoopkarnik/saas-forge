# SaaS Forge — Desktop App

Electron 36 + React 19 + React Router v7 + Vite 7 desktop application, packaged with electron-builder.

## Prerequisites

- **Node.js** >= 20
- **pnpm** >= 9
- Platform-specific tooling (see per-platform sections below)

## Development

```bash
# From the monorepo root
pnpm install

# Run the desktop app in dev mode (hot-reload)
pnpm --filter saas-forge dev
```

Create a `.env` file based on the existing `.env` defaults. Key variables:

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API base URL (default `http://localhost:3000`) |
| `VITE_AUTH_EMAIL` | Enable email/password auth |
| `VITE_AUTH_GOOGLE` | Enable Google OAuth |
| `VITE_AUTH_GITHUB` | Enable GitHub OAuth |
| `VITE_AUTH_LINKEDIN` | Enable LinkedIn OAuth |
| `VITE_SUPPORT_MAIL` | Support email address |

## Building for Production

The build is a two-step process:

```bash
# 1. Compile the app (uses .env.production)
pnpm --filter saas-forge build:prod

# 2. Package into platform-specific installers
pnpm --filter saas-forge package
```

> **Tip:** Update `.env.production` with your live API URL and feature flags before building.

---

## Platform-Specific Deployment

### Linux

The `electron-builder.yml` is pre-configured to produce **AppImage**, **deb**, and **snap** targets.

#### AppImage (portable — no install required)

```bash
pnpm --filter saas-forge build:prod
pnpm --filter saas-forge package
# Output: dist/SaaS Forge-<version>.AppImage
```

Distribute the `.AppImage` file directly. Users run it with:

```bash
chmod +x SaaS\ Forge-*.AppImage
./SaaS\ Forge-*.AppImage
```

#### .deb (Debian / Ubuntu)

```bash
pnpm --filter saas-forge package
# Output: dist/saas-forge_<version>_amd64.deb
```

Install with:

```bash
sudo dpkg -i saas-forge_<version>_amd64.deb
```

You can host the `.deb` on a custom APT repository or distribute it directly via GitHub Releases.

#### Snap Store

**Prerequisites:** Install `snapcraft` and log in to your Snap Store account.

```bash
sudo snap install snapcraft --classic
snapcraft login
```

**Build and publish:**

```bash
# Build the snap package
pnpm --filter saas-forge build:prod
pnpm --filter saas-forge package:snap
# Output: dist/saas-forge_<version>_amd64.snap

# Test locally first
pnpm --filter saas-forge install:locally

# Publish to the edge channel (for testing)
pnpm --filter saas-forge publish:snapstore:edge

# Promote to the stable channel
pnpm --filter saas-forge publish:snapstore:stable
```

> **Note:** Update the version in the `install:locally` and `publish:snapstore:*` scripts in `package.json` when you bump the app version.

**Snap configuration** (in `electron-builder.yml`):
- Confinement: `strict` (sandboxed)
- Grade: `stable`
- Plugs: `default`, `network-bind` (required for API calls and OAuth)

#### Flathub (alternative)

To distribute via Flathub, create a Flatpak manifest (`com.saasforge.desktop.yml`) and submit to the [Flathub repository](https://github.com/flathub/flathub). Refer to the [Flatpak Electron guide](https://docs.flatpak.org/en/latest/electron.html) for manifest examples.

---

### macOS

#### .dmg (direct distribution)

```bash
pnpm --filter saas-forge build:prod
pnpm --filter saas-forge package
# Output: dist/SaaS Forge-<version>.dmg
```

#### Code Signing

To distribute outside the Mac App Store, you need an **Apple Developer ID Application** certificate.

```bash
# Set these environment variables before running electron-builder
export CSC_LINK=/path/to/DeveloperID.p12
export CSC_KEY_PASSWORD=your-certificate-password
pnpm --filter saas-forge package
```

#### Notarization

Apple requires notarization for apps distributed outside the App Store (macOS 10.15+).

```bash
# After packaging, notarize the .dmg
xcrun notarytool submit dist/SaaS\ Forge-<version>.dmg \
  --apple-id your@apple.id \
  --team-id YOUR_TEAM_ID \
  --password your-app-specific-password \
  --wait

# Staple the notarization ticket
xcrun stapler staple dist/SaaS\ Forge-<version>.dmg
```

Alternatively, configure `electron-builder` to handle notarization automatically by adding to `electron-builder.yml`:

```yaml
afterSign: scripts/notarize.js
mac:
  target: dmg
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: build/entitlements.mac.plist
  entitlementsInherit: build/entitlements.mac.plist
```

#### Mac App Store (MAS)

To distribute via the Mac App Store, change the target and add your provisioning profile:

```yaml
# electron-builder.yml override
mac:
  target: mas
  provisioningProfile: build/embedded.provisionprofile
```

Build with `pnpm --filter saas-forge package`, then upload using **Transporter** or `xcrun altool`.

---

### Windows

#### NSIS Installer

```bash
pnpm --filter saas-forge build:prod
pnpm --filter saas-forge package
# Output: dist/SaaS Forge Setup <version>.exe
```

#### Code Signing

Windows SmartScreen warnings are suppressed by signing with an **EV Code Signing Certificate**.

```bash
export WIN_CSC_LINK=/path/to/ev-certificate.p12
export WIN_CSC_KEY_PASSWORD=your-password
pnpm --filter saas-forge package
```

For hardware token-based EV certificates (e.g., DigiCert), configure `electron-builder` with `signtool`:

```yaml
# electron-builder.yml
win:
  target: nsis
  sign: scripts/custom-sign.js
  certificateSubjectName: "Your Company Name"
```

#### Microsoft Store

To distribute via the Microsoft Store, build an MSIX/AppX package:

```yaml
# electron-builder.yml override
win:
  target: appx
  appx:
    identityName: "YourCompany.SaaSForge"
    publisher: "CN=YOUR-PUBLISHER-ID"
    publisherDisplayName: "Your Company"
```

Submit the `.appx` via [Microsoft Partner Center](https://partner.microsoft.com/).

#### Winget / Chocolatey

- **Winget:** Submit a manifest to [winget-pkgs](https://github.com/microsoft/winget-pkgs) pointing to your hosted `.exe` installer.
- **Chocolatey:** Create a `.nuspec` package spec and push to [community.chocolatey.org](https://community.chocolatey.org/).

---

## Auto-Updates

To enable automatic updates, install `electron-updater`:

```bash
pnpm --filter saas-forge add electron-updater
```

Configure a publish target in `electron-builder.yml`:

```yaml
publish:
  provider: github   # or s3, generic, etc.
  owner: your-org
  repo: saas-forge
```

Then in your main process (`src/main/index.ts`):

```typescript
import { autoUpdater } from "electron-updater";

app.whenReady().then(() => {
  autoUpdater.checkForUpdatesAndNotify();
});
```

The updater checks GitHub Releases (or your configured provider) for new versions and prompts the user to install.

---

## CI/CD with GitHub Actions

Example workflow for building on all platforms:

```yaml
# .github/workflows/desktop-release.yml
name: Desktop Release

on:
  push:
    tags:
      - "desktop-v*"

jobs:
  build:
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    runs-on: ${{ matrix.os }}

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Build & Package
        run: |
          pnpm --filter saas-forge build:prod
          pnpm --filter saas-forge package
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          # macOS signing
          CSC_LINK: ${{ secrets.MAC_CERT_P12 }}
          CSC_KEY_PASSWORD: ${{ secrets.MAC_CERT_PASSWORD }}
          # Windows signing
          WIN_CSC_LINK: ${{ secrets.WIN_CERT_P12 }}
          WIN_CSC_KEY_PASSWORD: ${{ secrets.WIN_CERT_PASSWORD }}

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: desktop-${{ matrix.os }}
          path: |
            apps/desktop/dist/*.dmg
            apps/desktop/dist/*.AppImage
            apps/desktop/dist/*.deb
            apps/desktop/dist/*.snap
            apps/desktop/dist/*.exe

      - name: Publish to GitHub Releases
        if: startsWith(github.ref, 'refs/tags/')
        uses: softprops/action-gh-release@v2
        with:
          files: |
            apps/desktop/dist/*.dmg
            apps/desktop/dist/*.AppImage
            apps/desktop/dist/*.deb
            apps/desktop/dist/*.snap
            apps/desktop/dist/*.exe

  publish-snap:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: desktop-ubuntu-latest

      - uses: snapcore/action-publish@v1
        with:
          snap: "*.snap"
          release: stable
        env:
          SNAPCRAFT_STORE_CREDENTIALS: ${{ secrets.SNAPCRAFT_TOKEN }}
```

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `MAC_CERT_P12` | Base64-encoded macOS Developer ID certificate |
| `MAC_CERT_PASSWORD` | Certificate password |
| `WIN_CERT_P12` | Base64-encoded Windows EV certificate |
| `WIN_CERT_PASSWORD` | Certificate password |
| `SNAPCRAFT_TOKEN` | Snap Store credentials (`snapcraft export-login`) |

---

## Project Structure

```
apps/desktop/
├── electron-builder.yml    # Packaging config (targets, protocols, signing)
├── electron.vite.config.ts # Vite build config (main, preload, renderer)
├── .env                    # Dev environment variables
├── .env.production         # Production environment variables
└── src/
    ├── main/index.ts       # Electron main process (window, IPC, deep-linking)
    ├── preload/index.ts    # Preload script (IPC bridge)
    └── renderer/           # React app (routes, components, hooks)
```
