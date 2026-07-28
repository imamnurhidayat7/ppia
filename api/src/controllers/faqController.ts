import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

// GET /api/faq - list all FAQs (optionally filtered by category)
export const listFaqs = async (req: Request, res: Response): Promise<void> => {
  const { category } = req.query;
  const where: any = {};
  if (category) where.category = category as string;
  const faqs = await prisma.faq.findMany({
    where,
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  });
  res.json(faqs);
};

// GET /api/faq/:id
export const getFaq = async (req: Request, res: Response): Promise<void> => {
  const faq = await prisma.faq.findUnique({ where: { id: Number(req.params.id) } });
  if (!faq) {
    res.status(404).json({ error: 'FAQ not found' });
    return;
  }
  res.json(faq);
};

// POST /api/faq
export const createFaq = async (req: Request, res: Response): Promise<void> => {
  const { question, answer, category, order, published } = req.body;
  if (!question || !answer) {
    res.status(400).json({ error: 'question and answer are required' });
    return;
  }
  const faq = await prisma.faq.create({
    data: {
      question,
      answer,
      category: category ?? null,
      order: order ?? 0,
      published: published ?? true,
    },
  });
  res.status(201).json(faq);
};

// PUT /api/faq/:id
export const updateFaq = async (req: Request, res: Response): Promise<void> => {
  const { question, answer, category, order, published } = req.body;
  const faq = await prisma.faq.update({
    where: { id: Number(req.params.id) },
    data: {
      ...(question !== undefined && { question }),
      ...(answer !== undefined && { answer }),
      ...(category !== undefined && { category }),
      ...(order !== undefined && { order }),
      ...(published !== undefined && { published }),
    },
  });
  res.json(faq);
};

// DELETE /api/faq/:id
export const deleteFaq = async (req: Request, res: Response): Promise<void> => {
  await prisma.faq.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
};
