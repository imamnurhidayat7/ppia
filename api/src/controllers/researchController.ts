import { Request, Response } from 'express';
import prisma from '../lib/prisma';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
    divisionId?: string;
  };
}

// Get all research (public - only published)
export const getAllResearch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '10', search = '', type, status, divisionId } = req.query as Record<string, string | undefined>;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { published: true };

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' as const } },
        { abstract: { contains: search as string, mode: 'insensitive' as const } },
        { keywords: { contains: search as string, mode: 'insensitive' as const } }
      ];
    }

    if (type) where.researchType = type;
    if (status) where.researchStatus = status;
    if (divisionId) where.divisionId = divisionId;

    const [researches, total] = await Promise.all([
      prisma.research.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          mainAuthor: {
            select: { id: true, name: true, avatar: true }
          },
          Division: {
            select: { id: true, name: true, slug: true, color: true }
          }
        }
      }),
      prisma.research.count({ where })
    ]);

    res.json({
      researches,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get research error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get all research including drafts (admin).
 *
 * The public list hard-filters `published: true`, so the admin research screen
 * could never see drafts or items still under review — the "Draf" and "Menunggu
 * tinjauan" counters were always zero.
 */
export const getAllResearchAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '10', search = '', type, status, divisionId, published } =
      req.query as Record<string, string | undefined>;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (published === 'true') where.published = true;
    if (published === 'false') where.published = false;
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' as const } },
        { abstract: { contains: search as string, mode: 'insensitive' as const } },
        { keywords: { contains: search as string, mode: 'insensitive' as const } }
      ];
    }
    if (type) where.researchType = type;
    if (status) where.researchStatus = status;
    if (divisionId) where.divisionId = divisionId;

    const [researches, total] = await Promise.all([
      prisma.research.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          mainAuthor: { select: { id: true, name: true, avatar: true } },
          Division: { select: { id: true, name: true, slug: true, color: true } }
        }
      }),
      prisma.research.count({ where })
    ]);

    res.json({
      researches,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get admin research error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get a single research record regardless of publish state (admin).
 *
 * Unlike the public handler this does not bump `viewCount`, so admins reviewing
 * a draft do not inflate its statistics.
 */
export const getResearchByIdAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    const research = await prisma.research.findUnique({
      where: { id },
      include: {
        mainAuthor: { select: { id: true, name: true, avatar: true } },
        Division: { select: { id: true, name: true, slug: true, color: true } },
        tags: { select: { id: true, name: true, slug: true, color: true } }
      }
    });

    if (!research) {
      res.status(404).json({ error: 'Research not found' });
      return;
    }

    res.json({ research });
  } catch (error) {
    console.error('Get admin research by id error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get single research (public)
export const getResearchById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    const research = await prisma.research.findUnique({
      where: { id },
      include: {
        mainAuthor: {
          select: { id: true, name: true, avatar: true }
        },
        Division: {
          select: { id: true, name: true, slug: true, color: true }
        },
        tags: {
          select: { id: true, name: true, slug: true, color: true }
        }
      }
    });

    if (!research || !research.published) {
      res.status(404).json({ error: 'Research not found' });
      return;
    }

    // Increment view count
    await prisma.research.update({
      where: { id },
      data: { viewCount: { increment: 1 } }
    });

    res.json({ research });
  } catch (error) {
    console.error('Get research error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get research by slug (public)
export const getResearchBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params as { slug: string };

    const research = await prisma.research.findUnique({
      where: { slug },
      include: {
        mainAuthor: {
          select: { id: true, name: true, avatar: true }
        },
        Division: {
          select: { id: true, name: true, slug: true, color: true }
        },
        tags: {
          select: { id: true, name: true, slug: true, color: true }
        }
      }
    });

    if (!research || !research.published) {
      res.status(404).json({ error: 'Research not found' });
      return;
    }

    // Increment view count
    await prisma.research.update({
      where: { id: research.id },
      data: { viewCount: { increment: 1 } }
    });

    res.json({ research });
  } catch (error) {
    console.error('Get research by slug error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create research (admin only)
export const createResearch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const {
      title,
      titleIndonesian,
      slug: customSlug,
      abstract,
      abstractIndonesian,
      researchType,
      researchStatus,
      authors,
      publicationDate,
      venue,
      doi,
      url,
      keywords,
      citationFormat,
      pdfUrl,
      divisionId,
      published,
      imageUrl,
      metaTitle,
      metaDescription,
      metaKeywords,
      scheduledPublishAt,
      tags: tagIds
    } = req.body;

    const slug = customSlug || generateSlug(title);

    // Ensure unique slug by appending suffix if exists
    let resolvedSlug: string;
    const existingSlug = await prisma.research.findUnique({ where: { slug } });
    if (existingSlug) {
      const timestamp = Date.now().toString(36);
      const finalSlug = `${slug}-${timestamp}`;
      console.log(`Slug "${slug}" exists, using "${finalSlug}" instead`);
      // Use the new slug instead
      resolvedSlug = finalSlug;
    } else {
      resolvedSlug = slug;
    }

    const research = await prisma.research.create({
      data: {
        title,
        titleIndonesian,
        slug: resolvedSlug,
        abstract,
        abstractIndonesian,
        researchType,
        researchStatus: researchStatus || 'DRAFT',
        authors: typeof authors === 'string' ? authors : JSON.stringify(authors),
        publicationDate: publicationDate ? new Date(publicationDate) : null,
        venue,
        doi,
        url,
        keywords,
        citationFormat,
        pdfUrl,
        imageUrl,
        divisionId,
        published: published || false,
        metaTitle,
        metaDescription,
        metaKeywords,
        scheduledPublishAt: scheduledPublishAt ? new Date(scheduledPublishAt) : null,
        mainAuthorId: userId,
        tags: tagIds && Array.isArray(tagIds) ? {
          connect: tagIds.map((id: string) => ({ id }))
        } : undefined
      },
      include: {
        tags: { select: { id: true, name: true, slug: true, color: true } },
        Division: { select: { id: true, name: true, color: true } },
        mainAuthor: { select: { id: true, name: true, avatar: true } }
      }
    });

    res.status(201).json({ research });
  } catch (error: any) {
    console.error('Create research error:', error?.message);
    console.error('Stack:', error?.stack);
    console.error('Body:', JSON.stringify(req.body));
    res.status(500).json({ error: error?.message || 'Internal server error' });
  }
};

// Update research (admin only)
export const updateResearch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params as { id: string };
    const {
      title,
      titleIndonesian,
      abstract,
      abstractIndonesian,
      researchType,
      researchStatus,
      authors,
      publicationDate,
      venue,
      doi,
      url,
      keywords,
      citationFormat,
      pdfUrl,
      imageUrl,
      divisionId,
      published,
      featuredOrder,
      metaTitle,
      metaDescription,
      metaKeywords,
      scheduledPublishAt,
      tags: tagIds
    } = req.body;

    const updateData: any = {};
    if (title) updateData.title = title;
    if (titleIndonesian !== undefined) updateData.titleIndonesian = titleIndonesian;
    if (abstract) updateData.abstract = abstract;
    if (abstractIndonesian !== undefined) updateData.abstractIndonesian = abstractIndonesian;
    if (researchType) updateData.researchType = researchType;
    if (researchStatus) updateData.researchStatus = researchStatus;
    if (authors) updateData.authors = typeof authors === 'string' ? authors : JSON.stringify(authors);
    if (publicationDate) updateData.publicationDate = new Date(publicationDate);
    if (venue !== undefined) updateData.venue = venue;
    if (doi !== undefined) updateData.doi = doi;
    if (url !== undefined) updateData.url = url;
    if (keywords !== undefined) updateData.keywords = keywords;
    if (citationFormat !== undefined) updateData.citationFormat = citationFormat;
    if (pdfUrl !== undefined) updateData.pdfUrl = pdfUrl;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (divisionId !== undefined) updateData.divisionId = divisionId;
    if (published !== undefined) updateData.published = published;
    if (featuredOrder !== undefined) updateData.featuredOrder = featuredOrder;
    if (metaTitle !== undefined) updateData.metaTitle = metaTitle;
    if (metaDescription !== undefined) updateData.metaDescription = metaDescription;
    if (metaKeywords !== undefined) updateData.metaKeywords = metaKeywords;
    if (scheduledPublishAt !== undefined) updateData.scheduledPublishAt = scheduledPublishAt ? new Date(scheduledPublishAt) : null;

    // Handle tags update
    if (Array.isArray(tagIds)) {
      updateData.tags = {
        set: tagIds.map((tid: string) => ({ id: tid }))
      };
    }

    const research = await prisma.research.update({
      where: { id },
      data: updateData,
      include: {
        tags: { select: { id: true, name: true, slug: true, color: true } },
        Division: { select: { id: true, name: true, color: true } },
        mainAuthor: { select: { id: true, name: true, avatar: true } }
      }
    });

    res.json({ research });
  } catch (error) {
    console.error('Update research error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete research (admin only)
export const deleteResearch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params as { id: string };

    await prisma.research.delete({ where: { id } });

    res.json({ message: 'Research deleted successfully' });
  } catch (error) {
    console.error('Delete research error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Helper function to generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}