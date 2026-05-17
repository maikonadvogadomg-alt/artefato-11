// Capacitor + GitHub Actions APK builder
// Generates workflow files and pushes them to the user's GitHub repo
// This is completely free — GitHub Actions gives 2000 min/month free

const WORKFLOW_YML = (appName: string, packageId: string) => `name: Build Android APK

on:
  push:
    branches: [main, master]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '17'

      - name: Setup Android SDK
        uses: android-actions/setup-android@v3

      - name: Install Capacitor
        run: |
          npm init -y 2>/dev/null || true
          npm install --save @capacitor/core @capacitor/android
          npm install --save-dev @capacitor/cli

      - name: Configure Capacitor
        run: |
          cat > capacitor.config.json << 'EOF'
          {
            "appId": "${packageId}",
            "appName": "${appName}",
            "webDir": "."
          }
          EOF

      - name: Init Capacitor Android
        run: |
          npx cap add android
          npx cap sync android

      - name: Build APK
        run: |
          cd android
          chmod +x gradlew
          ./gradlew assembleDebug --no-daemon

      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: app-debug
          path: android/app/build/outputs/apk/debug/app-debug.apk
          retention-days: 30
`;

const CAPACITOR_CONFIG = (appName: string, packageId: string) =>
  JSON.stringify({ appId: packageId, appName: appName, webDir: "." }, null, 2);

async function getFileSha(
  token: string,
  owner: string,
  repo: string,
  filePath: string
): Promise<string | null> {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.sha || null;
}

async function pushFile(
  token: string,
  owner: string,
  repo: string,
  filePath: string,
  content: string,
  message: string
): Promise<void> {
  const sha = await getFileSha(token, owner, repo, filePath);
  const body: Record<string, unknown> = {
    message,
    content: btoa(unescape(encodeURIComponent(content))),
  };
  if (sha) body.sha = sha;
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error((err.message as string) || `HTTP ${res.status} ao enviar ${filePath}`);
  }
}

export interface CapacitorBuildResult {
  actionsUrl: string;
}

export async function setupCapacitorBuild(
  token: string,
  owner: string,
  repo: string,
  appName: string,
  packageId: string,
  onLog: (msg: string) => void
): Promise<CapacitorBuildResult> {
  onLog("📁 Criando .github/workflows/build-apk.yml ...");
  await pushFile(
    token,
    owner,
    repo,
    ".github/workflows/build-apk.yml",
    WORKFLOW_YML(appName, packageId),
    "ci: add Capacitor Android APK build workflow"
  );
  onLog("✅ Workflow criado!");

  onLog("⚙️ Criando capacitor.config.json ...");
  await pushFile(
    token,
    owner,
    repo,
    "capacitor.config.json",
    CAPACITOR_CONFIG(appName, packageId),
    "chore: add capacitor.config.json"
  );
  onLog("✅ Config do Capacitor criado!");

  onLog("🚀 GitHub Actions iniciou automaticamente o build...");
  onLog("📦 Em ~5 minutos o APK estará pronto para baixar!");

  return { actionsUrl: `https://github.com/${owner}/${repo}/actions` };
}
