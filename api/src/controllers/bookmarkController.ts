/**
 * Saved articles ("reading list").
 *
 * Every handler is scoped to the caller's own user id taken from the token, not
 * from the request body — a member can only ever read or change their own saves.
 */
import { Request, Response } from 'express';
import prisma from '../lib/prisma';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
    divisionId?: string;
  };
}

/**
 * Article fields needed to render a saved item.
 *
 * Deliberately not the whole record: the reading list is a list of links, so it
 * does not need `content`, which is the largest column on the table.
 */
const SAVED_ARTICLE_SELECT = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  imageUrl: true,
  category: true,
  readingTime: true,
  createdAt: true,
  published: true,
  User: {
    select: { id: true, name: true, avatar: true },
  },
} as const;

/**
 * GET /api/bookmarks — the caller's reading list, newest save first.
 */
export const getBookmarks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { page = '1', limit = '20' } = req.query as Record<string, string | undefined>;
    const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, Number.parseInt(limit, 10) || 20));

    // An article can be unpublished after being saved. Hiding those keeps the
    // list consistent with what the member can actually open, without deleting
    // the save — if the article comes back, so does the entry.
    const where = { userId, Article: { published: true } };

    const [bookmarks, total] = await Promise.all([
      prisma.bookmark.findMany({
        where,
        select: {
          id: true,
          createdAt: true,
          Article: { select: SAVED_ARTICLE_SELECT },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNumber - 1) * pageSize,
        take: pageSize,
      }),
      prisma.bookmark.count({ where }),
    ]);

    res.json({
      bookmarks: bookmarks.map((bookmark) => ({
        id: bookmark.id,
        savedAt: bookmark.createdAt,
        article: bookmark.Article,
      })),
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (error) {
    console.error('Get bookmarks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/bookmarks/ids — just the article ids the caller has saved.
 *
 * Article listings need to render the save button in the right state for many
 * cards at once. Fetching the full reading list to answer "is this one saved?"
 * would be wasteful, so this returns the set on its own.
 */
export const getBookmarkedArticleIds = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const bookmarks = await prisma.bookmark.findMany({
      where: { userId },
      select: { articleId: true },
    });

    res.json({ articleIds: bookmarks.map((bookmark) => bookmark.articleId) });
  } catch (error) {
    console.error('Get bookmark ids error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/bookmarks/:articleId — save an article.
 *
 * Idempotent: saving something already saved returns the existing record with
 * 200 instead of failing on the unique constraint. A double-click should not be
 * an error.
 */
export const addBookmark = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { articleId } = req.params as { articleId: string };

    // Confirm the article exists and is readable before recording a save,
    // otherwise the list can accumulate references to nothing.
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: { id: true, published: true },
    });

    if (!article || !article.published) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }

    const existing = await prisma.bookmark.findUnique({
      where: { userId_articleId: { userId, articleId } },
      select: { id: true, createdAt: true },
    });

    if (existing) {
      res.json({ bookmarked: true, savedAt: existing.createdAt });
      return;
    }

    const bookmark = await prisma.bookmark.create({
      data: { userId, articleId },
      select: { id: true, createdAt: true },
    });

    res.status(201).json({ bookmarked: true, savedAt: bookmark.createdAt });
  } catch (error) {
    console.error('Add bookmark error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * DELETE /api/bookmarks/:articleId — remove a save.
 *
 * Also idempotent: removing something that is not saved is the state the caller
 * asked for, so it succeeds rather than 404s.
 */
export const removeBookmark = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { articleId } = req.params as { articleId: string };

    // deleteMany rather than delete: it does not throw when nothing matches, and
    // the userId in the filter is what scopes this to the caller's own save.
    await prisma.bookmark.deleteMany({ where: { userId, articleId } });

    res.json({ bookmarked: false });
  } catch (error) {
    console.error('Remove bookmark error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
