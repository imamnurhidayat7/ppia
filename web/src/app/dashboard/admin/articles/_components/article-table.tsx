'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ExternalLink, Eye, FileText, Pencil, Star, Trash2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui';
import { IconAction, RowActions, TableShell, Td, Th, Tr } from '@/components/dashboard';
import { formatDate, getImageUrl } from '@/lib/utils';
import type { AdminArticle } from './shared';
import { stripHtml } from './shared';

/**
 * Thumbnails come from arbitrary URLs (uploads or pasted links), so they are
 * served unoptimized and fall back to an icon when the file is missing.
 */
function ArticleThumb({ item, icon: Icon }: { item: AdminArticle; icon: LucideIcon }) {
  const [failed, setFailed] = useState(false);
  const src = getImageUrl(item.imageUrl);

  if (!src || failed) {
    return (
      <span className="flex h-11 w-16 shrink-0 items-center justify-center rounded-lg bg-[#0D1B33] text-white/40">
        <Icon className="h-4 w-4" />
      </span>
    );
  }
  return (
    <span className="relative h-11 w-16 shrink-0 overflow-hidden rounded-lg bg-[#0D1B33]">
      <Image
        src={src}
        alt=""
        fill
        unoptimized
        sizes="64px"
        className="object-cover"
        onError={() => setFailed(true)}
      />
    </span>
  );
}

interface ArticleTableProps {
  items: AdminArticle[];
  /** Icon used by the thumbnail placeholder, e.g. Newspaper or BookOpen. */
  icon?: LucideIcon;
  editHref: (item: AdminArticle) => string;
  /** Public site URL, omitted for content that has no public page yet. */
  publicHref?: (item: AdminArticle) => string;
  onDelete: (item: AdminArticle) => void;
  /** Adds an eye action, used by the content overview to open the detail modal. */
  onView?: (item: AdminArticle) => void;
  showDivision?: boolean;
  /** Word used in the aria-labels, e.g. 'article' or 'research item'. */
  noun?: string;
  footer?: React.ReactNode;
}

export function ArticleTable({
  items,
  icon = FileText,
  editHref,
  publicHref,
  onDelete,
  onView,
  showDivision = false,
  noun = 'article',
  footer,
}: ArticleTableProps) {
  return (
    <TableShell
      head={
        <>
          <Th>Title</Th>
          {showDivision && <Th>Division</Th>}
          <Th>Status</Th>
          <Th>Author</Th>
          <Th>Created</Th>
          <Th align="center">Views</Th>
          <Th align="right">Actions</Th>
        </>
      }
      footer={footer}
    >
      {items.map((item) => {
        const snippet = stripHtml(item.excerpt || '');
        return (
          <Tr key={item.id}>
            <Td>
              <div className="flex items-start gap-3">
                <ArticleThumb item={item} icon={icon} />
                <div className="min-w-0">
                  <Link
                    href={editHref(item)}
                    className="block truncate text-sm font-semibold text-slate-900 hover:underline dark:text-slate-100"
                  >
                    {item.title}
                  </Link>
                  <p className="truncate text-xs text-slate-400">/{item.slug}</p>
                  {snippet && (
                    <p className="mt-0.5 line-clamp-1 max-w-xs text-xs text-slate-500 dark:text-slate-400">
                      {snippet}
                    </p>
                  )}
                </div>
              </div>
            </Td>
            {showDivision && (
              <Td>
                {item.division ? (
                  <span
                    className="inline-flex rounded-full px-2 py-1 text-xs font-medium"
                    style={{
                      backgroundColor: `${item.division.color || '#6366F1'}20`,
                      color: item.division.color || '#6366F1',
                    }}
                  >
                    {item.division.name}
                  </span>
                ) : (
                  <span className="text-slate-400">&mdash;</span>
                )}
              </Td>
            )}
            <Td>
              <div className="flex flex-wrap items-center gap-1.5">
                {item.published ? (
                  <Badge variant="success">Published</Badge>
                ) : (
                  <Badge variant="warning">Draft</Badge>
                )}
                {item.isFeatured && (
                  <Badge variant="primary" className="gap-1">
                    <Star className="h-3 w-3" />
                    Featured
                  </Badge>
                )}
              </div>
            </Td>
            <Td>
              <span className="truncate text-sm">{item.author?.name || 'Admin'}</span>
            </Td>
            <Td>
              <span className="whitespace-nowrap">{formatDate(item.createdAt)}</span>
            </Td>
            <Td align="center">
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {(item.views || 0).toLocaleString('en-NZ')}
              </span>
            </Td>
            <Td align="right">
              <RowActions>
                {onView && (
                  <IconAction
                    icon={Eye}
                    label={`View summary of ${item.title}`}
                    onClick={() => onView(item)}
                  />
                )}
                <IconAction
                  icon={Pencil}
                  label={`Edit ${item.title}`}
                  href={editHref(item)}
                />
                {publicHref && (
                  <IconAction
                    icon={ExternalLink}
                    label={`View public page of ${item.title}`}
                    href={publicHref(item)}
                  />
                )}
                <IconAction
                  icon={Trash2}
                  label={`Delete ${noun} ${item.title}`}
                  tone="danger"
                  onClick={() => onDelete(item)}
                />
              </RowActions>
            </Td>
          </Tr>
        );
      })}
    </TableShell>
  );
}
