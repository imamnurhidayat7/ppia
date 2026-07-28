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

    const where: any = {};

    if (entity) {
      where.entity = entity;
    }

    if (action) {
      where.action = action;
    }

    const skip = (Number(page) - 1) * Number(limit);

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
        take: Number(limit)
      }),
      prisma.auditLog.count({ where })
    ]);

    res.json({
      logs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
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

    const logs = await prisma.auditLog.findMany({
      where: {
        entity,
        entityId
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ logs });
  } catch (error) {
    console.error('Get entity audit logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
