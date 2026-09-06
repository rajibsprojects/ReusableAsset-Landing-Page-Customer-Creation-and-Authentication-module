import { IMAGES } from "@/config/site";
import { useBusinessContent } from "@/hooks/useBusinessContent";
import { SectionHeading } from "@/components/common/SectionHeading";
import { Reveal } from "@/components/common/Reveal";

const VALUES = ["Personalized Service", "Quality Craftsmanship", "Customer First"];

export function AboutBusiness() {
  const { content } = useBusinessContent();
  const paragraphs = (content.about_business || "").split(/\n+/).filter(Boolean);

  return (
    <section id="about" className="bg-white py-20 lg:py-28 overflow-hidden" data-testid="about-business-section">
      <div className="container-x grid lg:grid-cols-[0.9fr_1.1fr] gap-12 lg:gap-16 items-center">
        <Reveal>
          <div className="relative">
            <div className="absolute -inset-3 border border-powder/60 rounded-sm translate-x-3 translate-y-3" aria-hidden="true" />
            <img src={IMAGES.about} alt="Threads, fabrics and tailoring tools" className="relative w-full h-[320px] sm:h-[400px] object-cover rounded-sm shadow-card" />
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <SectionHeading eyebrow="About Our Business" title={content.business_name} testId="about-business-heading" />
          <div className="mt-6 space-y-4 text-ink/85 leading-relaxed text-sm sm:text-base" data-testid="about-business-text">
            {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 script-accent text-2xl" data-testid="about-business-values">
            <span className="hidden sm:block h-px w-10 bg-bluegrey" />
            {VALUES.map((v, i) => (
              <span key={v} className="flex items-center gap-4">
                {i > 0 && <span className="h-1.5 w-1.5 rotate-45 bg-powder" />}
                {v}
              </span>
            ))}
            <span className="hidden sm:block h-px w-10 bg-bluegrey" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
