import type { Metadata } from "next";
import EventsList from "./_components/events-list";

export const metadata: Metadata = {
  title: "Events",
  description:
    "Upcoming and past PPIA Auckland events — welcoming parties, seminars, sports, cultural nights and student gatherings for Indonesians studying in Auckland. Browse details and register.",
  alternates: { canonical: "/activities/events" },
  openGraph: {
    title: "Events | PPIA Auckland",
    description:
      "Upcoming and past PPIA Auckland events for Indonesian students in Auckland, with dates, locations and registration details.",
    url: "https://ppiauckland.org/activities/events",
    type: "website",
  },
};

export default function EventsPage() {
  return <EventsList />;
}
