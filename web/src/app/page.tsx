import Navbar from "@/components/Navbar";
import HeroSection from "@/components/sections/HeroSection";
import AboutSection from "@/components/sections/AboutSection";
import PartnersStrip from "@/components/sections/PartnersStrip";
import TestimonialSection from "@/components/sections/TestimonialSection";
import VideoSection from "@/components/sections/VideoSection";
import EventsSection from "@/components/sections/EventsSection";
import ArticlesSection from "@/components/sections/ArticlesSection";
import FAQSection from "@/components/sections/FAQSection";
import MembershipSection from "@/components/sections/MembershipSection";
import SectionDivider from "@/components/sections/SectionDivider";
import AnnouncementBanner from "@/components/sections/AnnouncementBanner";
import Footer from "@/components/Footer";

/**
 * Homepage composition.
 *
 * The order follows the question a first-time visitor asks next, and the
 * background tone alternates so those questions land in distinct blocks:
 *
 *   Hero          dark    — who is this for?
 *   Partners      white    — thin credibility strip, reads as a rule not a section
 *   About         white    — what is PPIA Auckland?
 *   Video         dark    — show me
 *   Events        dark    — what actually happens
 *   Testimonials  white    — do real people rate it?
 *   Articles      grey    — is this alive?
 *   Membership    dark    — join
 *   FAQ          white    — anything still holding you back?
 *
 * FAQ sits after the call to action rather than before it. The page should end
 * on the ask, and a visitor who is already convinced should not have to scroll
 * past four objections to reach the button. Those still hesitating keep reading.
 *
 * A divider is only used where two neighbours share a tone — video → events is
 * the one place that happens. Everywhere else the tone change is the
 * transition, which reads more deliberately than decorating every seam.
 */
export default function HomePage() {
  return (
    <>
      <AnnouncementBanner />
      <Navbar />
      <main>
        <HeroSection />
        <PartnersStrip />
        <AboutSection />
        <VideoSection />
        <SectionDivider variant="gradient" className="bg-[#0D1B33]" />
        <EventsSection />
        <TestimonialSection />
        <ArticlesSection />
        <MembershipSection />
        <FAQSection />
      </main>
      <Footer />
    </>
  );
}
