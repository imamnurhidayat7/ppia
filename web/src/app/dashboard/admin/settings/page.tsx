'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { useToast } from '@/components/Toast';
import { useConfirm, ConfirmHost } from '@/hooks/useConfirm';
import { Button, Toggle } from '@/components/ui';
import {
  AccessDenied,
  Field,
  FormActions,
  FormGrid,
  PageHeading,
  PageStack,
  SectionCard,
} from '@/components/dashboard';
import { isValidHexColor } from '@/lib/theme-validation';
import {
  AlertCircle,
  Building2,
  Globe,
  Mail,
  MessageCircle,
  Palette,
  RotateCcw,
  Save,
  Settings as SettingsIcon,
  Sliders,
} from 'lucide-react';

interface OrganizationSettings {
  name: string;
  tagline: string;
  establishedYear: string;
  description: string;
}

interface ContactSettings {
  email: string;
  phone: string;
  address: string;
}

interface SocialMediaSettings {
  linkedin: string;
  instagram: string;
  twitter: string;
  youtube: string;
  facebook: string;
}

interface BrandingSettings {
  primaryColor: string;
  logoUrl: string;
  faviconUrl: string;
}

interface SystemPreferencesSettings {
  maintenanceMode: boolean;
  allowPublicRegistration: boolean;
}

/**
 * The interface is English only and `language-context` keeps the choice in
 * `localStorage`, so this is a per-browser preference rather than site
 * configuration. Persisting it as a server setting would promise a site-wide
 * effect that nothing honours.
 */
const LOCAL_LANGUAGE_KEY = 'ppia-language';

const DEFAULT_SETTINGS = {
  organization: {
    name: 'PPIA Auckland',
    tagline: 'Indonesian Students Association in Auckland',
    establishedYear: '2000',
    description:
      'PPIA Auckland is a community of Indonesian students and friends based in Tāmaki Makaurau (Auckland), New Zealand.',
  } satisfies OrganizationSettings,
  contact: {
    email: 'contact@ppiauckland.org',
    // Empty rather than the placeholder number, so "restore defaults" cannot
    // publish a made-up phone number. Matches the API default.
    phone: '',
    address: 'Auckland, New Zealand',
  } satisfies ContactSettings,
  socialMedia: {
    linkedin: '',
    instagram: '',
    twitter: '',
    youtube: '',
    facebook: '',
  } satisfies SocialMediaSettings,
  branding: {
    primaryColor: '#E8231A',
    logoUrl: '',
    faviconUrl: '',
  } satisfies BrandingSettings,
  systemPreferences: {
    maintenanceMode: false,
    allowPublicRegistration: true,
  } satisfies SystemPreferencesSettings,
};

/** Maps every server setting key to the section field it belongs to. */
type SettingsMap = Record<string, string>;

const readBoolean = (value: string | undefined, fallback: boolean) =>
  value === undefined || value === '' ? fallback : value === 'true';

const LANGUAGE_OPTIONS: { value: 'EN' | 'ID'; label: string }[] = [
  { value: 'EN', label: 'English (EN)' },
  { value: 'ID', label: 'Bahasa Indonesia (ID)' },
];

