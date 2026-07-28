/**
 * Transactional e-mail delivery.
 *
 * Talks to the Mailtrap HTTP API with the global `fetch`, so no extra runtime
 * dependency is required. Two endpoints exist and the choice is driven by
 * `MAILTRAP_USE_SANDBOX`:
 *
 *   sandbox    -> https://sandbox.api.mailtrap.io/api/send/{inboxId}
 *                 Nothing leaves Mailtrap; every message lands in the inbox.
 *                 Requires MAILTRAP_INBOX_ID.
 *   production -> https://send.api.mailtrap.io/api/send
 *                 Real delivery. The `from` domain must be verified in
 *                 Mailtrap or the API rejects the request.
 *
 * Failures never throw. Callers sit inside request handlers where a raised
 * error would turn a successful password reset into a 500 — and, worse, would
 * make `forgot-password` behave differently for known and unknown addresses,
 * reintroducing the e-mail enumeration leak that endpoint deliberately avoids.
 * Instead every send resolves to a SendResult the caller may inspect or ignore.
 */

const SANDBOX_ENDPOINT = 'https://sandbox.api.mailtrap.io/api/send';
const PRODUCTION_ENDPOINT = 'https://send.api.mailtrap.io/api/send';

/** How long to wait for Mailtrap before giving up on a single message. */
const REQUEST_TIMEOUT_MS = 10_000;

export interface SendResult {
  /** True only when the provider accepted the message. */
  ok: boolean;
  /** True when no provider is configured and the message was logged instead. */
  skipped?: boolean;
  error?: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  /** Plain-text alternative. Derived from `html` when omitted. */
  text?: string;
  /** Groups messages in the Mailtrap dashboard. */
  category?: string;
}

/**
 * dotenv keeps inline comments in some configurations, so `true # toggle`
 * can reach us verbatim. Read only the first whitespace-delimited token.
 */
const readEnv = (key: string): string => {
  const raw = process.env[key];
  if (!raw) return '';
  return raw.split('#')[0].trim();
};

const isTruthy = (value: string): boolean => {
  const normalised = value.toLowerCase();
  return normalised === 'true' || normalised === '1' || normalised === 'yes';
};

/**
 * A Mailtrap API token is a compact opaque string. Anything containing a scheme,
 * a slash or whitespace is something else that was pasted into the variable —
 * most often the URL of the token page.
 *
 * Rejecting those matters more than it looks: repeatedly presenting a bad token
 * makes Mailtrap answer `403 Too many failed login attempts` and lock the
 * account out for a while, so a mis-paste turns into an outage that outlasts the
 * fix.
 */
const looksLikeToken = (value: string): boolean =>
  value.length >= 16 && !/[\s/]/.test(value) && !value.includes('://');

/** Pick the first candidate that is plausibly a token, ignoring mis-pastes. */
const firstUsableToken = (...candidates: string[]): string => {
  for (const candidate of candidates) {
    if (candidate && looksLikeToken(candidate)) return candidate;
    if (candidate) {
      console.warn(
        '[mailer] Ignoring a Mailtrap credential that does not look like an API token ' +
          '(it contains a URL, a slash or whitespace). Check MAILTRAP_TOKEN and MAILTRAP_API_KEY.'
      );
    }
  }
  return '';
};

interface MailerConfig {
  endpoint: string;
  token: string;
  fromEmail: string;
  fromName: string;
  sandbox: boolean;
}

/**
 * Resolve configuration on every call rather than at module load, so tests and
 * scripts can adjust the environment without re-importing the module.
 */
