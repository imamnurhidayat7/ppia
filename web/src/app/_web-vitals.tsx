"use client";

import { useReportWebVitals } from "next/web-vitals";
import { useEffect, useRef } from "react";

/**
 * Reports Core Web Vitals to the analytics endpoint.
 *
 * Mounted once in the root layout so every route gets instrumentation.
 * In development the values are logged to the console; in production
 * they are POSTed to /api/web-vitals (no-op if the endpoint is absent).
 */
export function WebVitalsReporter() {
  const queued = useRef<Record<string, unknown>[]>([]);

  useEffect(() => {
    const id = setInterval(() => {
      if (queued.current.length === 0) return;
      const batch = queued.current.splice(0);
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.debug("[web-vitals]", batch);
        return;
      }
      navigator.sendBeacon &&
        navigator.sendBeacon(
          "/api/web-vitals",
          new Blob([JSON.stringify({ events: batch })], {
            type: "application/json",
          }),
        );
    }, 10_000);
    return () => clearInterval(id);
  }, []);

  useReportWebVitals((metric) => {
    queued.current.push({
      id: metric.id,
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      navigationType: metric.navigationType,
      path: typeof location !== "undefined" ? location.pathname : undefined,
      ts: Date.now(),
    });
  });

  return null;
}
