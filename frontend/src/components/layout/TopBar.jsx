import { Link, useNavigate } from "react-router-dom";
import { Gift, User, LogOut } from "lucide-react";
import { toast } from "sonner";
import { BRAND, ROUTES } from "@/config/site";
import { useAuth } from "@/auth/useAuth";

export function TopBar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success("You have been logged out");
    navigate(ROUTES.home);
  };

  return (
    <div className="bg-navy text-white text-[11px] sm:text-xs font-body" data-testid="top-bar">
      <div className="container-x h-8 sm:h-9 flex items-center justify-between gap-4">
        <p className="flex items-center gap-2 tracking-wide truncate" data-testid="top-bar-tagline">
          <Gift className="h-3.5 w-3.5 text-powder shrink-0" strokeWidth={1.6} />
          <span className="truncate">{BRAND.topbar}</span>
        </p>
        {isAuthenticated ? (
          <div className="flex items-center gap-2 sm:gap-3 whitespace-nowrap">
            <span className="hidden sm:inline" data-testid="top-bar-welcome">Welcome, {user.name?.split(" ")[0]}</span>
            <span className="hidden sm:inline text-powder/60">|</span>
            <Link to={ROUTES.account} className="inline-flex items-center gap-1 hover:text-powder transition-colors" data-testid="top-bar-account-link">
              <User className="h-3.5 w-3.5" strokeWidth={1.6} /> My Account
            </Link>
            <span className="text-powder/60">|</span>
            <button onClick={handleLogout} className="inline-flex items-center gap-1 hover:text-powder transition-colors" data-testid="top-bar-logout-button">
              <LogOut className="h-3.5 w-3.5" strokeWidth={1.6} /> Logout
            </button>
          </div>
        ) : (
          <Link to={ROUTES.login} className="inline-flex items-center gap-1 hover:text-powder transition-colors whitespace-nowrap" data-testid="top-bar-login-link">
            <User className="h-3.5 w-3.5" strokeWidth={1.6} /> Customer Login
          </Link>
        )}
      </div>
    </div>
  );
}
