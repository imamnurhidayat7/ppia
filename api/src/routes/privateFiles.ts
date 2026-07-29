import { Router, type Request, type Response } from 'express';
import fs from 'fs';
import {
  STORAGE_DRIVER,
  isSafeObjectKey,
  localPrivatePath,
  verifyLocalSignature,
} from '../lib/storage';

const router = Router();

/**
 * Read a private object through a short-lived signed link (local driver only).
 *
 * Supabase serves its own signed URLs, so this route exists purely so the local
 * driver can offer the same contract: `createPrivateSignedUrl` hands out a link
 * that works for a couple of minutes and then stops.
 *
 * Authorisation lives in the signature, not in a session: the link is minted by
 * `GET /api/members/:id/document`, which is already admin-gated. That is what
 * lets the browser open the PDF directly in a viewer.
 */
router.get('/*key', (req: Request, res: Response) => {
  if (STORAGE_DRIVER !== 'local') {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const raw = (req.params as Record<string, string | string[]>).key;
  const key = Array.isArray(raw) ? raw.join('/') : String(raw ?? '');
  const { exp, sig } = req.query as Record<string, string | undefined>;

  if (!isSafeObjectKey(key)) {
    res.status(400).json({ error: 'Invalid file reference' });
    return;
  }

  if (!verifyLocalSignature(key, Number(exp), sig ?? '')) {
    res.status(403).json({ error: 'This link is not valid or has expired' });
    return;
  }

  const filePath = localPrivatePath(key);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  // Personal documents must never be cached by a shared cache, and must not be
  // sniffed into something executable.
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (key.toLowerCase().endsWith('.pdf')) res.type('application/pdf');

  res.sendFile(filePath, (error) => {
    if (error && !res.headersSent) {
      res.status(500).json({ error: 'Could not read the file' });
    }
  });
});

export default router;
