import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

// GET /api/blocks/data?type=events&filter=upcoming&limit=5&category=
export const getBlockData = async (req: Request, res: Response): Promise<void> => {
  const { type, filter = 'all', limit = '10', category } = req.query;
  const take = Math.min(parseInt(limit as string, 10) || 10, 50);

  try {
    let data: any[] = [];

    switch (type) {
      case 'events': {
        const where: any = { published: true };
        if (filter === 'upcoming') {
          where.startDate = { gte: new Date() };
          data = await prisma.event.findMany({
            where,
            orderBy: { startDate: 'asc' },
            take,
          });
        } else if (filter === 'past') {
          where.startDate = { lt: new Date() };
          data = await prisma.event.findMany({
            where,
            orderBy: { startDate: 'desc' },
            take,
          });
        } else {
          data = await prisma.event.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take,
          });
        }
        break;
      }
      case 'articles': {
        data = await prisma.article.findMany({
          where: { published: true },
          orderBy: { createdAt: 'desc' },
          take,
          include: { tags: true },
        });
        break;
      }
      case 'divisions': {
        data = await prisma.division.findMany({
          where: { isActive: true },
          orderBy: { name: 'asc' },
          take,
        });
        break;
      }
      case 'faq': {
        const where: any = { published: true };
        if (category) where.category = category as string;
        data = await prisma.faq.findMany({
          where,
          orderBy: { order: 'asc' },
          take,
        });
        break;
      }
      case 'media': {
        const where: any = {};
        if (category) where.category = category as string;
        data = await prisma.media.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take,
        });
        break;
      }
      case 'candidates': {
        data = await prisma.candidate.findMany({
          where: { status: 'APPROVED' },
          orderBy: { createdAt: 'desc' },
          take,
        });
        break;
      }
      default:
        res.status(400).json({ error: `Unknown data source type: ${type}` });
        return;
    }

    res.json({ data });
  } catch (err: any) {
    console.error('Block data error:', err);
    res.status(500).json({ error: 'Failed to fetch block data' });
  }
};
