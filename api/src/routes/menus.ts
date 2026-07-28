import { Router } from 'express';
import {
  getAllMenuItems,
  getMenuItemByKey,
  getAllMenuItemsAdmin,
  updateMenuItem,
  getAllSiteConfig,
  getSiteConfigByKey,
  getAllSiteConfigAdmin,
  updateSiteConfig,
} from '../controllers/menuController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// ============================================
// PUBLIC ROUTES
// ============================================

// Get all menu items (public)
router.get('/menus', getAllMenuItems);

// Get menu item by key (public)
router.get('/menus/:key', getMenuItemByKey);

// Get all site config (public)
router.get('/config', getAllSiteConfig);

// Get site config by key (public)
router.get('/config/:key', getSiteConfigByKey);

// ============================================
// ADMIN ROUTES
// ============================================

// Get all menu items (admin)
router.get(
  '/admin/menus',
  authenticate,
  authorize('SUPER_ADMIN'),
  getAllMenuItemsAdmin
);

// Update menu item (admin)
router.put(
  '/admin/menus/:key',
  authenticate,
  authorize('SUPER_ADMIN'),
  updateMenuItem
);

// Get all site config (admin)
router.get(
  '/admin/config',
  authenticate,
  authorize('SUPER_ADMIN'),
  getAllSiteConfigAdmin
);

// Update site config (admin)
router.put(
  '/admin/config/:key',
  authenticate,
  authorize('SUPER_ADMIN'),
  updateSiteConfig
);

export default router;
