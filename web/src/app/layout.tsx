import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/lib/theme-context";
import { ToastProvider } from "@/components/Toast";
import { LanguageProvider } from "@/lib/language-context";
import { LandingColorsProvider } from "@/lib/hooks/use-landing-colors";
import { HtmlLangSync } from "@/components/HtmlLangSync";
import PageTransition from "@/components/PageTransition";
import BackToTop from "@/components/BackToTop";
import CookieConsent from "@/components/CookieConsent";
import { ScrollProgressBar } from "@/components/ScrollReveal";
import JsonLd from "@/components/JsonLd";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
  preload: true,
});

const defaultTitle = "PPIA Auckland — Perhimpunan Pelajar Indonesia Auckland";
const defaultDescription =
  "Komunitas pelajar Indonesia di Auckland, Selandia Baru. Bergabung dengan PPIA untuk terhubung, berkembang, dan bersama.";

export const metadata: Metadata = {
  title: {
    default: defaultTitle,
    template: "%s | PPIA Auckland",
  },
  description: defaultDescription,
  keywords: [
    "PPIA", "Indonesian students", "Auckland", "New Zealand",
    "student association", "perhimpunan pelajar", "Indonesia",
    "Pelajar Indonesia Auckland", "PPIA Auckland",
  ],
  authors: [{ name: "PPIA Auckland" }],
  creator: "PPIA Auckland",
  metadataBase: new URL("https://ppiauckland.org"),
  openGraph: {
    title: defaultTitle,
    description: defaultDescription,
    url: "https://ppiauckland.org",
    siteName: "PPIA Auckland",
    locale: "id_ID",
    alternateLocale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "PPIA Auckland",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: defaultDescription,
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "32x32" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0D1B33" },
    { media: "(prefers-color-scheme: dark)", color: "#0D1B33" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`} suppressHydrationWarning>
      <head>
        {/* Applies the stored theme before first paint to avoid a flash */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <JsonLd />
      </head>
      <body className="min-h-screen antialiased">
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <ScrollProgressBar />
        <ThemeProvider>
          <LanguageProvider>
            <HtmlLangSync />
            <LandingColorsProvider>
              <AuthProvider>
                <ToastProvider>
                  <PageTransition>
                    <div id="main-content">
                      {children}
                    </div>
                    <BackToTop />
                    <CookieConsent />
                  </PageTransition>
                </ToastProvider>
              </AuthProvider>
            </LandingColorsProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
