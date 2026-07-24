import "dotenv/config";
import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import leadsRoutes from "./routes/leads.js";
import agentsRoutes from "./routes/agents.js";
import dashboardRoutes from "./routes/dashboard.js";
import whatsappRoutes from "./routes/whatsapp.js";
import notificationsRoutes from "./routes/notifications.js";
import reportsRoutes from "./routes/reports.js";
import bolsaoRoutes from "./routes/bolsao.js";
import facebookRoutes from "./routes/facebook.js";
import distributionRoutes from "./routes/distribution.js";
import webhooksRoutes from "./routes/webhooks.js";
import standsRoutes from "./routes/stands.js";
import tagsRoutes from "./routes/tags.js";
import companiesRoutes from "./routes/companies.js";
import lostReasonsRoutes from "./routes/lost-reasons.js";
import queuePositionRoutes from "./routes/queue-position.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/leads", leadsRoutes);
app.use("/api/agents", agentsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/whatsapp", whatsappRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/bolsao", bolsaoRoutes);
app.use("/api/facebook", facebookRoutes);
app.use("/api/distribution", distributionRoutes);
app.use("/api/webhooks", webhooksRoutes);
app.use("/api/stands", standsRoutes);
app.use("/api/tags", tagsRoutes);
app.use("/api/companies", companiesRoutes);
app.use("/api/lost-reasons", lostReasonsRoutes);
app.use("/api/queue-position", queuePositionRoutes);

app.listen(PORT, () => {
  console.log(`✅ Fortal CRM API rodando em http://localhost:${PORT}`);
});
