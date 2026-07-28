import { Request, Response } from 'express';
import prisma from '../lib/prisma';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
  };
};

// ============================================
// PUBLIC ENDPOINTS
// ============================================

// Get all enabled sections with their blocks (public)
export const getAllSections = async (req: Request, res: Response): Promise<void> => {
  try {
    const sections = await prisma.landingSection.findMany({
      where: {
        enabled: true,
      },
      orderBy: {
        order: 'asc',
      },
      include: {
        blocks: {
          where: {
            enabled: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    res.json({
      success: true,
      data: sections,
    });
  } catch (error) {
    console.error('Error fetching sections:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch sections',
      },
    });
  }
};

// Get section by key (public)
export const getSectionByKey = async (req: Request, res: Response): Promise<void> => {
  try {
    const { key } = req.params as { key: string };

    const section = await prisma.landingSection.findUnique({
      where: { key },
      include: {
        blocks: {
          where: {
            enabled: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (!section) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Section not found',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: section,
    });
  } catch (error) {
    console.error('Error fetching section:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch section',
      },
    });
  }
};

// ============================================
// ADMIN ENDPOINTS
// ============================================

// Get all sections with all blocks (admin)
export const getAllSectionsAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sections = await prisma.landingSection.findMany({
      orderBy: {
        order: 'asc',
      },
      include: {
        blocks: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    res.json({
      success: true,
      data: sections,
    });
  } catch (error) {
    console.error('Error fetching sections (admin):', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch sections',
      },
    });
  }
};

// Create new section (admin)
export const createSection = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Not authenticated',
        },
      });
      return;
    }

    const { 
      key, 
      title, 
      titleId, 
      subtitle, 
      subtitleId, 
      description, 
      descriptionId,
      enabled, 
      order, 
      config 
    } = req.body;

    // Validate required fields
    if (!key) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Key is required',
        },
      });
      return;
    }

    // Check if key already exists
    const existing = await prisma.landingSection.findUnique({
      where: { key },
    });

    if (existing) {
      res.status(400).json({
        success: false,
        error: {
          code: 'DUPLICATE_KEY',
          message: 'Section with this key already exists',
        },
      });
      return;
    }

    const section = await prisma.landingSection.create({
      data: {
        key,
        title,
        titleId,
        subtitle,
        subtitleId,
        description,
        descriptionId,
        enabled: enabled ?? true,
        order: order ?? 0,
        config,
      },
    });

    res.status(201).json({
      success: true,
      data: section,
    });
  } catch (error) {
    console.error('Error creating section:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create section',
      },
    });
  }
};

// Update section (admin)
export const updateSection = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Not authenticated',
        },
      });
      return;
    }

    const { id } = req.params as { id: string };
    const { 
      title, 
      titleId, 
      subtitle, 
      subtitleId, 
      description, 
      descriptionId,
      enabled, 
      order, 
      config 
    } = req.body;

    const section = await prisma.landingSection.update({
      where: { id },
      data: {
        title,
        titleId,
        subtitle,
        subtitleId,
        description,
        descriptionId,
        enabled,
        order,
        config,
      },
    });

    res.json({
      success: true,
      data: section,
    });
  } catch (error) {
    console.error('Error updating section:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update section',
      },
    });
  }
};

// Delete section (admin) - soft delete
export const deleteSection = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Not authenticated',
        },
      });
      return;
    }

    const { id } = req.params as { id: string };

    // Soft delete - just disable it
    await prisma.landingSection.update({
      where: { id },
      data: {
        enabled: false,
      },
    });

    res.json({
      success: true,
      message: 'Section deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting section:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete section',
      },
    });
  }
};

// Reorder sections (admin)
export const reorderSections = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Not authenticated',
        },
      });
      return;
    }

    const { sections } = req.body; // Array of { id, order }

    if (!Array.isArray(sections)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Sections must be an array',
        },
      });
      return;
    }

    // Update all sections in a transaction
    await prisma.$transaction(
      sections.map((item: { id: string; order: number }) =>
        prisma.landingSection.update({
          where: { id: item.id },
          data: { order: item.order },
        })
      )
    );

    res.json({
      success: true,
      message: 'Sections reordered successfully',
    });
  } catch (error) {
    console.error('Error reordering sections:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to reorder sections',
      },
    });
  }
};

// ============================================
// BLOCK ENDPOINTS
// ============================================

// Create block in section (admin)
export const createBlock = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Not authenticated',
        },
      });
      return;
    }

    const { id } = req.params as { id: string }; // sectionId
    const {
      type,
      title,
      subtitle,
      content,
      linkUrl,
      linkText,
      imageUrl,
      iconName,
      color,
      order,
      config,
      enabled,
    } = req.body;

    // Validate required fields
    if (!type) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Block type is required',
        },
      });
      return;
    }

    // Verify section exists
    const section = await prisma.landingSection.findUnique({
      where: { id },
    });

    if (!section) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Section not found',
        },
      });
      return;
    }

    const block = await prisma.sectionBlock.create({
      data: {
        sectionId: id,
        type,
        title,
        subtitle,
        content,
        linkUrl,
        linkText,
        imageUrl,
        iconName,
        color,
        order: order ?? 0,
        config,
        enabled: enabled ?? true,
      },
    });

    res.status(201).json({
      success: true,
      data: block,
    });
  } catch (error) {
    console.error('Error creating block:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create block',
      },
    });
  }
};

// Update block (admin)
export const updateBlock = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Not authenticated',
        },
      });
      return;
    }

    const { id, blockId } = req.params as { id: string; blockId: string };
    const {
      type,
      title,
      subtitle,
      content,
      linkUrl,
      linkText,
      imageUrl,
      iconName,
      color,
      order,
      config,
      enabled,
    } = req.body;

    const block = await prisma.sectionBlock.update({
      where: { id: blockId },
      data: {
        type,
        title,
        subtitle,
        content,
        linkUrl,
        linkText,
        imageUrl,
        iconName,
        color,
        order,
        config,
        enabled,
      },
    });

    res.json({
      success: true,
      data: block,
    });
  } catch (error) {
    console.error('Error updating block:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update block',
      },
    });
  }
};

// Delete block (admin)
export const deleteBlock = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Not authenticated',
        },
      });
      return;
    }

    const { blockId } = req.params as { blockId: string };

    // Hard delete the block
    await prisma.sectionBlock.delete({
      where: { id: blockId },
    });

    res.json({
      success: true,
      message: 'Block deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting block:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete block',
      },
    });
  }
};

// Reorder blocks within a section (admin)
export const reorderBlocks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Not authenticated',
        },
      });
      return;
    }

    const { id } = req.params as { id: string }; // sectionId
    const { blocks } = req.body; // Array of { id, order }

    if (!Array.isArray(blocks)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Blocks must be an array',
        },
      });
      return;
    }

    // Update all blocks in a transaction
    await prisma.$transaction(
      blocks.map((item: { id: string; order: number }) =>
        prisma.sectionBlock.update({
          where: { id: item.id },
          data: { order: item.order },
        })
      )
    );

    res.json({
      success: true,
      message: 'Blocks reordered successfully',
    });
  } catch (error) {
    console.error('Error reordering blocks:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to reorder blocks',
      },
    });
  }
};
