import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SITE } from "@/lib/constants";
import { fetchEventBySlug, toAbsoluteMediaUrl, toMetaDescription } from "@/lib/server-api";
import EventDetail from "./_components/event-detail";

interface EventPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await fetchEventBySlug(slug);

  if (!event) {
    return {
      title: "Event not found",
      description: "This event is no longer available on the PPIA Auckland website.",
      robots: { index: false, follow: true },
    };
  }

  const canonical = `/activities/events/${slug}`;
  const description = toMetaDescription(
    event.description,
    `${event.title} — an event organised by PPIA Auckland.`
  );
  const image = toAbsoluteMediaUrl(event.imageUrl);

  return {
    title: event.title,
    description,
    alternates: { canonical },
    openGraph: {
      title: event.title,
      description,
      url: `${SITE.url}${canonical}`,
      type: "website",
      ...(image ? { images: [{ url: image, alt: event.title }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: event.title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function EventDetailPage({ params }: EventPageProps) {
  const { slug } = await params;
  const event = await fetchEventBySlug(slug);

  if (!event) notFound();

  return <EventDetail event={event} />;
}