const resolveConfig = (): MailerConfig | null => {
  // MAILTRAP_TOKEN is the documented name for the sending API token;
  // MAILTRAP_API_KEY is accepted as an alias because both appear in the wild.
  const token = firstUsableToken(readEnv('MAILTRAP_TOKEN'), readEnv('MAILTRAP_API_KEY'));
  if (!token) return null;

  const sandbox = isTruthy(readEnv('MAILTRAP_USE_SANDBOX'));
  const inboxId = readEnv('MAILTRAP_INBOX_ID');

  // A sandbox send is addressed to a specific inbox; without the id there is
  // nowhere to deliver, so treat it as unconfigured instead of failing later.
  if (sandbox && !inboxId) return null;

  return {
    endpoint: sandbox ? `${SANDBOX_ENDPOINT}/${inboxId}` : PRODUCTION_ENDPOINT,
    token,
    fromEmail: readEnv('MAIL_FROM') || 'no-reply@ppiaauckland.org',
    fromName: readEnv('MAIL_FROM_NAME') || 'PPIA Auckland',
    sandbox,
  };
};

/**
 * Collapse an HTML body into a readable plain-text alternative.
 *
 * Order matters here: whole elements that must not contribute any text are
 * removed first, while their tags still exist to match on. Only then are the
 * remaining block boundaries turned into whitespace and the tags stripped.
 */
const htmlToText = (html: string): string =>
  html
    // Comments first — they wrap the Outlook-only tables, whose markup would
    // otherwise survive into the text.
    .replace(/<!--[\s\S]*?-->/g, '')
    // <style> and <title> content is markup, not message.
    .replace(/<(style|title)[^>]*>[\s\S]*?<\/\1>/gi, '')
    // The hidden preheader is a duplicate of the subject line, and nothing is
    // hidden in a plain-text part.
    .replace(/<div[^>]*mso-hide:all[^>]*>[\s\S]*?<\/div>/gi, '')
    // Keep the destination of links visible in the text part, as "label (url)".
    //
    // A link whose only content is an image — the logo in the header — has no
    // label, and emitting "(https://…)" on its own put a bare URL at the very
    // top of every plain-text body. Those are dropped instead.
    .replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_match, href, inner) => {
      const label = String(inner).replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, ' ').trim();
      if (!label) return '';
      // No point repeating the URL when the label already is the URL.
      return label === href ? label : `${label} (${href})`;
    })
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    // A table cell is a word boundary. The layout is table-based, so without
    // this the labels and values in a details block run together.
    .replace(/<\/\s*t[dh]\s*>/gi, '  ')
    .replace(/<\/\s*(p|div|h[1-6]|li|tr|table)\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&zwnj;/gi, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

let warnedAboutMissingConfig = false;

/**
 * Log the message instead of sending it. Used when Mailtrap is not configured
 * so local development keeps working without credentials.
 *
 * Bodies carry password-reset and verification links, so they are only printed
 * outside production. In production the absence of configuration is a
 * misconfiguration worth shouting about, but the tokens stay out of the log.
 */
const logInsteadOfSending = (options: SendEmailOptions): SendResult => {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!warnedAboutMissingConfig) {
    warnedAboutMissingConfig = true;
    console.warn(
      '[mailer] Mailtrap is not configured (MAILTRAP_TOKEN, and MAILTRAP_INBOX_ID ' +
        'when MAILTRAP_USE_SANDBOX=true). E-mails are being logged, not delivered.'
    );
  }

  if (isProduction) {
    console.error(`[mailer] DROPPED e-mail to ${options.to} — subject: ${options.subject}`);
  } else {
    console.log(`[mailer] (not sent) To: ${options.to} — ${options.subject}`);
    console.log(htmlToText(options.html));
  }

  return { ok: false, skipped: true, error: 'Mail provider not configured' };
};

/**
 * Deliver one message. Resolves to `{ ok: false }` on any failure — inspect the
 * result when the outcome matters, ignore it when best-effort is acceptable.
 */
