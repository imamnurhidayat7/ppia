import { Request, Response } from 'express';
import prisma from '../lib/prisma';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
  };
};

// ============================================
// MENU ITEMS
// ============================================

// Get all menu items (public)
export const getAllMenuItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const menuItems = await prisma.menuItem.findMany({
      where: {
        enabled: true,
      },
    });

    // Transform to key-value format
    const result: Record<string, any> = {};
    menuItems.forEach(item => {
      result[item.key] = item.items;
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch menu items',
      },
    });
  }
};

// Get menu item by key (public)
export const getMenuItemByKey = async (req: Request, res: Response): Promise<void> => {
  try {
    const { key } = req.params as { key: string };

    const menuItem = await prisma.menuItem.findUnique({
      where: { key },
    });

    if (!menuItem) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Menu item not found',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: menuItem,
    });
  } catch (error) {
    console.error('Error fetching menu item:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch menu item',
      },
    });
  }
};

// ============================================
// ADMIN MENU ITEMS
// ============================================

// Get all menu items (admin - includes disabled)
export const getAllMenuItemsAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const menuItems = await prisma.menuItem.findMany();

    res.json({
      success: true,
      data: menuItems,
    });
  } catch (error) {
    console.error('Error fetching menu items (admin):', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch menu items',
      },
    });
  }
};

// Update menu item (admin)
export const updateMenuItem = async (req: AuthRequest, res: Response): Promise<void> => {
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

    const { key } = req.params as { key: string };
    const { items, enabled } = req.body;

    const menuItem = await prisma.menuItem.update({
      where: { key },
      data: {
        items,
        enabled,
      },
    });

    res.json({
      success: true,
      data: menuItem,
    });
  } catch (error) {
    console.error('Error updating menu item:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update menu item',
      },
    });
  }
};

// ============================================
// SITE CONFIG
// ============================================

// Get all site config (public)
export const getAllSiteConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const configs = await prisma.siteConfig.findMany();

    // Transform to key-value format
    const result: Record<string, any> = {};
    configs.forEach(config => {
      result[config.key] = config.config;
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching site config:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch site configuration',
      },
    });
  }
};

// Get site config by key (public)
export const getSiteConfigByKey = async (req: Request, res: Response): Promise<void> => {
  try {
    const { key } = req.params as { key: string };

    const config = await prisma.siteConfig.findUnique({
      where: { key },
    });

    if (!config) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Site configuration not found',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Error fetching site config:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch site configuration',
      },
    });
  }
};

// ============================================
// ADMIN SITE CONFIG
// ============================================

// Get all site config (admin)
export const getAllSiteConfigAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const configs = await prisma.siteConfig.findMany();

    res.json({
      success: true,
      data: configs,
    });
  } catch (error) {
    console.error('Error fetching site config (admin):', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch site configuration',
      },
    });
  }
};

// Update site config (admin)
export const updateSiteConfig = async (req: AuthRequest, res: Response): Promise<void> => {
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

    const { key } = req.params as { key: string };
    const { config } = req.body;

    const siteConfig = await prisma.siteConfig.upsert({
      where: { key },
      update: {
        config,
      },
      create: {
        key,
        config,
      },
    });

    res.json({
      success: true,
      data: siteConfig,
    });
  } catch (error) {
    console.error('Error updating site config:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update site configuration',
      },
    });
  }
};
