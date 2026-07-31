import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { isBotRequest, shouldCountView } from '../lib/view-tracking';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
    divisionId?: string;
  };
}

// Helper function to calculate reading time (average 200 words per minute)
function calculateReadingTime(content: any): number {
  if (!content) return 0;
  const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
  const wordCount = contentStr.split(/\s+/).length;
  return Math.ceil(wordCount / 200) * 60; // in seconds
}

// Helper function to generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Get all articles (public - only published)
export const getAllArticles = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '10', search = '', category, tags, featured, sort } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = { published: true };

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' as const } },
        { excerpt: { contains: search as string, mode: 'insensitive' as const } },
        { metaKeywords: { contains: search as string, mode: 'insensitive' as const } }
      ];
    }

    if (category) {
      where.category = category;
    }

    if (featured === 'true') {
      where.isFeatured = true;
    }

    if (tags) {
      const tagArray = (tags as string).split(',');
      where.tags = {
        some: {
          id: { in: tagArray }
        }
      };
    }

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        skip,
        take: limitNum,
        // `sort=latest` is used by the public homepage to show the three
        // most recent posts regardless of whether they are featured.
        // Default keeps the curated order: featured first, then most recent.
        orderBy:
          sort === 'latest'
            ? [{ createdAt: 'desc' }]
            : [
                { isFeatured: 'desc' },
                { featuredOrder: 'asc' },
                { createdAt: 'desc' }
              ],
        include: {
          User: {
            select: { id: true, name: true, avatar: true }
          },
          tags: {
            select: { id: true, name: true, slug: true, color: true }
          },
          Division: {
            select: { id: true, name: true, slug: true, color: true }
          }
        }
      }),
      prisma.article.count({ where })
    ]);

    res.json({
      articles,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get articles error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get single article (public - only published)
export const getArticleById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    const article = await prisma.article.findUnique({
      where: { id },
      include: {
        User: {
          select: { id: true, name: true, avatar: true }
        }
      }
    });

    if (!article || !article.published) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }

    res.json({ article });
  } catch (error) {
    console.error('Get article error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get article by slug (public)
export const getArticleBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params as { slug: string };

    const article = await prisma.article.findUnique({
      where: { slug, published: true },
      include: {
        User: {
          select: { id: true, name: true, avatar: true }
        },
        tags: {
          select: { id: true, name: true, slug: true, color: true }
        },
        Division: {
          select: { id: true, name: true, slug: true, color: true }
        }
      }
    });

    if (!article) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }

    // NOTE: View tracking is handled by a dedicated POST /:id/view endpoint
    // called from the client-side. We do NOT increment here because this
    // handler is also hit by Next.js ISR revalidations and CDN refreshes,
    // which would inflate the count.

    res.json({ article });
  } catch (error) {
    console.error('Get article by slug error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Track article view (called from client-side useEffect, not SSR)
export const trackArticleView = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    const userAgent = req.headers['user-agent'];
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.socket.remoteAddress
      || 'unknown';

    // Ignore bots/crawlers and SSR prefetches (no real user-agent)
    if (isBotRequest(userAgent)) {
      res.status(204).end();
      return;
    }

    // Deduplicate per IP within the cooldown window
    if (!shouldCountView('article', id, clientIp)) {
      res.status(204).end();
      return;
    }

    await prisma.article.update({
      where: { id },
      data: { views: { increment: 1 } },
    });

    res.status(204).end();
  } catch (error) {
    // Silently fail — view tracking should never break the page
    console.error('Track article view error:', error);
    res.status(204).end();
  }
};

