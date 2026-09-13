# Stripe Payment Sheet — Numvra Mobile

Implementação concluída no app React Native 0.76.9 com `@stripe/stripe-react-native@0.76.0`.

## Fluxo

1. `PlanScreen` chama `POST /api/create-mobile-subscription` com Bearer token Firebase renovado (`getIdToken(true)`), `planId` normalizado e `billingPeriod`.
2. Cada tentativa recebe um `Idempotency-Key` único. Preço, moeda, `priceId`, usuário e nome do plano não são enviados pelo app.
3. A resposta do backend fornece `paymentIntentClientSecret`, `customerId`, `customerEphemeralKeySecret` (ou `ephemeralKeySecret`), nome da loja e, opcionalmente, `publishableKey`.
4. O Payment Sheet é inicializado com aparência compatível com o tema claro/escuro, métodos atrasados desabilitados e `numvra://stripe-redirect` para 3DS. Apple Pay/Google Pay não são habilitados.
5. Após `presentPaymentSheet`, o app apenas informa que o pagamento está sendo confirmado. Plano, permissões e status continuam vindo do AuthContext/Firestore atualizado por webhook; não há escrita local para “ativar” assinatura.
6. HTTP 409 é tratado como assinatura já ativa e não abre o formulário.

## Fallback e portal

`ENABLE_MOBILE_PAYMENT_SHEET=false` força o Checkout legado (`/api/create-checkout-session`). O fallback permanece disponível para web ou contingência.

“Gerenciar assinatura” usa `/api/create-customer-portal-session` autenticado e abre somente URL HTTPS do Stripe; não depende de link fixo.

## Configuração e publicação

Defina `API_BASE_URL`, `STRIPE_PUBLISHABLE_KEY` (opcional quando o backend a retorna) e `ENABLE_MOBILE_PAYMENT_SHEET=true` no `.env`. A chave deve ser `pk_test_` em testes e `pk_live_` em produção; nenhuma chave secreta deve entrar no bundle.

O esquema `numvra` foi registrado em `app.json`, `ios/Numvra/Info.plist` e `AndroidManifest.xml`. É necessário reinstalar pods/recompilar Android e iOS após instalar o SDK ou alterar manifests. Teste com cartões de teste Stripe, 3DS e cenários de cancelamento/erro; confirme no Dashboard e no Firestore que o webhook atualiza o plano.

## Backend esperado

O endpoint deve validar autenticação, plano/período no servidor, criar/recuperar Customer, PaymentIntent e credencial efêmera, respeitar idempotência e retornar HTTP 409 para assinatura ativa. O app não altera backend nem tenta confirmar assinatura por conta própria.
