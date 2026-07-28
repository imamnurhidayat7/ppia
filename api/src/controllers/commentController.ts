import { Request, Response } from 'express';
import { NotificationType } from '@prisma/client';
import prisma from '../lib/prisma';
import { notify } from '../lib/notify';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
    divisionId?: string;
  };
}

/** Matches the character budget the comment forms enforce client-side. */
const MAX_COMMENT_LENGTH = 2000;
const DEFAULT_COMMENT_LIMIT = 20;
const MAX_COMMENT_LIMIT = 50;
const MAX_REPLIES_PER_THREAD = 100;

const parsePagination = (pageValue: unknown, limitValue: unknown) => {
  const parsedPage = Number.parseInt(String(pageValue ?? ''), 10);
  const parsedLimit = Number.parseInt(String(limitValue ?? ''), 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const requestedLimit = Number.isFinite(parsedLimit) && parsedLimit > 0
    ? parsedLimit
    : DEFAULT_COMMENT_LIMIT;
  const limit = Math.min(requestedLimit, MAX_COMMENT_LIMIT);
  return { page, limit, skip: (page - 1) * limit };
};

/**
 * Validate and normalise comment body text.
 *
 * Returns the trimmed content, or an error message to send back. Without a
 * server-side length check the client's `maxLength` is the only limit, and that
 * is trivially bypassed.
 */
const normaliseCommentContent = (raw: unknown): { content: string } | { error: string } => {
  if (typeof raw !== 'string') return { error: 'Content is required' };

  const content = raw.trim();
  if (!content) return { error: 'Content is required' };
  if (content.length > MAX_COMMENT_LENGTH) {
    return { error: `Comments are limited to ${MAX_COMMENT_LENGTH} characters` };
  }

  return { content };
};

/**
 * Check that a reply may attach to the given parent.
 *
 * Existence alone is not enough. The parent has to belong to the same article or
 * research item, otherwise a reply could be grafted onto a thread on a
 * completely different page — it would be stored, then rendered under whichever
 * article the parent belongs to. Replies to replies are also refused, because
 * both the read query and the UI only ever surface one level of nesting; a
 * deeper reply would be silently invisible.
 */
const validateParent = async (
  parentId: string,
  target: { articleId?: string | null; researchId?: string | null }
): Promise<string | null> => {
  const parent = await prisma.comment.findUnique({
    where: { id: parentId },
    select: { id: true, articleId: true, researchId: true, parentId: true, isHidden: true },
  });

  if (!parent) return 'Parent comment not found';
  if (parent.isHidden) return 'Cannot reply to a hidden comment';
  if (parent.parentId) return 'Replies cannot be nested further';

  const sameArticle = Boolean(target.articleId) && parent.articleId === target.articleId;
  const sameResearch = Boolean(target.researchId) && parent.researchId === target.researchId;

  if (!sameArticle && !sameResearch) {
    return 'Parent comment belongs to a different item';
  }

  return null;
};

/**
 * Notify the author of the comment being replied to.
 *
 * Skipped when the parent was posted by a guest (no `userId` to address) or when
 * somebody replies to their own comment — nobody needs telling about that.
 *
 * The article slug is resolved here so the notification can link straight to the
 * thread rather than to a list.
 */
const notifyCommentParentAuthor = async (params: {
  parentId: string;
  replyAuthorId?: string | null;
  replyAuthorName: string;
  content: string;
}): Promise<void> => {
  const parent = await prisma.comment.findUnique({
    where: { id: params.parentId },
    select: {
      userId: true,
      Article: { select: { slug: true, title: true } },
      Research: { select: { slug: true, title: true } },
    },
  });

  if (!parent?.userId) return;
  if (parent.userId === params.replyAuthorId) return;

  const target = parent.Article ?? parent.Research ?? null;
  const link = parent.Article
    ? `/dashboard/articles/${parent.Article.slug}`
    : parent.Research
      ? `/dashboard/research/${parent.Research.slug}`
      : null;

  await notify({
    userId: parent.userId,
    type: NotificationType.COMMENT_REPLY,
    title: `${params.replyAuthorName} replied to your comment`,
    body: target ? `On “${target.title}”: ${params.content}` : params.content,
    link,
  });
};

// ===========================================
// PUBLIC COMMENT METHODS
// ===========================================

// Get comments for an article
export const getArticleComments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { articleId } = req.params as { articleId: string };
    const { page, limit, skip } = parsePagination(req.query.page, req.query.limit);
    const where = { articleId, parentId: null, isHidden: false };

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          User: { select: { id: true, name: true, avatar: true } },
          replies: {
            where: { isHidden: false },
            take: MAX_REPLIES_PER_THREAD,
            orderBy: { createdAt: 'asc' },
            include: { User: { select: { id: true, name: true, avatar: true } } }
          }
        }
      }),
      prisma.comment.count({ where })
    ]);

    res.json({
      comments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Get article comments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get comments for a research
export const getResearchComments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { researchId } = req.params as { researchId: string };
    const { page, limit, skip } = parsePagination(req.query.page, req.query.limit);
    const where = { researchId, parentId: null, isHidden: false };

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          User: { select: { id: true, name: true, avatar: true } },
          replies: {
            where: { isHidden: false },
            take: MAX_REPLIES_PER_THREAD,
            orderBy: { createdAt: 'asc' },
            include: { User: { select: { id: true, name: true, avatar: true } } }
          }
        }
      }),
      prisma.comment.count({ where })
    ]);

    res.json({
      comments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Get research comments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a public comment (no authentication required)
export const createPublicComment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { articleId, researchId, userName, userEmail, parentId } = req.body;

    if (!userName || !userEmail) {
      res.status(400).json({ error: 'Content, name, and email are required' });
      return;
    }

    if (!articleId && !researchId) {
      res.status(400).json({ error: 'Either articleId or researchId is required' });
      return;
    }

    const normalised = normaliseCommentContent(req.body.content);
    if ('error' in normalised) {
      res.status(400).json({ error: normalised.error });
      return;
    }
    const { content } = normalised;

    if (parentId) {
      const parentError = await validateParent(parentId, { articleId, researchId });
      if (parentError) {
        res.status(parentError === 'Parent comment not found' ? 404 : 400).json({ error: parentError });
        return;
      }
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        userName,
        userEmail,
        articleId: articleId || null,
        researchId: researchId || null,
        parentId: parentId || null
      },
      include: {
        User: {
          select: { id: true, name: true, avatar: true }
        },
        replies: {
          include: {
            User: {
              select: { id: true, name: true, avatar: true }
            }
          }
        }
      }
    });

    // A guest reply still deserves a notification for the member who wrote the
    // parent comment. `userName` is caller-supplied here, so it is only ever
    // rendered as text, never as markup.
    if (parentId) {
      await notifyCommentParentAuthor({
        parentId,
        replyAuthorId: null,
        replyAuthorName: userName,
        content,
      });
    }

    res.status(201).json({ comment });
  } catch (error) {
    console.error('Create public comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ===========================================
// AUTHENTICATED USER COMMENTS
// ===========================================

// Create a comment as authenticated user
export const createComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const { articleId, researchId, parentId } = req.body;

    if (!articleId && !researchId) {
      res.status(400).json({ error: 'Either articleId or researchId is required' });
      return;
    }

    const normalised = normaliseCommentContent(req.body.content);
    if ('error' in normalised) {
      res.status(400).json({ error: normalised.error });
      return;
    }
    const { content } = normalised;

    if (parentId) {
      const parentError = await validateParent(parentId, { articleId, researchId });
      if (parentError) {
        res.status(parentError === 'Parent comment not found' ? 404 : 400).json({ error: parentError });
        return;
      }
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        userId,
        userName: user.name,
        userEmail: user.email,
        articleId: articleId || null,
        researchId: researchId || null,
        parentId: parentId || null
      },
      include: {
        User: {
          select: { id: true, name: true, avatar: true }
        },
        replies: {
          include: {
            User: {
              select: { id: true, name: true, avatar: true }
            }
          }
        }
      }
    });

    // Tell the person being replied to. Awaited so the notification is visible
    // by the time the client refetches, but it can only ever log on failure.
    if (parentId) {
      await notifyCommentParentAuthor({
        parentId,
        replyAuthorId: userId,
        replyAuthorName: user.name,
        content,
      });
    }

    res.status(201).json({ comment });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ===========================================
