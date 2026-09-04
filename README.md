# Numvra Mobile

Aplicativo React Native Bare do Numvra, com TypeScript, Firebase Auth, Firestore e Google Sign-In nativo.

## Desenvolvimento Android

1. Instale as dependências com `npm install`.
2. Inicie o Metro com `npm start`.
3. Abra a pasta `android/` no Android Studio ou execute `npm run android` com um emulador ou dispositivo conectado.

Para gerar APKs diretamente pelo Gradle:

```powershell
npm run android:debug
npm run android:release
```

Os APKs são gerados em `android/app/build/outputs/apk/<variant>/`.

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha as chaves públicas do Firebase e o `GOOGLE_WEB_CLIENT_ID`. Essas variáveis são disponibilizadas ao aplicativo por `react-native-config`.

## iOS

A instalação e validação iOS devem ser concluídas em um Mac com Xcode e CocoaPods.
