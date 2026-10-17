import { Request, Response } from 'express';
import prisma from '../lib/prisma';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
    divisionId?: string;
  };
}

// ===========================================
// ANALYTICS METHODS
// ===========================================

// Get article analytics
export const getArticleAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period as string);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      totalArticles,
      publishedArticles,
      draftArticles,
      featuredArticles,
      totalViews,
      totalLikes,
      recentArticles
    ] = await Promise.all([
      prisma.article.count(),
      prisma.article.count({ where: { published: true } }),
      prisma.article.count({ where: { published: false } }),
      prisma.article.count({ where: { isFeatured: true } }),
      prisma.article.aggregate({ _sum: { views: true } }),
      prisma.article.aggregate({ _sum: { likes: true } }),
      prisma.article.findMany({
        where: { createdAt: { gte: startDate } },
        orderBy: { views: 'desc' },
        take: 10,
        select: {
          id: true,
          title: true,
          slug: true,
          views: true,
          likes: true,
          createdAt: true
        }
      })
    ]);

    // Get top articles by views
    const topArticles = await prisma.article.findMany({
      orderBy: { views: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        slug: true,
        views: true,
        likes: true,
        imageUrl: true,
        createdAt: true
      }
    });

    // Get articles created per day for the last N days
    const articlesPerDay = await prisma.$queryRaw<{ date: Date; count: number }[]>`
      SELECT DATE("createdAt") as date, COUNT(*)::int as count
      FROM "Article"
      WHERE "createdAt" >= ${startDate}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;

    res.json({
      summary: {
        total: totalArticles,
        published: publishedArticles,
        drafts: draftArticles,
        featured: featuredArticles,
        totalViews: totalViews._sum.views || 0,
        totalLikes: totalLikes._sum.likes || 0
      },
      topArticles,
      recentArticles,
      articlesPerDay
    });
  } catch (error) {
    console.error('Get article analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get research analytics
export const getResearchAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period as string);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      totalResearch,
      publishedResearch,
      pendingResearch,
      totalViews,
      totalDownloads,
      totalCitations,
      recentResearch
    ] = await Promise.all([
      prisma.research.count(),
      prisma.research.count({ where: { published: true } }),
      prisma.research.count({ where: { researchStatus: 'PENDING_REVIEW' } }),
      prisma.research.aggregate({ _sum: { viewCount: true } }),
      prisma.research.aggregate({ _sum: { downloadCount: true } }),
      prisma.research.aggregate({ _sum: { citationsCount: true } }),
      prisma.research.findMany({
        where: { createdAt: { gte: startDate } },
        orderBy: { viewCount: 'desc' },
        take: 10,
        select: {
          id: true,
          title: true,
          slug: true,
          viewCount: true,
          downloadCount: true,
          createdAt: true
        }
      })
    ]);

    // Get top research by views
    const topResearch = await prisma.research.findMany({
      orderBy: { viewCount: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        slug: true,
        viewCount: true,
        downloadCount: true,
        citationsCount: true,
        pdfUrl: true,
        createdAt: true
      }
    });

    // Research by type
    const researchByType = await prisma.research.groupBy({
      by: ['researchType'],
      _count: true
    });

    // Research by status
    const researchByStatus = await prisma.research.groupBy({
      by: ['researchStatus'],
      _count: true
    });

    res.json({
      summary: {
        total: totalResearch,
        published: publishedResearch,
        pending: pendingResearch,
        totalViews: totalViews._sum.viewCount || 0,
        totalDownloads: totalDownloads._sum.downloadCount || 0,
        totalCitations: totalCitations._sum.citationsCount || 0
      },
      topResearch,
      recentResearch,
      researchByType,
      researchByStatus
    });
  } catch (error) {
    console.error('Get research analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get dashboard overview (admin dashboard)
export const getDashboardAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(today.setDate(today.getDate() - 7));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      // Content counts
      totalArticles,
      totalResearch,
      totalMembers,
      totalEvents,

      // Today's stats
      articlesToday,
      researchToday,
      newMembersToday,
      eventsUpcoming,

      // Recent activity
      recentArticles,
      recentResearch,
      recentMembers
    ] = await Promise.all([
      prisma.article.count(),
      prisma.research.count(),
      prisma.user.count({ where: { role: 'MEMBER' } }),
      prisma.event.count({ where: { startDate: { gte: new Date() } } }),

      prisma.article.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.research.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.user.count({ where: { createdAt: { gte: startOfToday }, role: 'MEMBER' } }),
      prisma.event.count({ where: { startDate: { gte: startOfToday }, published: true } }),

      prisma.article.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, title: true, slug: true, createdAt: true, views: true }
      }),
      prisma.research.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, title: true, slug: true, createdAt: true, viewCount: true }
      }),
      prisma.user.findMany({
        where: { role: 'MEMBER' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, name: true, email: true, createdAt: true }
      })
    ]);

    // Calculate engagement rates
    const totalArticleViews = await prisma.article.aggregate({ _sum: { views: true } });
    const totalResearchViews = await prisma.research.aggregate({ _sum: { viewCount: true } });
    const totalDownloads = await prisma.research.aggregate({ _sum: { downloadCount: true } });

    res.json({
      overview: {
        totalArticles,
        totalResearch,
        totalMembers,
        totalEvents,
        upcomingEvents: eventsUpcoming
      },
      today: {
        articles: articlesToday,
        research: researchToday,
        newMembers: newMembersToday
      },
      engagement: {
        totalArticleViews: totalArticleViews._sum.views || 0,
        totalResearchViews: totalResearchViews._sum.viewCount || 0,
        totalDownloads: totalDownloads._sum.downloadCount || 0
      },
      recentActivity: {
        articles: recentArticles,
        research: recentResearch,
        members: recentMembers
      }
    });
  } catch (error) {
    console.error('Get dashboard analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Track research download
export const trackDownload = async (req: Request, res: Response): Promise<void> => {
  try {
    const { researchId } = req.params as { researchId: string };
    const { userId } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');

    // Update download count
    await prisma.research.update({
      where: { id: researchId },
      data: { downloadCount: { increment: 1 } }
    });

    // Create download record
    await prisma.researchDownload.create({
      data: {
        researchId,
        userId: userId || null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Track download error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get download analytics for a specific research
export const getResearchDownloadAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { researchId } = req.params as { researchId: string };

    const [downloads, totalDownloads, uniqueDownloads] = await Promise.all([
      prisma.researchDownload.findMany({
        where: { researchId },
        orderBy: { downloadedAt: 'desc' },
        take: 50,
        include: {
          User: {
            select: { id: true, name: true, email: true }
          }
        }
      }),
      prisma.researchDownload.count({ where: { researchId } }),
      prisma.researchDownload.groupBy({
        by: ['userId'],
        where: { researchId, userId: { not: null } },
        _count: true
      })
    ]);

    // Downloads per day (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const downloadsPerDay = await prisma.$queryRaw<{ date: Date; count: number }[]>`
      SELECT DATE("downloadedAt") as date, COUNT(*)::int as count
      FROM "ResearchDownload"
      WHERE "researchId" = ${researchId} AND "downloadedAt" >= ${thirtyDaysAgo}
      GROUP BY DATE("downloadedAt")
      ORDER BY date ASC
    `;

    res.json({
      downloads,
      totalDownloads,
      uniqueUsers: uniqueDownloads.length,
      downloadsPerDay
    });
  } catch (error) {
    console.error('Get research download analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get content engagement over time
export const getEngagementOverTime = async (req: Request, res: Response): Promise<void> => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period as string);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get article views per day
    const articleViews = await prisma.article.findMany({
      where: { createdAt: { gte: startDate } },
      select: {
        createdAt: true,
        views: true
      }
    });

    // Get research views per day
    const researchViews = await prisma.research.findMany({
      where: { createdAt: { gte: startDate } },
      select: {
        createdAt: true,
        viewCount: true,
        downloadCount: true
      }
    });

    res.json({
      articleViews,
      researchViews,
      period: days
    });
  } catch (error) {
    console.error('Get engagement over time error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