// ADMIN COMMENT MANAGEMENT
// ===========================================

// Get all comments (admin)
export const getAllComments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { page = '1', limit = '20', articleId, researchId, hidden } = req.query as Record<string, string | undefined>;
    const { page: pageNum, limit: limitNum, skip } = parsePagination(page, limit);

    const where: any = {};

    if (articleId) where.articleId = articleId;
    if (researchId) where.researchId = researchId;
    if (hidden === 'true') where.isHidden = true;
    else if (hidden === 'false') where.isHidden = false;

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          User: {
            select: { id: true, name: true, avatar: true, email: true }
          },
          Article: {
            select: { id: true, title: true, slug: true }
          },
          Research: {
            select: { id: true, title: true, slug: true }
          }
        }
      }),
      prisma.comment.count({ where })
    ]);

    res.json({
      comments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get all comments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Hide/unhide comment (admin)
export const toggleCommentVisibility = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params as { id: string };
    const { isHidden } = req.body;

    const comment = await prisma.comment.update({
      where: { id },
      data: { isHidden },
      include: {
        User: {
          select: { id: true, name: true, avatar: true }
        }
      }
    });

    res.json({ comment });
  } catch (error) {
    console.error('Toggle comment visibility error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete comment (admin)
export const deleteComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params as { id: string };

    // Delete comment and all replies (cascade)
    await prisma.comment.deleteMany({
      where: {
        OR: [
          { id },
          { parentId: id }
        ]
      }
    });

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get comment statistics (admin)
export const getCommentStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const [totalComments, articleComments, researchComments, hiddenComments, recentComments] = await Promise.all([
      prisma.comment.count(),
      prisma.comment.count({ where: { articleId: { not: null } } }),
      prisma.comment.count({ where: { researchId: { not: null } } }),
      prisma.comment.count({ where: { isHidden: true } }),
      prisma.comment.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
        }
      })
    ]);

    res.json({
      stats: {
        total: totalComments,
        articleComments,
        researchComments,
        hidden: hiddenComments,
        last7Days: recentComments
      }
    });
  } catch (error) {
    console.error('Get comment stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
