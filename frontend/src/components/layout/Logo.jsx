import { Link } from "react-router-dom";
import { Crown } from "lucide-react";
import { BRAND } from "@/config/site";
import { useBusinessContent } from "@/hooks/useBusinessContent";

export function Logo({ light = false, compact = false }) {
  const { content } = useBusinessContent();
  const color = light ? "text-white" : "text-navy";
  return (
    <Link to="/" className="inline-flex items-center gap-3 group" data-testid="brand-logo" aria-label={`${BRAND.name} home`}>
      {content.business_logo ? (
        <img src={content.business_logo} alt={content.business_name || BRAND.name} className={`${compact ? "h-9" : "h-12"} w-auto object-contain`} />
      ) : (
        <span className="flex flex-col items-center leading-none">
          <Crown className={`h-4 w-4 ${light ? "text-powder" : "text-navy-soft"} mb-0.5 transition-transform duration-300 group-hover:-translate-y-0.5`} strokeWidth={1.6} />
          <span className={`font-heading ${compact ? "text-xl" : "text-2xl sm:text-[26px]"} ${color} tracking-wide`}>
            {BRAND.name}
          </span>
          <span className={`text-[9px] sm:text-[10px] uppercase tracking-[0.32em] mt-1 ${light ? "text-powder" : "text-steel"}`}>{BRAND.tagline}</span>
        </span>
      )}
    </Link>
  );
}
