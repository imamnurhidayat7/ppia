import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Field type allowlist. Stored as a string in the DB so adding a new type
 * never requires a migration — the controller validates the value against
 * this set instead.
 */
const ALLOWED_TYPES = new Set([
  'FIELD_TEXT',
  'FIELD_RICHTEXT',
  'FIELD_NUMBER',
  'FIELD_SINGLE_CHOICE',
  'FIELD_MULTIPLE_CHOICE',
  'FIELD_IMAGE',
  'FIELD_VIDEO_LINK',
]);

const CHOICE_TYPES = new Set([
  'FIELD_SINGLE_CHOICE',
  'FIELD_MULTIPLE_CHOICE',
]);

const IMAGE_TYPE = 'FIELD_IMAGE';

function normalizeOptions(options: unknown): string[] | null {
  if (!Array.isArray(options)) return null;
  const cleaned = options
    .map((o) => (typeof o === 'string' ? o.trim() : String(o)))
    .filter((s) => s.length > 0);
  if (cleaned.length === 0) return null;
  // Deduplicate while preserving order.
  return Array.from(new Set(cleaned));
}

function normalizeAcceptedTypes(accepted: unknown): string[] | null {
  if (!Array.isArray(accepted)) return null;
  const cleaned = accepted
    .map((a) => (typeof a === 'string' ? a.toLowerCase().replace(/^\./, '').trim() : ''))
    .filter((s) => /^[a-z0-9]+$/.test(s));
  if (cleaned.length === 0) return null;
  return Array.from(new Set(cleaned));
}

// GET /api/elections/:id/form-fields
export const getFormFields = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const fields = await prisma.electionFormField.findMany({
      where: { electionId: id },
      orderBy: { order: 'asc' },
    });
    res.json({ fields });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch form fields' });
  }
};

// POST /api/elections/:id/form-fields
export const createFormField = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { type, label, description, options, required, maxFileSize, acceptedTypes } = req.body ?? {};

    if (!type || !ALLOWED_TYPES.has(type)) {
      return res.status(400).json({ error: 'Invalid field type' });
    }
    if (!label || typeof label !== 'string' || label.trim().length === 0) {
      return res.status(400).json({ error: 'Label is required' });
    }

    // Choice fields MUST carry options.
    let normalizedOptions: string[] | null = null;
    if (CHOICE_TYPES.has(type)) {
      normalizedOptions = normalizeOptions(options);
      if (!normalizedOptions) {
        return res.status(400).json({ error: 'Choice fields require at least one non-empty option' });
      }
    }

    // Image-only: optional maxFileSize + acceptedTypes.
    let normalizedAccepted: string[] | null = null;
    let normalizedMax: number | null = null;
    if (type === IMAGE_TYPE) {
      if (maxFileSize !== undefined && maxFileSize !== null) {
        const n = Number(maxFileSize);
        if (!Number.isFinite(n) || n <= 0 || n > 10) {
          return res.status(400).json({ error: 'maxFileSize must be between 1 and 10 MB' });
        }
        normalizedMax = Math.floor(n);
      }
      if (acceptedTypes !== undefined && acceptedTypes !== null) {
        normalizedAccepted = normalizeAcceptedTypes(acceptedTypes);
        if (!normalizedAccepted) {
          return res.status(400).json({ error: 'acceptedTypes must be a non-empty array of extensions' });
        }
      }
    }

    // Append at the end by default.
    const last = await prisma.electionFormField.findFirst({
      where: { electionId: id },
      orderBy: { order: 'desc' },
    });
    const nextOrder = (last?.order ?? -1) + 1;

    const field = await prisma.electionFormField.create({
      data: {
        electionId: id,
        type,
        label: label.trim(),
        description: description?.trim() || null,
        options: normalizedOptions ?? undefined,
        required: Boolean(required),
        maxFileSize: normalizedMax,
        acceptedTypes: normalizedAccepted ?? undefined,
        order: nextOrder,
      },
    });
    res.status(201).json({ field });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create form field' });
  }
};

// PATCH /api/form-fields/:fieldId
export const updateFormField = async (req: Request, res: Response) => {
  try {
    const { fieldId } = req.params as { fieldId: string };
    const { type, label, description, options, required, maxFileSize, acceptedTypes } = req.body ?? {};

    const existing = await prisma.electionFormField.findUnique({ where: { id: fieldId } });
    if (!existing) return res.status(404).json({ error: 'Field not found' });

    const effectiveType = type ?? existing.type;
    if (type !== undefined && !ALLOWED_TYPES.has(type)) {
      return res.status(400).json({ error: 'Invalid field type' });
    }

    const data: Record<string, unknown> = {};
    if (label !== undefined) {
      if (typeof label !== 'string' || label.trim().length === 0) {
        return res.status(400).json({ error: 'Label is required' });
      }
      data.label = label.trim();
    }
    if (description !== undefined) data.description = description?.trim() || null;
    if (required !== undefined) data.required = Boolean(required);

    if (CHOICE_TYPES.has(effectiveType)) {
      const normalized = normalizeOptions(options ?? existing.options);
      if (!normalized) {
        return res.status(400).json({ error: 'Choice fields require at least one non-empty option' });
      }
      data.options = normalized;
    } else {
      // Non-choice fields don't store options.
      data.options = undefined;
    }

    if (effectiveType === IMAGE_TYPE) {
      if (maxFileSize !== undefined && maxFileSize !== null) {
        const n = Number(maxFileSize);
        if (!Number.isFinite(n) || n <= 0 || n > 10) {
          return res.status(400).json({ error: 'maxFileSize must be between 1 and 10 MB' });
        }
        data.maxFileSize = Math.floor(n);
      }
      if (acceptedTypes !== undefined && acceptedTypes !== null) {
        const normalized = normalizeAcceptedTypes(acceptedTypes);
        if (!normalized) {
          return res.status(400).json({ error: 'acceptedTypes must be a non-empty array of extensions' });
        }
        data.acceptedTypes = normalized;
      }
    } else {
      data.maxFileSize = undefined;
      data.acceptedTypes = undefined;
    }

    const field = await prisma.electionFormField.update({
      where: { id: fieldId },
      data,
    });
    res.json({ field });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update form field' });
  }
};

// DELETE /api/form-fields/:fieldId
export const deleteFormField = async (req: Request, res: Response) => {
  try {
    const { fieldId } = req.params as { fieldId: string };
    await prisma.electionFormField.delete({ where: { id: fieldId } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete form field' });
  }
};

// POST /api/elections/:id/form-fields/reorder
// Body: { order: [fieldId, fieldId, ...] } in the new order.
export const reorderFormFields = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { order } = req.body ?? {};
    if (!Array.isArray(order) || order.length === 0) {
      return res.status(400).json({ error: 'order must be a non-empty array of field IDs' });
    }

    // Verify all the IDs belong to this election to prevent cross-election writes.
    const owned = await prisma.electionFormField.findMany({
      where: { electionId: id },
      select: { id: true },
    });
    const ownedSet = new Set(owned.map((f) => f.id));
    for (const fid of order) {
      if (!ownedSet.has(fid)) {
        return res.status(400).json({ error: 'One or more field IDs do not belong to this election' });
      }
    }

    await prisma.$transaction(
      order.map((fieldId: string, index: number) =>
        prisma.electionFormField.update({
          where: { id: fieldId },
          data: { order: index },
        }),
      ),
    );

    const fields = await prisma.electionFormField.findMany({
      where: { electionId: id },
      orderBy: { order: 'asc' },
    });
    res.json({ fields });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to reorder form fields' });
  }
};
