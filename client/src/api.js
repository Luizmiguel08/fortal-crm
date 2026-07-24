const BASE = import.meta.env.VITE_API_URL || "/api";

function getToken() {
  return localStorage.getItem("c2s_token");
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Erro na requisição");
  }
  return data;
}

export const api = {
  login: (email, password) =>
    request("/auth/login", { method: "POST", body: { email, password }, auth: false }),
  me: () => request("/auth/me"),

  getLeads: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/leads${qs ? `?${qs}` : ""}`);
  },
  getLead: (id) => request(`/leads/${id}`),
  createLead: (data) => request("/leads", { method: "POST", body: data }),
  updateLead: (id, data) => request(`/leads/${id}`, { method: "PATCH", body: data }),
  deleteLead: (id) => request(`/leads/${id}`, { method: "DELETE" }),
  addActivity: (id, data) => request(`/leads/${id}/activities`, { method: "POST", body: data }),
  sendMessage: (id, body) => request(`/leads/${id}/messages`, { method: "POST", body: { body } }),
  getMyQueuePosition: () => request("/queue-position/my-position"),
  getIntakeKey: () => request("/lead-intake/key"),
  rotateIntakeKey: () => request("/lead-intake/key/rotate", { method: "POST" }),

  getAgents: () => request("/agents"),
  createAgent: (data) => request("/agents", { method: "POST", body: data }),
  updateAgent: (id, data) => request(`/agents/${id}`, { method: "PATCH", body: data }),

  getStats: () => request("/dashboard/stats"),

  getNotifications: () => request("/notifications"),

  getTimeline: (days = 30) => request(`/reports/timeline?days=${days}`),
  getPerformance: () => request("/reports/performance"),

  async downloadLeadsCsv() {
    const res = await fetch(`${BASE}/reports/export/csv`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) throw new Error("Não foi possível exportar o CSV");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  getBolsao: () => request("/bolsao"),
  claimBolsaoLead: (id) => request(`/bolsao/${id}/claim`, { method: "POST" }),
  getBolsaoSettings: () => request("/bolsao/settings"),
  updateBolsaoSettings: (data) => request("/bolsao/settings", { method: "PUT", body: data }),
  getBolsaoReport: () => request("/bolsao/report"),

  getFbPages: () => request("/facebook/pages"),
  addFbPage: (data) => request("/facebook/pages", { method: "POST", body: data }),
  removeFbPage: (id) => request(`/facebook/pages/${id}`, { method: "DELETE" }),

  getQueues: () => request("/distribution/queues"),
  createQueue: (name) => request("/distribution/queues", { method: "POST", body: { name } }),
  updateQueue: (id, data) => request(`/distribution/queues/${id}`, { method: "PATCH", body: data }),
  deleteQueue: (id) => request(`/distribution/queues/${id}`, { method: "DELETE" }),
  reorderQueues: (order) => request("/distribution/queues/reorder", { method: "PUT", body: { order } }),
  setQueueMembers: (id, userIds) => request(`/distribution/queues/${id}/members`, { method: "PUT", body: { user_ids: userIds } }),
  getFallback: () => request("/distribution/fallback"),
  setFallback: (userId) => request("/distribution/fallback", { method: "PUT", body: { user_id: userId } }),
  setNextSeller: (queueId, userId) => request(`/distribution/queues/${queueId}/next-seller`, { method: "POST", body: { user_id: userId } }),
  redistributeLead: (queueId, leadId) => request(`/distribution/queues/${queueId}/redistribute`, { method: "POST", body: { lead_id: leadId } }),
  setQueuePriorities: (queueId, priorities) => request(`/distribution/queues/${queueId}/priorities`, { method: "PUT", body: { priorities } }),

  getRules: () => request("/distribution/rules"),
  createRule: (data) => request("/distribution/rules", { method: "POST", body: data }),
  updateRule: (id, data) => request(`/distribution/rules/${id}`, { method: "PATCH", body: data }),
  deleteRule: (id) => request(`/distribution/rules/${id}`, { method: "DELETE" }),

  getWebhooks: () => request("/webhooks"),
  subscribeWebhook: (hookAction, hookUrl) => request("/webhooks/subscribe", { method: "POST", body: { hook_action: hookAction, hook_url: hookUrl } }),
  unsubscribeWebhook: (hookAction) => request("/webhooks/unsubscribe", { method: "POST", body: { hook_action: hookAction } }),

  getStands: () => request("/stands"),
  createStand: (data) => request("/stands", { method: "POST", body: data }),
  updateStand: (id, data) => request(`/stands/${id}`, { method: "PATCH", body: data }),
  deleteStand: (id) => request(`/stands/${id}`, { method: "DELETE" }),
  getStandActive: (id) => request(`/stands/${id}/active`),
  standCheckin: (id) => request(`/stands/${id}/checkin`, { method: "POST" }),
  standCheckout: (id) => request(`/stands/${id}/checkout`, { method: "POST" }),
  createStandLead: (id, data) => request(`/stands/${id}/leads`, { method: "POST", body: data }),
  getStandAttendance: (id) => request(`/stands/${id}/attendance-summary`),

  getTags: () => request("/tags"),
  createTag: (data) => request("/tags", { method: "POST", body: { tag: data } }),
  updateTag: (id, data) => request(`/tags/${id}`, { method: "PATCH", body: data }),
  deleteTag: (id) => request(`/tags/${id}`, { method: "DELETE" }),
  getLeadTags: (leadId) => request(`/leads/${leadId}/tags`),
  addLeadTag: (leadId, tagId) => request(`/leads/${leadId}/tags`, { method: "POST", body: { tag_id: tagId } }),
  removeLeadTag: (leadId, tagId) => request(`/leads/${leadId}/remove-tag`, { method: "POST", body: { tag_id: tagId } }),

  getCompanies: () => request("/companies"),
  createCompany: (data) => request("/companies", { method: "POST", body: data }),
  updateCompany: (id, data) => request(`/companies/${id}`, { method: "PATCH", body: data }),
  deleteCompany: (id) => request(`/companies/${id}`, { method: "DELETE" }),

  getLostReasons: () => request("/lost-reasons"),
  createLostReason: (name) => request("/lost-reasons", { method: "POST", body: { name } }),
  deleteLostReason: (id) => request(`/lost-reasons/${id}`, { method: "DELETE" }),

  markLeadInteracted: (id) => request(`/leads/${id}/mark-as-interacted`, { method: "POST" }),
  closeDeal: (id, data) => request(`/leads/${id}/done-deal`, { method: "POST", body: data }),

  batchTimeshift: (sellerIds) => request("/agents/batch-timeshift", { method: "PUT", body: { seller_ids: sellerIds } }),
};

export { getToken };
