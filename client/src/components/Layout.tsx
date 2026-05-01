import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
    isActive ? "bg-brand-700 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-800"
  }`;

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <NavLink to="/" className="font-semibold text-white tracking-tight">
              Team<span className="text-brand-500">Tasks</span>
            </NavLink>
            <nav className="flex items-center gap-1">
              <NavLink to="/" end className={linkClass}>
                Dashboard
              </NavLink>
              <NavLink to="/projects" className={linkClass}>
                Projects
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-zinc-500 truncate max-w-[10rem] sm:max-w-xs">{user?.name}</span>
            <button
              type="button"
              onClick={logout}
              className="text-zinc-400 hover:text-white px-2 py-1 rounded-md hover:bg-zinc-800"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
