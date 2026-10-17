import { Request, Response } from 'express';
import prisma from '../lib/prisma';

// Global search across events, articles, and members
export const globalSearch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, type, page = 1, limit = 10 } = req.query;

    if (!q || typeof q !== 'string') {
      res.status(400).json({ error: 'Search query is required' });
      return;
    }

    const searchTerm = q.trim();
    const skip = (Number(page) - 1) * Number(limit);

    // If type is specified, search only that type
    if (type) {
      switch (type) {
        case 'events':
          const events = await prisma.event.findMany({
            where: {
              published: true,
              OR: [
                { title: { contains: searchTerm, mode: 'insensitive' } },
                { description: { contains: searchTerm, mode: 'insensitive' } },
                { location: { contains: searchTerm, mode: 'insensitive' } }
              ]
            },
            select: {
              id: true,
              title: true,
              slug: true,
              description: true,
              startDate: true,
              location: true,
              imageUrl: true
            },
            orderBy: { startDate: 'desc' },
            skip,
            take: Number(limit)
          });
          res.json({ type: 'events', results: events, query: searchTerm });
          return;

        case 'articles':
          const articles = await prisma.article.findMany({
            where: {
              published: true,
              OR: [
                { title: { contains: searchTerm, mode: 'insensitive' } },
                { excerpt: { contains: searchTerm, mode: 'insensitive' } }
              ]
            },
            select: {
              id: true,
              title: true,
              slug: true,
              excerpt: true,
              category: true,
              imageUrl: true,
              createdAt: true,
              User: {
                select: {
                  name: true
                }
              }
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: Number(limit)
          });
          res.json({ type: 'articles', results: articles, query: searchTerm });
          return;

        case 'members':
          const members = await prisma.user.findMany({
            where: {
              OR: [
                { name: { contains: searchTerm, mode: 'insensitive' } },
                { university: { contains: searchTerm, mode: 'insensitive' } },
                { major: { contains: searchTerm, mode: 'insensitive' } }
              ]
            },
            select: {
              id: true,
              name: true,
              avatar: true,
              university: true,
              major: true,
              role: true
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: Number(limit)
          });
          res.json({ type: 'members', results: members, query: searchTerm });
          return;

        default:
          res.status(400).json({ error: 'Invalid search type' });
          return;
      }
    }

    // Search all types
    const [events, articles, members] = await Promise.all([
      prisma.event.findMany({
        where: {
          published: true,
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          startDate: true,
          location: true,
          imageUrl: true
        },
        take: 5,
        orderBy: { startDate: 'desc' }
      }),
      prisma.article.findMany({
        where: {
          published: true,
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { excerpt: { contains: searchTerm, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          category: true,
          imageUrl: true,
          createdAt: true
        },
        take: 5,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { university: { contains: searchTerm, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          name: true,
          avatar: true,
          university: true,
          role: true
        },
        take: 5
      })
    ]);

    res.json({
      query: searchTerm,
      results: {
        events: {
          count: events.length,
          items: events
        },
        articles: {
          count: articles.length,
          items: articles
        },
        members: {
          count: members.length,
          items: members
        }
      }
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
