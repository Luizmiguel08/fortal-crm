# Deploy do Fortal CRM — passo a passo até funcionar 100%

Vamos usar **Render** para o backend (API) e **Vercel** para o frontend (site/app).
Os dois têm plano gratuito e não pedem cartão de crédito para começar.

⚠️ **Importante sobre o plano gratuito do Render**: o servidor "dorme" depois de
15 minutos sem uso (a primeira requisição depois disso demora ~30-60s pra acordar) e o
arquivo do banco SQLite pode ser resetado quando você fizer um novo deploy. Isso é
perfeito pra testar e mostrar o projeto funcionando. Se depois você quiser algo sempre
ligado e com dados permanentes, no final deste guia explico como migrar (é só trocar de
plano, não precisa mexer no código).

---

## Parte 0 — Contas que você precisa criar (5 min)

1. Uma conta no **GitHub** → https://github.com/signup (se ainda não tiver)
2. Uma conta no **Render** → https://render.com (pode entrar direto com o GitHub)
3. Uma conta na **Vercel** → https://vercel.com (pode entrar direto com o GitHub)

---

## Parte 1 — Colocar o código no GitHub

O Render e a Vercel publicam o site "puxando" o código direto do GitHub. Então o
primeiro passo é subir a pasta `c2s-clone` pra lá.

1. Extraia o `c2s-clone.zip` em uma pasta no seu computador.
2. Acesse https://github.com/new e crie um repositório novo:
   - Nome: `c2s-clone` (ou o nome que quiser)
   - Deixe **Public** ou **Private**, tanto faz
   - Não marque nenhuma opção de "adicionar README" (você já tem um)
   - Clique em **Create repository**
3. O GitHub vai te mostrar alguns comandos. Abra o terminal **dentro da pasta
   `c2s-clone`** (a pasta que tem as subpastas `server` e `client`) e rode:

   ```bash
   git init
   git add .
   git commit -m "Primeira versão do Fortal CRM"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/c2s-clone.git
   git push -u origin main
   ```

   (troque `SEU-USUARIO` pelo seu usuário do GitHub — o link certinho aparece na
   própria página do repositório que você criou)

