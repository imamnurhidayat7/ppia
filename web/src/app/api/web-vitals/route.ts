import { NextResponse } from 'next/server';

/**
 * Sink for the Core Web Vitals beacons sent by `WebVitalsReporter`
 * (mounted in the root layout). Analytics ingestion is not wired up yet, so
 * this deliberately accepts and discards the payload — the point is to answer
 * 204 instead of 404ing and spamming the console on every page view.
 */
export async function POST(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204 });
}
