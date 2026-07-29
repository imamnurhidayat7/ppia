import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchEventBySlug } from "@/lib/server-api";
import EventRegisterForm from "./_components/event-register-form";

interface RegisterPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: RegisterPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await fetchEventBySlug(slug);
  return {
    title: event ? `Register — ${event.title}` : "Register",
    // A personal registration form should not be indexed.
    robots: { index: false, follow: true },
  };
}

export default async function EventRegisterPage({ params }: RegisterPageProps) {
  const { slug } = await params;
  const event = await fetchEventBySlug(slug);
  if (!event) notFound();
  return <EventRegisterForm event={event} />;
}
