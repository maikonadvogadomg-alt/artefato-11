# DevMobile — Como Gerar o APK Gratuitamente

> **Sem Replit, sem EAS pago, sem nada além de uma conta GitHub gratuita.**

---

## Opção 1 — GitHub Actions (RECOMENDADO, 100% Grátis)

### Passo a passo:

1. **Crie uma conta no GitHub** — github.com (gratuita)

2. **Crie um repositório novo** (pode ser privado, é grátis):
   - Clique em `+` → `New repository`
   - Nome: `devmobile` (ou qualquer nome)
   - Deixe vazio (sem README)

3. **Faça upload do código**:
   - Descompacte este ZIP
   - Abra o terminal/prompt na pasta
   - Execute:
     ```
     git init
     git add .
     git commit -m "DevMobile app"
     git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git
     git push -u origin main
     ```

4. **Acesse a aba Actions no GitHub**:
   - Vá em `github.com/SEU_USUARIO/SEU_REPO/actions`
   - Clique em `Build Android APK`
   - Clique em `Run workflow` → `Run workflow`

5. **Aguarde ~10 minutos** e baixe o APK:
   - Clique no build finalizado
   - Desça até `Artifacts`
   - Clique em `app-debug` para baixar o APK

6. **Instale no celular**:
   - Transfira o APK para o celular
   - Ative "Instalar de fontes desconhecidas" nas configurações
   - Instale o APK

---

## Opção 2 — EAS Build (Grátis, 30 builds/mês)

1. Instale o EAS CLI:
   ```
   npm install -g eas-cli
   ```

2. Faça login:
   ```
   eas login
   ```

3. Na pasta do projeto, execute:
   ```
   eas build -p android --profile preview --non-interactive
   ```

4. Aguarde o link do APK na tela (~5-10 minutos)

---

## Opção 3 — Expo Go (para testar sem buildar)

1. Instale o Expo Go no celular (Play Store)
2. Instale as dependências: `npm install`
3. Inicie o Metro: `npx expo start`
4. Escaneie o QR code com o Expo Go

---

## Requisitos para buildar localmente (avançado)

- Node.js 18+
- Java JDK 17
- Android Studio + Android SDK
- `npm install`
- `npx expo prebuild --platform android`
- `cd android && ./gradlew assembleDebug`
- APK em: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## Dicas

- O APK gerado é `debug` — funciona normalmente no celular
- Para APK `release` (menor, mais rápido), troque `assembleDebug` por `assembleRelease` no workflow
- A chave de IA (Groq, Gemini, etc.) fica salva no celular — não depende de nenhum servidor
- O app funciona 100% offline para edição de código, terminal js>/sql> e SQLite

---

## Suporte

- Issues: github.com/seu_usuario/devmobile/issues
- Expo docs: docs.expo.dev
- EAS Build: docs.expo.dev/build/introduction
