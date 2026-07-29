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
import WaveTransition from "@/components/sections/WaveTransition";
import AnnouncementBanner from "@/components/sections/AnnouncementBanner";
import Footer from "@/components/Footer";
import {
  fetchHomeEvents,
  fetchHomeArticles,
  fetchLandingSection,
} from "@/lib/server-api";

/**
 * Rebuild the homepage at most once every five minutes (ISR). The public
 * content changes rarely, so serving a cached, fully-rendered page keeps the
 * first paint fast while staying current enough for visitors and crawlers.
 */
export const revalidate = 300;

/**
 * Seam colours for the wave transitions.
 *
 * These have to match the ends of the `.sea-deep` / `.sea-shore` gradients in
 * globals.css, otherwise a hairline of the wrong colour shows at each seam.
 */
const DEEP_SEA_EDGE = "#050D18"; // the hero's bottom vignette
const DEEP_SEA = "#0B1C2E"; // .sea-deep, end of gradient
const SHORE = "#FFFFFF"; // .sea-shore, start of gradient
const SHORE_DEEP = "#EDF5FB"; // .sea-shore, end of gradient
const FOOTER_SEA = "#071321"; // Footer background

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
export default async function HomePage() {
  // Fetch everything the content sections need on the server, in parallel, so
  // the HTML ships with events and articles already rendered instead of each
  // section firing its own request from the browser after hydration.
  const [heroSection, events, articles, eventsSection, articlesSection] = await Promise.all([
    fetchLandingSection("hero"),
    fetchHomeEvents(8),
    fetchHomeArticles(3),
    fetchLandingSection("events"),
    fetchLandingSection("articles"),
  ]);

  return (
    <>
      <AnnouncementBanner />
      <Navbar />
      <main>
        <HeroSection initialSection={heroSection} />
        <WaveTransition from={DEEP_SEA_EDGE} to={SHORE} />
        <PartnersStrip />
        <AboutSection />
        <WaveTransition from={SHORE_DEEP} to={DEEP_SEA} />
        <VideoSection />
        {/* Video and events share the deep-sea surface, so they read as one
            block. A hairline is enough to mark the seam; a wave here would
            imply a change of surface that is not happening. */}
        <div className="sea-deep" aria-hidden="true">
          <div className="mx-auto max-w-7xl px-6">
            <span className="block h-px bg-white/10" />
          </div>
        </div>
        <EventsSection initialEvents={events} initialSection={eventsSection} />
        <WaveTransition from={DEEP_SEA} to={SHORE} mirror />
        <TestimonialSection />
        <ArticlesSection initialArticles={articles} initialSection={articlesSection} />
        <WaveTransition from={SHORE_DEEP} to={DEEP_SEA} />
        <MembershipSection />
        <WaveTransition from={DEEP_SEA} to={SHORE} mirror />
        <FAQSection />
      </main>
      <WaveTransition from={SHORE_DEEP} to={FOOTER_SEA} />
      <Footer />
    </>
  );
}
