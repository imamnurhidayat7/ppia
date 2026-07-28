import { Request, Response } from 'express';
import { PrismaClient, ElectionStatus } from '@prisma/client';
import { computeElectionState } from '../lib/electionState';

const prisma = new PrismaClient();

// GET /api/elections
export const getElections = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const where = status ? { status: status as ElectionStatus } : {};
    const elections = await prisma.election.findMany({
      where,
      include: { _count: { select: { candidates: true, votes: true } } },
      orderBy: { votingStart: 'desc' },
    });
    res.json({ elections });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch elections' });
  }
};

// GET /api/elections/active
export const getActiveElection = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const election = await prisma.election.findFirst({
      where: {
        status: { in: ['UPCOMING', 'REGISTRATION', 'CAMPAIGN', 'VOTING'] },
        votingEnd: { gte: now },
      },
      include: {
        candidates: {
          where: { status: 'APPROVED' },
          include: { user: { select: { id: true, name: true, avatar: true, username: true, division: { select: { name: true, color: true } } } } },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { votes: true } },
      },
      orderBy: { votingStart: 'desc' },
    });
    if (!election) return res.json({ election: null });
    res.json({ election: computeElectionState(election).election });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch active election' });
  }
};

// GET /api/elections/:id
export const getElectionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const election = await prisma.election.findUnique({
      where: { id },
      include: {
        candidates: {
          include: { user: { select: { id: true, name: true, avatar: true, username: true, division: { select: { name: true, color: true } } } } },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { votes: true } },
      },
    });
    if (!election) return res.status(404).json({ error: 'Election not found' });
    res.json({ election });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch election' });
  }
};

// POST /api/elections (admin only)
export const createElection = async (req: Request, res: Response) => {
  try {
    const { title, description, registrationStart, registrationEnd, campaignStart, campaignEnd, votingStart, votingEnd } = req.body;
    const userId = (req as any).user?.userId;
    if (!title || !registrationStart || !votingEnd) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const election = await prisma.election.create({
      data: {
        title,
        description,
        registrationStart: new Date(registrationStart),
        registrationEnd: new Date(registrationEnd || registrationStart),
        campaignStart: new Date(campaignStart || registrationStart),
        campaignEnd: new Date(campaignEnd || votingStart),
        votingStart: new Date(votingStart),
        votingEnd: new Date(votingEnd),
        createdBy: userId,
      },
    });
    res.status(201).json({ election });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create election' });
  }
};

// PATCH /api/elections/:id (admin only)
export const updateElection = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const data: any = { ...req.body };
    ['registrationStart', 'registrationEnd', 'campaignStart', 'campaignEnd', 'votingStart', 'votingEnd'].forEach((key) => {
      if (data[key]) data[key] = new Date(data[key]);
    });
    const election = await prisma.election.update({ where: { id }, data });
    res.json({ election });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update election' });
  }
};

// DELETE /api/elections/:id (admin only)
export const deleteElection = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    await prisma.election.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete election' });
  }
};

// GET /api/elections/:id/results
export const getResults = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const candidates = await prisma.candidate.findMany({
      where: { electionId: id, status: 'APPROVED' },
      include: {
        user: { select: { id: true, name: true, avatar: true, username: true } },
        _count: { select: { votes: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    const totalVotes = await prisma.vote.count({ where: { electionId: id } });
    const results = candidates.map((c) => ({
      id: c.id,
      name: c.user.name,
      avatar: c.user.avatar,
      username: c.user.username,
      slogan: c.slogan,
      voteCount: c._count.votes,
      percentage: totalVotes > 0 ? (c._count.votes / totalVotes) * 100 : 0,
    }));
    res.json({ results, totalVotes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
};

// GET /api/elections/:id/voters (admin only)
export const getVoters = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const votes = await prisma.vote.findMany({
      where: { electionId: id },
      include: {
        voter: { select: { id: true, name: true, email: true, username: true, division: { select: { name: true } } } },
        candidate: { select: { id: true, user: { select: { name: true } } } },
      },
      orderBy: { votedAt: 'desc' },
    });
    res.json({ votes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch voters' });
  }
};
