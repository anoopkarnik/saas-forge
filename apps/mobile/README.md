# SaaS Forge — Mobile App

Expo 55 + React Native 0.83 + NativeWind + expo-router mobile application targeting iOS, Android, and Web.

## Prerequisites

- **Node.js** >= 20
- **pnpm** >= 9
- **Expo CLI**: `npm install -g expo-cli` (or use `npx expo`)
- **EAS CLI**: `npm install -g eas-cli` (for cloud builds and submissions)
- **iOS** (local builds only): Xcode 16+ with CocoaPods
- **Android** (local builds only): Android Studio with SDK 34+

## Development

```bash
# From the monorepo root
pnpm install

# Run on web (default dev command)
pnpm --filter mobile dev

# Run on specific platforms
pnpm --filter mobile ios       # iOS simulator
pnpm --filter mobile android   # Android emulator
pnpm --filter mobile web       # Web browser
```

Create a `.env` file based on `.env.example`:

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_API_URL` | Backend API base URL |
| `EXPO_PUBLIC_APP_URL` | Mobile app URL (for deep linking) |
| `EXPO_PUBLIC_AUTH_EMAIL` | Enable email/password auth |
| `EXPO_PUBLIC_AUTH_GOOGLE` | Enable Google OAuth |
| `EXPO_PUBLIC_AUTH_GITHUB` | Enable GitHub OAuth |
| `EXPO_PUBLIC_AUTH_LINKEDIN` | Enable LinkedIn OAuth |
| `EXPO_PUBLIC_SUPPORT_MAIL` | Enable support email feature |
| `EXPO_PUBLIC_THEME` | Theme color (e.g., `green`) |
| `EXPO_PUBLIC_THEME_TYPE` | Theme mode (`dark` or `light`) |
| `EXPO_PUBLIC_PAYMENT_GATEWAY` | Payment provider (`stripe` or `dodo`) |
| `EXPO_PUBLIC_CALENDLY_BOOKING_URL` | Calendly booking link (optional) |

---

## Setting Up EAS Build

EAS (Expo Application Services) handles cloud builds, submissions, and OTA updates.

### 1. Login and Configure

```bash
npx eas-cli login
npx eas-cli build:configure
```

This generates an `eas.json` file. Here is a recommended configuration:

```json
{
  "cli": {
    "version": ">= 14.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your@apple.id",
        "ascAppId": "your-app-store-connect-app-id",
        "appleTeamId": "YOUR_TEAM_ID"
      },
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

### 2. Configure app.json for Production

Update `app.json` with your production identifiers:

```json
{
  "expo": {
    "name": "SaaS Forge",
    "slug": "saas-forge",
    "version": "1.0.0",
    "scheme": "saas-forge",
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourcompany.saasforge"
    },
    "android": {
      "package": "com.yourcompany.saasforge",
      "adaptiveIcon": { ... }
    }
  }
}
```

---

## Platform-Specific Deployment

### Android

#### EAS Build (recommended — cloud-based, no local SDK required)

```bash
# Build a production AAB (for Google Play)
npx eas-cli build --platform android --profile production

# Build a preview APK (for internal testing / sideloading)
npx eas-cli build --platform android --profile preview
```

#### Submit to Google Play Store

**Prerequisites:**
1. Create a [Google Play Developer account](https://play.google.com/console/) ($25 one-time fee)
2. Create your app listing in the Play Console
3. Generate a [Google Service Account key](https://expo.dev/accounts/[your-account]/settings/google-service-accounts) and save as `google-service-account.json`

```bash
# Submit the latest production build
npx eas-cli submit --platform android --profile production
```

**Google Play testing tracks:**
- **Internal testing** — Up to 100 testers, instant availability
- **Closed testing** — Invite-only, requires review
- **Open testing** — Public opt-in beta
- **Production** — Full rollout (supports staged rollouts: 10%, 25%, 50%, 100%)

Change the track in `eas.json`:

```json
"android": {
  "serviceAccountKeyPath": "./google-service-account.json",
  "track": "internal"  // or "alpha", "beta", "production"
}
```

#### Local Build (requires Android Studio)

```bash
# Generate a release APK
npx expo run:android --variant release

# Generate an AAB for Play Store
cd android && ./gradlew bundleRelease
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

#### Signing (local builds)

Generate a keystore:

```bash
keytool -genkeypair -v -storetype PKCS12 \
  -keystore saas-forge.keystore \
  -alias saas-forge \
  -keyalg RSA -keysize 2048 -validity 10000
```

Add to `android/app/build.gradle`:

```groovy
signingConfigs {
    release {
        storeFile file('saas-forge.keystore')
        storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD')
        keyAlias 'saas-forge'
        keyPassword System.getenv('ANDROID_KEY_PASSWORD')
    }
}
```

> **Note:** With EAS Build, signing is managed automatically — Expo stores your keystore securely in the cloud.

---

### iOS

#### EAS Build (recommended — builds on Apple silicon in the cloud)

```bash
# Build for App Store
npx eas-cli build --platform ios --profile production

# Build for internal distribution (ad hoc)
npx eas-cli build --platform ios --profile preview
```

> EAS handles provisioning profiles and certificates automatically with **managed credentials**. No local Xcode required.

#### Submit to App Store

**Prerequisites:**
1. [Apple Developer Program](https://developer.apple.com/programs/) membership ($99/year)
2. Create your app in [App Store Connect](https://appstoreconnect.apple.com/)

```bash
# Submit the latest production build
npx eas-cli submit --platform ios --profile production
```

This uploads the `.ipa` to App Store Connect. From there:

1. Go to **App Store Connect** > your app > **TestFlight** tab
2. Select the build and add it to a test group
3. Once validated, submit for **App Store Review** under the **App Store** tab

#### TestFlight (beta distribution)

After submitting via EAS, the build appears in TestFlight automatically:

- **Internal testers** — Up to 100 members of your team, no review required
- **External testers** — Up to 10,000 users, requires brief Apple review

Share the TestFlight link or invite testers by email from App Store Connect.

#### Manual Xcode Build

```bash
# Generate native iOS project
npx expo prebuild --platform ios

# Open in Xcode
open ios/*.xcworkspace
```

In Xcode:
1. Select **Product > Archive**
2. In the Organizer, click **Distribute App**
3. Choose **App Store Connect** and follow the wizard

#### Certificates and Provisioning

**Managed credentials (recommended):** EAS manages certificates, provisioning profiles, and push notification keys for you. Run `npx eas-cli credentials` to inspect or reset them.

**Manual credentials:** If you prefer to manage your own:
1. Create certificates in the [Apple Developer Portal](https://developer.apple.com/account/resources/certificates/list)
2. Create provisioning profiles matching your bundle ID
3. Configure in `eas.json`:

```json
"ios": {
  "credentialsSource": "local",
  "provisioningProfilePath": "./profiles/distribution.mobileprovision",
  "distributionCertificate": {
    "path": "./certs/distribution.p12",
    "password": "CERT_PASSWORD"
  }
}
```

---

### Web

Expo can export a static web bundle for deployment to any hosting provider.

#### Export

```bash
npx expo export --platform web
# Output: dist/ directory with static files
```

#### Deploy to Vercel

```bash
npm install -g vercel
cd apps/mobile
vercel --prod
```

Or configure in `vercel.json`:

```json
{
  "buildCommand": "npx expo export --platform web",
  "outputDirectory": "dist"
}
```

#### Deploy to Netlify

```bash
npm install -g netlify-cli
cd apps/mobile
npx expo export --platform web
netlify deploy --prod --dir=dist
```

Or configure in `netlify.toml`:

```toml
[build]
  command = "npx expo export --platform web"
  publish = "dist"
```

#### Deploy to Static Hosting (S3, Firebase, etc.)

```bash
npx expo export --platform web

# AWS S3
aws s3 sync dist/ s3://your-bucket --delete

# Firebase Hosting
firebase deploy --only hosting

# GitHub Pages
# Push the dist/ folder to a gh-pages branch
```

> **Note:** For SPA routing, configure your host to redirect all paths to `index.html`.

---

## OTA Updates (Over-the-Air)

EAS Update lets you push JavaScript and asset changes instantly — no app store review required.

### Setup

```bash
# Configure EAS Update
npx eas-cli update:configure

# Link your project
npx eas-cli project:init
```

Add to `app.json`:

```json
{
  "expo": {
    "updates": {
      "url": "https://u.expo.dev/your-project-id"
    },
    "runtimeVersion": {
      "policy": "appVersion"
    }
  }
}
```

### Publish an Update

```bash
# Push an update to the production branch
npx eas-cli update --branch production --message "Bug fix for login screen"

# Push to a preview branch
npx eas-cli update --branch preview --message "Testing new feature"
```

### How It Works

1. User opens the app
2. Expo checks for updates matching the current `runtimeVersion`
3. If a new update exists, it downloads in the background
4. On next app launch, the new bundle is used

> **Limitation:** OTA updates only work for JavaScript and asset changes. Native code changes (new native modules, SDK version bumps) require a full app store build.

---

## CI/CD with GitHub Actions

### EAS Build on Push

```yaml
# .github/workflows/mobile-release.yml
name: Mobile Release

on:
  push:
    tags:
      - "mobile-v*"

jobs:
  build:
    runs-on: ubuntu-latest

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

      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Build for Android
        run: npx eas-cli build --platform android --profile production --non-interactive
        working-directory: apps/mobile

      - name: Build for iOS
        run: npx eas-cli build --platform ios --profile production --non-interactive
        working-directory: apps/mobile

      - name: Submit to stores
        run: |
          npx eas-cli submit --platform android --profile production --non-interactive
          npx eas-cli submit --platform ios --profile production --non-interactive
        working-directory: apps/mobile
```

### OTA Update on Push to Main

```yaml
# .github/workflows/mobile-ota.yml
name: Mobile OTA Update

on:
  push:
    branches:
      - main
    paths:
      - "apps/mobile/**"

jobs:
  update:
    runs-on: ubuntu-latest

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

      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Publish OTA update
        run: npx eas-cli update --branch production --non-interactive
        working-directory: apps/mobile
```

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `EXPO_TOKEN` | Expo access token (`npx eas-cli login`, then create at expo.dev/settings/access-tokens) |
| Google Service Account JSON | Upload as a secret or store in EAS Secrets (`npx eas-cli secret:create`) |
| Apple credentials | Managed by EAS automatically, or configure via EAS Secrets |

---

## Project Structure

```
apps/mobile/
├── app.json              # Expo configuration (name, scheme, icons, splash)
├── babel.config.js       # Babel preset with NativeWind JSX
├── metro.config.js       # Metro bundler (monorepo + NativeWind)
├── tailwind.config.js    # Tailwind/NativeWind theme configuration
├── global.css            # CSS variable-based theme definitions
├── .env.example          # Environment variable template
├── app/                  # expo-router file-based routes
├── components/           # UI components (auth, home, settings, support)
└── lib/                  # API clients, auth, providers
```
