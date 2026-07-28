import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getCandidates = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { status } = req.query;
    const where: any = { electionId: id };
    if (status) where.status = status;
    const candidates = await prisma.candidate.findMany({
      where,
      include: { user: { select: { id: true, name: true, avatar: true, username: true, division: { select: { name: true, color: true } } } } },
      orderBy: { createdAt: 'asc' },
    });    res.json({ candidates });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
};

export const registerCandidate = async (req: Request, res: Response) => {
  try {
    const { id: electionId } = req.params as { id: string };
    const { vision, mission, experience, program, slogan, posterUrl } = req.body;
    const userId = (req as any).user?.userId;

    if (!vision || !mission) {
      return res.status(400).json({ error: 'Vision and mission are required' });
    }
    if (vision.length < 50 || mission.length < 50) {
      return res.status(400).json({ error: 'Vision and mission must be at least 50 characters' });
    }

    const election = await prisma.election.findUnique({ where: { id: electionId } });
    if (!election) return res.status(404).json({ error: 'Election not found' });
    const now = new Date();
    if (now < election.registrationStart || now >= election.registrationEnd) {
      return res.status(403).json({ error: 'Candidate registration is closed' });
    }

    const candidate = await prisma.candidate.create({
      data: {
        electionId,
        userId,
        vision,
        mission,
        experience,
        program,
        slogan,
        posterUrl,
        status: 'PENDING',
      },
    });
    res.status(201).json({ candidate });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return res.status(409).json({ error: 'You are already registered as a candidate' });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to register candidate' });
  }
};

export const approveCandidate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const userId = (req as any).user?.userId;
    const candidate = await prisma.candidate.update({
      where: { id },
      data: { status: 'APPROVED', approvedAt: new Date(), approvedBy: userId },
    });
    res.json({ candidate });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to approve candidate' });
  }
};

export const rejectCandidate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { reason } = req.body;
    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({ error: 'A rejection reason of at least 5 characters is required' });
    }
    const candidate = await prisma.candidate.update({
      where: { id },
      data: { status: 'REJECTED', rejectionReason: reason.trim() },
    });
    res.json({ candidate });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to reject candidate' });
  }
};

export const withdrawCandidate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    await prisma.candidate.update({
      where: { id },
      data: { status: 'WITHDRAWN' },
    });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to withdraw candidate' });
  }
};
