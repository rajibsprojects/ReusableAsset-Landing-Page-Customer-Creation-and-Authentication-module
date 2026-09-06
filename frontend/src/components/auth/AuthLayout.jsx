import { IMAGES } from "@/config/site";
import { FloralCorner } from "@/components/common/Motifs";

export function AuthLayout({ children }) {
  return (
    <section className="relative min-h-[calc(100vh-113px)] py-12 sm:py-16 overflow-hidden" data-testid="auth-layout">
      <div className="absolute inset-0 bg-cover bg-center scale-105" style={{ backgroundImage: `url(${IMAGES.authBg})` }} aria-hidden="true" />
      <div className="absolute inset-0 bg-offwhite/85 backdrop-blur-[6px]" aria-hidden="true" />
      <FloralCorner className="absolute -left-8 top-8 h-60 w-60 text-navy/10 pointer-events-none" />
      <FloralCorner className="absolute -right-8 bottom-8 h-60 w-60 text-navy/10 pointer-events-none rotate-180" />
      <div className="container-x relative">
        <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2 items-start">{children}</div>
      </div>
    </section>
  );
}

export function AuthCard({ icon: Icon, label, title, subtitle, children, testId, muted = false }) {
  return (
    <div className={`auth-card p-7 sm:p-9 ${muted ? "md:mt-6" : ""}`} data-testid={testId}>
      <div className="flex items-center justify-center gap-2 text-navy">
        {Icon && <Icon className="h-5 w-5" strokeWidth={1.6} />}
        <span className="font-heading text-xl">{label}</span>
      </div>
      <h1 className="heading-serif text-2xl sm:text-3xl text-center mt-5">{title}</h1>
      {subtitle && <p className="text-center text-sm text-steel mt-2">{subtitle}</p>}
      <div className="mt-7">{children}</div>
    </div>
  );
}
