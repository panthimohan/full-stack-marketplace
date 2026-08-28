import { NavLink, Outlet, Link, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { Toaster } from "../ui/Toaster";
import clsx from "clsx";

export interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
}

export function DashboardLayout({ title, navItems }: { title: string; navItems: NavItem[] }) {
  const { logout, refreshToken } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (refreshToken) {
      try {
        const { authApi } = await import("../../api/auth");
        await authApi.logout(refreshToken);
      } catch {
        /* noop */
      }
    }
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex bg-canvas">
      <aside className="w-64 shrink-0 hidden lg:flex flex-col border-r border-line bg-surface">
        <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg px-6 h-16 border-b border-line">
          <span className="w-8 h-8 rounded-lg bg-brand-500 text-white flex items-center justify-center text-sm">M</span>
          Marketto
        </Link>
        <div className="px-6 pt-5 pb-2 text-xs font-semibold uppercase tracking-wide text-ink-700/50">{title}</div>
        <nav className="flex-1 px-3 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive ? "bg-brand-50 text-brand-600" : "text-ink-800 hover:bg-black/5"
                )
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-line">
          <button onClick={handleLogout} className="btn-ghost w-full justify-start">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="lg:hidden h-14 border-b border-line bg-surface flex items-center px-4 justify-between">
          <span className="font-display font-bold">{title}</span>
          <button onClick={handleLogout} className="text-sm text-ink-700">Logout</button>
        </header>
        <main className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
          <Outlet />
        </main>
      </div>
      <Toaster />
    </div>
  );
}
