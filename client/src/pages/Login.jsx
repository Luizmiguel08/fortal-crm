import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../AuthContext.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@c2sclone.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center mb-8">
          <img src="/fortal-logo.png" alt="Fortal" className="h-24 w-auto" />
        </div>

        <div className="bg-white rounded-xl2 shadow-soft p-6">
          <h1 className="font-display font-semibold text-lg text-ink mb-1">Entrar</h1>
          <p className="text-sm text-gray-500 mb-5">Acesse a gestão de leads da sua equipe.</p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                required
              />
            </div>

            {error && <p className="text-sm text-perdido">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-brand text-ink rounded-lg py-2.5 text-sm font-medium hover:bg-brand/90 transition-colors disabled:opacity-60"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Entrar
            </button>
          </form>
        </div>

        <p className="text-center text-white/40 text-xs mt-4">
          Demo: admin@c2sclone.com / admin123 · ana@c2sclone.com / agente123
        </p>
      </div>
    </div>
  );
}
