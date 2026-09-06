import { Link } from "react-router-dom";
import { ArrowLeft, Clock } from "lucide-react";
import { ROUTES } from "@/config/site";
import { FloralCorner } from "@/components/common/Motifs";
import { SectionHeading } from "@/components/common/SectionHeading";

export default function PlaceholderPage({ eyebrow, title, description, testId }) {
  return (
    <section className="relative texture-paper min-h-[60vh] flex items-center overflow-hidden" data-testid={testId}>
      <FloralCorner className="absolute -left-8 bottom-0 h-64 w-64 text-navy/10 pointer-events-none" />
      <FloralCorner className="absolute -right-8 top-0 h-64 w-64 text-navy/10 pointer-events-none rotate-180" />
      <div className="container-x relative py-20 text-center">
        <SectionHeading eyebrow={eyebrow} title={title} subtitle={description} align="center" as="h1" />
        <p className="mt-8 inline-flex items-center gap-2 rounded-full border border-navy/30 bg-white px-5 py-2 text-sm text-navy" data-testid={`${testId}-badge`}>
          <Clock className="h-4 w-4" strokeWidth={1.6} /> Coming in Phase 2
        </p>
        <div className="mt-10">
          <Link to={ROUTES.home} className="btn-outline text-sm" data-testid={`${testId}-back-home`}><ArrowLeft className="h-4 w-4" /> Back to Home</Link>
        </div>
      </div>
    </section>
  );
}
