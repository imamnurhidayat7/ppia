'use client';

/**
 * Site configuration editor: header, footer, social links, and brand colours.
 *
 * All four are saved through the same site-config endpoint, one record per key
 * ('header' | 'footer' | 'social' | 'colors'), so each tab has its own save
 * button and only sends the section currently open.
 */

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import type {
  ColorConfig,
  FooterConfig,
  HeaderConfig,
  SiteConfigResponse,
  SocialConfig,
} from '@/lib/api-types';
import {
  Button,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  Toggle,
} from '@/components/ui';
import {
  Field,
  FormActions,
  FormGrid,
  LoadingRows,
  SectionCard,
} from '@/components/dashboard';
import { useToast } from '@/components/Toast';
import {
  Briefcase,
  Camera,
  Music2,
  PanelBottom,
  PanelTop,
  Palette,
  Save,
  Share2,
  ThumbsUp,
  Video,
} from 'lucide-react';

type ConfigKey = 'header' | 'footer' | 'social' | 'colors';

type AnyConfig = HeaderConfig | FooterConfig | SocialConfig | ColorConfig;

/** Shape of the admin site-config endpoint response, so there is no `any` in the component. */
interface SiteConfigListResponse {
  success: boolean;
  data?: SiteConfigResponse[];
}

interface SiteConfigMutationResponse {
  success: boolean;
  data?: SiteConfigResponse;
}

const CONFIG_TABS: { key: ConfigKey; label: string; icon: typeof PanelTop }[] = [
  { key: 'header', label: 'Header', icon: PanelTop },
  { key: 'footer', label: 'Footer', icon: PanelBottom },
  { key: 'social', label: 'Social media', icon: Share2 },
  { key: 'colors', label: 'Colours', icon: Palette },
];

const SAVE_LABEL: Record<ConfigKey, string> = {
  header: 'Header settings saved',
  footer: 'Footer settings saved',
  social: 'Social media links saved',
  colors: 'Brand colours saved',
};

const SOCIAL_PREVIEW: {
  key: keyof SocialConfig;
  label: string;
  icon: typeof Camera;
}[] = [
  { key: 'instagram', label: 'Instagram', icon: Camera },
  { key: 'linkedin', label: 'LinkedIn', icon: Briefcase },
  { key: 'youtube', label: 'YouTube', icon: Video },
  { key: 'tiktok', label: 'TikTok', icon: Music2 },
  { key: 'facebook', label: 'Facebook', icon: ThumbsUp },
];

const COLOR_FIELDS: {
  key: keyof ColorConfig;
  label: string;
  hint: string;
  fallback: string;
}[] = [
  {
    key: 'primary',
    label: 'Primary colour',
    hint: 'Brand colour for backgrounds and primary elements.',
    fallback: '#1A2B4A',
  },
  {
    key: 'accent',
    label: 'Accent colour',
    hint: 'Secondary accent for highlights and hover states.',
    fallback: '#E8231A',
  },
  {
    key: 'textAccent',
    label: 'Text accent colour',
    hint: 'For text highlighted in the middle of a sentence.',
    fallback: '#E8231A',
  },
  {
    key: 'buttonPrimary',
    label: 'Primary button colour',
    hint: 'Background of the primary action button.',
    fallback: '#E8231A',
  },
];

/**
 * `<input type="color">` only accepts six-digit hex; an empty or three-digit
 * value silently falls back to black. So the colour picker uses the fallback
 * value until the text field actually contains a full hex.
 */
function swatchValue(value: string | undefined, fallback: string): string {
  return value && /^#[0-9a-f]{6}$/i.test(value.trim()) ? value.trim() : fallback;
}

