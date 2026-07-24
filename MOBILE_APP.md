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

## 3. Buildar o iOS (precisa de Mac + Xcode)

Aqui **não tem jeito de fugir do Mac** — é exigência da própria Apple.

**Se você não tem um Mac**, alternativas sem comprar um:
- **MacinCloud** ou **Amazon EC2 Mac instances** — Mac alugado na nuvem por hora/mês
- **Codemagic** ou **Ionic Appflow** — serviços de CI que compilam e assinam o app iOS pra você, sem precisar de Mac próprio (pagos, mas com planos de entrada)

Com um Mac disponível:
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

## 4. Ícone e splash screen

Já gerados a partir de `client/resources/icon.png` e `client/resources/splash.png`.
Pra trocar o visual, substitua essas duas imagens e rode:

```bash
npx capacitor-assets generate --iconBackgroundColor '#0E0C0A' --splashBackgroundColor '#0E0C0A'
```

---

## 5. Dica de aprovação

Apps que são "só um site dentro de uma casca" às vezes são recusados,
principalmente pela Apple. O Fortal CRM já tem bastante coisa nativa de
verdade a favor dele (clique-pra-ligar, salvar contato, compartilhamento
nativo, PWA instalável, cronômetros em tempo real) — isso ajuda bastante
na aprovação. Se a Apple recusar alegando "conteúdo web mínimo", o caminho
é adicionar mais uma função nativa (ex: notificações push quando cai lead
novo) antes de reenviar.
