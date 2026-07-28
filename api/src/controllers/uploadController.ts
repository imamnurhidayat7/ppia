import { Request, Response } from 'express';
import multer from 'multer';
import {
  uploadPublicObject,
  uploadPrivateObject,
  isStorageConfigured,
} from '../lib/storage';

/**
 * Upload validation.
 *
 * `file.mimetype` is just the multipart part header — client-supplied and no
 * proof of the actual bytes. So the declared MIME must be in an allowlist, the
 * stored extension is derived from that allowlist (never from the client-named
 * file), and the leading bytes are checked against the format signature before
 * the file is accepted. Files are held in memory and streamed to Supabase
 * Storage; nothing is written to the local disk.
 */
interface FileType {
  /** The extension the file will be stored with. */
  ext: string;
  /** Does the start of the file match this format's signature? */
  matches: (head: Buffer) => boolean;
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const IMAGE_TYPES: Record<string, FileType> = {
  'image/jpeg': {
    ext: '.jpg',
    matches: (h) => h[0] === 0xff && h[1] === 0xd8 && h[2] === 0xff,
  },
  'image/png': {
    ext: '.png',
    matches: (h) => h.subarray(0, 8).equals(PNG_SIGNATURE),
  },
  'image/gif': {
    ext: '.gif',
    matches: (h) => {
      const tag = h.subarray(0, 6).toString('latin1');
      return tag === 'GIF87a' || tag === 'GIF89a';
    },
  },
  'image/webp': {
    ext: '.webp',
    // RIFF container with a WEBP form type at offset 8.
    matches: (h) =>
      h.subarray(0, 4).toString('latin1') === 'RIFF' &&
      h.subarray(8, 12).toString('latin1') === 'WEBP',
  },
};

const DOCUMENT_TYPES: Record<string, FileType> = {
  'application/pdf': {
    ext: '.pdf',
    matches: (h) => h.subarray(0, 5).toString('latin1') === '%PDF-',
  },
};

/** Longest signature we inspect sits at offset 12, so 16 bytes is plenty. */
const HEAD_BYTES = 16;

function makeFilter(types: Record<string, FileType>, message: string) {
  return (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (types[file.mimetype]) {
      cb(null, true);
      return;
    }
    cb(new Error(message));
  };
}

/**
 * Validate the in-memory upload against its declared type. Returns null when
 * acceptable, or an error message. Also returns the resolved extension so the
 * caller can build a safe object key.
 */
function verifyUpload(
  file: Express.Multer.File,
  types: Record<string, FileType>
): { error: string } | { ext: string } {
  const type = types[file.mimetype];
  if (!type) return { error: 'Unsupported file type' };
  const head = file.buffer.subarray(0, HEAD_BYTES);
  if (!type.matches(head)) return { error: 'File contents do not match its declared type' };
  return { ext: type.ext };
}

function uniqueName(ext: string): string {
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
}

// Both endpoints hold the file in memory so the buffer can be signature-checked
// and streamed straight to Supabase Storage.
export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: makeFilter(IMAGE_TYPES, 'Only image files (JPEG, PNG, GIF, WebP) are allowed'),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});

export const uploadDocument = multer({
  storage: multer.memoryStorage(),
  fileFilter: makeFilter(DOCUMENT_TYPES, 'Only PDF files are allowed'),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
});

/** Image upload → public bucket. Returns a public URL. */
export const uploadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const check = verifyUpload(req.file, IMAGE_TYPES);
    if ('error' in check) {
      res.status(400).json({ error: check.error });
      return;
    }

    if (!isStorageConfigured()) {
      console.error('Upload rejected: Supabase Storage env vars are not set.');
      res.status(500).json({ error: 'File storage is not configured on the server' });
      return;
    }

    const objectName = uniqueName(check.ext);
    const publicUrl = await uploadPublicObject(objectName, req.file.buffer, req.file.mimetype);

    res.json({
      url: publicUrl,
      filename: objectName,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
};

/**
 * Document upload (PDF proof of studentship) → PRIVATE bucket.
 *
 * These are personal documents, so they must not be publicly readable. The
 * response returns the object KEY (not a URL); an authorised admin later
 * exchanges it for a short-lived signed URL to view the file.
 */
export const uploadDocumentFile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const check = verifyUpload(req.file, DOCUMENT_TYPES);
    if ('error' in check) {
      res.status(400).json({ error: check.error });
      return;
    }

    if (!isStorageConfigured()) {
      console.error('Document upload rejected: Supabase Storage env vars are not set.');
      res.status(500).json({ error: 'File storage is not configured on the server' });
      return;
    }

    const objectKey = `loa-coe/${uniqueName(check.ext)}`;
    const key = await uploadPrivateObject(objectKey, req.file.buffer, req.file.mimetype);

    res.json({
      url: key,
      filename: objectKey,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
};
