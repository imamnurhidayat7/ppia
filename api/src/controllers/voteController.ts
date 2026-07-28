import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const castVote = async (req: Request, res: Response) => {
  try {
    const { id: electionId } = req.params as { id: string };
    const { candidateId } = req.body;
    const userId = (req as any).user?.userId;

    const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
    if (!candidate || candidate.electionId !== electionId) {
      return res.status(404).json({ error: 'Invalid candidate' });
    }
    if (candidate.status !== 'APPROVED') {
      return res.status(403).json({ error: 'Candidate has not been approved' });
    }

    const election = await prisma.election.findUnique({ where: { id: electionId } });
    if (!election) return res.status(404).json({ error: 'Election not found' });
    const now = new Date();
    if (now < election.votingStart || now >= election.votingEnd) {
      return res.status(403).json({ error: 'Voting is not open' });
    }

    const vote = await prisma.vote.create({
      data: { electionId, candidateId, voterId: userId },
    });
    res.status(201).json({ vote });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return res.status(409).json({ error: 'You have already voted' });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to cast vote' });
  }
};

export const getMyVote = async (req: Request, res: Response) => {
  try {
    const { id: electionId } = req.params as { id: string };
    const userId = (req as any).user?.userId;
    const vote = await prisma.vote.findUnique({
      where: { electionId_voterId: { electionId, voterId: userId } },
      include: { candidate: { select: { id: true, user: { select: { name: true, avatar: true } } } } },
    });
    res.json({ vote });
  } catch (error) {
    res.json({ vote: null });
  }
};
