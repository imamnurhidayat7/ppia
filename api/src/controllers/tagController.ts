import { Request, Response } from 'express';
import prisma from '../lib/prisma';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
    divisionId?: string;
  };
}

// Helper function to generate slug from tag name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Get all tags (public)
export const getAllTags = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search = '' } = req.query as Record<string, string | undefined>;

    const where = search ? {
      OR: [
        { name: { contains: search as string, mode: 'insensitive' as const } },
        { description: { contains: search as string, mode: 'insensitive' as const } }
      ]
    } : {};

    const tags = await prisma.tag.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            articles: true,
            researches: true
          }
        }
      }
    });

    res.json({ tags });
  } catch (error) {
    console.error('Get tags error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get single tag
export const getTagById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    const tag = await prisma.tag.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            articles: true,
            researches: true
          }
        }
      }
    });

    if (!tag) {
      res.status(404).json({ error: 'Tag not found' });
      return;
    }

    res.json({ tag });
  } catch (error) {
    console.error('Get tag error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get tag by slug
export const getTagBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params as { slug: string };

    const tag = await prisma.tag.findUnique({
      where: { slug },
      include: {
        _count: {
          select: {
            articles: true,
            researches: true
          }
        }
      }
    });

    if (!tag) {
      res.status(404).json({ error: 'Tag not found' });
      return;
    }

    res.json({ tag });
  } catch (error) {
    console.error('Get tag by slug error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create tag (admin only)
export const createTag = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { name, description, color } = req.body;

    const slug = generateSlug(name);

    // Check if tag already exists
    const existingTag = await prisma.tag.findFirst({
      where: {
        OR: [
          { name },
          { slug }
        ]
      }
    });

    if (existingTag) {
      res.status(400).json({ error: 'Tag already exists' });
      return;
    }

    const tag = await prisma.tag.create({
      data: {
        name,
        slug,
        description,
        color
      }
    });

    res.status(201).json({ tag });
  } catch (error) {
    console.error('Create tag error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update tag (admin only)
export const updateTag = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params as { id: string };
    const { name, description, color } = req.body;

    // Check if tag exists
    const existingTag = await prisma.tag.findUnique({ where: { id } });
    if (!existingTag) {
      res.status(404).json({ error: 'Tag not found' });
      return;
    }

    // Generate new slug if name changed
    let slug = existingTag.slug;
    if (name && name !== existingTag.name) {
      slug = generateSlug(name);
      // Check if new slug already exists
      const slugExists = await prisma.tag.findUnique({ where: { slug } });
      if (slugExists) {
        res.status(400).json({ error: 'Tag with this name already exists' });
        return;
      }
    }

    const tag = await prisma.tag.update({
      where: { id },
      data: {
        ...(name && { name, slug }),
        ...(description !== undefined && { description }),
        ...(color !== undefined && { color })
      }
    });

    res.json({ tag });
  } catch (error) {
    console.error('Update tag error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete tag (admin only)
export const deleteTag = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params as { id: string };

    const tag = await prisma.tag.findUnique({ where: { id } });
    if (!tag) {
      res.status(404).json({ error: 'Tag not found' });
      return;
    }

    await prisma.tag.delete({ where: { id } });

    res.json({ message: 'Tag deleted successfully' });
  } catch (error) {
    console.error('Delete tag error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};