# Configuracao do Notification Scheduler na VPS

Este guia explica como subir o servico server-side de notificacoes do Numvra na VPS.

O scheduler funciona independente do app mobile estar aberto. Ele roda em Node.js/TypeScript com PM2, usa Firebase Admin e envia push FCM.

## O que ja esta implementado

- Scheduler automatico em `server/notifications/scheduler.ts`.
- Servico principal em `server/notifications/notificationSchedulerService.ts`.
- Worker de notificacoes manuais em `server/notifications/systemNotificationPushWorker.ts`.
- Comando separado para notificacoes manuais em `server/notifications/manualPush.ts`.
- Configuracao PM2 em `ecosystem.config.cjs`.
- Icone Android de notificacao em `android/app/src/main/res/drawable/ic_stat_numvra.xml`.

## Colecoes usadas no Firebase

- `system_notifications`: notificacoes internas que o app lista e tambem pode usar para envio manual de push.
- `notification_events`: controle idempotente para evitar duplicidade dos alertas automaticos.
- `notification_scheduler_logs`: logs de cada rodada do scheduler.
- `users/{uid}/settings/push_notifications`: preferencia de notificacao do usuario.
- `users/{uid}/push_tokens`: tokens FCM dos dispositivos.

## Requisitos na VPS

- Node.js instalado.
- NPM instalado.
- PM2 instalado globalmente.
- Projeto `numvra-mobile` atualizado na VPS.
- Arquivo JSON da Service Account do Firebase Admin.

Instalar PM2, se ainda nao existir:

```bash
npm install -g pm2
```

## Service Account do Firebase

No Firebase Console:

1. Entre no projeto `numvra-main`.
2. Va em Project settings.
3. Abra a aba Service accounts.
4. Clique em Generate new private key.
5. Baixe o JSON.

Na VPS, salve esse arquivo fora do repositorio, por exemplo:

```bash
/opt/numvra/firebase-service-account.json
```

Nao commite esse arquivo no GitHub.

## Variaveis de ambiente

Na VPS, configure:

```bash
export FIREBASE_PROJECT_ID=numvra-main
export GOOGLE_APPLICATION_CREDENTIALS=/opt/numvra/firebase-service-account.json
export TZ=America/Sao_Paulo
export NOTIFICATION_SCHEDULER_INTERVAL_MS=300000
export NOTIFICATION_LOOKAHEAD_DAYS=3
export BUDGET_WARNING_THRESHOLD=0.8
export MANUAL_NOTIFICATION_LOOKBACK_MINUTES=1440
export MANUAL_NOTIFICATION_SCAN_LIMIT=100
```

Tambem da para colocar essas variaveis no ambiente do PM2 ou em um arquivo `.env` local da VPS.

## Deploy na VPS

Dentro da pasta do projeto:

```bash
cd /caminho/numvra-mobile
git pull
npm ci
```

Depois inicie o scheduler:

```bash
pm2 start ecosystem.config.cjs --only numvra-notification-scheduler
pm2 save
```

Ver logs:

```bash
pm2 logs numvra-notification-scheduler
```

Reiniciar depois de novos deploys:

```bash
git pull
npm ci
pm2 restart numvra-notification-scheduler --update-env
```

## Testar antes de deixar rodando

Executar uma rodada sem gravar e sem enviar push:

```bash
npm run notifications:dry-run
```

Executar uma rodada real dos alertas automaticos:

```bash
npm run notifications:once
```

Executar somente o worker de notificacoes manuais:

```bash
npm run notifications:manual-push
```

## Criar notificacao manual pelo Firebase

Para enviar push manual pelo Firebase Console, crie um documento em `system_notifications` com campos como:

```text
title: "Promo Numvra"
text: "Premium com desconto por tempo limitado."
audience: "all"
pushStatus: "pending"
enabled: true
createdAt: timestamp atual
```

Para enviar para um usuario especifico:

```text
title: "Aviso Numvra"
text: "Sua assinatura foi atualizada."
userId: "UID_DO_USUARIO"
pushStatus: "pending"
enabled: true
createdAt: timestamp atual
```

Para varios usuarios:

```text
title: "Atualizacao Numvra"
text: "Nova versao disponivel."
userIds: ["uid1", "uid2"]
pushStatus: "pending"
enabled: true
createdAt: timestamp atual
```

O worker vai marcar o documento depois do envio com campos como:

```text
pushSent: true
pushStatus: "sent"
pushSentAt
pushRecipientCount
pushTokenCount
pushSuccessCount
pushFailureCount
```

Se falhar, ele marca:

```text
pushStatus: "failed"
pushError
pushFailedAt
```

## Alertas automaticos monitorados

O scheduler verifica:

- assinaturas vencendo;
- assinaturas vencidas;
- faturas/cartoes vencendo;
- faturas/cartoes vencidos;
- budgets proximos do limite;
- budgets acima do limite;
- metas alcancadas;
- metas vencendo hoje;
- metas vencidas.

A deduplicacao e feita por `eventKey`, por exemplo:

```text
subscription_due:{subscriptionId}:{date}
subscription_overdue:{subscriptionId}:{date}
bill_due:{cardId}:{date}
budget_threshold:{budgetId}:{threshold}:{period}
goal_overdue:{goalId}:{date}
```

## Observacoes importantes

- O scheduler usa Firebase Admin, entao ele nao depende das rules do Firestore para escrever.
- O app mobile ainda precisa ter permissao de notificacao ativa e token salvo em `users/{uid}/push_tokens`.
- O usuario precisa ter ativado notificacoes no app pelo menos uma vez no dispositivo.
- No Android, o icone pequeno da notificacao so atualiza depois de instalar uma nova build/APK, porque e recurso nativo.
- Se criar manualmente documento em `system_notifications`, use `pushStatus: "pending"` para garantir que o worker envie o push.
