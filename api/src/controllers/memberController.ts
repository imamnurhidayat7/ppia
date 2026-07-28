import { Request, Response } from 'express';
import { Degree, NotificationType, Prisma, Role } from '@prisma/client';
import prisma from '../lib/prisma';
import { createPrivateSignedUrl } from '../lib/storage';
import { USER_DIRECTORY_SELECT, USER_SAFE_SELECT_WITH_DIVISION } from '../lib/user-select';
import {
  sendEmail,
  renderEmailLayout,
  renderEmailButton,
  renderWhatsAppButton,
  renderEmailHeading,
  renderEmailDetails,
  renderEmailFallbackLink,
  escapeHtml,
} from '../lib/mailer';
import { notify } from '../lib/notify';
import { getWhatsAppGroupLink } from '../lib/settings';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
  };
};

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Settings reads live in lib/settings.ts so this controller and the auth flow
// resolve the WhatsApp link the same way.

// Get all members (admin only)
export const getAllMembers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // Only admins can list all members
    if (userRole !== 'SUPER_ADMIN') {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    const { page = '1', limit = '10', role, search = '', membershipStatus } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      ...(role && { role: role as Role }),
      ...(membershipStatus && { membershipStatus: membershipStatus as any }),
      ...(search && {
        OR: [
          { name: { contains: search as string, mode: 'insensitive' } },
          { email: { contains: search as string, mode: 'insensitive' } },
          { username: { contains: search as string, mode: 'insensitive' } },
          { university: { contains: search as string, mode: 'insensitive' } }
        ]
      })
    };

    const [members, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        select: USER_SAFE_SELECT_WITH_DIVISION
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      members,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get member by ID (admin or own profile)
export const getMemberById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const { id } = req.params as { id: string };

    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // Users can only view their own profile, admins can view any
    if (userId !== id && userRole !== 'SUPER_ADMIN') {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    const member = await prisma.user.findUnique({
      where: { id },
      select: USER_SAFE_SELECT_WITH_DIVISION
    });

    if (!member) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    res.json({ member });
  } catch (error) {
    console.error('Get member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update member role & division (admin only)
export const updateMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (userRole !== 'SUPER_ADMIN') {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    const { id } = req.params as { id: string };
    const { role, position, divisionId } = req.body;

    // Validate role if provided
    if (role && !['SUPER_ADMIN', 'BOARD', 'MEMBER'].includes(role)) {
      res.status(400).json({ error: 'Invalid role' });
      return;
    }

    // Validate position if provided
    const validPositions = ['PRESIDENT', 'VICE_PRESIDENT', 'SECRETARY', 'TREASURER', 'COORDINATOR', 'MEMBER'];
    if (position && !validPositions.includes(position)) {
      res.status(400).json({ error: 'Invalid position' });
      return;
    }

    // If setting to BOARD, divisionId is required (unless they're a board member with position)
    if (role === 'BOARD' && !divisionId && !position) {
      res.status(400).json({ error: 'Division is required for BOARD role' });
      return;
    }

    // If setting to BOARD, verify division exists
    if (divisionId) {
      const division = await prisma.division.findUnique({ where: { id: divisionId } });
      if (!division) {
        res.status(400).json({ error: 'Division not found' });
        return;
      }
    }

    // If changing from BOARD to MEMBER, clear divisionId
    // Only the role is needed here, so nothing else is read out of the row.
    const currentUser = await prisma.user.findUnique({
      where: { id },
      select: { role: true }
    });
    let newDivisionId: string | null = divisionId || null;
    if (currentUser?.role === 'BOARD' && role === 'MEMBER') {
      newDivisionId = null;
    }

    // Handle coordinator role - if setting position to KOORDINATOR, set as division coordinator
    if (position === 'KOORDINATOR' && divisionId) {
      // Remove current coordinator from that division if exists
      await prisma.division.update({
        where: { id: divisionId },
        data: { coordinatorId: null }
      });
    }

    const member = await prisma.user.update({
      where: { id },
      data: {
        ...(role && { role: role as Role }),
        ...(position && { position }),
        divisionId: newDivisionId,
        ...(position === 'KOORDINATOR' && divisionId ? {
          coordinatedDivision: {
            connect: { id: divisionId }
          }
        } : {})
      },
      select: USER_SAFE_SELECT_WITH_DIVISION
    });

    // If user is set as coordinator, update division's coordinatorId
    if (position === 'KOORDINATOR' && divisionId) {
      await prisma.division.update({
        where: { id: divisionId },
        data: { coordinatorId: id }
      });
    }

    res.json({ member });
  } catch (error) {
    console.error('Update member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete member (admin only)
export const deleteMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (userRole !== 'SUPER_ADMIN') {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    const { id } = req.params as { id: string };

    // Prevent self-deletion
    if (userId === id) {
      res.status(400).json({ error: 'Cannot delete yourself' });
      return;
    }

    // Existence check only — no field of this row is read or returned.
    const member = await prisma.user.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!member) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    await prisma.user.delete({ where: { id } });

    res.json({ message: 'Member deleted successfully' });
  } catch (error) {
    console.error('Delete member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get members count (public stats)
export const getMembersStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [total, byRole, byUniversity] = await Promise.all([
      prisma.user.count(),
      prisma.user.groupBy({
        by: ['role'],
        _count: { role: true }
      }),
      prisma.user.groupBy({
        by: ['university'],
        _count: { university: true },
        where: { university: { not: null } }
      })
    ]);

    res.json({
      total,
      byRole: byRole.reduce((acc, item) => {
        acc[item.role] = item._count.role;
        return acc;
      }, {} as Record<string, number>),
      byUniversity: byUniversity.map(item => ({
        university: item.university,
        count: item._count.university
      }))
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Approve a pending member (SUPER_ADMIN only)
export const approveMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const approverId = req.user?.userId;

    if (!approverId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params as { id: string };

    const member = await prisma.user.update({
      where: { id },
      data: {
        membershipStatus: 'APPROVED',
        approvedAt: new Date(),
        approvedBy: approverId,
        rejectionReason: null
      },
      select: USER_SAFE_SELECT_WITH_DIVISION
    });

    // Tell the member they are in. The WhatsApp invite is an optional extra —
    // previously the whole e-mail was skipped when no link was configured,
    // which left approved members with no notification at all.
    const whatsappGroupLink = await getWhatsAppGroupLink();
    const whatsappBlock = whatsappGroupLink
      ? `
        <p style="margin:0 0 8px;">Join the WhatsApp community to stay in the loop:</p>
        ${renderWhatsAppButton(escapeHtml(whatsappGroupLink))}
        ${renderEmailFallbackLink(escapeHtml(whatsappGroupLink), 'Or paste this invite into your browser:')}
      `
      : '';

    const html = renderEmailLayout(
      `
        ${renderEmailHeading('Your membership is approved')}
        <p style="margin:0 0 16px;">Hi ${escapeHtml(member.name)},</p>
        <p style="margin:0 0 16px;">Welcome to PPIA Auckland. Your membership has been approved, so you can sign in now and open the member dashboard.</p>
        ${renderEmailButton(`${FRONTEND_URL}/login`, 'Sign in to your dashboard')}
        ${whatsappBlock}
      `,
      { preheader: 'Your PPIA Auckland membership has been approved. Sign in any time.' }
    );

    await sendEmail({
      to: member.email,
      subject: 'Your PPIA Auckland membership is approved',
      html,
      category: 'membership-approved',
    });

    // In-app copy of the same news, so it is still there after the e-mail is
    // archived — and visible even if mail delivery failed.
    await notify({
      userId: member.id,
      type: NotificationType.MEMBERSHIP_APPROVED,
      title: 'Your membership has been approved',
      body: 'You now have full access to the member dashboard.',
      link: '/dashboard',
    });

    res.json({ message: 'Member approved successfully', member });
  } catch (error) {
    console.error('Approve member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Reject a pending member (SUPER_ADMIN only)
export const rejectMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const approverId = req.user?.userId;

    if (!approverId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params as { id: string };
    const { reason } = req.body as { reason?: string };

    const member = await prisma.user.update({
      where: { id },
      data: {
        membershipStatus: 'REJECTED',
        rejectionReason: reason || null
      },
      select: USER_SAFE_SELECT_WITH_DIVISION
    });

    // Without this the applicant only finds out by trying to log in, where the
    // reason is shown on a 403. Tell them directly instead.
    const reasonBlock = reason ? renderEmailDetails([['Reason given', escapeHtml(reason)]]) : '';

    const html = renderEmailLayout(
      `
        ${renderEmailHeading('About your registration')}
        <p style="margin:0 0 16px;">Hi ${escapeHtml(member.name)},</p>
        <p style="margin:0 0 16px;">Your PPIA Auckland registration was not approved at this time.</p>
        ${reasonBlock}
        <p style="margin:0;">If you think this is a mistake, or you have updated details to share, get in touch with the committee through the contact form on our website and we'll take another look.</p>
      `,
      { preheader: 'An update on your PPIA Auckland registration.' }
    );

    await sendEmail({
      to: member.email,
      subject: 'Update on your PPIA Auckland registration',
      html,
      category: 'membership-rejected',
    });

    await notify({
      userId: member.id,
      type: NotificationType.MEMBERSHIP_REJECTED,
      title: 'Your registration was not approved',
      body: reason || 'Contact the committee if you would like this reviewed.',
      link: '/dashboard/profile',
    });

    res.json({ message: 'Member rejected', member });
  } catch (error) {
    console.error('Reject member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ===========================================
// MEMBER DIRECTORY
// ===========================================

/**
 * Browsable list of fellow members, readable by any signed-in member.
 *
 * Distinct from `getAllMembers`, which is an administration screen restricted to
 * SUPER_ADMIN and returns contact details. This endpoint returns
 * `USER_DIRECTORY_SELECT` — no e-mail, phone, student id or funding — because
 * "find people studying the same thing as me" does not require handing out the
 * personal details of everyone in the organisation.
 *
 * Only APPROVED members appear. Pending and rejected applications are not
 * public information, not even internally.
 */
export const getMemberDirectory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const {
      q,
      divisionId,
      university,
      degree,
      page = '1',
      limit = '24',
    } = req.query as Record<string, string | undefined>;

    // Clamp pagination so a caller cannot request the entire table in one go.
    const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
    const pageSize = Math.min(60, Math.max(1, Number.parseInt(limit, 10) || 24));

    const search = (q || '').trim();

    const where: Prisma.UserWhereInput = {
      membershipStatus: 'APPROVED',
      ...(divisionId ? { divisionId } : {}),
      ...(university ? { university } : {}),
      // `degree` is an enum; an unrecognised value would make Prisma throw, so
      // it is only applied when it matches a real member of the enum.
      ...(degree && degree in Degree ? { degree: degree as Degree } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { username: { contains: search, mode: 'insensitive' as const } },
              { university: { contains: search, mode: 'insensitive' as const } },
              { major: { contains: search, mode: 'insensitive' as const } },
              // `position` is an enum, not free text, so it cannot take part in
              // a substring search — it is offered as a filter instead.
            ],
          }
        : {}),
    };

    const [members, total, universities] = await Promise.all([
      prisma.user.findMany({
        where,
        select: USER_DIRECTORY_SELECT,
        // Committee members first so the people who run things are easy to find,
        // then alphabetically.
        orderBy: [{ position: { sort: 'asc', nulls: 'last' } }, { name: 'asc' }],
        skip: (pageNumber - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
      // Filter options, derived from the approved population rather than
      // hard-coded, so the list stays accurate as members join.
      prisma.user.findMany({
        where: { membershipStatus: 'APPROVED' },
        select: { university: true },
        distinct: ['university'],
        orderBy: { university: 'asc' },
      }),
    ]);

    res.json({
      members,
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
      filters: {
        universities: universities.map((row) => row.university).filter(Boolean),
      },
    });
  } catch (error) {
    console.error('Get member directory error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Issue a short-lived signed URL for a member's proof-of-studentship document
 * (loaCoe), which lives in a private Storage bucket. Super Admin only, since
 * this is personal data. Generated on demand rather than stored, so links
 * cannot be shared or leak from the page source.
 */
export const getMemberDocumentUrl = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const { id } = req.params as { id: string };

    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (userRole !== 'SUPER_ADMIN') {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    const member = await prisma.user.findUnique({
      where: { id },
      select: { loaCoe: true },
    });

    if (!member) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    if (!member.loaCoe) {
      res.status(404).json({ error: 'No document uploaded for this member' });
      return;
    }

    // Legacy or externally hosted absolute URLs are returned unchanged.
    if (/^https?:\/\//i.test(member.loaCoe)) {
      res.json({ url: member.loaCoe });
      return;
    }

    const signedUrl = await createPrivateSignedUrl(member.loaCoe, 120);
    if (!signedUrl) {
      res.status(500).json({ error: 'Could not generate a link for this document' });
      return;
    }

    res.json({ url: signedUrl });
  } catch (error) {
    console.error('Get member document URL error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
