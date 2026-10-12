import { Request, Response } from 'express';
import prisma from '../lib/prisma';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
    divisionId?: string;
  };
}

const VALID_TYPES = ['INDONESIAN_GOV', 'NZ_GOV', 'UNIVERSITY'] as const;
const VALID_STATUSES = ['DRAFT', 'PENDING_REVIEW', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PUBLISHED'] as const;

function generateSlug(name: string): string {
  return (name || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toStringArray(raw: unknown): string[] {
  if (!raw) return [];
  if (typeof raw === 'string') return raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (!Array.isArray(raw)) return [];
  return raw.map((v) => String(v ?? '').trim()).filter(Boolean);
}

const submitterSelect = {
  select: { id: true, name: true, avatar: true },
} as const;

async function resolveUniqueSlug(base: string, excludeId?: string): Promise<string> {
  const fallback = base || 'scholarship';
  let slug = fallback;
  let attempt = 0;
  for (;;) {
    const existing = await prisma.scholarship.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) return slug;
    attempt += 1;
    slug = attempt === 1 ? `${fallback}-${Date.now().toString(36)}` : `${fallback}-${Date.now().toString(36)}-${attempt}`;
  }
}

// Get all scholarships (public — only published, newest first)
export const getAllScholarships = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '10', search = '', type, featured } = req.query as Record<string, string | undefined>;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 10));
    const skip = (pageNum - 1) * limitNum;

    const where: any = { published: true };

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' as const } },
        { provider: { contains: search as string, mode: 'insensitive' as const } },
      ];
    }

    if (type && (VALID_TYPES as readonly string[]).includes(type)) where.type = type;
    if (featured === 'true') where.featured = true;

    const [scholarships, total] = await Promise.all([
      prisma.scholarship.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: { submittedBy: submitterSelect },
      }),
      prisma.scholarship.count({ where }),
    ]);

    res.json({
      scholarships,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get scholarships error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get a single published scholarship by id (public)
export const getScholarshipById = async (req: Request, res: Response): Promise<void> => {
  try {
    const scholarship = await prisma.scholarship.findFirst({
      where: { id: (req.params as { id: string }).id, published: true },
      include: { submittedBy: submitterSelect },
    });
    if (!scholarship) {
      res.status(404).json({ error: 'Scholarship not found' });
      return;
    }
    res.json({ scholarship });
  } catch (error) {
    console.error('Get scholarship error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get a single published scholarship by slug (public)
export const getScholarshipBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const scholarship = await prisma.scholarship.findFirst({
      where: { slug: (req.params as { slug: string }).slug, published: true },
      include: { submittedBy: submitterSelect },
    });
    if (!scholarship) {
      res.status(404).json({ error: 'Scholarship not found' });
      return;
    }
    res.json({ scholarship });
  } catch (error) {
    console.error('Get scholarship error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all scholarships including drafts (board / super admin)
export const getAllScholarshipsAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '10', search = '', type, status, published } =
      req.query as Record<string, string | undefined>;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(1000, Math.max(1, parseInt(limit as string) || 10));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' as const } },
        { provider: { contains: search as string, mode: 'insensitive' as const } },
      ];
    }
    if (type && (VALID_TYPES as readonly string[]).includes(type)) where.type = type;
    if (status && (VALID_STATUSES as readonly string[]).includes(status)) where.status = status;
    if (published === 'true') where.published = true;
    if (published === 'false') where.published = false;

    const [scholarships, total] = await Promise.all([
      prisma.scholarship.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { updatedAt: 'desc' },
        include: { submittedBy: submitterSelect },
      }),
      prisma.scholarship.count({ where }),
    ]);

    res.json({
      scholarships,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get scholarships admin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get any single scholarship by id (board / super admin — drafts included)
export const getScholarshipByIdAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const scholarship = await prisma.scholarship.findUnique({
      where: { id: (req.params as { id: string }).id },
      include: { submittedBy: submitterSelect },
    });
    if (!scholarship) {
      res.status(404).json({ error: 'Scholarship not found' });
      return;
    }
    res.json({ scholarship });
  } catch (error) {
    console.error('Get scholarship admin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Create a scholarship (SUPER_ADMIN / BOARD only — enforced by the route).
 * Entries can go live immediately (`published: true`) or stay as drafts.
 */
export const createScholarship = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const {
      name,
      provider,
      type,
      color,
      level,
      coverage,
      amount,
      deadline,
      deadlineDate,
      url,
      desc,
      slug: customSlug,
      featured,
      status,
      published,
    } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'Scholarship name is required' });
      return;
    }
    if (type !== undefined && !(VALID_TYPES as readonly string[]).includes(type)) {
      res.status(400).json({ error: 'Invalid scholarship type' });
      return;
    }
    if (url !== undefined && url !== '' && typeof url === 'string') {
      try {
        const parsed = new URL(url);
        if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) throw new Error('bad protocol');
      } catch {
        res.status(400).json({ error: 'Official link must be a valid URL' });
        return;
      }
    }

    const slug = await resolveUniqueSlug(generateSlug(typeof customSlug === 'string' && customSlug ? customSlug : name));

    let parsedDeadline: Date | null = null;
    if (deadlineDate) {
      const d = new Date(deadlineDate);
      if (Number.isNaN(d.getTime())) {
        res.status(400).json({ error: 'Invalid deadline date' });
        return;
      }
      parsedDeadline = d;
    }

    const scholarship = await prisma.scholarship.create({
      data: {
        slug,
        name: name.trim(),
        provider: typeof provider === 'string' ? provider.trim() : '',
        type: type ?? 'UNIVERSITY',
        color: typeof color === 'string' && color ? color : '#3B82F6',
        level: toStringArray(level),
        coverage: toStringArray(coverage),
        amount: typeof amount === 'string' ? amount : '',
        deadline: typeof deadline === 'string' ? deadline : '',
        deadlineDate: parsedDeadline,
        url: typeof url === 'string' ? url : '',
        desc: typeof desc === 'string' ? desc : '',
        featured: !!featured,
        status: status && (VALID_STATUSES as readonly string[]).includes(status) ? status : 'DRAFT',
        published: !!published,
        submittedById: userId,
      },
      include: { submittedBy: submitterSelect },
    });

    res.status(201).json({ scholarship });
  } catch (error) {
    console.error('Create scholarship error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update a scholarship (SUPER_ADMIN / BOARD only — enforced by the route).
 * Setting status PUBLISHED publishes immediately; REJECTED hides the row.
 * Reviewer + timestamp are stamped on every stage change.
 */
export const updateScholarship = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params as { id: string };
    const existing = await prisma.scholarship.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Scholarship not found' });
      return;
    }

    const {
      name,
      provider,
      type,
      color,
      level,
      coverage,
      amount,
      deadline,
      deadlineDate,
      url,
      desc,
      slug: customSlug,
      featured,
      status,
      published,
      reviewComments,
    } = req.body;

    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      res.status(400).json({ error: 'Scholarship name is required' });
      return;
    }
    if (type !== undefined && !(VALID_TYPES as readonly string[]).includes(type)) {
      res.status(400).json({ error: 'Invalid scholarship type' });
      return;
    }
    if (status !== undefined && !(VALID_STATUSES as readonly string[]).includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }
    if (url !== undefined && url !== '' && typeof url === 'string') {
      try {
        const parsed = new URL(url);
        if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) throw new Error('bad protocol');
      } catch {
        res.status(400).json({ error: 'Official link must be a valid URL' });
        return;
      }
    }

    const data: any = {};
    if (name !== undefined) data.name = name.trim();
    if (provider !== undefined) data.provider = typeof provider === 'string' ? provider.trim() : '';
    if (type !== undefined) data.type = type;
    if (color !== undefined) data.color = color || '#3B82F6';
    if (level !== undefined) data.level = toStringArray(level);
    if (coverage !== undefined) data.coverage = toStringArray(coverage);
    if (amount !== undefined) data.amount = typeof amount === 'string' ? amount : '';
    if (deadline !== undefined) data.deadline = typeof deadline === 'string' ? deadline : '';
    if (deadlineDate !== undefined) {
      if (deadlineDate === null || deadlineDate === '') {
        data.deadlineDate = null;
      } else {
        const d = new Date(deadlineDate);
        if (Number.isNaN(d.getTime())) {
          res.status(400).json({ error: 'Invalid deadline date' });
          return;
        }
        data.deadlineDate = d;
      }
    }
    if (url !== undefined) data.url = typeof url === 'string' ? url : '';
    if (desc !== undefined) data.desc = typeof desc === 'string' ? desc : '';
    if (customSlug !== undefined && typeof customSlug === 'string' && customSlug) {
      data.slug = await resolveUniqueSlug(generateSlug(customSlug), existing.id);
    }

    if (featured !== undefined) data.featured = !!featured;
    if (published !== undefined) data.published = !!published;
    if (status !== undefined) {
      data.status = status;
      // The stage is the single source of truth for visibility: PUBLISHED is
      // public, every other stage hides the row. This keeps the board form
      // (one Published switch) and the API from ever disagreeing.
      data.published = status === 'PUBLISHED';
      data.reviewedBy = userId;
      data.reviewedAt = new Date();
    }
    if (reviewComments !== undefined) {
      data.reviewComments = typeof reviewComments === 'string' ? reviewComments : null;
      if (reviewComments && !data.reviewedAt) {
        data.reviewedBy = userId;
        data.reviewedAt = new Date();
      }
    }

    const scholarship = await prisma.scholarship.update({
      where: { id: existing.id },
      data,
      include: { submittedBy: submitterSelect },
    });

    res.json({ scholarship });
  } catch (error) {
    console.error('Update scholarship error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a scholarship (SUPER_ADMIN / BOARD only — enforced by the route).
export const deleteScholarship = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    const existing = await prisma.scholarship.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Scholarship not found' });
      return;
    }

    await prisma.scholarship.delete({ where: { id: existing.id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete scholarship error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
