import { Request, Response } from 'express';
import prisma from '../lib/prisma';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
  };
};

// Get all divisions (public)
export const getAllDivisions = async (req: Request, res: Response): Promise<void> => {
  try {
    const divisions = await prisma.division.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        color: true
      }
    });

    res.json({ divisions });
  } catch (error) {
    console.error('Get divisions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get division by ID
export const getDivisionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    const division = await prisma.division.findUnique({
      where: { id },
      include: {
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        _count: {
          select: {
            members: true,
            Article: true,
            Event: true
          }
        }
      }
    });

    if (!division) {
      res.status(404).json({ error: 'Division not found' });
      return;
    }

    res.json({ division });
  } catch (error) {
    console.error('Get division error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create division (super admin only)
export const createDivision = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userRole = req.user?.role;

    if (userRole !== 'SUPER_ADMIN') {
      res.status(403).json({ error: 'Only super admin can create divisions' });
      return;
    }

    const { name, slug, description, color } = req.body;

    if (!name || !slug) {
      res.status(400).json({ error: 'Name and slug are required' });
      return;
    }

    // Check if slug already exists
    const existingDivision = await prisma.division.findUnique({
      where: { slug }
    });

    if (existingDivision) {
      res.status(400).json({ error: 'Slug already exists' });
      return;
    }

    const division = await prisma.division.create({
      data: {
        name,
        slug,
        description,
        color
      }
    });

    res.status(201).json({ division });
  } catch (error) {
    console.error('Create division error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update division (super admin only)
export const updateDivision = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userRole = req.user?.role;

    if (userRole !== 'SUPER_ADMIN') {
      res.status(403).json({ error: 'Only super admin can update divisions' });
      return;
    }

    const { id } = req.params as { id: string };
    const { name, slug, description, color } = req.body;

    // Check if division exists
    const existingDivision = await prisma.division.findUnique({
      where: { id }
    });

    if (!existingDivision) {
      res.status(404).json({ error: 'Division not found' });
      return;
    }

    // Check slug uniqueness if changed
    if (slug && slug !== existingDivision.slug) {
      const slugExists = await prisma.division.findUnique({ where: { slug } });
      if (slugExists) {
        res.status(400).json({ error: 'Slug already exists' });
        return;
      }
    }

    const division = await prisma.division.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
        ...(description !== undefined && { description }),
        ...(color !== undefined && { color })
      }
    });

    res.json({ division });
  } catch (error) {
    console.error('Update division error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete division (super admin only)
export const deleteDivision = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userRole = req.user?.role;

    if (userRole !== 'SUPER_ADMIN') {
      res.status(403).json({ error: 'Only super admin can delete divisions' });
      return;
    }

    const { id } = req.params as { id: string };

    const division = await prisma.division.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            members: true,
            Article: true,
            Event: true
          }
        }
      }
    });

    if (!division) {
      res.status(404).json({ error: 'Division not found' });
      return;
    }

    // Check if division has members
    if (division._count.members > 0) {
      res.status(400).json({
        error: 'Cannot delete division that has members. Please reassign members first.'
      });
      return;
    }

    await prisma.division.delete({ where: { id } });

    res.json({ message: 'Division deleted successfully' });
  } catch (error) {
    console.error('Delete division error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
