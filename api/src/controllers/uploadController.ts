import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { uploadPublicObject, isStorageConfigured } from '../lib/storage';

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Upload validation.
 *
 * Two separate problems existed here:
 *
 * 1. The stored filename took its extension from `file.originalname`, which the
 *    client controls completely. A request declaring `Content-Type: image/png`
 *    while naming the file `payload.html` passed the MIME filter and was written
 *    as `<random>.html` into a directory served as static files — stored HTML,
 *    and therefore stored XSS, on the API's own origin.
 *
 * 2. `file.mimetype` is just the multipart part header. It is client-supplied
 *    and says nothing about the bytes that follow.
 *
 * The fix has three layers:
 *
 *   · The extension is *derived* from the allowlisted MIME type rather than read
 *     from the filename, so the client cannot influence it at all.
 *   · The declared MIME must be in the allowlist for the endpoint.
 *   · After the file is written, its leading bytes are checked against the
 *     signature for that type, and the file is deleted if they do not match.
 *
 * Magic-byte checking is what actually establishes the file type; the first two
 * layers just keep obvious junk from ever being written.
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

function makeStorage(types: Record<string, FileType>) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
      // `fileFilter` runs before this and rejects anything not in `types`, so
      // the lookup is guaranteed to hit. The extension comes from our map — the
      // original filename is never used to build the stored name.
      const type = types[file.mimetype];
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${type.ext}`);
    },
  });
}

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
 * Confirm the written file really is what it claimed, and remove it if not.
 * Returns null when the file is acceptable, or an error message.
 */
function verifySignature(
  file: Express.Multer.File,
  types: Record<string, FileType>
): string | null {
  const type = types[file.mimetype];
  if (!type) return 'Unsupported file type';

  let head: Buffer;
  try {
    const handle = fs.openSync(file.path, 'r');
    try {
      head = Buffer.alloc(HEAD_BYTES);
      fs.readSync(handle, head, 0, HEAD_BYTES, 0);
    } finally {
      fs.closeSync(handle);
    }
  } catch {
    return 'Could not read the uploaded file';
  }

  if (type.matches(head)) return null;
  return 'File contents do not match its declared type';
}

function discard(filePath: string) {
  try {
    fs.unlinkSync(filePath);
  } catch {
    // Already gone, or not ours to remove — nothing useful to do here.
  }
}

// Images are held in memory so the buffer can be signature-checked and streamed
// straight to Supabase Storage — nothing touches the local disk.
export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: makeFilter(IMAGE_TYPES, 'Only image files (JPEG, PNG, GIF, WebP) are allowed'),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});

export const uploadDocument = multer({
  storage: makeStorage(DOCUMENT_TYPES),
  fileFilter: makeFilter(DOCUMENT_TYPES, 'Only PDF files are allowed'),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
});

function respond(req: Request, res: Response, types: Record<string, FileType>): void {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  const problem = verifySignature(req.file, types);
  if (problem) {
    discard(req.file.path);
    res.status(400).json({ error: problem });
    return;
  }

  res.json({
    url: `/uploads/${req.file.filename}`,
    filename: req.file.filename,
    mimetype: req.file.mimetype,
    size: req.file.size,
  });
}

export const uploadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const type = IMAGE_TYPES[req.file.mimetype];
    if (!type) {
      res.status(400).json({ error: 'Unsupported file type' });
      return;
    }

    // Same magic-byte check as before, now against the in-memory buffer: the
    // declared MIME must actually match the leading bytes.
    const head = req.file.buffer.subarray(0, HEAD_BYTES);
    if (!type.matches(head)) {
      res.status(400).json({ error: 'File contents do not match its declared type' });
      return;
    }

    if (!isStorageConfigured()) {
      console.error('Upload rejected: Supabase Storage env vars are not set.');
      res.status(500).json({ error: 'File storage is not configured on the server' });
      return;
    }

    const objectName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${type.ext}`;
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

// Document upload handler (PDF for registration proof of studentship)
export const uploadDocumentFile = async (req: Request, res: Response): Promise<void> => {
  try {
    respond(req, res, DOCUMENT_TYPES);
  } catch (error) {
    console.error('Document upload error:', error);
    if (req.file) discard(req.file.path);
    res.status(500).json({ error: 'Failed to upload document' });
  }
};
