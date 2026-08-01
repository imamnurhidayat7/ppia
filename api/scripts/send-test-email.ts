/**
 * Verify that transactional e-mail actually leaves the API.
 *
 *   npm run mail:test -- you@example.com
 *
 * With RESEND_API_KEY set, Resend accepts the message; whether it reaches the
 * inbox depends on the recipient address (use your own while onboarding) and
 * on the `from` address being a verified Resend sender. The script does not
 * check delivery — only that the provider accepted the request.
 *
 * Exits non-zero when the provider rejects the message, which makes this
 * usable as a deployment smoke check.
 */
import 'dotenv/config';
import { sendEmail, renderEmailLayout, renderEmailButton } from '../src/lib/mailer';

const readEnv = (key: string): string => (process.env[key] || '').split('#')[0].trim();

const main = async (): Promise<void> => {
  const recipient = process.argv[2] || 'mailer-test@example.com';

  console.log('Resend configuration');
  console.log(`  api key present : ${Boolean(readEnv('RESEND_API_KEY'))}`);
  console.log(`  from            : ${readEnv('MAIL_FROM') || 'onboarding@resend.dev'}`);
  console.log(`  from name       : ${readEnv('MAIL_FROM_NAME') || 'PPIA Auckland'}`);
  console.log(`  recipient       : ${recipient}`);
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
    console.log('OK — Resend accepted the message.');
    return;
  }

  if (result.skipped) {
    console.error('NOT CONFIGURED — the message was logged instead of sent.');
    console.error('Set RESEND_API_KEY in api/.env.');
    process.exitCode = 1;
    return;
  }

  console.error(`FAILED — ${result.error}`);
  console.error('');
  console.error('A 401 means the API key is wrong or revoked.');
  console.error('A 422 usually means MAIL_FROM is on a domain that has not been');
  console.error('verified in Resend. Check Domains in the Resend dashboard.');
  process.exitCode = 1;
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