export const sendEmail = async (options: SendEmailOptions): Promise<SendResult> => {
  const config = resolveConfig();

  if (!config) {
    return logInsteadOfSending(options);
  }

  const payload = {
    from: { email: config.fromEmail, name: config.fromName },
    to: [{ email: options.to }],
    subject: options.subject,
    html: options.html,
    text: options.text ?? htmlToText(options.html),
    ...(options.category ? { category: options.category } : {}),
  };

  try {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Token': config.token,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      // Mailtrap returns { errors: [...] } on rejection. Surface it, but never
      // echo the request body — it contains reset tokens.
      const detail = await response.text().catch(() => '');
      const message = `Mailtrap responded ${response.status}${detail ? `: ${detail.slice(0, 300)}` : ''}`;
      console.error(`[mailer] Failed to send "${options.subject}" to ${options.to} — ${message}`);
      return { ok: false, error: message };
    }

    console.log(
      `[mailer] Sent "${options.subject}" to ${options.to}` +
        (config.sandbox ? ' (Mailtrap sandbox)' : '')
    );
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[mailer] Failed to send "${options.subject}" to ${options.to} — ${message}`);
    return { ok: false, error: message };
  }
};

// ===========================================
// TEMPLATE
// ===========================================

/** Brand palette, matching the website. */
const BRAND = {
  navy: '#0D1B33',
  red: '#E8231A',
  text: '#1E293B',
  muted: '#64748B',
  faintText: '#94A3B8',
  border: '#E2E8F0',
  canvas: '#F1F5F9',
  white: '#FFFFFF',
} as const;

/**
 * Font stack, not a webfont.
 *
 * Outlook on Windows ignores @font-face entirely and Gmail strips it, so a
 * webfont only ever adds weight and an inconsistent result. System fonts render
 * identically everywhere.
 */
const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

const siteUrl = (): string =>
  (process.env.FRONTEND_URL || 'http://localhost:3000').split('#')[0].trim().replace(/\/+$/, '');

/**
 * Absolute URL of the wordmark.
 *
 * E-mail clients fetch images over the public internet, so this has to be a
 * reachable absolute URL — a relative path or a localhost address renders as a
 * broken image. In development that means the logo will not load, which is
 * expected; the layout is built so the alt text carries the header on its own.
 *
 * The white wordmark is used because it sits on the navy header band.
 */
const logoUrl = (): string => `${siteUrl()}/Logo-PPIA-2025-White.png`;

/**
 * Shared chrome for every outgoing message: logo, body, footer.
 *
 * Deliberately built from nested tables with inline styles rather than the divs
 * and flexbox the website uses. The reasons are all client bugs rather than
 * taste:
 *
 *   - Outlook 2007–2019 renders through Word, which ignores `<style>` blocks,
 *     margins on divs, max-width and anything resembling modern layout. Tables
 *     with fixed widths are the only construct it lays out reliably.
 *   - Gmail strips `<head>`, so the `<style>` block here is a progressive
 *     enhancement for mobile only. Everything load-bearing is inline.
 *   - `role="presentation"` keeps screen readers from announcing the layout
 *     tables as data tables.
 *
 * `bodyHtml` is trusted markup composed by this API. Anything user-supplied that
 * reaches it must go through `escapeHtml` at the call site.
 */
export const renderEmailLayout = (bodyHtml: string, options?: { preheader?: string }): string => {
  const site = siteUrl();

  /**
   * Preheader: the grey text a client shows after the subject in the inbox list.
   *
   * Without one, clients grab the first words of the body — usually "Hi Name," —
   * which wastes the most valuable line of an e-mail. The trailing zero-width
   * characters pad it out so no body text bleeds into the preview.
   */
  const preheader = options?.preheader
    ? `<div style="display:none;font-size:1px;color:${BRAND.canvas};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${options.preheader}${'&zwnj;&nbsp;'.repeat(40)}</div>`
    : '';

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="x-apple-disable-message-reformatting" />
  <!-- Tell clients this design is light-only so they do not auto-invert it. -->
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>PPIA Auckland</title>
  <!--[if mso]>
  <style type="text/css">
    /* Word has no system font stack; name a real font or it falls back to Times. */
    body, table, td, p, a, span { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
  <style type="text/css">
    /* Gmail strips this block. Nothing here may be load-bearing. */
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
    img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
    table { border-collapse: collapse !important; }
    a { color: ${BRAND.red}; }

    /* iOS turns dates, addresses and numbers into blue links. Neutralise it. */
    a[x-apple-data-detectors] {
      color: inherit !important; text-decoration: none !important;
      font-size: inherit !important; font-weight: inherit !important;
    }

    @media screen and (max-width: 620px) {
      .email-container { width: 100% !important; }
      .px { padding-left: 20px !important; padding-right: 20px !important; }
      .stack { display: block !important; width: 100% !important; text-align: center !important; }
      .btn a { display: block !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.canvas};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  ${preheader}

  <!-- Outer table paints the background colour across the full viewport, which
       a div cannot do reliably in Outlook. -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:${BRAND.canvas};">
    <tr>
      <td align="center" style="padding:24px 12px;">

        <!--[if mso]>
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600"><tr><td>
        <![endif]-->

        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" class="email-container" style="width:600px;max-width:600px;">

          <!-- Header. Navy band so the white wordmark reads, and it doubles as
               the brand cue when images are blocked (alt text stays legible). -->
          <tr>
            <td align="left" class="px" bgcolor="${BRAND.navy}" style="background-color:${BRAND.navy};padding:24px 32px;border-radius:12px 12px 0 0;">
              <a href="${site}" style="text-decoration:none;">
                <img src="${logoUrl()}" width="150" height="49" alt="PPIA Auckland"
                     style="display:block;width:150px;max-width:150px;height:auto;border:0;color:${BRAND.white};font-family:${FONT_STACK};font-size:18px;font-weight:bold;line-height:49px;" />
              </a>
            </td>
          </tr>

          <!-- A thin accent rule under the header, done with a coloured cell
               rather than a border so Outlook keeps it. -->
          <tr>
            <td height="4" bgcolor="${BRAND.red}" style="background-color:${BRAND.red};height:4px;line-height:4px;font-size:0;">&nbsp;</td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="px" bgcolor="${BRAND.white}" style="background-color:${BRAND.white};padding:32px;font-family:${FONT_STACK};font-size:15px;line-height:24px;color:${BRAND.text};mso-line-height-rule:exactly;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="px" bgcolor="${BRAND.white}" style="background-color:${BRAND.white};padding:20px 32px 28px;border-top:1px solid ${BRAND.border};border-radius:0 0 12px 12px;font-family:${FONT_STACK};">
              <p style="margin:0 0 10px;font-size:13px;line-height:20px;color:${BRAND.text};font-weight:bold;">
                Perhimpunan Pelajar Indonesia Auckland
              </p>
              <p style="margin:0 0 12px;font-size:12px;line-height:20px;color:${BRAND.muted};">
                Indonesian Students' Association in Auckland, New Zealand<br />
                <a href="mailto:ppiauckland@gmail.com" style="color:${BRAND.muted};text-decoration:underline;">ppiauckland@gmail.com</a>
              </p>
              <p style="margin:0 0 12px;font-size:12px;line-height:20px;">
                <a href="${site}" style="color:${BRAND.muted};text-decoration:underline;">Website</a>
                &nbsp;&middot;&nbsp;
                <a href="https://instagram.com/ppiauckland" style="color:${BRAND.muted};text-decoration:underline;">Instagram</a>
                &nbsp;&middot;&nbsp;
                <a href="https://linkedin.com/company/ppiauckland" style="color:${BRAND.muted};text-decoration:underline;">LinkedIn</a>
              </p>
              <p style="margin:0;font-size:11px;line-height:18px;color:${BRAND.faintText};">
                This is an automated message about your PPIA Auckland account, so it has no
                unsubscribe link. Newsletters do.
              </p>
            </td>
          </tr>

          <tr>
            <td height="24" style="height:24px;line-height:24px;font-size:0;">&nbsp;</td>
          </tr>
        </table>

        <!--[if mso]>
        </td></tr></table>
        <![endif]-->

      </td>
    </tr>
  </table>
</body>
</html>`;
};

/**
 * Escape a value before interpolating it into e-mail markup.
 *
 * Names, reasons and other user-supplied strings reach these templates, so
 * without escaping a member could inject markup into mail sent to others.
 */
export const escapeHtml = (value: string | null | undefined): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Primary call-to-action button.
 *
 * Built as a single-cell table rather than a styled `<a>`. Word-based Outlook
 * ignores padding on an inline anchor, which collapsed the previous version into
 * bare underlined text — the most important element in a password-reset e-mail
 * turning into something that does not look clickable.
 *
 * The colour is set with both `bgcolor` and inline `background-color` because
 * older clients honour only one of the two, and the anchor carries its own
 * colour so a client that drops the cell background still shows readable text.
 */
export const renderEmailButton = (href: string, label: string): string =>
  `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:20px 0;">
     <tr>
       <td class="btn" align="center" bgcolor="#E8231A" style="background-color:#E8231A;border-radius:8px;">
         <a href="${href}"
            style="display:inline-block;padding:14px 28px;font-family:${FONT_STACK};font-size:15px;font-weight:bold;line-height:20px;color:#FFFFFF;text-decoration:none;border-radius:8px;">${label}</a>
       </td>
     </tr>
   </table>`;

/**
 * A secondary button in WhatsApp green, for the community invite.
 *
 * Separate from the primary button so a message never shows two competing red
 * calls to action, and so the WhatsApp link carries its own recognisable colour.
 */
export const renderWhatsAppButton = (href: string, label = 'Join the WhatsApp group'): string =>
  `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:16px 0;">
     <tr>
       <td class="btn" align="center" bgcolor="#25D366" style="background-color:#25D366;border-radius:8px;">
         <a href="${href}"
            style="display:inline-block;padding:14px 28px;font-family:${FONT_STACK};font-size:15px;font-weight:bold;line-height:20px;color:#FFFFFF;text-decoration:none;border-radius:8px;">${label}</a>
       </td>
     </tr>
   </table>`;

/**
 * A key/value block, for the details that accompany a confirmation — when an
 * event starts, where it is, a check-in code.
 *
 * A table keeps the labels and values aligned in clients that collapse
 * whitespace, and each row stacks on a narrow screen via the `.stack` class.
 */
export const renderEmailDetails = (rows: [label: string, value: string][]): string => {
  if (rows.length === 0) return '';

  const cells = rows
    .map(
      ([label, value]) => `
       <tr>
         <td class="stack" style="padding:6px 16px 6px 0;font-family:${FONT_STACK};font-size:13px;line-height:20px;color:${BRAND.muted};vertical-align:top;white-space:nowrap;">${label}</td>
         <td class="stack" style="padding:6px 0;font-family:${FONT_STACK};font-size:14px;line-height:20px;font-weight:bold;color:${BRAND.text};">${value}</td>
       </tr>`
    )
    .join('');

  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 20px;background-color:${BRAND.canvas};border-radius:8px;">
     <tr><td style="padding:8px 16px;">
       <table role="presentation" border="0" cellpadding="0" cellspacing="0">${cells}</table>
     </td></tr>
   </table>`;
};

/**
 * The heading that opens a message body.
 *
 * Exists so every template gets the same size, weight and spacing instead of
 * each one hand-rolling an `<h2>` with slightly different inline styles.
 */
export const renderEmailHeading = (text: string): string =>
  `<h1 style="margin:0 0 16px;font-family:${FONT_STACK};font-size:22px;line-height:30px;font-weight:bold;color:${BRAND.navy};">${text}</h1>`;

/**
 * A long URL shown as fallback text under a button.
 *
 * Some corporate clients strip links entirely, so the raw address has to be
 * readable. `word-break` stops it forcing horizontal scroll on a phone.
 */
export const renderEmailFallbackLink = (url: string, intro = 'Or paste this link into your browser:'): string =>
  `<p style="margin:0 0 16px;font-family:${FONT_STACK};font-size:12px;line-height:18px;color:${BRAND.muted};">
     ${intro}<br />
     <span style="word-break:break-all;">${url}</span>
   </p>`;

export default sendEmail;
