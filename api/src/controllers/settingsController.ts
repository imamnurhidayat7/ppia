import { Request, Response } from 'express';
import prisma from '../lib/prisma';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
  };
}

/**
 * Keys any visitor may read, with no session.
 *
 * `whatsappGroupLink` used to be here, which meant a single unauthenticated GET
 * returned the community invite to anyone who asked. That undermines the point
 * of only sending it once an address has been confirmed — an invite link is a
 * credential for joining the group, so it now needs a session.
 */
const PUBLIC_KEYS: string[] = [
  // Organisation identity, contact details, social profiles and branding all
  // appear on public pages, so an anonymous visitor has to be able to read them.
  'organizationName',
  'organizationTagline',
  'organizationEstablishedYear',
  'organizationDescription',
  'contactEmail',
  'contactPhone',
  'contactAddress',
  'socialLinkedin',
  'socialInstagram',
  'socialTwitter',
  'socialYoutube',
  'socialFacebook',
  'brandingPrimaryColor',
  'brandingLogoUrl',
  'brandingFaviconUrl',
  // Site-wide switches the public site itself needs to honour.
  'maintenanceMode',
  'allowPublicRegistration'
];

/** Keys any signed-in member may read. */
const MEMBER_KEYS = ['whatsappGroupLink'];

// All known setting keys (used to seed defaults / validate writes).
const KNOWN_KEYS = [...PUBLIC_KEYS, ...MEMBER_KEYS];

const DEFAULTS: Record<string, string> = {
  whatsappGroupLink: '',
  organizationName: 'PPIA Auckland',
  organizationTagline: 'Indonesian Students Association in Auckland',
  organizationEstablishedYear: '2000',
  organizationDescription:
    'PPIA Auckland is a community of Indonesian students and friends based in Tāmaki Makaurau (Auckland), New Zealand.',
  contactEmail: 'contact@ppiauckland.org',
  contactPhone: '',
  contactAddress: 'Auckland, New Zealand',
  socialLinkedin: '',
  socialInstagram: '',
  socialTwitter: '',
  socialYoutube: '',
  socialFacebook: '',
  brandingPrimaryColor: '#E8231A',
  brandingLogoUrl: '',
  brandingFaviconUrl: '',
  maintenanceMode: 'false',
  allowPublicRegistration: 'true'
};

/** Keys that must hold an absolute http(s) URL when they are not empty. */
const ABSOLUTE_URL_KEYS = new Set([
  'whatsappGroupLink',
  'socialLinkedin',
  'socialInstagram',
  'socialTwitter',
  'socialYoutube',
  'socialFacebook'
]);

/**
 * Keys that may hold either an absolute URL or a site-relative path. Logos and
 * favicons are usually uploaded to this app (`/uploads/…`) rather than hosted
 * elsewhere, so rejecting relative paths would block the common case.
 */
const ASSET_URL_KEYS = new Set(['brandingLogoUrl', 'brandingFaviconUrl']);

const BOOLEAN_KEYS = new Set(['maintenanceMode', 'allowPublicRegistration']);

function isAbsoluteHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Returns an error message when `value` is not acceptable for `key`, or null
 * when it is. Empty strings always pass: clearing a setting is how an admin
 * removes it.
 */
function validateSetting(key: string, value: string): string | null {
  if (value === '') return null;

  if (ABSOLUTE_URL_KEYS.has(key) && !isAbsoluteHttpUrl(value)) {
    return `${key} must be a http:// or https:// URL`;
  }

  if (ASSET_URL_KEYS.has(key) && !isAbsoluteHttpUrl(value) && !value.startsWith('/')) {
    return `${key} must be a http:// or https:// URL, or a path starting with /`;
  }

  if (BOOLEAN_KEYS.has(key) && value !== 'true' && value !== 'false') {
    return `${key} must be either "true" or "false"`;
  }

  if (key === 'contactEmail' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return 'contactEmail must be a valid e-mail address';
  }

  if (key === 'brandingPrimaryColor' && !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)) {
    return 'brandingPrimaryColor must be a hex colour, for example #E8231A';
  }

  if (key === 'organizationEstablishedYear' && !/^\d{4}$/.test(value)) {
    return 'organizationEstablishedYear must be a four-digit year';
  }

  return null;
}

// GET /api/settings — public-safe settings only
export const getPublicSettings = async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await prisma.setting.findMany({
      where: { key: { in: PUBLIC_KEYS } }
    });

    // Defaults are filtered to PUBLIC_KEYS rather than spread wholesale.
    // Spreading DEFAULTS put every known key into the public response — with an
    // empty value, so nothing leaked, but it advertised the existence of keys
    // this endpoint is not meant to serve.
    const settings: Record<string, string> = {};
    for (const key of PUBLIC_KEYS) {
      settings[key] = DEFAULTS[key] ?? '';
    }
    for (const row of rows) {
      settings[row.key] = row.value;
    }

    res.json({ settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/settings/member — settings a signed-in member may read.
 *
 * This is where the dashboard gets the WhatsApp invite from. Authentication is
 * the whole point: the link is handed out to confirmed members by e-mail, so it
 * must not also be readable by an anonymous request.
 */
export const getMemberSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const rows = await prisma.setting.findMany({
      where: { key: { in: MEMBER_KEYS } }
    });

    const settings: Record<string, string> = {};
    for (const key of MEMBER_KEYS) {
      settings[key] = DEFAULTS[key] ?? '';
    }
    for (const row of rows) {
      settings[row.key] = row.value;
    }

    res.json({ settings });
  } catch (error) {
    console.error('Get member settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/settings/all — all settings (admin only)
export const getAllSettings = async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await prisma.setting.findMany();
    const settings: Record<string, string> = { ...DEFAULTS };
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    res.json({ settings });
  } catch (error) {
    console.error('Get all settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/settings — upsert settings (admin only)
export const updateSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const incoming = req.body?.settings ?? req.body;

    if (!incoming || typeof incoming !== 'object') {
      res.status(400).json({ error: 'settings object is required' });
      return;
    }

    const updates: { key: string; value: string }[] = [];
    for (const key of Object.keys(incoming)) {
      if (!KNOWN_KEYS.includes(key)) continue; // ignore unknown keys
      const raw = incoming[key];
      // Booleans arrive as real booleans from the dashboard toggles; everything
      // is stored as text, so normalise before validating.
      const value = raw == null ? '' : typeof raw === 'boolean' ? String(raw) : String(raw).trim();
      const problem = validateSetting(key, value);
      if (problem) {
        res.status(400).json({ error: problem });
        return;
      }
      updates.push({ key, value });
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No valid settings provided' });
      return;
    }

    await Promise.all(
      updates.map((u) =>
        prisma.setting.upsert({
          where: { key: u.key },
          update: { value: u.value },
          create: { key: u.key, value: u.value }
        })
      )
    );

    // Return the full settings map
    const rows = await prisma.setting.findMany();
    const settings: Record<string, string> = { ...DEFAULTS };
    for (const row of rows) {
      settings[row.key] = row.value;
    }

    res.json({ message: 'Settings updated successfully', settings });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