// Create article (admin only - BOARD must be in same division)
export const createArticle = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const userDivisionId = req.user?.divisionId;

    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const {
      title,
      slug: customSlug,
      excerpt,
      content,
      imageUrl,
      category = 'News',
      divisionId,
      published,
      isFeatured,
      featuredOrder,
      metaTitle,
      metaDescription,
      metaKeywords,
      scheduledPublishAt,
      scheduledUnpublishAt,
      tags: tagIds
    } = req.body;

    // Generate slug if not provided
    const slug = customSlug || generateSlug(title);

    // BOARD can only create articles for their division
    if (userRole === 'BOARD' && divisionId && divisionId !== userDivisionId) {
      res.status(403).json({ error: 'You can only create articles for your division' });
      return;
    }

    // Check if slug already exists
    const existingArticle = await prisma.article.findUnique({
      where: { slug }
    });

    if (existingArticle) {
      res.status(400).json({ error: 'Slug already exists' });
      return;
    }

    // Calculate reading time
    const readingTime = calculateReadingTime(content);

    const article = await prisma.article.create({
      data: {
        title,
        slug,
        excerpt,
        content: content || {},
        imageUrl,
        category,
        divisionId: divisionId || userDivisionId || null,
        published: published || false,
        isFeatured: isFeatured || false,
        featuredOrder: isFeatured ? featuredOrder || 0 : null,
        metaTitle,
        metaDescription,
        metaKeywords,
        readingTime,
        scheduledPublishAt: scheduledPublishAt ? new Date(scheduledPublishAt) : null,
        scheduledUnpublishAt: scheduledUnpublishAt ? new Date(scheduledUnpublishAt) : null,
        authorId: userId,
        updatedAt: new Date(),
        tags: tagIds && Array.isArray(tagIds) ? {
          connect: tagIds.map((id: string) => ({ id }))
        } : undefined
      },
      include: {
        User: {
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

    res.status(201).json({ article });
  } catch (error) {
    console.error('Create article error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update article (admin only)
export const updateArticle = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params as { id: string };
    const {
      title,
      slug: customSlug,
      excerpt,
      content,
      imageUrl,
      category,
      divisionId,
      published,
      isFeatured,
      featuredOrder,
      metaTitle,
      metaDescription,
      metaKeywords,
      scheduledPublishAt,
      scheduledUnpublishAt,
      tags: tagIds
    } = req.body;

    // Check if article exists
    const existingArticle = await prisma.article.findUnique({
      where: { id }
    });

    if (!existingArticle) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }

    // Generate slug if title changed and no custom slug provided
    let slug = customSlug;
    if (!slug && title && title !== existingArticle.title) {
      slug = generateSlug(title);
    }

    // Check slug uniqueness if changed
    if (slug && slug !== existingArticle.slug) {
      const slugExists = await prisma.article.findUnique({ where: { slug } });
      if (slugExists) {
        res.status(400).json({ error: 'Slug already exists' });
        return;
      }
    }

    // Calculate reading time if content changed
    const readingTime = content ? calculateReadingTime(content) : undefined;

    // Prepare update data
    const updateData: any = {};
    if (title) updateData.title = title;
    if (slug) updateData.slug = slug;
    if (excerpt !== undefined) updateData.excerpt = excerpt;
    if (content) updateData.content = content;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (category) updateData.category = category;
    if (divisionId !== undefined) updateData.divisionId = divisionId;
    if (published !== undefined) updateData.published = published;
    if (isFeatured !== undefined) updateData.isFeatured = isFeatured;
    if (featuredOrder !== undefined) updateData.featuredOrder = featuredOrder;
    if (metaTitle !== undefined) updateData.metaTitle = metaTitle;
    if (metaDescription !== undefined) updateData.metaDescription = metaDescription;
    if (metaKeywords !== undefined) updateData.metaKeywords = metaKeywords;
    if (readingTime !== undefined) updateData.readingTime = readingTime;
    if (scheduledPublishAt !== undefined) updateData.scheduledPublishAt = scheduledPublishAt ? new Date(scheduledPublishAt) : null;
    if (scheduledUnpublishAt !== undefined) updateData.scheduledUnpublishAt = scheduledUnpublishAt ? new Date(scheduledUnpublishAt) : null;

    // Handle tags update
    if (Array.isArray(tagIds)) {
      updateData.tags = {
        set: tagIds.map((id: string) => ({ id }))
      };
    }

    const article = await prisma.article.update({
      where: { id },
      data: updateData,
      include: {
        User: {
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

    res.json({ article });
  } catch (error) {
    console.error('Update article error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete article (admin only)
export const deleteArticle = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params as { id: string };

    const article = await prisma.article.findUnique({ where: { id } });

    if (!article) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }

    await prisma.article.delete({ where: { id } });

    res.json({ message: 'Article deleted successfully' });
  } catch (error) {
    console.error('Delete article error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all articles (admin - including unpublished)
/**
 * Fetch a single article for the admin editor, including unpublished drafts.
 * The public `getArticleById` 404s anything not published, which blocked
 * editing or publishing a draft.
 */
export const getArticleByIdAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params as { id: string };

    const article = await prisma.article.findUnique({
      where: { id },
      include: {
        User: { select: { id: true, name: true, avatar: true } },
        tags: { select: { id: true, name: true, slug: true, color: true } },
        Division: { select: { id: true, name: true, slug: true, color: true } }
      }
    });

    if (!article) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }

    res.json({ article });
  } catch (error) {
    console.error('Get article (admin) error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export const getAllArticlesAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { page = '1', limit = '10', search = '', category, status, featured, tags } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause for admin
    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' as const } },
        { excerpt: { contains: search as string, mode: 'insensitive' as const } }
      ];
    }

    if (category) {
      where.category = category;
    }

    if (status === 'published') {
      where.published = true;
    } else if (status === 'draft') {
      where.published = false;
    }

    if (featured === 'true') {
      where.isFeatured = true;
    }

    if (tags) {
      const tagArray = (tags as string).split(',');
      where.tags = {
        some: {
          id: { in: tagArray }
        }
      };
    }

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: [
          { isFeatured: 'desc' },
          { featuredOrder: 'asc' },
          { createdAt: 'desc' }
        ],
        include: {
          User: {
            select: { id: true, name: true, avatar: true }
          },
          tags: {
            select: { id: true, name: true, slug: true, color: true }
          },
          Division: {
            select: { id: true, name: true, slug: true, color: true }
          }
        }
      }),
      prisma.article.count({ where })
    ]);

    res.json({
      articles,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get articles admin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
