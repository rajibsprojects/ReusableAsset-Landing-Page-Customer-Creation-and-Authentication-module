import { Link, useLocation } from "react-router-dom";
import { ArrowRight, Scissors, Layers, PackageSearch, Info } from "lucide-react";
import { ROUTES } from "@/config/site";
import { useAuth } from "@/auth/useAuth";
import { UserProfile } from "@/components/auth/UserProfile";
import { SectionHeading } from "@/components/common/SectionHeading";

const QUICK_LINKS = [
  { to: ROUTES.boutique, label: "Madam Boutique", desc: "Custom tailoring & designer wear", Icon: Scissors, testId: "account-link-boutique" },
  { to: ROUTES.fashions, label: "Madam Fashions", desc: "Dress materials, silks & lace", Icon: Layers, testId: "account-link-fashions" },
  { to: ROUTES.orderStatus, label: "Order Status", desc: "Track your requirements & orders", Icon: PackageSearch, testId: "account-link-orders" },
];

function AlreadyRegisteredNotice() {
  const { user, logout } = useAuth();
  return (
    <div className="mt-6 flex gap-3 rounded-sm border border-powder bg-powder/30 px-4 py-3 text-sm text-navy" role="status" data-testid="google-already-registered-notice">
      <Info className="h-4 w-4 mt-0.5 shrink-0" />
      <div>
        <p><strong>{user?.email}</strong> is already registered as <strong>{user?.customer_no}</strong>, so we signed you in instead of creating a new account.</p>
        <p className="mt-1 text-steel">Each Google account maps to one customer. To register another customer, <button type="button" onClick={logout} className="underline underline-offset-2 text-navy" data-testid="already-registered-logout-button">sign out</button>, switch to the other Google account in your browser (or use a private window), then sign up again.</p>
      </div>
    </div>
  );
}

export default function AccountPage() {
  const { state } = useLocation();
  return (
    <section className="texture-paper py-14 lg:py-20" data-testid="account-page">
      <div className="container-x grid lg:grid-cols-[1.4fr_0.8fr] gap-10 items-start">
        <div>
          <SectionHeading eyebrow="My Account" title="Your Profile" testId="account-heading" />
          {state?.alreadyRegistered && <AlreadyRegisteredNotice />}
          <div className="mt-8"><UserProfile /></div>
        </div>
        <aside className="space-y-4 lg:pt-24">
          {QUICK_LINKS.map(({ to, label, desc, Icon, testId }) => (
            <Link key={to} to={to} className="card-cream p-5 flex items-center gap-4 group transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-soft" data-testid={testId}>
              <span className="h-11 w-11 rounded-full bg-navy text-white inline-flex items-center justify-center shrink-0"><Icon className="h-5 w-5" strokeWidth={1.5} /></span>
              <span className="flex-1">
                <span className="block font-heading text-lg text-navy">{label}</span>
                <span className="block text-xs text-steel">{desc}</span>
              </span>
              <ArrowRight className="h-4 w-4 text-steel transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          ))}
        </aside>
      </div>
    </section>
  );
}