export default function AdminSettingsPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const confirmCtx = useConfirm();

  const [organization, setOrganization] = useState<OrganizationSettings>(
    DEFAULT_SETTINGS.organization
  );
  const [contact, setContact] = useState<ContactSettings>(DEFAULT_SETTINGS.contact);
  const [socialMedia, setSocialMedia] = useState<SocialMediaSettings>(
    DEFAULT_SETTINGS.socialMedia
  );
  const [branding, setBranding] = useState<BrandingSettings>(DEFAULT_SETTINGS.branding);
  const [systemPreferences, setSystemPreferences] = useState<SystemPreferencesSettings>(
    DEFAULT_SETTINGS.systemPreferences
  );
  const [whatsappGroupLink, setWhatsappGroupLink] = useState('');
  const [interfaceLanguage, setInterfaceLanguage] = useState<'EN' | 'ID'>('EN');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [colorError, setColorError] = useState<string | null>(null);

  // Site configuration is not content, so Super Admin only.
  const canManage = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const fetchSettings = useCallback(async () => {
    try {
      const response = (await api.getAllSettings()) as { settings?: SettingsMap };
      const saved = response.settings ?? {};
      // The API always answers with every known key (its own defaults filled
      // in), so a missing key means an older API — fall back to the page default.
      const value = (key: string, fallback: string) => saved[key] ?? fallback;

      setWhatsappGroupLink(value('whatsappGroupLink', ''));
      setOrganization({
        name: value('organizationName', DEFAULT_SETTINGS.organization.name),
        tagline: value('organizationTagline', DEFAULT_SETTINGS.organization.tagline),
        establishedYear: value(
          'organizationEstablishedYear',
          DEFAULT_SETTINGS.organization.establishedYear
        ),
        description: value('organizationDescription', DEFAULT_SETTINGS.organization.description),
      });
      setContact({
        email: value('contactEmail', DEFAULT_SETTINGS.contact.email),
        phone: value('contactPhone', DEFAULT_SETTINGS.contact.phone),
        address: value('contactAddress', DEFAULT_SETTINGS.contact.address),
      });
      setSocialMedia({
        linkedin: value('socialLinkedin', ''),
        instagram: value('socialInstagram', ''),
        twitter: value('socialTwitter', ''),
        youtube: value('socialYoutube', ''),
        facebook: value('socialFacebook', ''),
      });
      setBranding({
        primaryColor: value('brandingPrimaryColor', DEFAULT_SETTINGS.branding.primaryColor),
        logoUrl: value('brandingLogoUrl', ''),
        faviconUrl: value('brandingFaviconUrl', ''),
      });
      setSystemPreferences({
        maintenanceMode: readBoolean(saved.maintenanceMode, false),
        allowPublicRegistration: readBoolean(saved.allowPublicRegistration, true),
      });
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      showError(err.response?.data?.error || err.message || 'Could not load settings');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  /* eslint-disable react-hooks/set-state-in-effect --
     fetchSettings() only writes state after awaiting the network; the linter
     cannot see past the call. The language preference lives in localStorage,
     which does not exist until after mount. */
  useEffect(() => {
    if (user && canManage) {
      fetchSettings();
    }
  }, [user, canManage, fetchSettings]);

  useEffect(() => {
    if (window.localStorage.getItem(LOCAL_LANGUAGE_KEY) === 'id') {
      setInterfaceLanguage('ID');
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Anyone but Super Admin never triggers the fetch, so the skeleton must not wait on it.
  const showSkeleton = (isLoading || loading) && (isLoading || canManage);

  const handleSave = async () => {
    if (!isValidHexColor(branding.primaryColor)) {
      setColorError('Primary colour must be a valid hex code, for example #E8231A.');
      showError('Invalid primary colour');
      return;
    }
    setColorError(null);
    setSaving(true);
    try {
      await api.updateSettings({
        whatsappGroupLink: whatsappGroupLink.trim(),
        organizationName: organization.name.trim(),
        organizationTagline: organization.tagline.trim(),
        organizationEstablishedYear: organization.establishedYear.trim(),
        organizationDescription: organization.description.trim(),
        contactEmail: contact.email.trim(),
        contactPhone: contact.phone.trim(),
        contactAddress: contact.address.trim(),
        socialLinkedin: socialMedia.linkedin.trim(),
        socialInstagram: socialMedia.instagram.trim(),
        socialTwitter: socialMedia.twitter.trim(),
        socialYoutube: socialMedia.youtube.trim(),
        socialFacebook: socialMedia.facebook.trim(),
        brandingPrimaryColor: branding.primaryColor.trim(),
        brandingLogoUrl: branding.logoUrl.trim(),
        brandingFaviconUrl: branding.faviconUrl.trim(),
        maintenanceMode: String(systemPreferences.maintenanceMode),
        allowPublicRegistration: String(systemPreferences.allowPublicRegistration),
      });
      showSuccess('Settings saved');
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      showError(err.response?.data?.error || err.message || 'Could not save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleResetAll = async () => {
    const ok = await confirmCtx.confirm({
      title: 'Restore all settings?',
      message:
        'Every section on this page will return to its default value. Nothing changes on the server until you save.',
      confirmLabel: 'Yes, restore',
      variant: 'danger',
    });
    if (!ok) return;
    setOrganization(DEFAULT_SETTINGS.organization);
    setContact(DEFAULT_SETTINGS.contact);
    setSocialMedia(DEFAULT_SETTINGS.socialMedia);
    setBranding(DEFAULT_SETTINGS.branding);
    setSystemPreferences(DEFAULT_SETTINGS.systemPreferences);
    setColorError(null);
    showSuccess('All settings restored to defaults');
  };

  if (showSkeleton) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-56 rounded skeleton" />
          <div className="h-4 w-80 rounded skeleton" />
        </div>
        {[0, 1, 2].map((card) => (
          <div key={card} className="h-56 rounded-2xl skeleton" />
        ))}
      </div>
    );
  }

  if (!canManage) {
    return (
      <AccessDenied message="Only Super Admin can access site settings." backHref="/dashboard" />
    );
  }

  return (
    <PageStack>
      <PageHeading
        title="Site settings"
        description="Organisation identity, contact, social media, branding, and system preferences."
        icon={SettingsIcon}
        backHref="/dashboard/admin"
        backLabel="Back to admin panel"
      />

      <SectionCard
        title="WhatsApp integration"
        description="The community invite sent to members by e-mail. Changing it here takes effect immediately — no deploy needed."
        icon={MessageCircle}
      >
        <Field
          label="WhatsApp group link"
          htmlFor="whatsapp-link"
          hint="Use the invite link from chat.whatsapp.com. It is e-mailed when a member confirms their address and again when their membership is approved, and it appears on the member dashboard. It is only served to signed-in members, never publicly."
        >
          <input
            id="whatsapp-link"
            type="url"
            value={whatsappGroupLink}
            onChange={(event) => setWhatsappGroupLink(event.target.value)}
            placeholder="https://chat.whatsapp.com/…"
            className="input-base"
          />
        </Field>
      </SectionCard>

      <SectionCard
        title="Organisation identity"
        description="The name and description shown on public pages."
        icon={Building2}
      >
        <div className="space-y-4">
          <FormGrid columns={2}>
            <Field label="Organisation name" htmlFor="org-name">
              <input
                id="org-name"
                type="text"
                value={organization.name}
                onChange={(event) => setOrganization({ ...organization, name: event.target.value })}
                placeholder="PPIA Auckland"
                className="input-base"
              />
            </Field>
            <Field label="Tagline" htmlFor="org-tagline">
              <input
                id="org-tagline"
                type="text"
                value={organization.tagline}
                onChange={(event) =>
                  setOrganization({ ...organization, tagline: event.target.value })
                }
                placeholder="Indonesian Students Association in Auckland"
                className="input-base"
              />
            </Field>
            <Field label="Founded" htmlFor="org-year">
              <input
                id="org-year"
                type="number"
                value={organization.establishedYear}
                onChange={(event) =>
                  setOrganization({ ...organization, establishedYear: event.target.value })
                }
                placeholder="2000"
                className="input-base"
              />
            </Field>
          </FormGrid>
          <Field label="Description" htmlFor="org-description">
            <textarea
              id="org-description"
              rows={4}
              value={organization.description}
              onChange={(event) =>
                setOrganization({ ...organization, description: event.target.value })
              }
              placeholder="A short description of the organisation"
              className="input-base resize-y"
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        title="Contact"
        description="The main contact channels shown to visitors."
        icon={Mail}
      >
        <div className="space-y-4">
          <FormGrid columns={2}>
            <Field label="Email" htmlFor="contact-email">
              <input
                id="contact-email"
                type="email"
                value={contact.email}
                onChange={(event) => setContact({ ...contact, email: event.target.value })}
                placeholder="contact@ppiauckland.org"
                className="input-base"
              />
            </Field>
            <Field label="Phone" htmlFor="contact-phone">
              <input
                id="contact-phone"
                type="tel"
                value={contact.phone}
                onChange={(event) => setContact({ ...contact, phone: event.target.value })}
                placeholder="+64 21 000 0000"
                className="input-base"
              />
            </Field>
          </FormGrid>
          <Field label="Address" htmlFor="contact-address">
            <textarea
              id="contact-address"
              rows={3}
              value={contact.address}
              onChange={(event) => setContact({ ...contact, address: event.target.value })}
              placeholder="Auckland, New Zealand"
              className="input-base resize-y"
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        title="Social media"
        description="Links to the organisation's official profiles."
        icon={Globe}
      >
        <FormGrid columns={2}>
          <Field label="LinkedIn" htmlFor="social-linkedin">
            <input
              id="social-linkedin"
              type="url"
              value={socialMedia.linkedin}
              onChange={(event) => setSocialMedia({ ...socialMedia, linkedin: event.target.value })}
              placeholder="https://linkedin.com/company/…"
              className="input-base"
            />
          </Field>
          <Field label="Instagram" htmlFor="social-instagram">
            <input
              id="social-instagram"
              type="url"
              value={socialMedia.instagram}
              onChange={(event) =>
                setSocialMedia({ ...socialMedia, instagram: event.target.value })
              }
              placeholder="https://instagram.com/…"
              className="input-base"
            />
          </Field>
          <Field label="Twitter / X" htmlFor="social-twitter">
            <input
              id="social-twitter"
              type="url"
              value={socialMedia.twitter}
              onChange={(event) => setSocialMedia({ ...socialMedia, twitter: event.target.value })}
              placeholder="https://x.com/…"
              className="input-base"
            />
          </Field>
          <Field label="YouTube" htmlFor="social-youtube">
            <input
              id="social-youtube"
              type="url"
              value={socialMedia.youtube}
              onChange={(event) => setSocialMedia({ ...socialMedia, youtube: event.target.value })}
              placeholder="https://youtube.com/…"
              className="input-base"
            />
          </Field>
          <Field label="Facebook" htmlFor="social-facebook">
            <input
              id="social-facebook"
              type="url"
              value={socialMedia.facebook}
              onChange={(event) => setSocialMedia({ ...socialMedia, facebook: event.target.value })}
              placeholder="https://facebook.com/…"
              className="input-base"
            />
          </Field>
        </FormGrid>
      </SectionCard>

      <SectionCard
        title="Branding"
        description="The colours and assets used across the site."
        icon={Palette}
      >
        <FormGrid columns={2}>
          <Field
            label="Primary colour"
            htmlFor="branding-color"
            error={colorError ?? undefined}
            hint="Hex format, for example #E8231A."
          >
            <div className="flex items-center gap-3">
              <input
                id="branding-color-picker"
                type="color"
                value={isValidHexColor(branding.primaryColor) ? branding.primaryColor : '#E8231A'}
                onChange={(event) => {
                  setBranding({ ...branding, primaryColor: event.target.value });
                  setColorError(null);
                }}
                aria-label="Primary colour picker"
                className="h-11 w-14 cursor-pointer rounded-lg border border-slate-200 dark:border-slate-700"
              />
              <input
                id="branding-color"
                type="text"
                value={branding.primaryColor}
                onChange={(event) => {
                  setBranding({ ...branding, primaryColor: event.target.value });
                  setColorError(null);
                }}
                placeholder="#E8231A"
                className="input-base font-mono"
              />
            </div>
          </Field>
          <Field label="Logo URL" htmlFor="branding-logo">
            <input
              id="branding-logo"
              type="url"
              value={branding.logoUrl}
              onChange={(event) => setBranding({ ...branding, logoUrl: event.target.value })}
              placeholder="/logo.png"
              className="input-base"
            />
          </Field>
          <Field label="Favicon URL" htmlFor="branding-favicon">
            <input
              id="branding-favicon"
              type="url"
              value={branding.faviconUrl}
              onChange={(event) => setBranding({ ...branding, faviconUrl: event.target.value })}
              placeholder="/favicon.ico"
              className="input-base"
            />
          </Field>
        </FormGrid>
      </SectionCard>

      <SectionCard
        title="System preferences"
        description="Switches that apply across the whole site. They are stored on the server; the public site does not enforce them yet."
        icon={Sliders}
      >
        <div className="space-y-5">
          <Toggle
            id="pref-maintenance"
            label="Maintenance mode"
            description="When enabled, the public site shows a maintenance page."
            checked={systemPreferences.maintenanceMode}
            onChange={(event) =>
              setSystemPreferences({
                ...systemPreferences,
                maintenanceMode: event.target.checked,
              })
            }
          />
          <Toggle
            id="pref-registration"
            label="Allow public registration"
            description="When turned off, new members can only be added by an admin."
            checked={systemPreferences.allowPublicRegistration}
            onChange={(event) =>
              setSystemPreferences({
                ...systemPreferences,
                allowPublicRegistration: event.target.checked,
              })
            }
          />
          <Field
            label="Interface language"
            htmlFor="pref-language"
            className="max-w-xs"
            hint="Kept in this browser only, not on the server. The interface is written in English; the Indonesian option only affects built-in fallback copy on this device."
          >
            <select
              id="pref-language"
              value={interfaceLanguage}
              onChange={(event) => {
                const next = event.target.value as 'EN' | 'ID';
                setInterfaceLanguage(next);
                window.localStorage.setItem(LOCAL_LANGUAGE_KEY, next.toLowerCase());
              }}
              className="input-base"
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        title="Danger zone"
        description="Restore every setting on this page to its default value."
        icon={AlertCircle}
        className="border-danger-200 dark:border-danger-900/50"
      >
        <div className="flex flex-col gap-4 rounded-xl border border-danger-100 bg-danger-50 p-4 md:flex-row md:items-center md:justify-between dark:border-danger-900/50 dark:bg-danger-900/20">
          <div className="min-w-0">
            <p className="text-sm font-bold text-danger-900 dark:text-danger-100">
              Restore all settings to defaults
            </p>
            <p className="mt-0.5 text-xs text-danger-800 dark:text-danger-200">
              Every section on this page returns to its initial value. The WhatsApp link already
              saved on the server is not removed.
            </p>
          </div>
          <Button
            variant="danger"
            leftIcon={<RotateCcw className="h-4 w-4" />}
            onClick={handleResetAll}
            className="shrink-0"
          >
            Restore defaults
          </Button>
        </div>
      </SectionCard>

      <FormActions>
        <span className="mr-auto text-xs text-slate-500 dark:text-slate-400">
          Saving applies every section on this page to the server, except the interface language.
        </span>
        <Button variant="secondary" onClick={() => fetchSettings()} disabled={saving}>
          Refresh
        </Button>
        <Button
          variant="primary"
          leftIcon={<Save className="h-4 w-4" />}
          isLoading={saving}
          onClick={handleSave}
        >
          Save settings
        </Button>
      </FormActions>

      <ConfirmHost ctx={confirmCtx} />
    </PageStack>
  );
}
