import { Request, Response } from 'express';
import prisma from '../lib/prisma';

// Create audit log entry
export const createAuditLog = async (
  userId: string | null,
  action: string,
  entity: string,
  entityId: string,
  details?: any,
  ipAddress?: string,
  userAgent?: string
) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        details: details || {},
        ipAddress,
        userAgent
      }
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
};

// Get audit logs (admin only)
export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    // @ts-ignore
    const userId = req.user?.userId;
    // @ts-ignore
    const userRole = req.user?.role;

    if (!userId || userRole !== 'SUPER_ADMIN') {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    const { entity, action, page = 1, limit = 50 } = req.query;
    const parsedPage = Number.parseInt(String(page), 10);
    const parsedLimit = Number.parseInt(String(limit), 10);
    const pageNum = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const limitNum = Math.min(
      Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 50,
      100
    );

    const where: any = {};

    if (entity) {
      where.entity = entity;
    }

    if (action) {
      where.action = action;
    }

    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          User: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.auditLog.count({ where })
    ]);

    res.json({
      logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get audit logs for specific entity
export const getEntityAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    // @ts-ignore
    const userId = req.user?.userId;
    // @ts-ignore
    const userRole = req.user?.role;

    if (!userId || userRole !== 'SUPER_ADMIN') {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    const entity = String(req.params.entity);
    const entityId = String(req.params.entityId);
    const parsedPage = Number.parseInt(String(req.query.page ?? ''), 10);
    const parsedLimit = Number.parseInt(String(req.query.limit ?? ''), 10);
    const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const limit = Math.min(
      Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 50,
      100
    );
    const where = { entity, entityId };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          User: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.auditLog.count({ where })
    ]);

    res.json({
      logs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Get entity audit logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
