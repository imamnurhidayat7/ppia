// ===========================================
// Centralized constants & shared values
// ===========================================

// Brand colors (single source of truth)
export const COLORS = {
  navy: "#1A2B4A",
  navyDark: "#0D1B33",
  red: "#E8231A",
  redDark: "#C41E16",
  redMuted: "#FFF0EF",
  slate400: "#94A3B8",
  slate500: "#64748B",
  white: "#FFFFFF",
} as const;

// Site metadata
export const SITE = {
  name: "PPIA Auckland",
  shortName: "PPIA",
  url: "https://ppiauckland.org",
  description:
    "Komunitas pelajar Indonesia di Auckland, Selandia Baru. Bergabung dengan PPIA untuk terhubung, berkembang, dan bersama.",
  email: "ppiauckland@gmail.com",
  location: "Auckland, New Zealand",
} as const;

// Social links
export const SOCIALS = [
  { label: "Instagram", href: "https://instagram.com/ppiauckland" },
  { label: "LinkedIn", href: "https://linkedin.com/company/ppiauckland" },
  { label: "YouTube", href: "https://youtube.com/@ppiauckland2025" },
  { label: "Email", href: "mailto:ppiauckland@gmail.com" },
] as const;

// API endpoints — single source of truth lives in ./api-base
export { API_ORIGIN as API_BASE, API_URL } from "./api-base";

// Reusable Framer Motion variants — replaces repeated initial/animate objects
export const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
};

// Default transition timing
export const TRANSITIONS = {
  fast: { duration: 0.3 },
  base: { duration: 0.5 },
  slow: { duration: 0.8 },
  spring: { type: "spring" as const, stiffness: 300, damping: 30 },
};

// Stagger container for lists
export const staggerContainer = (stagger = 0.1, delay = 0) => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: stagger, delayChildren: delay },
  },
});

// Category color palette (used by article/event cards)
export const CATEGORY_COLORS: Record<string, { from: string; to: string; text: string }> = {
  News: { from: COLORS.navy, to: COLORS.red, text: COLORS.red },
  Articles: { from: COLORS.navy, to: "#8B5CF6", text: "#8B5CF6" },
  Events: { from: COLORS.navy, to: "#3B82F6", text: "#3B82F6" },
  Research: { from: COLORS.navy, to: "#10B981", text: "#10B981" },
  default: { from: COLORS.navy, to: "#3B82F6", text: "#3B82F6" },
};

// Pagination defaults
export const PAGINATION = {
  defaultLimit: 10,
  eventsPerPage: 9,
  articlesPerPage: 9,
};

// Newsletter / contact
export const NEWSLETTER = {
  placeholder: "Enter your email",
  successMessage: "Successfully subscribed!",
};
