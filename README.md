# Fortal CRM — Gestão de Leads (inspirado no Contact2Sale)

Clone funcional do conceito do C2S: captação/cadastro de leads, distribuição automática
round-robin entre corretores, funil visual (kanban), histórico de atividades, chat estilo
WhatsApp e dashboard de métricas. Feito em **Node.js/Express** (backend) + **React/Vite** (frontend),
com o frontend configurado como **PWA**, ou seja, roda no navegador normalmente E pode ser
"instalado" no celular como se fosse um app nativo.

## ⚠️ Sobre a integração real com WhatsApp

Este projeto tem toda a estrutura pronta (`server/routes/whatsapp.js`) para enviar e receber
mensagens de WhatsApp, mas **enviar mensagens de verdade exige uma conta comercial sua** em um
destes provedores:

- [Meta WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api) (oficial, gratuita até certo volume)
- [Twilio WhatsApp API](https://www.twilio.com/docs/whatsapp) (paga, mais simples)
- Z-API ou outro provedor brasileiro não oficial

Sem essas credenciais, o chat funciona em modo demonstração (as mensagens ficam salvas no banco
mas não saem de verdade para o WhatsApp). Basta preencher o `.env` do servidor quando tiver a conta.

## Deploy em produção (link público de verdade)

Guia completo: veja **DEPLOY.md** neste projeto — passo a passo do zero até o link no ar,
usando Render (backend) e Vercel (frontend), ambos com camada gratuita.

## Estrutura

```
c2s-clone/
  server/     -> API Node.js/Express + SQLite
  client/     -> Frontend React/Vite (PWA)
```

## Como rodar

### 1) Backend

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

A API sobe em `http://localhost:4000`. O banco SQLite é criado automaticamente
(`server/c2s.sqlite`) já com dados de exemplo (usuários e leads fictícios).

**Usuários de demonstração:**
| Papel  | Email                | Senha      |
|--------|-----------------------|------------|
| Admin  | admin@c2sclone.com    | admin123   |
| Agente | ana@c2sclone.com      | agente123  |
| Agente | bruno@c2sclone.com    | agente123  |
| Agente | carla@c2sclone.com    | agente123  |

### 2) Frontend

Em outro terminal:

```bash
cd client
npm install
npm run dev
```

Acesse `http://localhost:5173` no navegador do computador.

### 3) Rodar como app no celular

Com o frontend rodando (`npm run dev -- --host` ou `npm run build && npm run preview -- --host`),
seu celular precisa estar na **mesma rede Wi-Fi** do computador:

1. Descubra o IP local do computador (`ipconfig` no Windows ou `ifconfig`/`ip a` no Mac/Linux).
2. No celular, abra o navegador e acesse `http://SEU_IP:5173` (dev) ou `:4173` (preview/build).
3. No Chrome (Android) ou Safari (iPhone), toque em **"Adicionar à tela de início"**.
4. O app aparece com ícone próprio e abre em tela cheia, como um aplicativo nativo.

Para uso fora da rede local (produção de verdade), publique o backend e o frontend em um
serviço de hospedagem (Render, Railway, Vercel, VPS, etc.) e aponte o proxy do `vite.config.js`
para a URL pública da API.

## Funcionalidades incluídas

- Login com JWT (admin e agentes)
- Cadastro de leads com **distribuição automática round-robin**
- Funil kanban com drag-and-drop entre etapas
- Temperatura do lead (quente/morno/frio) com indicador visual
- Histórico de atividades (notas, mudanças de status, atribuições)
- Chat estilo WhatsApp por lead (pronto para plugar API real)
- Dashboard com taxa de conversão, funil por etapa e ranking de corretores
- Gestão de corretores (ativar/desativar, criar novos)
- **Notificações/alertas**: sino no topo avisa sobre leads quentes sem contato,
  leads sem corretor atribuído e leads sem follow-up há mais de 24h (atualiza a cada 1 min)
- **Relatórios**: gráfico de evolução de leads recebidos x ganhos (7/30/90 dias),
  desempenho comparado por corretor (conversão, tempo médio até 1º contato) e
  exportação de todos os leads em **CSV**
- **Tags/Etiquetas** (`/tags`): crie etiquetas (ex: Quente, Investidor, VIP) e aplique nos leads
  direto na tela de detalhe do lead
- **Empresas/Filiais** (`/empresas`): sua empresa matriz e filiais do grupo — cada corretor e
  cada lead pertence a uma empresa
- **Campos avançados de vendedor**: ID externo (pra integrar com outros sistemas), permissão de
  gerenciar usuários, incluir/excluir do ranking de métricas — tudo editável na tela de Corretores
- **Prioridade de vendedores em lote**: `PUT /api/agents/batch-timeshift` reordena quem recebe o
  próximo lead entre vários vendedores de uma vez, sem precisar editar fila por fila
- **Ações no lead**: marcar como lido automaticamente ao abrir, fechar negócio com valor/data/tipo
  de negociação (dispara modal ao marcar como "ganho"), motivo da perda (modal ao marcar como
  "perdido"), telefone secundário e localização (UF/cidade/bairro) no cadastro
- **Filas de distribuição avançadas**: além de reordenar e ativar/desativar,
  agora dá pra definir prioridade por membro dentro da fila, forçar manualmente
  quem recebe o próximo lead, e redistribuir um lead específico através de
  qualquer fila (tudo isso na tela `/distribuicao` e no detalhe do lead)
- **Regras de distribuição por região**: crie regras que mandam leads direto
  pra um vendedor fixo (ou em rodízio) com base em UF/cidade/bairro, sem passar
  pelas filas normais — útil pra times regionais
- **Stand de vendas** (`/estandes`): pra leads capturados em eventos/estandes
  presenciais. Corretores fazem check-in quando chegam e check-out quando saem;
  os leads capturados naquele estande são distribuídos só entre quem está com
  check-in feito no momento. Tem resumo de presenças por vendedor (quantidade
  de check-ins, leads recebidos, tempo médio de permanência)
- **Webhooks** (aba Integrações): avise outro sistema seu sempre que um lead for
  criado, atualizado, ou fechado (ganho/perdido) — cola a URL, marca as ações
  que quer, e pronto
- **Filas de distribuição**: em vez de uma roleta única, você pode criar várias filas
  nomeadas (ex: "Time Zona Sul", "Time carros importados"), cada uma com seus próprios
  membros, ativar/desativar, reordenar por prioridade e um "usuário de segurança" de
  reserva pra quando nenhuma fila ativa tiver alguém disponível
- **Bolsão de leads**: se um corretor não responde a tempo (prazo configurável),
  o lead cai numa fila que qualquer corretor elegível pode assumir. Tem tela de
  configuração (prazo, horário de funcionamento, quem pode ver) e relatório de
  quem mais assume x quem mais perde leads pro bolsão
- **Integração com Facebook/Instagram Lead Ads**: webhook pronto para receber
  leads de formulário em tempo real e distribuí-los automaticamente (ver seção
  abaixo sobre como configurar do lado do Meta)
- PWA instalável no celular

### Regras de alerta usadas nas notificações

Definidas em `server/routes/notifications.js` — ajuste os limites de tempo conforme a
realidade da sua equipe:

- Lead sem corretor atribuído → alerta imediato (severidade alta)
- Lead quente sem nenhum contato há mais de 2h desde a criação → alerta alto
- Lead quente/morno sem follow-up há mais de 24h desde o último contato → alerta médio

## Bolsão de leads (rede de segurança)

Funciona assim: quando um lead é distribuído para um corretor, se ele não registrar
nenhum contato (nota, mensagem, mudança de status) dentro do prazo configurado, o lead
aparece na tela **Bolsão** para qualquer corretor elegível assumir. Configurável em
`/bolsao/configuracoes` (link visível só para admins, dentro da própria tela do Bolsão):

- Ativar/desativar
- Prazo de resposta (5 min a 12h)
- Quem pode ver: qualquer usuário da empresa, ou só quem participa da distribuição automática
- Horário de funcionamento por dia da semana
- Toggle "Vê o bolsão" por usuário, na tela de Corretores

**Observação:** a opção "apenas usuários da mesma equipe" do C2S original não foi
implementada porque este projeto não tem um conceito de equipes/times — dá pra
adicionar depois se for necessário para o seu caso.

## Integração com Facebook/Instagram Lead Ads

Tela em `/integracoes`. Passo a passo para configurar de verdade:

1. Publique o backend (veja `DEPLOY.md`) — o Meta só consegue chamar uma URL pública, não localhost
2. Crie um App em [developers.facebook.com/apps](https://developers.facebook.com/apps) (tipo "Empresa")
3. Gere um **Page Access Token** com a permissão `leads_retrieval` (pode usar o
   [Graph API Explorer](https://developers.facebook.com/tools/explorer))
4. Configure o Webhook do App: URL `https://SEU-BACKEND/api/facebook/webhook`,
   campo de assinatura `leadgen`, Verify Token = o valor de `FB_VERIFY_TOKEN` no `.env` do servidor
5. Na tela `/integracoes` do sistema, cole o **Page ID** e o **Page Access Token** e clique em Integrar

A partir daí, toda vez que alguém preencher o formulário do anúncio, o lead cai
automaticamente no sistema e já é distribuído pro corretor da vez (round-robin).

## Próximos passos sugeridos

- Conectar o WhatsApp de verdade (ver aviso acima)
- Trocar SQLite por Postgres/MySQL em produção
- Evoluir os alertas do sino para notificações push reais (service worker + Web Push API)
- Deploy: backend em Render/Railway, frontend em Vercel/Netlify
