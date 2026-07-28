/**
 * Verify that transactional e-mail actually leaves the API.
 *
 *   npm run mail:test -- you@example.com
 *
 * With MAILTRAP_USE_SANDBOX=true the message is captured by the Mailtrap inbox
 * and no real recipient is contacted, so any address works as the argument.
 *
 * Exits non-zero when the provider rejects the message, which makes this usable
 * as a deployment smoke check.
 */
import 'dotenv/config';
import { sendEmail, renderEmailLayout, renderEmailButton } from '../src/lib/mailer';

const readEnv = (key: string): string => (process.env[key] || '').split('#')[0].trim();

const main = async (): Promise<void> => {
  const recipient = process.argv[2] || 'mailer-test@example.com';
  const sandbox = ['true', '1', 'yes'].includes(readEnv('MAILTRAP_USE_SANDBOX').toLowerCase());

  console.log('Mailtrap configuration');
  console.log(`  mode          : ${sandbox ? 'sandbox (captured, not delivered)' : 'production (real delivery)'}`);
  console.log(`  token present : ${Boolean(readEnv('MAILTRAP_TOKEN') || readEnv('MAILTRAP_API_KEY'))}`);
  console.log(`  inbox id      : ${readEnv('MAILTRAP_INBOX_ID') || '(unset)'}`);
  console.log(`  from          : ${readEnv('MAIL_FROM') || 'no-reply@ppiaauckland.org'}`);
  console.log(`  recipient     : ${recipient}`);
  console.log('');

  const result = await sendEmail({
    to: recipient,
    subject: 'PPIA Auckland — mailer test',
    html: renderEmailLayout(
      `<h2 style="margin:0 0 16px;color:#0D1B33;font-size:20px;">Mailer test</h2>
       <p style="margin:0 0 12px;">This message was sent by <code>npm run mail:test</code>.</p>
       <p style="margin:0 0 12px;">Seeing it means password resets, e-mail verification and membership notifications can be delivered.</p>
       ${renderEmailButton('https://ppiaauckland.org', 'Visit the website')}`,
      { preheader: 'Confirming that PPIA Auckland transactional e-mail works.' }
    ),
    category: 'mailer-test',
  });

  if (result.ok) {
    console.log('OK — Mailtrap accepted the message.');
    if (sandbox) console.log('Open the Mailtrap inbox to read it.');
    return;
  }

  if (result.skipped) {
    console.error('NOT CONFIGURED — the message was logged instead of sent.');
    console.error('Set MAILTRAP_TOKEN (and MAILTRAP_INBOX_ID when using the sandbox) in api/.env.');
    process.exitCode = 1;
    return;
  }

  console.error(`FAILED — ${result.error}`);
  console.error('');
  console.error('A 401 means the token is not a Mailtrap sending API token.');
  console.error('Sandbox: Mailtrap > Email Testing > your inbox > Integrations > API.');
  console.error('Production: Mailtrap > Email Sending > Sending Domains > API tokens.');
  process.exitCode = 1;
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
