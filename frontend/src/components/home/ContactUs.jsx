import { Phone, Mail, MapPin, Facebook, Instagram, Linkedin, MessageCircle } from "lucide-react";
import { useBusinessContent } from "@/hooks/useBusinessContent";
import { SectionHeading } from "@/components/common/SectionHeading";
import { FloralCorner } from "@/components/common/Motifs";
import { Reveal } from "@/components/common/Reveal";
import { telLink, mailtoLink, whatsappLink, ensureHttp, instagramHandle } from "@/utils/links";

function ContactColumn({ icon: Icon, title, sub, href, children, testId, index }) {
  const inner = (
    <>
      <span className="h-12 w-12 rounded-full bg-navy text-white inline-flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:-translate-y-1">
        <Icon className="h-5 w-5" strokeWidth={1.6} />
      </span>
      <p className="mt-4 text-sm sm:text-[15px] font-medium text-ink break-words">{title}</p>
      {sub && <p className="text-xs text-steel mt-1">{sub}</p>}
      {children}
    </>
  );
  return (
    <Reveal delay={index * 0.08}>
      {href ? (
        <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="group flex flex-col items-center text-center px-4" data-testid={testId}>{inner}</a>
      ) : (
        <div className="group flex flex-col items-center text-center px-4" data-testid={testId}>{inner}</div>
      )}
    </Reveal>
  );
}

export function ContactUs() {
  const { content: c } = useBusinessContent();
  const address = [c.business_address_1, c.business_address_2, [c.business_city, c.business_state].filter(Boolean).join(", "), c.business_pin].filter(Boolean);
  const socials = [
    { key: "facebook", href: ensureHttp(c.business_facebook_url), Icon: Facebook },
    { key: "instagram", href: ensureHttp(c.business_instagram_url), Icon: Instagram },
    { key: "linkedin", href: ensureHttp(c.business_linkedin_url), Icon: Linkedin },
  ].filter((s) => s.href);

  return (
    <section id="contact" className="relative bg-offwhite py-20 lg:py-28 overflow-hidden" data-testid="contact-section">
      <FloralCorner className="absolute -left-6 bottom-0 h-64 w-64 text-navy/10 pointer-events-none" />
      <FloralCorner className="absolute -right-6 top-0 h-64 w-64 text-navy/10 pointer-events-none rotate-180" />
      <div className="container-x relative">
        <SectionHeading eyebrow="Get in Touch" title="Contact Us" align="center" subtitle="We would love to hear from you. Get in touch for orders, queries or any assistance." testId="contact-heading" />
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-12 lg:divide-x lg:divide-bluegrey">
          <ContactColumn index={0} icon={Phone} title={c.business_phone_number || "Phone number coming soon"} sub="Call us" href={telLink(c.business_phone_number)} testId="contact-phone" />
          <ContactColumn index={1} icon={MessageCircle} title={c.business_whatsapp_number || "WhatsApp coming soon"} sub="Chat on WhatsApp" href={whatsappLink(c.business_whatsapp_number)} testId="contact-whatsapp" />
          <ContactColumn index={2} icon={Mail} title={c.business_email_address || "Email coming soon"} sub="Email us" href={mailtoLink(c.business_email_address)} testId="contact-email" />
          <ContactColumn index={3} icon={MapPin} title={address[0] || "Kolkata, India"} testId="contact-address">
            {address.slice(1).map((line) => <p key={line} className="text-xs text-steel">{line}</p>)}
          </ContactColumn>
        </div>
        {socials.length > 0 && (
          <div className="mt-14 flex flex-col items-center gap-3" data-testid="contact-social">
            <p className="eyebrow">Follow Us</p>
            <div className="flex gap-3">
              {socials.map(({ key, href, Icon }) => (
                <a key={key} href={href} target="_blank" rel="noreferrer" aria-label={key} className="h-11 w-11 rounded-full border border-navy/30 text-navy inline-flex items-center justify-center hover:bg-navy hover:text-white transition-colors" data-testid={`contact-social-${key}`}>
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
                </a>
              ))}
            </div>
            {c.business_instagram_url && <p className="text-xs text-steel">{instagramHandle(c.business_instagram_url)}</p>}
          </div>
        )}
      </div>
    </section>
  );
}
