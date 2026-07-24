import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, KanbanSquare, Users, LogOut, BarChart3, Inbox, Plug, Shuffle, Store, Tag, Building2 } from "lucide-react";
import { useAuth } from "../AuthContext.jsx";
import NotificationBell from "./NotificationBell.jsx";

const DESKTOP_NAV = [
  { to: "/", label: "Painel", icon: LayoutDashboard, end: true },
  { to: "/leads", label: "Leads", icon: KanbanSquare },
  { to: "/bolsao", label: "Bolsão", icon: Inbox },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/agentes", label: "Corretores", icon: Users },
  { to: "/distribuicao", label: "Distribuição de leads", icon: Shuffle },
  { to: "/estandes", label: "Stand de vendas", icon: Store },
  { to: "/tags", label: "Tags", icon: Tag },
  { to: "/empresas", label: "Empresas", icon: Building2 },
  { to: "/integracoes", label: "Integrações", icon: Plug },
];

// no celular, o espaço é curto — mantém só os mais usados no dia a dia
const MOBILE_NAV = [
  { to: "/", label: "Painel", icon: LayoutDashboard, end: true },
  { to: "/leads", label: "Leads", icon: KanbanSquare },
  { to: "/bolsao", label: "Bolsão", icon: Inbox },
  { to: "/agentes", label: "Equipe", icon: Users },
];

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex bg-surface">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex md:flex-col w-64 bg-ink text-white shrink-0">
        <div className="px-6 py-6 flex items-center justify-between gap-2">
          <img src="/fortal-logo.png" alt="Fortal" className="h-11 w-auto" />
          <NotificationBell dark />
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {DESKTOP_NAV.filter((item) => !["/distribuicao", "/empresas"].includes(item.to) || user?.role === "admin").map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? "bg-brand text-ink" : "text-white/60 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-xs font-semibold text-ink">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-white/40 truncate capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/60 hover:bg-white/5 hover:text-white transition-colors"
          >
            <LogOut size={16} /> Sair
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 inset-x-0 h-14 bg-ink text-white flex items-center justify-between px-4 z-30">
        <img src="/fortal-logo.png" alt="Fortal" className="h-8 w-auto" />
        <div className="flex items-center gap-1">
          <NotificationBell dark />
          <button onClick={logout} className="text-white/60 p-1.5">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <main className="flex-1 min-w-0 pt-14 pb-16 md:pt-0 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 h-16 bg-white border-t border-line flex items-stretch z-30 pb-[env(safe-area-inset-bottom)]">
        {MOBILE_NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium ${
                isActive ? "text-brand-dark" : "text-gray-400"
              }`
            }
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
