import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { IMAGES, ROUTES } from "@/config/site";
import { FloralCorner } from "@/components/common/Motifs";

const fade = (delay) => ({ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] } });

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-offwhite" data-testid="hero-section">
      <FloralCorner className="absolute -left-10 top-16 h-56 w-56 text-navy/10 pointer-events-none" />
      <div className="container-x grid lg:grid-cols-[1.05fr_1fr] items-center min-h-[520px] lg:min-h-[600px]">
        <div className="relative z-10 py-16 lg:py-24 max-w-xl">
          <motion.h1 {...fade(0)} className="heading-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.08]" data-testid="hero-title">
            Timeless Styles
            <br />
            Crafted Just for You
          </motion.h1>
          <motion.p {...fade(0.15)} className="mt-6 text-steel text-base sm:text-lg font-body tracking-wide" data-testid="hero-subtitle">
            Custom Tailoring <span className="mx-2 text-powder">|</span> Designer Apparel <span className="mx-2 text-powder">|</span> Premium Fabrics
          </motion.p>
          <motion.p {...fade(0.25)} className="mt-5 script-accent text-3xl sm:text-4xl" data-testid="hero-tagline">
            For every occasion, for every you...
          </motion.p>
          <motion.div {...fade(0.35)} className="mt-9 flex flex-col sm:flex-row gap-3">
            <Link to={ROUTES.boutique} className="btn-navy" data-testid="hero-explore-boutique">
              Explore Madam Boutique <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to={ROUTES.fashions} className="btn-outline" data-testid="hero-explore-fashions">
              Explore Madam Fashions <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>
        <motion.div initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.1 }} className="relative h-[360px] sm:h-[440px] lg:h-full lg:min-h-[600px] -mx-4 sm:-mx-6 lg:mx-0">
          <img src={IMAGES.hero} alt="Woman in an elegant embroidered Indian ensemble" className="absolute inset-0 h-full w-full object-cover object-top" />
          <div className="absolute inset-0 bg-gradient-to-r from-offwhite via-offwhite/20 to-transparent hidden lg:block" />
          <div className="absolute inset-0 bg-gradient-to-t from-offwhite via-transparent to-transparent lg:hidden" />
        </motion.div>
      </div>
    </section>
  );
}