Se pedir login, use seu usuário e um **Personal Access Token** (o GitHub explica como
gerar um na hora, ou você pode instalar o GitHub Desktop e fazer isso clicando em vez de
usar comandos, se preferir: https://desktop.github.com).

Não tem `git` instalado? No Windows, baixe em https://git-scm.com/downloads — no
Mac já vem instalado.

---

## Parte 2 — Publicar o backend (API) no Render

1. Entre em https://dashboard.render.com
2. Clique em **New +** → **Web Service**
3. Conecte sua conta do GitHub (se pedir) e escolha o repositório `c2s-clone`
4. Preencha assim:
   - **Name**: `fortal-crm-api` (o nome vira parte da URL)
   - **Region**: escolha a mais perto de você (ex: Ohio ou Oregon, para o Brasil
     qualquer uma serve bem)
   - **Root Directory**: `server` ← **muito importante**, é a subpasta do backend
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
5. Antes de clicar em criar, desça até **Environment Variables** e adicione:
   | Key | Value |
   |---|---|
   | `JWT_SECRET` | qualquer frase longa e aleatória, ex: `x7Jk29pQmZ...` |
   | `CORS_ORIGIN` | deixe `*` por enquanto (ajustamos na Parte 4) |
6. Clique em **Create Web Service**.

O Render vai instalar as dependências e subir o servidor — acompanhe o log na tela.
Quando aparecer `✅ Fortal CRM API rodando...` no log, está no ar. Copie a URL que
aparece no topo da página, algo como:

```
https://fortal-crm-api.onrender.com
```

**Teste**: abra `https://fortal-crm-api.onrender.com/api/health` no navegador — se
aparecer `{"ok":true}`, o backend está funcionando. 🎉

---

## Parte 3 — Publicar o frontend na Vercel

1. Entre em https://vercel.com/new
2. Importe o mesmo repositório `c2s-clone`
3. Na tela de configuração:
   - **Root Directory**: clique em "Edit" e selecione `client` ← **muito importante**
   - Framework Preset: a Vercel deve detectar "Vite" sozinha
   - **Build Command**: `npm run build` (já vem preenchido)
   - **Output Directory**: `dist` (já vem preenchido)
4. Abra **Environment Variables** e adicione:
   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://fortal-crm-api.onrender.com/api` (a URL do Render + `/api`) |
5. Clique em **Deploy**.

Em ~1 minuto a Vercel te dá uma URL pública, tipo:

```
https://fortal-crm.vercel.app
```

Abra essa URL. Você deve ver a tela de login do sistema.

---

## Parte 4 — Ligar os dois (CORS) e testar de ponta a ponta

Por segurança, agora vamos dizer ao backend para só aceitar pedidos vindos do seu
site (em vez de `*`, que aceita qualquer origem):

1. Volte no **Render** → seu serviço `fortal-crm-api` → aba **Environment**
2. Edite a variável `CORS_ORIGIN` e coloque a URL exata da Vercel:
   ```
   https://fortal-crm.vercel.app
   ```
3. Salve — o Render reinicia o serviço sozinho (leva ~1 min).

Agora teste o fluxo completo:

1. Abra `https://fortal-crm.vercel.app`
2. Entre com `admin@c2sclone.com` / `admin123`
3. Veja se o painel carrega números, se a lista de leads aparece, se dá pra
   arrastar um card no kanban

Se der erro de login ou tela em branco, veja a seção **Resolução de problemas**
mais abaixo.

---

## Parte 5 — Instalar como app no celular

Com o site já publicado (não precisa mais estar na mesma rede Wi-Fi):

1. No celular, abra `https://fortal-crm.vercel.app` no Chrome (Android) ou Safari (iPhone)
2. Toque no menu (⋮ ou ícone de compartilhar) → **Adicionar à tela de início**
3. Pronto — abre em tela cheia como um app.

---

## Resolução de problemas

**Tela de login não faz nada / erro no console do navegador**
→ Confira se `VITE_API_URL` na Vercel está exatamente igual à URL do Render + `/api`
no final. Depois de mudar uma env var na Vercel, você precisa clicar em **Redeploy**
(aba Deployments) para ela valer.

**"Failed to fetch" ou erro de CORS no console**
→ O `CORS_ORIGIN` no Render tem que ser **idêntico** à URL da Vercel (sem barra `/`
no final). Confira também se não sobrou espaço em branco ao colar.

**Primeira requisição demora muito / dá timeout**
→ Normal no plano gratuito do Render: se ninguém usou o site nos últimos 15 min, o
servidor "acorda" na primeira tentativa e isso leva até 1 minuto. As próximas são rápidas.

**Depois de um novo deploy, os leads que eu cadastrei sumiram**
→ Esperado: o plano gratuito do Render não garante que o arquivo SQLite sobrevive
a um redeploy. Veja a seção abaixo para resolver isso de vez.

---

## Quer dados permanentes e servidor sempre ligado? (opcional, pago)

Quando o projeto sair do teste e virar uso real, dois ajustes no Render (sem mexer
em nenhuma linha de código):

1. **Trocar o plano do web service** de Free para **Starter** (~US$7/mês) — tira o
   "modo soneca" e mantém o servidor sempre no ar.
2. **Adicionar um disco persistente** (Render → seu serviço → aba **Disks** →
   Add Disk, ex: 1GB por ~US$0.25/mês), montado por exemplo em `/var/data`, e então
   configurar a variável de ambiente `DB_PATH=/var/data/c2s.sqlite`. Assim o banco
   sobrevive a qualquer redeploy.

Isso já é suficiente pra uma imobiliária pequena/média usar de verdade. Se o volume
de leads crescer muito, aí sim vale migrar de SQLite para um Postgres gerenciado
(posso te ajudar nessa migração quando chegar a hora).
