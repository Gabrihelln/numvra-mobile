# Notification Scheduler - VPS

Este job roda fora do app mobile, sem Expo e sem Cloud Functions. Ele usa Firebase Admin para ler os dados, criar notificacoes internas em `system_notifications`, deduplicar em `notification_events` e enviar push FCM para os tokens em `users/{uid}/push_tokens`.

## Variaveis de ambiente

Use uma credencial Admin do Firebase na VPS. Nao commite esse arquivo no repositorio.

```bash
export FIREBASE_PROJECT_ID=numvra-main
export GOOGLE_APPLICATION_CREDENTIALS=/opt/numvra/firebase-service-account.json
export TZ=America/Sao_Paulo
export NOTIFICATION_SCHEDULER_INTERVAL_MS=300000
export NOTIFICATION_LOOKAHEAD_DAYS=3
export BUDGET_WARNING_THRESHOLD=0.8
```

Alternativa: definir `FIREBASE_SERVICE_ACCOUNT` com o JSON completo da service account.

## Comandos

Validar CLI sem conectar no Firebase:

```bash
npm run notifications:scheduler -- --help
```

Executar uma vez:

```bash
npm run notifications:once
```

Processar apenas notificacoes manuais criadas em system_notifications:

`ash
npm run notifications:manual-push
` 

Executar uma vez sem gravar/enviar:

```bash
npm run notifications:dry-run
```

Subir continuamente com PM2:

```bash
pm2 start ecosystem.config.cjs --only numvra-notification-scheduler
pm2 save
pm2 logs numvra-notification-scheduler
```

Deploy basico na VPS:

```bash
git pull
npm ci
pm2 restart numvra-notification-scheduler --update-env
```

## Colecoes usadas

- `system_notifications`: notificacoes internas exibidas no app.
- `notification_events`: deduplicacao idempotente por `eventKey`.
- `notification_scheduler_logs`: log de cada rodada do scheduler.
- `users/{uid}/settings/push_notifications`: preferencia do usuario.
- `users/{uid}/push_tokens`: tokens FCM ativos.

## Eventos monitorados

- assinaturas vencendo e vencidas;
- faturas/cartoes vencendo e vencidos;
- budgets perto do limite e acima do limite;
- metas alcancadas, vencendo hoje e vencidas.

## Enviar push manual pelo Firebase Console

Crie um documento em `system_notifications` com estes campos:

```text
title: "Promo Numvra"
text: "Assine o Premium com desconto hoje."
audience: "all"
pushStatus: "pending"
enabled: true
createdAt: timestamp atual
```

Para enviar para um usuario especifico, use `userId` no lugar de `audience: "all"`. Para varios usuarios, use `userIds` com uma lista de UIDs.

Depois rode localmente ou aguarde o PM2 na VPS:

```bash
npm run notifications:manual-push
```

O worker marca o documento com `pushSent: true`, `pushStatus: sent`, contadores de tokens e horario de envio.
