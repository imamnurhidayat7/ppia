import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import path from 'path';
import fs from 'fs';
import { createAuditLog } from './auditLogController';

// Get all media (admin)
export const getAllMedia = async (req: Request, res: Response): Promise<void> => {
  try {
    // @ts-ignore
    const userId = req.user?.userId;
    // @ts-ignore
    const userRole = req.user?.role;

    if (!userId || (userRole !== 'SUPER_ADMIN' && userRole !== 'BOARD')) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    const { folder, page = 1, limit = 50, search } = req.query;
    const parsedPage = Number.parseInt(String(page), 10);
    const parsedLimit = Number.parseInt(String(limit), 10);
    const pageNum = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const limitNum = Math.min(
      Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 50,
      100
    );

    const where: any = {};

    if (folder) {
      where.folder = folder;
    }

    if (search) {
      where.OR = [
        { filename: { contains: String(search), mode: 'insensitive' } },
        { altText: { contains: String(search), mode: 'insensitive' } }
      ];
    }

    const skip = (pageNum - 1) * limitNum;

    const [media, total] = await Promise.all([
      prisma.media.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.media.count({ where })
    ]);

    // Get folders
    const folders = await prisma.media.findMany({
      select: { folder: true },
      where: { folder: { not: null } },
      distinct: ['folder']
    });

    res.json({
      media,
      folders: folders.map(f => f.folder).filter(Boolean),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get all media error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete media
export const deleteMedia = async (req: Request, res: Response): Promise<void> => {
  try {
    // @ts-ignore
    const userId = req.user?.userId;
    // @ts-ignore
    const userRole = req.user?.role;

    if (!userId || (userRole !== 'SUPER_ADMIN' && userRole !== 'BOARD')) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    const id = String(req.params.id);

    const media = await prisma.media.findUnique({
      where: { id }
    });

    if (!media) {
      res.status(404).json({ error: 'Media not found' });
      return;
    }

    // Delete file from disk
    const filePath = path.join(process.cwd(), 'uploads', path.basename(media.url));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await prisma.media.delete({
      where: { id }
    });

    await createAuditLog(userId, 'DELETE', 'Media', id, { filename: media.filename });

    res.json({ message: 'Media deleted successfully' });
  } catch (error) {
    console.error('Delete media error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update media metadata
export const updateMedia = async (req: Request, res: Response): Promise<void> => {
  try {
    // @ts-ignore
    const userId = req.user?.userId;
    // @ts-ignore
    const userRole = req.user?.role;

    if (!userId || (userRole !== 'SUPER_ADMIN' && userRole !== 'BOARD')) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    const id = String(req.params.id);
    const altText = req.body.altText ? String(req.body.altText) : undefined;
    const folder = req.body.folder ? String(req.body.folder) : undefined;

    const media = await prisma.media.update({
      where: { id },
      data: {
        ...(altText !== undefined && { altText }),
        ...(folder !== undefined && { folder })
      }
    });

    await createAuditLog(userId, 'UPDATE', 'Media', id, { altText, folder });

    res.json({ media });
  } catch (error) {
    console.error('Update media error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
