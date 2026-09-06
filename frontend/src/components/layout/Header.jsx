import { Link, NavLink, useLocation } from "react-router-dom";
import { User } from "lucide-react";
import { NAV_LINKS, ROUTES } from "@/config/site";
import { useAuth } from "@/auth/useAuth";
import { Logo } from "./Logo";
import { MobileNav } from "./MobileNav";

export function Header() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-bluegrey shadow-[0_1px_0_rgba(0,33,71,0.04)]" data-testid="site-header">
      <div className="container-x h-[76px] flex items-center justify-between gap-6">
        <Logo />
        <nav className="hidden lg:flex items-center" aria-label="Main navigation" data-testid="desktop-nav">
          {NAV_LINKS.map((link, i) => (
            <div key={link.to} className="flex items-center">
              {i > 0 && <span className="mx-4 h-3 w-px bg-bluegrey" aria-hidden="true" />}
              {link.to.includes("#") ? (
                <Link to={link.to} className="nav-link" data-testid={link.testId}>{link.label}</Link>
              ) : (
                <NavLink to={link.to} end={link.to === "/"} className={({ isActive }) => `nav-link ${isActive ? "active text-navy" : ""}`} data-testid={link.testId}>
                  {link.label}
                </NavLink>
              )}
            </div>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link
            to={isAuthenticated ? ROUTES.account : ROUTES.login}
            state={!isAuthenticated ? { from: location.pathname } : undefined}
            className="hidden sm:inline-flex btn-navy !py-2.5 !px-5 text-sm"
            data-testid="header-account-button"
          >
            <User className="h-4 w-4" strokeWidth={1.8} />
            {isAuthenticated ? "My Account" : "Customer Login"}
          </Link>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
