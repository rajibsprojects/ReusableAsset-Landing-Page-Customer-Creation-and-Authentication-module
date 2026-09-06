import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, User, LogOut } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { NAV_LINKS, ROUTES, BRAND } from "@/config/site";
import { useAuth } from "@/auth/useAuth";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();
  const close = () => setOpen(false);

  return (
    <div className="lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button className="inline-flex h-11 w-11 items-center justify-center rounded-sm border border-bluegrey text-navy hover:bg-offwhite transition-colors" aria-label="Open menu" data-testid="mobile-menu-button">
            <Menu className="h-5 w-5" strokeWidth={1.8} />
          </button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[300px] sm:w-[340px] bg-cream p-0" data-testid="mobile-menu">
          <div className="bg-navy text-white px-6 py-6">
            <SheetTitle className="font-heading text-2xl text-white font-normal">{BRAND.name}</SheetTitle>
            <p className="text-[10px] uppercase tracking-[0.3em] text-powder mt-1">{BRAND.tagline}</p>
          </div>
          <nav className="flex flex-col px-2 py-4" aria-label="Mobile navigation">
            {NAV_LINKS.map((link) => (
              <Link key={link.to} to={link.to} onClick={close} className="px-4 py-3.5 font-body text-base text-ink border-b border-bluegrey/70 hover:bg-white hover:text-navy transition-colors" data-testid={`mobile-${link.testId}`}>
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="px-6 pb-8 pt-2 space-y-3">
            {isAuthenticated ? (
              <>
                <p className="text-sm text-steel" data-testid="mobile-welcome">Welcome, {user.name}</p>
                <Link to={ROUTES.account} onClick={close} className="btn-navy w-full" data-testid="mobile-account-button"><User className="h-4 w-4" /> My Account</Link>
                <button onClick={() => { close(); logout(); }} className="btn-outline w-full" data-testid="mobile-logout-button"><LogOut className="h-4 w-4" /> Logout</button>
              </>
            ) : (
              <>
                <Link to={ROUTES.login} onClick={close} className="btn-navy w-full" data-testid="mobile-login-button"><User className="h-4 w-4" /> Customer Login</Link>
                <Link to={ROUTES.signup} onClick={close} className="btn-outline w-full" data-testid="mobile-signup-button">Sign Up</Link>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
