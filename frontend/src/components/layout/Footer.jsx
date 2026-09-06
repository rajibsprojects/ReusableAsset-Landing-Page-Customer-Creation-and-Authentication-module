import { Link } from "react-router-dom";
import { Facebook, Instagram, Linkedin, MessageCircle } from "lucide-react";
import { BRAND, NAV_LINKS } from "@/config/site";
import { useBusinessContent } from "@/hooks/useBusinessContent";
import { ensureHttp, whatsappLink } from "@/utils/links";
import { Logo } from "./Logo";

export function Footer() {
  const { content } = useBusinessContent();
  const socials = [
    { key: "facebook", href: ensureHttp(content.business_facebook_url), Icon: Facebook },
    { key: "instagram", href: ensureHttp(content.business_instagram_url), Icon: Instagram },
    { key: "linkedin", href: ensureHttp(content.business_linkedin_url), Icon: Linkedin },
    { key: "whatsapp", href: whatsappLink(content.business_whatsapp_number), Icon: MessageCircle },
  ].filter((s) => s.href);

  return (
    <footer className="bg-navy text-white" data-testid="site-footer">
      <div className="container-x py-12 grid gap-10 md:grid-cols-[auto_1fr_auto] md:items-center">
        <div>
          <Logo light />
          <p className="mt-4 text-xs text-powder/90 font-body max-w-xs leading-relaxed">{BRAND.footerLine}</p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-3 md:justify-center" aria-label="Footer navigation">
          {NAV_LINKS.map((link) => (
            <Link key={link.to} to={link.to} className="text-sm text-white/85 hover:text-powder transition-colors" data-testid={`footer-${link.testId}`}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex gap-3 md:justify-end">
          {socials.map(({ key, href, Icon }) => (
            <a key={key} href={href} target="_blank" rel="noreferrer" className="h-9 w-9 rounded-full bg-white/10 hover:bg-white hover:text-navy transition-colors inline-flex items-center justify-center" aria-label={key} data-testid={`footer-social-${key}`}>
              <Icon className="h-4 w-4" strokeWidth={1.7} />
            </a>
          ))}
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-powder/80 font-body">
          <span data-testid="footer-copyright">© {new Date().getFullYear()} {content.business_name || BRAND.name}. All Rights Reserved.</span>
          <span>Madam® is a registered trademark</span>
        </div>
      </div>
    </footer>
  );
}
