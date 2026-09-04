# Numvra Mobile

Aplicativo mobile do Numvra em React Native bare, com TypeScript, Firebase, Google Sign-In e Apple Sign-In.

Este repositório é a base principal do app. Você pode clonar este projeto em um Mac e concluir por lá a configuração nativa que falta para iOS, mantendo este mesmo repositório como fonte oficial.

## Requisitos gerais

- Node.js LTS
- npm
- Git
- Conta/projeto Firebase configurado
- Arquivo `.env` criado a partir de `.env.example`

Instalação inicial:

```bash
git clone https://github.com/Gabrihelln/numvra-mobile.git
cd numvra-mobile
npm install
cp .env.example .env
```

No Windows PowerShell, para copiar o `.env`:

```powershell
Copy-Item .env.example .env
```

Depois preencha o `.env` com as chaves necessárias do Firebase e login social.

## Variáveis de ambiente

O app usa `react-native-config`. As variáveis devem ficar no arquivo `.env`, que não é versionado.

Use `.env.example` como referência e configure, no mínimo, as chaves públicas do Firebase e o `GOOGLE_WEB_CLIENT_ID`.

Sempre que alterar variáveis nativas, pare o Metro e recompile o app.

## Android

### Requisitos Android

- Android Studio
- Android SDK instalado
- JDK compatível com React Native 0.76
- Emulador Android ou celular com depuração USB
- `ANDROID_HOME`/SDK configurado pelo Android Studio

### Configuração Android

O projeto já inclui a pasta `android/`.

Verifique se o arquivo do Firebase Android existe em:

```text
android/app/google-services.json
```

Se você criar outro app Android no Firebase, baixe o novo `google-services.json` e substitua esse arquivo.

### Rodar no Android

Em um terminal:

```bash
npm start
```

Em outro terminal:

```bash
npm run android
```

### Gerar APK Android

Debug:

```powershell
npm run android:debug
```

Release:

```powershell
npm run android:release
```

Os APKs são gerados em:

```text
android/app/build/outputs/apk/
```

## iOS

### Pode clonar no Mac?

Sim. O caminho recomendado é exatamente esse: clonar este repositório no Mac, instalar as dependências, instalar os Pods e finalizar a configuração iOS no Xcode.

O Windows pode manter o desenvolvimento Android. O Mac fica responsável por validar, ajustar certificados, configurar Firebase iOS, Apple Sign-In e compilar o app iOS.

### Requisitos iOS

- macOS
- Xcode instalado pela App Store
- Command Line Tools do Xcode
- CocoaPods
- Node.js LTS
- npm
- Conta Apple Developer para rodar em dispositivo físico e publicar

Instale o CocoaPods se ainda não tiver:

```bash
sudo gem install cocoapods
```

### Clonar e instalar no Mac

```bash
git clone https://github.com/Gabrihelln/numvra-mobile.git
cd numvra-mobile
npm install
cp .env.example .env
```

Preencha o `.env` no Mac com os mesmos valores usados no projeto principal.

### Instalar Pods

```bash
cd ios
pod install
cd ..
```

Se houver problema de cache dos Pods:

```bash
cd ios
pod deintegrate
pod install
cd ..
```

### Configuração Firebase iOS

No Firebase Console, crie ou confira o app iOS com o Bundle Identifier usado no Xcode.

Depois baixe o arquivo:

```text
GoogleService-Info.plist
```

Adicione esse arquivo ao projeto pelo Xcode, dentro do target iOS do app. Garanta que ele esteja incluído no target correto.

### Configuração no Xcode

Abra o workspace, não o `.xcodeproj`:

```bash
open ios/Numvra.xcworkspace
```

No Xcode, confira:

- Team da conta Apple Developer
- Bundle Identifier
- Signing & Capabilities
- Apple Sign-In, se usado em produção
- Push Notifications, se for usar Firebase Messaging/APNs
- Arquivo `GoogleService-Info.plist` incluído no target

### Rodar no iOS

Com o Metro aberto:

```bash
npm start
```

Em outro terminal:

```bash
npm run ios
```

Ou rode diretamente pelo Xcode usando o workspace `ios/Numvra.xcworkspace`.

## Comandos úteis

Verificar TypeScript:

```bash
npm run ts:check
```

Limpar cache do Metro:

```bash
npm start -- --reset-cache
```

Ver status do Git:

```bash
git status
```

Enviar alterações:

```bash
git add .
git commit -m "Describe the change"
git push
```

## Observações importantes

- Não commite `.env`, `node_modules`, builds ou arquivos locais.
- `node_modules`, `dist`, `.expo`, `.idea`, `.env` e builds nativos estão no `.gitignore`.
- O Android pode ser mantido no Windows.
- O iOS deve ser finalizado e testado em um Mac com Xcode.
- Depois de ajustar iOS no Mac, faça commit e push normalmente para manter este repositório como principal.
