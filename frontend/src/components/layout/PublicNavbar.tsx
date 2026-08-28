import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Search, User, Menu, X, Store, LogOut, LayoutDashboard } from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { useCart } from "../../features/cart/hooks";

export function PublicNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { user, isAuthenticated, logout: doLogout, refreshToken } = useAuthStore();
  const navigate = useNavigate();
  const { data: cart } = useCart(isAuthenticated && user?.role === "CUSTOMER");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/products?search=${encodeURIComponent(search)}`);
  };

  const handleLogout = async () => {
    if (refreshToken) {
      try {
        const { authApi } = await import("../../api/auth");
        await authApi.logout(refreshToken);
      } catch {
        /* noop */
      }
    }
    doLogout();
    navigate("/");
  };

  const dashboardPath = user?.role === "ADMIN" ? "/admin" : user?.role === "VENDOR" ? "/vendor" : "/account";

  return (
    <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur border-b border-line">
      <div className="container-page flex items-center h-16 gap-4">
        <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg text-ink-900 shrink-0">
          <span className="w-8 h-8 rounded-lg bg-brand-500 text-white flex items-center justify-center text-sm">M</span>
          Marketto
        </Link>

        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-700/40" />
          <input
            className="input !pl-9"
            placeholder="Search products, brands, vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>

        <nav className="hidden md:flex items-center gap-1 ml-auto">
          <Link to="/products" className="btn-ghost">Shop</Link>
          <Link to="/vendors" className="btn-ghost">Vendors</Link>

          {isAuthenticated && user?.role === "CUSTOMER" && (
            <Link to="/cart" className="btn-ghost relative">
              <ShoppingCart className="w-5 h-5" />
              {!!cart?.item_count && (
                <span className="absolute -top-1 -right-1 bg-clay-500 text-white text-[10px] rounded-full w-4.5 h-4.5 flex items-center justify-center min-w-[18px] h-[18px]">
                  {cart.item_count}
                </span>
              )}
            </Link>
          )}

          {isAuthenticated ? (
            <>
              <Link to={dashboardPath} className="btn-ghost">
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </Link>
              <button onClick={handleLogout} className="btn-ghost">
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost"><User className="w-4 h-4" /> Log in</Link>
              <Link to="/register" className="btn-primary">Sign up</Link>
            </>
          )}
        </nav>

        <button className="md:hidden ml-auto" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-line px-4 py-3 space-y-2 bg-surface">
          <form onSubmit={handleSearch} className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-700/40" />
            <input className="input !pl-9" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </form>
          <Link to="/products" className="block py-2" onClick={() => setMenuOpen(false)}>Shop</Link>
          <Link to="/vendors" className="block py-2" onClick={() => setMenuOpen(false)}><Store className="w-4 h-4 inline mr-1.5" />Vendors</Link>
          {isAuthenticated ? (
            <>
              {user?.role === "CUSTOMER" && <Link to="/cart" className="block py-2" onClick={() => setMenuOpen(false)}>Cart ({cart?.item_count ?? 0})</Link>}
              <Link to={dashboardPath} className="block py-2" onClick={() => setMenuOpen(false)}>Dashboard</Link>
              <button onClick={handleLogout} className="block py-2 text-left w-full">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="block py-2" onClick={() => setMenuOpen(false)}>Log in</Link>
              <Link to="/register" className="block py-2 font-semibold text-brand-500" onClick={() => setMenuOpen(false)}>Sign up</Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
