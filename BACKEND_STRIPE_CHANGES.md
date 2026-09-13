# Auditoria e plano de implementacao Stripe — Numvra

## 1. Escopo auditado

O workspace contem somente o aplicativo React Native e um worker de notificacoes. Nao ha codigo de backend HTTP/Express, Firebase Functions, webhook Stripe ou integracao `stripe` neste repositorio.

Arquivos do app relacionados:

- `src/services/api.ts`: cliente HTTP autenticado; envia `Authorization: Bearer <Firebase ID token>`.
- `src/services/checkoutService.ts`: cria Checkout Session e abre URLs Stripe; tambem abre o Customer Portal configurado.
- `src/screens/PlanScreen.tsx`: tela de plano atual e upgrade.
- `src/config/planCatalog.ts`: catalogo local de `basic`, `pro` e `premium`, com periodos `monthly`, `semiannual` e `annual`.
- `src/contexts/AuthContext.tsx`: le o perfil `users/{uid}` e deriva o plano ativo considerando expiracao.
- `src/types/index.ts`: campos de assinatura no perfil.

## 2. Rota de checkout encontrada

Base URL: `https://api.numvra.com` (variavel `API_BASE_URL` em `.env.example` e `react-native-config`).

Endpoint: `POST /api/create-checkout-session`.

App: `src/services/checkoutService.ts`.

Backend: nao presente neste repositorio; o host respondeu via Express/Nginx.

Body atual seguro:

```json
{
  "planId": "pro|premium",
  "billingPeriod": "monthly|semiannual|annual"
}
```

O ID Token Firebase segue no header `Authorization`; o app nao deve enviar `price`, `planName`, `amount`, `uid` ou `email` como fonte de identidade/preco.

Retorno esperado: `{ "url": "https://checkout.stripe.com/..." }`.

Status observado: o host deixou de retornar 404 para checkout e responde 400 quando a requisicao anonima e invalida; isso confirma que a rota existe. O teste autenticado deve ser feito com o app.

Success/cancel URL: nao sao definidos pelo app; devem ser definidos pelo backend ao criar a Checkout Session. O backend deve retornar uma URL HTTPS do Stripe.

## 3. Customer Portal

`POST /api/create-customer-portal-session` nao existe no host verificado. O botao Gerenciar assinatura usa atualmente o portal Stripe fornecido pelo produto:

`https://billing.stripe.com/p/login/28E3co4KE11Eefl4nBa3u00`

Se for necessario portal contextual por usuario, publicar a rota no backend e substituir o link fixo por uma sessao criada para o `stripeCustomerId` autenticado.

## 4. Planos reais do app

O catalogo local define:

- `basic`: gratis.
- `pro`: mensal 19,90; semestral 16,52 por mes; anual 13,33 por mes.
- `premium`: mensal 34,90; semestral 28,97 por mes; anual 23,38 por mes.

Esses valores sao somente exibicao. O backend deve escolher os Stripe Price IDs internamente para cada combinacao valida, sem confiar em valores do cliente.

## 5. O que precisa ser implementado no backend

1. Validar o Firebase ID Token e extrair `uid`.
2. Validar uma lista fechada de `planId` e `billingPeriod`.
3. Mapear internamente cada combinacao para o Price ID Stripe configurado no servidor.
4. Reutilizar `users/{uid}.stripeCustomerId`; criar Customer somente quando ausente.
5. Impedir nova assinatura quando ja houver assinatura ativa/incompleta relevante; preferir atualizar/trocar o plano por fluxo controlado.
6. Criar Checkout Session com `mode: subscription`, Customer, Price interno, metadata `firebaseUid`, `planId` e `billingPeriod`, alem de success/cancel URLs.
7. Usar chave de idempotencia por usuario/plano/período para retries e clique duplo.
8. Publicar `POST /api/create-customer-portal-session` se o portal contextual for desejado.
9. Validar assinatura do webhook Stripe usando o corpo raw.
10. Atualizar Firestore somente pelo webhook confirmado; nunca ativar Pro/Premium por resposta do frontend.

## 6. Webhook e Firestore

Nao ha webhook neste workspace. O backend deve tratar apenas os eventos necessarios, no minimo:

- `checkout.session.completed`;
- `customer.subscription.created` e `customer.subscription.updated`;
- `customer.subscription.deleted`;
- `invoice.paid`;
- `invoice.payment_failed`.

O processamento deve ser idempotente e localizar o usuario por Customer ID ou metadata. Atualizar, de forma compativel, `users/{uid}` com os campos que o app ja conhece: `plan`, `planStatus`, `planBillingPeriod`, `planPrice`, `planActiveUntil`, `stripeCustomerId` e `stripeSubscriptionId`. Recomenda-se acrescentar `currentPeriodStart`, `currentPeriodEnd` e `cancelAtPeriodEnd` se o backend ainda nao os possuir.

Estados devem preservar ao menos `active`, `trialing`, `past_due`, `canceled` e estados incompletos relevantes. Cancelamento no fim do periodo deve manter acesso ate `currentPeriodEnd`.

## 7. Payment Sheet e plataformas

`@stripe/stripe-react-native` nao esta instalado e Payment Sheet nao foi implementado. O fluxo atual continua sendo Stripe Checkout externo, adequado para preservar a integracao existente enquanto as politicas de distribuicao de assinaturas digitais no Brasil sao avaliadas.

Nao usar WebView nem coletar numero de cartao/CVV no app. Se futuramente Payment Sheet for aprovado para uma plataforma, adicionar um provider de pagamento separado, criar a assinatura no backend e conceder acesso somente apos webhook.

## 8. Variaveis de ambiente do servidor

O backend deve usar suas variaveis existentes, se houver. Onde ainda nao existir configuracao, sao necessarios equivalentes server-side para:

- chave secreta Stripe;
- segredo do webhook Stripe;
- Price IDs de Pro/Premium para mensal, semestral e anual;
- URLs de sucesso e cancelamento;
- credencial Firebase Admin.

Esses valores nunca devem ser adicionados ao app ou ao `.env.example` mobile.

## 9. Alteracoes ja feitas no aplicativo

- Mantida a rota existente `/api/create-checkout-session`.
- Payload reduzido para `planId` e `billingPeriod`; preco e Price ID nao sao enviados pelo cliente.
- Autenticacao continua pelo Firebase ID Token gerado em `src/services/api.ts`.
- URL Stripe retornada e normalizada antes de `Linking.openURL`.
- Botao de gerenciamento abre o portal Stripe informado pelo produto enquanto a rota contextual do backend nao existe.
- Bloqueio de multiplos cliques permanece na `PlanScreen` por meio do estado `submitting`.

## 10. Pendencias manuais

1. Corrigir/publicar o backend HTTP que atende `api.numvra.com`.
2. Confirmar os Price IDs reais no Stripe Dashboard e configura-los somente no servidor.
3. Implementar/verificar webhook assinado e idempotente.
4. Confirmar success/cancel URLs e deep link caso o Checkout precise retornar ao app.
5. Testar com conta nova, cancelamento, cartao recusado, assinatura existente, renovacao, falha de invoice e webhook duplicado.

