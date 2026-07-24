# Fortal CRM — App nativo (Android + iOS)

O app foi empacotado com **Capacitor**: ele carrega o site já publicado em
`https://fortalcrm.com.br` dentro de um app nativo de verdade. Ou seja,
toda vez que fizermos deploy no Render/Vercel, o app atualiza sozinho —
**você não precisa recompilar nem reenviar pra loja pra mudanças de conteúdo/funcionalidade**,
só quando mudar algo nativo (ícone, nome, permissões).

Projetos já gerados em:
- `client/android` — projeto Android Studio
- `client/ios` — projeto Xcode

---

## 1. Antes de tudo

| Coisa | Onde conseguir |
|---|---|
| Conta Google Play Console | https://play.google.com/console — taxa única de US$ 25 |
| Conta Apple Developer Program | https://developer.apple.com/programs/ — US$ 99/ano |
| Política de privacidade (URL pública) | Obrigatória nas duas lojas — pode ser uma página simples no seu site |

---

## 2. Buildar o Android (precisa de Android Studio)

Isso roda no Windows, Mac ou Linux — não precisa de Mac pro Android.

1. Instale o [Android Studio](https://developer.android.com/studio)
2. Clone o repositório e entre em `client/`
3. `npm install`
4. `npm run build` (gera a pasta `dist`, embora o app carregue o site ao vivo — o Capacitor ainda usa isso como fallback local)
5. `npx cap sync android`
6. `npx cap open android` — abre o projeto no Android Studio
7. No Android Studio: **Build → Generate Signed Bundle / APK → Android App Bundle (.aab)**
   - Crie uma *keystore* (senha guardada com cuidado — sem ela você não consegue atualizar o app depois!)
8. Suba o `.aab` gerado no [Google Play Console](https://play.google.com/console) → criar app → preencher ficha da loja (descrição, screenshots, categoria, classificação indicativa, política de privacidade)
9. Enviar pra revisão (geralmente aprova em horas a 1-2 dias)

---

## 3. Buildar o iOS com Codemagic (sem precisar de Mac)

Já deixei um arquivo `codemagic.yaml` pronto na raiz do projeto. Veja o passo a passo:

### 3.1 Criar conta e conectar o repositório
1. Acesse **https://codemagic.io** e crie uma conta (dá pra entrar direto com o login do GitHub)
2. Clique em **Add application** → escolha o repositório **fortal-crm**
3. O Codemagic vai detectar o `codemagic.yaml` automaticamente

### 3.2 Criar sua conta de desenvolvedor Apple (se ainda não tem)
1. Acesse **https://developer.apple.com/programs/** → assine o Apple Developer Program (US$ 99/ano)
2. Aguarde a aprovação (geralmente rápido, às vezes leva 1-2 dias)

### 3.3 Conectar a Apple ao Codemagic (integração automática de certificados)
1. No painel do Codemagic: **Teams → Integrations → App Store Connect**
2. Clique em **Generate API Key** — isso te leva direto pro App Store Connect da Apple pra gerar uma chave (o Codemagic explica esse passo na tela, é só seguir)
3. Dê um nome pra essa integração, por exemplo `fortal_crm_appstore`
4. **Importante:** esse mesmo nome precisa estar no `codemagic.yaml`, no campo `integrations.app_store_connect` (já deixei como `fortal_crm_appstore` — só troque se você usar outro nome)

### 3.4 Criar o app no App Store Connect
1. Acesse **https://appstoreconnect.apple.com** → **Apps** → **+** → **Novo app**
2. Bundle ID: `br.com.fortalcrm.crm` (o Codemagic consegue criar esse Bundle ID pra você automaticamente na primeira build, ou você cria manualmente em **Certificates, Identifiers & Profiles**)
3. Preencha nome do app, idioma principal, categoria

### 3.5 Rodar a primeira build
1. No Codemagic, vá na aba do seu app → **Start new build** → escolha o workflow `ios-fortal-crm`
2. Acompanhe o log — a primeira build demora mais (10-20 min)
3. Se der certo, o `.ipa` vai direto pro **TestFlight** (configurado em `submit_to_testflight: true`)
4. Baixe o app **TestFlight** no seu iPhone e teste antes de mandar pra revisão de verdade

### 3.6 Enviar pra revisão da App Store
1. Depois de testar no TestFlight e estiver satisfeito, preencha a ficha completa da loja no App Store Connect (screenshots, descrição, política de privacidade, classificação etária)
2. No `codemagic.yaml`, mude `submit_to_app_store: false` para `true`
3. Rode a build de novo, ou envie manualmente pela interface do App Store Connect

---

## 4. Se preferir buildar o iOS localmente (com Mac)


1. Instale o [Xcode](https://apps.apple.com/app/xcode/id497799835) (App Store)
2. `cd client && npm install && npm run build`
3. `npx cap sync ios`
4. `cd ios/App && pod install` (instala as dependências nativas do CocoaPods)
5. `npx cap open ios` — abre no Xcode
6. Configure o **Team** (sua conta Apple Developer) em Signing & Capabilities
7. **Product → Archive** → depois **Distribute App → App Store Connect**
8. Complete a ficha no [App Store Connect](https://appstoreconnect.apple.com) (screenshots, descrição, política de privacidade, classificação etária)
9. Enviar pra revisão (1-3 dias, a Apple é mais rigorosa — pode pedir ajustes)

---

## 5. Ícone e splash screen

Já gerados a partir de `client/resources/icon.png` e `client/resources/splash.png`.
Pra trocar o visual, substitua essas duas imagens e rode:

```bash
npx capacitor-assets generate --iconBackgroundColor '#0E0C0A' --splashBackgroundColor '#0E0C0A'
```

---

## 6. Dica de aprovação

Apps que são "só um site dentro de uma casca" às vezes são recusados,
principalmente pela Apple. O Fortal CRM já tem bastante coisa nativa de
verdade a favor dele (clique-pra-ligar, salvar contato, compartilhamento
nativo, PWA instalável, cronômetros em tempo real) — isso ajuda bastante
na aprovação. Se a Apple recusar alegando "conteúdo web mínimo", o caminho
é adicionar mais uma função nativa (ex: notificações push quando cai lead
novo) antes de reenviar.
