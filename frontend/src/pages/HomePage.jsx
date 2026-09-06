import { Hero } from "@/components/home/Hero";
import { AboutBusiness } from "@/components/home/AboutBusiness";
import { LinesOfBusiness } from "@/components/home/LinesOfBusiness";
import { AboutOwner } from "@/components/home/AboutOwner";
import { ContactUs } from "@/components/home/ContactUs";

export default function HomePage() {
  return (
    <div data-testid="home-page">
      <Hero />
      <AboutBusiness />
      <LinesOfBusiness />
      <AboutOwner />
      <ContactUs />
    </div>
  );
}
