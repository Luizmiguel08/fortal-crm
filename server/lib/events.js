// Broadcaster simples pra eventos em tempo real via SSE (Server-Sent Events).
// Não precisa de biblioteca extra nem de infraestrutura adicional — cada
// cliente conectado mantém uma conexão HTTP aberta, e a gente escreve nela
// direto quando algo acontece (ex: lead novo).
const clients = new Set();

export function addClient(res) {
  clients.add(res);
}

export function removeClient(res) {
  clients.delete(res);
}

export function broadcast(type, payload) {
  const message = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of clients) {
    try {
      res.write(message);
    } catch {
      clients.delete(res);
    }
  }
}
