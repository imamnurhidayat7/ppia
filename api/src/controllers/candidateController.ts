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
      include: {
        user: { select: { id: true, name: true, avatar: true, username: true, division: { select: { name: true, color: true } } } },
        formResponses: { include: { field: true } },
      },
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
    const { vision, mission, experience, program, slogan, posterUrl, formResponses } = req.body;
    const userId = (req as any).user?.userId;

    const election = await prisma.election.findUnique({
      where: { id: electionId },
      include: { formFields: true },
    });
    if (!election) return res.status(404).json({ error: 'Election not found' });
    const now = new Date();
    if (now < election.registrationStart || now >= election.registrationEnd) {
      return res.status(403).json({ error: 'Candidate registration is closed' });
    }

    // Vision/mission are required ONLY when the election has no custom form
    // fields. When an admin configures custom questions, those become the
    // primary registration content instead.
    const hasCustomFields = election.formFields.length > 0;
    if (!hasCustomFields) {
      if (!vision || !mission) {
        return res.status(400).json({ error: 'Vision and mission are required' });
      }
      if (vision.length < 50 || mission.length < 50) {
        return res.status(400).json({ error: 'Vision and mission must be at least 50 characters' });
      }
    }

    // Validate required custom fields + choice values.
    const responsesByFieldId = new Map<string, unknown>();
    if (Array.isArray(formResponses)) {
      for (const r of formResponses) {
        if (r && typeof r.fieldId === 'string') {
          responsesByFieldId.set(r.fieldId, r.value);
        }
      }
    }

    for (const field of election.formFields) {
      const value = responsesByFieldId.get(field.id);
      const isEmpty =
        value === undefined ||
        value === null ||
        value === '' ||
        (Array.isArray(value) && value.length === 0);

      if (field.required && isEmpty) {
        return res.status(400).json({ error: `Field "${field.label}" is required` });
      }
      if (!isEmpty) {
        // Validate choice values against the option list.
        if (field.type === 'FIELD_SINGLE_CHOICE') {
          const allowed = (field.options as string[] | null) ?? [];
          if (!allowed.includes(value as string)) {
            return res.status(400).json({ error: `Invalid option for "${field.label}"` });
          }
        } else if (field.type === 'FIELD_MULTIPLE_CHOICE') {
          const allowed = (field.options as string[] | null) ?? [];
          const picked = value as string[];
          if (!Array.isArray(picked) || !picked.every((p) => allowed.includes(p))) {
            return res.status(400).json({ error: `Invalid option(s) for "${field.label}"` });
          }
        }
      }
    }

    // Rejected candidates may apply again while registration is open. Reuse
    // the existing row so the @@unique([electionId, userId]) constraint does
    // not reject the re-application; PENDING/APPROVED rows still block
    // duplicate submissions.
    const existing = await prisma.candidate.findUnique({
      where: { electionId_userId: { electionId, userId } },
    });
    if (existing && existing.status !== 'REJECTED') {
      return res.status(409).json({ error: 'You are already registered as a candidate' });
    }

    const responseData = election.formFields
      .filter((f) => responsesByFieldId.has(f.id))
      .map((f) => ({
        fieldId: f.id,
        value: responsesByFieldId.get(f.id) as any,
      }));

    const candidate = existing
      ? await prisma.candidate.update({
          where: { id: existing.id },
          data: {
            vision: vision ?? '',
            mission: mission ?? '',
            experience,
            program,
            slogan,
            posterUrl,
            status: 'PENDING',
            rejectionReason: null,
            approvedAt: null,
            approvedBy: null,
            formResponses: { deleteMany: {}, create: responseData },
          },
          include: { formResponses: { include: { field: true } } },
        })
      : await prisma.candidate.create({
          data: {
            electionId,
            userId,
            vision: vision ?? '',
            mission: mission ?? '',
            experience,
            program,
            slogan,
            posterUrl,
            status: 'PENDING',
            formResponses: { create: responseData },
          },
          include: { formResponses: { include: { field: true } } },
        });
    res.status(existing ? 200 : 201).json({ candidate });
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
    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;

    // Only the candidate's owner or an admin may withdraw. Without this check,
    // any authenticated user could delete any candidate by id.
    const candidate = await prisma.candidate.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!candidate) {
      res.status(404).json({ error: 'Candidate not found' });
      return;
    }
    if (candidate.userId !== userId && userRole !== 'SUPER_ADMIN') {
      res.status(403).json({ error: 'You can only withdraw your own candidacy' });
      return;
    }

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
