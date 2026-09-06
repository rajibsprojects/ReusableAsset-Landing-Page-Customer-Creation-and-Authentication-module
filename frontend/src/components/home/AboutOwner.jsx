import { IMAGES } from "@/config/site";
import { useBusinessContent } from "@/hooks/useBusinessContent";
import { SectionHeading } from "@/components/common/SectionHeading";
import { Reveal } from "@/components/common/Reveal";

export function AboutOwner() {
  const { content } = useBusinessContent();
  const paragraphs = (content.about_owner || "").split(/\n+/).filter(Boolean);
  return (
    <section id="owner" className="bg-white py-20 lg:py-28 overflow-hidden" data-testid="about-owner-section">
      <div className="container-x grid lg:grid-cols-[0.85fr_1.15fr] gap-12 lg:gap-16 items-center">
        <Reveal>
          <div className="relative max-w-md">
            <div className="absolute -inset-3 border border-powder/60 rounded-sm -translate-x-3 translate-y-3" aria-hidden="true" />
            <img
              src={content.owner_photo_url || IMAGES.owner}
              alt={content.owner_name || "Owners of Madam Boutique"}
              className="relative w-full h-[340px] sm:h-[400px] object-cover rounded-sm shadow-card"
              data-testid="owner-photo"
              onError={(e) => { e.currentTarget.src = IMAGES.owner; }}
            />
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <SectionHeading eyebrow="About the Owner" title={content.owner_name} testId="owner-heading" />
          <div className="mt-6 space-y-4 text-ink/85 leading-relaxed text-sm sm:text-base" data-testid="owner-bio">
            {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
          </div>
          <p className="mt-8 script-accent text-2xl sm:text-3xl flex flex-wrap items-center gap-4" data-testid="owner-philosophy">
            Traditional Values <span className="h-1.5 w-1.5 rotate-45 bg-powder" /> Modern Vision
          </p>
        </Reveal>
      </div>
    </section>
  );
}