export default function SettingsEditor() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<ConfigKey>('header');

  // Local editing state per configuration type.
  const [headerConfig, setHeaderConfig] = useState<HeaderConfig>({});
  const [footerConfig, setFooterConfig] = useState<FooterConfig>({});
  const [socialConfig, setSocialConfig] = useState<SocialConfig>({});
  const [colorConfig, setColorConfig] = useState<ColorConfig>({});

  const loadConfigs = useCallback(async () => {
    try {
      setLoading(true);
      const res = (await api.getSiteConfigAdmin()) as SiteConfigListResponse;
      if (res.success) {
        const map: Record<string, SiteConfigResponse> = {};
        (res.data || []).forEach((entry) => {
          map[entry.key] = entry;
        });
        setHeaderConfig((map.header?.config as HeaderConfig) || {});
        setFooterConfig((map.footer?.config as FooterConfig) || {});
        setSocialConfig((map.social?.config as SocialConfig) || {});
        // Colours were never loaded from the server before, so this tab always
        // showed the fallback values and saving would overwrite the stored
        // palette.
        setColorConfig((map.colors?.config as ColorConfig) || {});
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Could not load site settings');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  /* eslint-disable react-hooks/set-state-in-effect --
     loadConfigs() loads data once when the component mounts; state is only written
     after a network await, and the linter cannot see past that call. */
  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const saveConfig = async (key: ConfigKey, config: AnyConfig) => {
    try {
      setSaving(true);
      const res = (await api.updateSiteConfig(key, config)) as SiteConfigMutationResponse;
      if (res.success) {
        showToast('success', SAVE_LABEL[key]);
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Could not save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SectionCard title="Site settings" description="Loading configuration…" icon={PanelTop}>
        <LoadingRows rows={5} />
      </SectionCard>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ConfigKey)}>
      <TabsList className="mb-4 flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        {CONFIG_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <TabsTrigger key={tab.key} value={tab.key} className="flex items-center gap-2">
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>

      <TabsContent value="header" className="space-y-5">
        <SectionCard
          title="Header configuration"
          description="Logo and contacts shown at the top of the site."
          icon={PanelTop}
        >
          <div className="space-y-5">
            <FormGrid columns={2}>
              <Field label="Logo URL" htmlFor="header-logo-url" hint="For example: /logo.svg.">
                <Input
                  id="header-logo-url"
                  value={headerConfig.logoUrl || ''}
                  onChange={(event) =>
                    setHeaderConfig({ ...headerConfig, logoUrl: event.target.value })
                  }
                  placeholder="/logo.svg"
                />
              </Field>
              <Field
                label="Logo alt text"
                htmlFor="header-logo-alt"
                hint="Read out by screen readers when the image fails to load."
              >
                <Input
                  id="header-logo-alt"
                  value={headerConfig.logoAlt || ''}
                  onChange={(event) =>
                    setHeaderConfig({ ...headerConfig, logoAlt: event.target.value })
                  }
                  placeholder="PPIA Auckland"
                />
              </Field>
              <Field label="Contact email" htmlFor="header-contact-email">
                <Input
                  id="header-contact-email"
                  type="email"
                  value={headerConfig.contactEmail || ''}
                  onChange={(event) =>
                    setHeaderConfig({ ...headerConfig, contactEmail: event.target.value })
                  }
                  placeholder="contact@ppia-auckland.org"
                />
              </Field>
              <Field label="Contact phone" htmlFor="header-contact-phone">
                <Input
                  id="header-contact-phone"
                  value={headerConfig.contactPhone || ''}
                  onChange={(event) =>
                    setHeaderConfig({ ...headerConfig, contactPhone: event.target.value })
                  }
                  placeholder="+64 …"
                />
              </Field>
            </FormGrid>

            <Toggle
              id="header-show-search"
              label="Show search field"
              description="Shows the search button in the main navigation."
              checked={!!headerConfig.showSearch}
              onChange={(event) =>
                setHeaderConfig({ ...headerConfig, showSearch: event.target.checked })
              }
            />
          </div>
        </SectionCard>

        <FormActions>
          <Button
            variant="primary"
            leftIcon={<Save className="h-4 w-4" />}
            isLoading={saving}
            onClick={() => saveConfig('header', headerConfig)}
          >
            Save header
          </Button>
        </FormActions>
      </TabsContent>

      <TabsContent value="footer" className="space-y-5">
        <SectionCard
          title="Footer configuration"
          description="Logo, description, contacts, and copyright text at the bottom of the site."
          icon={PanelBottom}
        >
          <div className="space-y-5">
            <FormGrid columns={2}>
              <Field label="Footer logo URL" htmlFor="footer-logo-url">
                <Input
                  id="footer-logo-url"
                  value={footerConfig.logoUrl || ''}
                  onChange={(event) =>
                    setFooterConfig({ ...footerConfig, logoUrl: event.target.value })
                  }
                  placeholder="/logo.svg"
                />
              </Field>
              <Field label="Logo alt text" htmlFor="footer-logo-alt">
                <Input
                  id="footer-logo-alt"
                  value={footerConfig.logoAlt || ''}
                  onChange={(event) =>
                    setFooterConfig({ ...footerConfig, logoAlt: event.target.value })
                  }
                  placeholder="PPIA Auckland"
                />
              </Field>
            </FormGrid>

            <FormGrid columns={2}>
              <Field label="Description (English)" htmlFor="footer-description">
                <Textarea
                  id="footer-description"
                  rows={3}
                  value={footerConfig.description || ''}
                  onChange={(event) =>
                    setFooterConfig({ ...footerConfig, description: event.target.value })
                  }
                  placeholder="The home of Indonesian students in Auckland…"
                />
              </Field>
              <Field label="Description (Indonesian)" htmlFor="footer-description-id">
                <Textarea
                  id="footer-description-id"
                  rows={3}
                  value={footerConfig.descriptionId || ''}
                  onChange={(event) =>
                    setFooterConfig({ ...footerConfig, descriptionId: event.target.value })
                  }
                  placeholder="Rumah bagi pelajar Indonesia di Auckland…"
                />
              </Field>
            </FormGrid>

            <FormGrid columns={3}>
              <Field label="Address" htmlFor="footer-address">
                <Input
                  id="footer-address"
                  value={footerConfig.address || ''}
                  onChange={(event) =>
                    setFooterConfig({ ...footerConfig, address: event.target.value })
                  }
                  placeholder="Auckland, New Zealand"
                />
              </Field>
              <Field label="Email" htmlFor="footer-email">
                <Input
                  id="footer-email"
                  type="email"
                  value={footerConfig.email || ''}
                  onChange={(event) =>
                    setFooterConfig({ ...footerConfig, email: event.target.value })
                  }
                  placeholder="contact@ppia-auckland.org"
                />
              </Field>
              <Field label="Phone" htmlFor="footer-phone">
                <Input
                  id="footer-phone"
                  value={footerConfig.phone || ''}
                  onChange={(event) =>
                    setFooterConfig({ ...footerConfig, phone: event.target.value })
                  }
                  placeholder="+64 …"
                />
              </Field>
            </FormGrid>

            <Field label="Copyright text" htmlFor="footer-copyright">
              <Input
                id="footer-copyright"
                value={footerConfig.copyrightText || ''}
                onChange={(event) =>
                  setFooterConfig({ ...footerConfig, copyrightText: event.target.value })
                }
                placeholder="© 2026 PPIA Auckland. All rights reserved."
              />
            </Field>
          </div>
        </SectionCard>

        <FormActions>
          <Button
            variant="primary"
            leftIcon={<Save className="h-4 w-4" />}
            isLoading={saving}
            onClick={() => saveConfig('footer', footerConfig)}
          >
            Save footer
          </Button>
        </FormActions>
      </TabsContent>

      <TabsContent value="social" className="space-y-5">
        <SectionCard
          title="Social media links"
          description="Official profile addresses shown in the header and footer."
          icon={Share2}
        >
          <div className="space-y-5">
            <FormGrid columns={2}>
              <Field label="Instagram" htmlFor="social-instagram">
                <Input
                  id="social-instagram"
                  type="url"
                  value={socialConfig.instagram || ''}
                  onChange={(event) =>
                    setSocialConfig({ ...socialConfig, instagram: event.target.value })
                  }
                  placeholder="https://instagram.com/ppiaauckland"
                />
              </Field>
              <Field label="LinkedIn" htmlFor="social-linkedin">
                <Input
                  id="social-linkedin"
                  type="url"
                  value={socialConfig.linkedin || ''}
                  onChange={(event) =>
                    setSocialConfig({ ...socialConfig, linkedin: event.target.value })
                  }
                  placeholder="https://linkedin.com/company/ppiaauckland"
                />
              </Field>
              <Field label="YouTube" htmlFor="social-youtube">
                <Input
                  id="social-youtube"
                  type="url"
                  value={socialConfig.youtube || ''}
                  onChange={(event) =>
                    setSocialConfig({ ...socialConfig, youtube: event.target.value })
                  }
                  placeholder="https://youtube.com/@ppiaauckland"
                />
              </Field>
              <Field label="TikTok" htmlFor="social-tiktok">
                <Input
                  id="social-tiktok"
                  type="url"
                  value={socialConfig.tiktok || ''}
                  onChange={(event) =>
                    setSocialConfig({ ...socialConfig, tiktok: event.target.value })
                  }
                  placeholder="https://tiktok.com/@ppiaauckland"
                />
              </Field>
              <Field label="Facebook" htmlFor="social-facebook">
                <Input
                  id="social-facebook"
                  type="url"
                  value={socialConfig.facebook || ''}
                  onChange={(event) =>
                    setSocialConfig({ ...socialConfig, facebook: event.target.value })
                  }
                  placeholder="https://facebook.com/ppiaauckland"
                />
              </Field>
            </FormGrid>
          </div>
        </SectionCard>

        <SectionCard
          title="Icon preview"
          description="Only filled-in links are shown on the site."
          icon={Share2}
        >
          <div className="flex flex-wrap gap-2">
            {SOCIAL_PREVIEW.map((entry) => {
              const href = socialConfig[entry.key];
              if (!href) return null;
              const Icon = entry.icon;
              return (
                <a
                  key={entry.key}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open ${entry.label} in a new tab`}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 transition-colors hover:border-[#E8231A] hover:text-[#E8231A] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  <Icon className="h-5 w-5" />
                </a>
              );
            })}
            {SOCIAL_PREVIEW.every((entry) => !socialConfig[entry.key]) && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No links filled in yet.
              </p>
            )}
          </div>
        </SectionCard>

        <FormActions>
          <Button
            variant="primary"
            leftIcon={<Save className="h-4 w-4" />}
            isLoading={saving}
            onClick={() => saveConfig('social', socialConfig)}
          >
            Save social media
          </Button>
        </FormActions>
      </TabsContent>

      <TabsContent value="colors" className="space-y-5">
        <SectionCard
          title="Brand colours"
          description="The palette public pages use for backgrounds, accents, and buttons."
          icon={Palette}
        >
          <FormGrid columns={2}>
            {COLOR_FIELDS.map((entry) => (
              <Field
                key={entry.key}
                label={entry.label}
                htmlFor={`color-${entry.key}`}
                hint={entry.hint}
              >
                <div className="flex items-center gap-3">
                  <input
                    id={`color-${entry.key}-picker`}
                    type="color"
                    value={swatchValue(colorConfig[entry.key], entry.fallback)}
                    onChange={(event) =>
                      setColorConfig({ ...colorConfig, [entry.key]: event.target.value })
                    }
                    aria-label={`Pick ${entry.label.toLowerCase()}`}
                    className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-slate-200 dark:border-slate-700"
                  />
                  <Input
                    id={`color-${entry.key}`}
                    value={colorConfig[entry.key] || ''}
                    onChange={(event) =>
                      setColorConfig({ ...colorConfig, [entry.key]: event.target.value })
                    }
                    placeholder={entry.fallback}
                    className="font-mono"
                  />
                </div>
              </Field>
            ))}
          </FormGrid>
        </SectionCard>

        <SectionCard
          title="Preview"
          description="A quick look at how this palette looks together."
          icon={Palette}
        >
          <div
            className="rounded-2xl border border-slate-200 p-6 dark:border-slate-700"
            style={{ backgroundColor: swatchValue(colorConfig.primary, '#1A2B4A') }}
          >
            <p className="font-display text-lg font-bold text-white">Example heading</p>
            <p className="mt-2 text-sm text-white/80">
              This is an example paragraph with{' '}
              <span style={{ color: swatchValue(colorConfig.textAccent, '#E8231A') }}>
                text highlighted in the middle
              </span>{' '}
              of the sentence.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <span
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
                style={{ backgroundColor: swatchValue(colorConfig.buttonPrimary, '#E8231A') }}
              >
                Primary button
              </span>
              <span
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
                style={{
                  backgroundColor: swatchValue(colorConfig.accent, '#E8231A'),
                  opacity: 0.8,
                }}
              >
                Secondary button
              </span>
            </div>
          </div>
        </SectionCard>

        <FormActions>
          <Button
            variant="primary"
            leftIcon={<Save className="h-4 w-4" />}
            isLoading={saving}
            onClick={() => saveConfig('colors', colorConfig)}
          >
            Save colours
          </Button>
        </FormActions>
      </TabsContent>
    </Tabs>
  );
}
