import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import {
  assertCustomPage,
  TEMPLATE_BLOCK_ERROR,
  TemplatePageBlocksError,
} from '../lib/page-content-mode';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
  };
}

// ============================================
// PUBLIC PAGE ENDPOINTS
// ============================================

// Get all pages (public - only published)
export const getAllPages = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search = '', type } = req.query;

    const where = {
      published: true,
      ...(type && { pageType: type as string }),
      ...(search && {
        title: { contains: search as string, mode: 'insensitive' as const }
      })
    };

    const pages = await prisma.page.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        featuredImage: true,
        pageType: true,
        published: true,
        updatedAt: true,
      }
    });

    res.json({ pages });
  } catch (error) {
    console.error('Get pages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get single page by slug (public - only published)
export const getPageBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    // path-to-regexp v8 wildcard (*slug) gives an array; join to reconstruct full slug
    const rawSlug = req.params.slug;
    const slug = Array.isArray(rawSlug) ? rawSlug.join('/') : rawSlug;

    const page = await prisma.page.findUnique({
      where: { slug },
      include: {
        User: {
          select: { id: true, name: true, avatar: true }
        },
        blocks: {
          where: { enabled: true },
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!page || !page.published) {
      res.status(404).json({ error: 'Page not found' });
      return;
    }

    res.json({ page });
  } catch (error) {
    console.error('Get page by slug error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get single page by ID (public - only published)
export const getPageById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    const page = await prisma.page.findUnique({
      where: { id },
      include: {
        User: {
          select: { id: true, name: true, avatar: true }
        },
        blocks: {
          where: { enabled: true },
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!page || !page.published) {
      res.status(404).json({ error: 'Page not found' });
      return;
    }

    res.json({ page });
  } catch (error) {
    console.error('Get page by id error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================
// ADMIN PAGE ENDPOINTS
// ============================================

// Get all pages (admin - includes unpublished)
export const getPagesAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search = '', type } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const where = {
      ...(type && { pageType: type as string }),
      ...(search && {
        OR: [
          { title: { contains: search as string, mode: 'insensitive' as const } },
          { slug: { contains: search as string, mode: 'insensitive' as const } },
        ]
      })
    };

    const [pages, total] = await Promise.all([
      prisma.page.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          User: {
            select: { id: true, name: true, avatar: true }
          },
          _count: { select: { blocks: true } }
        }
      }),
      prisma.page.count({ where })
    ]);

    res.json({
      pages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get pages admin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get single page (admin - includes unpublished + all blocks)
export const getPageAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    const page = await prisma.page.findUnique({
      where: { id },
      include: {
        User: {
          select: { id: true, name: true, avatar: true }
        },
        blocks: {
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!page) {
      res.status(404).json({ error: 'Page not found' });
      return;
    }

    res.json({ page });
  } catch (error) {
    console.error('Get page admin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create page (admin only)
export const createPage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const {
      title,
      slug,
      content,
      excerpt,
      metaTitle,
      metaDescription,
      featuredImage,
      pageType,
      template,
      published,
      blocks
    } = req.body;

    // Auto-generate slug from title if not provided
    const finalSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    // Check if slug already exists
    const existingPage = await prisma.page.findUnique({
      where: { slug: finalSlug }
    });

    if (existingPage) {
      res.status(400).json({ error: 'Slug already exists' });
      return;
    }

    const page = await prisma.page.create({
      data: {
        title,
        slug: finalSlug,
        content: content || {},
        excerpt,
        metaTitle,
        metaDescription,
        featuredImage,
        pageType: pageType || 'standard',
        template: template || 'default',
        published: published || false,
        authorId: userId,
        blocks: blocks ? {
          create: blocks.map((b: any, index: number) => ({
            type: b.type,
            title: b.title,
            titleId: b.titleId,
            subtitle: b.subtitle,
            subtitleId: b.subtitleId,
            content: b.content,
            contentId: b.contentId,
            linkUrl: b.linkUrl,
            linkText: b.linkText,
            linkTextId: b.linkTextId,
            imageUrl: b.imageUrl,
            iconName: b.iconName,
            color: b.color,
            order: b.order ?? index,
            config: b.config,
            enabled: b.enabled ?? true,
          }))
        } : undefined
      },
      include: {
        User: { select: { id: true, name: true, avatar: true } },
        blocks: { orderBy: { order: 'asc' } }
      }
    });

    res.status(201).json({ page });
  } catch (error) {
    console.error('Create page error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update page (admin only)
export const updatePage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params as { id: string };
    const {
      title,
      slug,
      content,
      excerpt,
      metaTitle,
      metaDescription,
      featuredImage,
      pageType,
      template,
      published
    } = req.body;

    // Check if page exists
    const existing = await prisma.page.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Page not found' });
      return;
    }

    // Check slug uniqueness if changing
    if (slug && slug !== existing.slug) {
      const slugExists = await prisma.page.findUnique({ where: { slug } });
      if (slugExists) {
        res.status(400).json({ error: 'Slug already exists' });
        return;
      }
    }

    const page = await prisma.page.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(slug !== undefined && { slug }),
        ...(content !== undefined && { content }),
        ...(excerpt !== undefined && { excerpt }),
        ...(metaTitle !== undefined && { metaTitle }),
        ...(metaDescription !== undefined && { metaDescription }),
        ...(featuredImage !== undefined && { featuredImage }),
        ...(pageType !== undefined && { pageType }),
        ...(template !== undefined && { template }),
        ...(published !== undefined && { published }),
      },
      include: {
        User: { select: { id: true, name: true, avatar: true } },
        blocks: { orderBy: { order: 'asc' } }
      }
    });

    res.json({ page });
  } catch (error) {
    console.error('Update page error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete page (admin only)
export const deletePage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    // Blocks are deleted automatically via onDelete: Cascade
    await prisma.page.delete({ where: { id } });

    res.json({ success: true, message: 'Page deleted successfully' });
  } catch (error) {
    console.error('Delete page error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================
// PAGE BLOCK ENDPOINTS (admin only)
// ============================================

// Create block in page
export const createBlock = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id: pageId } = req.params as { id: string };
    const body = req.body;

    // Verify page exists
    const page = await prisma.page.findUnique({ where: { id: pageId } });
    if (!page) {
      res.status(404).json({ error: 'Page not found' });
      return;
    }

    assertCustomPage(page);

    // Get the next order number
    const maxOrder = await prisma.pageBlock.aggregate({
      where: { pageId },
      _max: { order: true }
    });

    const block = await prisma.pageBlock.create({
      data: {
        pageId,
        type: body.type,
        title: body.title,
        titleId: body.titleId,
        subtitle: body.subtitle,
        subtitleId: body.subtitleId,
        content: body.content,
        contentId: body.contentId,
        linkUrl: body.linkUrl,
        linkText: body.linkText,
        linkTextId: body.linkTextId,
        imageUrl: body.imageUrl,
        iconName: body.iconName,
        color: body.color,
        order: body.order ?? (maxOrder._max.order ?? -1) + 1,
        config: body.config,
        enabled: body.enabled ?? true,
      }
    });

    res.status(201).json({ block });
  } catch (error) {
    if (error instanceof TemplatePageBlocksError) {
      res.status(409).json({ error: TEMPLATE_BLOCK_ERROR });
      return;
    }
    console.error('Create block error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update block
export const updateBlock = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { blockId } = req.params as { blockId: string };
    const body = req.body;

    const existing = await prisma.pageBlock.findUnique({
      where: { id: blockId },
      include: { page: { select: { pageType: true } } },
    });
    if (!existing) {
      res.status(404).json({ error: 'Block not found' });
      return;
    }
    assertCustomPage(existing.page);

    const block = await prisma.pageBlock.update({
      where: { id: blockId },
      data: {
        ...(body.type !== undefined && { type: body.type }),
        ...(body.title !== undefined && { title: body.title }),
        ...(body.titleId !== undefined && { titleId: body.titleId }),
        ...(body.subtitle !== undefined && { subtitle: body.subtitle }),
        ...(body.subtitleId !== undefined && { subtitleId: body.subtitleId }),
        ...(body.content !== undefined && { content: body.content }),
        ...(body.contentId !== undefined && { contentId: body.contentId }),
        ...(body.linkUrl !== undefined && { linkUrl: body.linkUrl }),
        ...(body.linkText !== undefined && { linkText: body.linkText }),
        ...(body.linkTextId !== undefined && { linkTextId: body.linkTextId }),
        ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl }),
        ...(body.iconName !== undefined && { iconName: body.iconName }),
        ...(body.color !== undefined && { color: body.color }),
        ...(body.order !== undefined && { order: body.order }),
        ...(body.config !== undefined && { config: body.config }),
        ...(body.enabled !== undefined && { enabled: body.enabled }),
      }
    });

    res.json({ block });
  } catch (error) {
    if (error instanceof TemplatePageBlocksError) {
      res.status(409).json({ error: TEMPLATE_BLOCK_ERROR });
      return;
    }
    console.error('Update block error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete block
export const deleteBlock = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { blockId } = req.params as { blockId: string };

    const existing = await prisma.pageBlock.findUnique({
      where: { id: blockId },
      include: { page: { select: { pageType: true } } },
    });
    if (!existing) {
      res.status(404).json({ error: 'Block not found' });
      return;
    }
    assertCustomPage(existing.page);

    await prisma.pageBlock.delete({ where: { id: blockId } });

    res.json({ success: true, message: 'Block deleted successfully' });
  } catch (error) {
    if (error instanceof TemplatePageBlocksError) {
      res.status(409).json({ error: TEMPLATE_BLOCK_ERROR });
      return;
    }
    console.error('Delete block error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Reorder blocks
export const reorderBlocks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id: pageId } = req.params as { id: string };
    const { blockIds } = req.body as { blockIds: string[] };

    const page = await prisma.page.findUnique({
      where: { id: pageId },
      select: { pageType: true },
    });
    if (!page) {
      res.status(404).json({ error: 'Page not found' });
      return;
    }
    assertCustomPage(page);

    const uniqueBlockIds = [...new Set(blockIds)];
    const ownedBlocks = await prisma.pageBlock.findMany({
      where: { id: { in: uniqueBlockIds }, pageId },
      select: { id: true },
    });
    if (ownedBlocks.length !== uniqueBlockIds.length || uniqueBlockIds.length !== blockIds.length) {
      res.status(400).json({ error: 'All blocks must belong to the target page' });
      return;
    }

    await prisma.$transaction(
      blockIds.map((blockId, index) =>
        prisma.pageBlock.update({
          where: { id: blockId },
          data: { order: index },
        }),
      ),
    );

    res.json({ success: true });
  } catch (error) {
    if (error instanceof TemplatePageBlocksError) {
      res.status(409).json({ error: TEMPLATE_BLOCK_ERROR });
      return;
    }
    console.error('Reorder blocks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
