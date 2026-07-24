import { Router } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../middleware/auth.js";
import { addClient, removeClient } from "../lib/events.js";

const router = Router();

// EventSource do navegador não consegue mandar header Authorization, então
// esse endpoint aceita o token pela query string (?token=...) só aqui.
router.get("/stream", (req, res) => {
  const token = req.query.token;
  try {
    jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).end();
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.write("retry: 3000\n\n");

  addClient(res);

  // Mantém a conexão viva através do sleep/proxy do Render
  const heartbeat = setInterval(() => {
    try {
      res.write(": ping\n\n");
    } catch {
      clearInterval(heartbeat);
    }
  }, 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    removeClient(res);
  });
});

export default router;
