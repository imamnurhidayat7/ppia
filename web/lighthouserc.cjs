/**
 * Lighthouse CI configuration.
 *
 * Run locally:
 *   npx @lhci/cli@0.14.x autorun --collect.url=http://localhost:3001
 *
 * In CI (GitHub Actions etc.) the same file is picked up automatically.
 * The assertions below enforce a performance budget on the public pages;
 * categorical scores below the threshold fail the build.
 */
module.exports = {
  ci: {
    collect: {
      url: [
        "http://localhost:3001/",
        "http://localhost:3001/about",
        "http://localhost:3001/about/ad-art",
        "http://localhost:3001/activities",
        "http://localhost:3001/services",
        "http://localhost:3001/contact",
        "http://localhost:3001/membership",
      ],
      numberOfRuns: 3,
      startServerCommand: "pnpm start",
      startServerReadyPattern: "Ready in|started server on",
      settings: {
        preset: "desktop",
        throttling: {
          rttMs: 40,
          throughputKbps: 10_240,
          cpuSlowdownMultiplier: 1,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0,
        },
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.85 }],
        "categories:accessibility": ["error", { minScore: 0.9 }],
        "categories:best-practices": ["warn", { minScore: 0.9 }],
        "categories:seo": ["error", { minScore: 0.9 }],
        "largest-contentful-paint": ["error", { maxNumericValue: 2500 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "first-contentful-paint": ["warn", { maxNumericValue: 1800 }],
        "total-blocking-time": ["warn", { maxNumericValue: 300 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: ".lighthouseci",
      reportFilenamePattern: "%%PATHNAME%%-%%DATETIME%%-report.%%EXTENSION%%",
    },
  },
};
