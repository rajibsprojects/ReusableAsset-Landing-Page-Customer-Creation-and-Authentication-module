import { Link } from "react-router-dom";
import { ArrowRight, Scissors, Layers } from "lucide-react";
import { IMAGES } from "@/config/site";
import { LINES_OF_BUSINESS } from "@/data/linesOfBusiness";
import { useBusinessContent } from "@/hooks/useBusinessContent";
import { SectionHeading } from "@/components/common/SectionHeading";
import { Reveal } from "@/components/common/Reveal";

const ICONS = { boutique: Scissors, fashions: Layers };

function BusinessCard({ card, description, index }) {
  const Icon = ICONS[card.key];
  return (
    <Reveal delay={index * 0.12} className="h-full">
      <article className="card-cream h-full p-6 sm:p-8 flex flex-col transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-soft" data-testid={`lob-card-${card.key}`}>
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-4">
            <span className={`h-14 w-14 rounded-full inline-flex items-center justify-center ${index === 0 ? "bg-powder/50 text-navy" : "bg-navy text-white"}`}>
              <Icon className="h-6 w-6" strokeWidth={1.5} />
            </span>
            <div>
              <h3 className="heading-serif text-2xl">{card.title}</h3>
              <p className="text-sm text-steel">{card.subtitle}</p>
            </div>
          </div>
          <img src={IMAGES[card.imageKey]} alt={card.title} className="hidden sm:block h-24 w-24 lg:h-28 lg:w-28 object-cover rounded-sm shadow-sm" />
        </div>
        <p className="mt-6 text-sm sm:text-[15px] text-ink/85 leading-relaxed" data-testid={`lob-desc-${card.key}`}>{description}</p>
        <div className="mt-6 grid sm:grid-cols-2 gap-6 border-t border-bluegrey pt-6">
          {card.columns.map((col) => (
            <div key={col.heading}>
              <h4 className="text-sm font-semibold text-navy tracking-wide">{col.heading}</h4>
              <ul className="mt-3 space-y-1.5">
                {col.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[13px] text-steel">
                    <span className="mt-2 h-1 w-1 rounded-full bg-navy-soft shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-8 pt-2 mt-auto">
          <Link to={card.route} className="btn-navy text-sm" data-testid={card.ctaTestId}>
            {card.cta} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </article>
    </Reveal>
  );
}

export function LinesOfBusiness() {
  const { content } = useBusinessContent();
  return (
    <section id="services" className="texture-paper py-20 lg:py-28" data-testid="lines-of-business-section">
      <div className="container-x">
        <SectionHeading eyebrow="Our Lines of Business" title="What We Offer" align="center" testId="lob-heading" />
        <div className="mt-12 grid lg:grid-cols-2 gap-8">
          {LINES_OF_BUSINESS.map((card, i) => (
            <BusinessCard key={card.key} card={card} index={i} description={content[card.contentKey]} />
          ))}
        </div>
      </div>
    </section>
  );
}
