'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Calendar,
  Clock,
  FileText,
  MessageCircle,
  Newspaper,
  Reply,
  Send,
  Tag,
  User,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import Image from 'next/image';
import RichText from '@/components/RichText';
import BookmarkButton from '@/components/BookmarkButton';
import { useBookmarks } from '@/lib/hooks/use-bookmarks';
import { cn, formatDate, getImageUrl } from '@/lib/utils';
import { Avatar, Badge, Button } from '@/components/ui';
import {
  EmptyBlock,
  PageHeading,
  PageLoading,
  PageStack,
  SectionCard,
} from '@/components/dashboard';
import Link from 'next/link';

interface AuthorRef {
  name: string;
  avatar?: string | null;
}

interface TagRef {
  id: string;
  name: string;
  slug: string;
  color?: string | null;
}

interface ArticleDetail {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  content: unknown;
  imageUrl?: string | null;
  category?: string | null;
  /** The API returns the relation as `User`; older payloads used `author`. */
  User?: AuthorRef | null;
  author?: AuthorRef | null;
  createdAt: string;
  /** Reading time in seconds. */
  readingTime?: number | null;
  readTime?: number | null;
  tags?: TagRef[];
}

interface Comment {
  id: string;
  content: string;
  userName: string;
  createdAt: string;
  /** Author relation, present when the comment was posted by a signed-in member. */
  User?: AuthorRef | null;
  /**
   * One level of nesting only — that is all the API returns and all the UI
   * shows, and `validateParent` on the server refuses anything deeper.
   */
  replies?: Comment[];
}

interface ArticleResponse {
  article?: ArticleDetail;
}

interface CommentsResponse {
  comments?: Comment[];
}

const CATEGORY_LABELS: Record<string, string> = {
  News: 'News',
  Articles: 'Articles',
};

/**
 * Typography for CMS-authored bodies. The project has no typography plugin, so
 * element styles are declared explicitly here.
 */
const RICH_TEXT_CLASS = cn(
  'max-w-none text-sm leading-relaxed ink-body',
  '[&_p]:my-3 [&_strong]:font-bold [&_em]:italic',
  '[&_h1]:font-display [&_h1]:text-2xl [&_h1]:font-black [&_h1]:mt-6 [&_h1]:mb-2',
  '[&_h2]:font-display [&_h2]:text-xl [&_h2]:font-black [&_h2]:mt-6 [&_h2]:mb-2',
  '[&_h3]:font-display [&_h3]:text-lg [&_h3]:font-bold [&_h3]:mt-5 [&_h3]:mb-2',
  // Descendant selectors cannot carry the ink component classes, so the
  // heading colours stay explicit here.
  '[&_h1]:text-slate-900 [&_h2]:text-slate-900 [&_h3]:text-slate-900',
  'dark:[&_h1]:text-slate-50 dark:[&_h2]:text-slate-50 dark:[&_h3]:text-slate-50',
  '[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6',
  '[&_a]:text-[#E8231A] [&_a]:underline',
  '[&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-[#E8231A] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-500 dark:[&_blockquote]:text-slate-400',
  '[&_img]:rounded-[5px]'
);

/**
 * Flatten CMS content into plain text.
 *
 * Content is stored as JSON, so a string check alone leaves rich-text
 * documents rendering as "no content".
 */
function parseContent(content: unknown): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (typeof content === 'object') {
    const node = content as { type?: string; content?: unknown[]; text?: string };
    if (typeof node.text === 'string' && !node.content) return node.text;
    if (Array.isArray(node.content)) {
      const parts = node.content.map((child) => parseContent(child));
      return node.type === 'doc' ? parts.join('\n\n') : parts.join('');
    }
  }
  return '';
}

/** Character budget, mirrored by `MAX_COMMENT_LENGTH` on the server. */
const MAX_COMMENT_LENGTH = 2000;

interface CommentComposerProps {
  authorName: string;
  authorAvatar?: string | null;
  placeholder: string;
  submitLabel: string;
  /** Resolves true when the comment was accepted, so the draft can be cleared. */
  onSubmit: (content: string) => Promise<boolean>;
  onCancel?: () => void;
  autoFocus?: boolean;
  compact?: boolean;
}

/**
 * Shared composer for both a new comment and a reply.
 *
 * Draft state lives here rather than on the page so each open reply box keeps
 * its own text, and closing one never clears another.
 */
function CommentComposer({
  authorName,
  authorAvatar,
  placeholder,
  submitLabel,
  onSubmit,
  onCancel,
  autoFocus = false,
  compact = false,
}: CommentComposerProps) {
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || posting) return;

    setPosting(true);
    setError(null);
    try {
      const accepted = await onSubmit(content);
      if (accepted) {
        setDraft('');
      } else {
        setError('Could not post your comment.');
      }
    } catch (err) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error || 'Could not post your comment.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={compact ? 'mt-3' : 'mb-5'}>
      <div className="flex gap-3">
        <Avatar name={authorName} src={authorAvatar ?? undefined} size={compact ? 'xs' : 'sm'} />
        <div className="min-w-0 flex-1">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={compact ? 2 : 3}
            maxLength={MAX_COMMENT_LENGTH}
            placeholder={placeholder}
            aria-label={placeholder}
            autoFocus={autoFocus}
            className="input-base resize-y"
          />
          {error && (
            <p className="mt-1.5 text-[12px] text-danger-600 dark:text-danger-400">{error}</p>
          )}
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="data-type text-[12px] ink-muted">Posting as {authorName}</span>
            <div className="flex items-center gap-2">
              {onCancel && (
                <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                size="sm"
                disabled={posting || draft.trim().length === 0}
                leftIcon={<Send className="h-4 w-4" />}
              >
                {posting ? 'Posting…' : submitLabel}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}

export default function DashboardArticleDetailPage() {
  const params = useParams();
  const slug = typeof params.slug === 'string' ? params.slug : undefined;

  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  /** Id of the comment currently being replied to, if any. */
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const { user } = useAuth();
  const { isSaved, toggle } = useBookmarks();

  const reloadComments = useCallback(async (articleId: string) => {
    try {
      const res = (await api.getArticleComments(articleId)) as CommentsResponse;
      setComments(res.comments || []);
    } catch (err) {
      console.error('Failed to load comments:', err);
    }
  }, []);

  /**
   * Posts as the signed-in member, optionally as a reply.
   *
   * Uses `createComment` rather than the public endpoint the marketing site
   * calls: the server reads the author's name and e-mail from the session, so a
   * member never retypes them and cannot post under someone else's name.
   *
   * Errors propagate to the composer, which owns the message display.
   */
  const postComment = useCallback(
    async (content: string, parentId?: string): Promise<boolean> => {
      if (!article?.id) return false;

      await api.createComment({ articleId: article.id, content, ...(parentId ? { parentId } : {}) });
      setReplyingTo(null);
      await reloadComments(article.id);
      return true;
    },
    [article, reloadComments]
  );

  const fetchArticle = useCallback(async () => {
    if (!slug) return;
    try {
      const res = (await api.getArticleBySlug(slug)) as ArticleResponse;
      if (res.article) {
        setArticle(res.article);
        try {
          const commentsRes = (await api.getArticleComments(res.article.id)) as CommentsResponse;
          setComments(commentsRes.comments || []);
        } catch (err) {
          console.error('Failed to load comments:', err);
        }
      } else {
        setError('Article not found');
      }
    } catch (err) {
      console.error('Failed to fetch article:', err);
      setError('Article not found');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  /* eslint-disable react-hooks/set-state-in-effect --
     fetchArticle() only writes state after awaiting the network request; the
     linter cannot see past the await. */
  useEffect(() => {
    fetchArticle();
  }, [fetchArticle]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (loading) {
    return <PageLoading label="Loading article…" />;
  }

  if (error || !article) {
    return (
      <PageStack>
        <PageHeading
          title="Article"
          backHref="/dashboard/articles"
          backLabel="Back to all articles"
        />
        <SectionCard flush>
          <EmptyBlock
            icon={Newspaper}
            title="Article not found"
            description="The link may have changed, or the article is no longer published."
            action={
              <Link href="/dashboard/articles">
                <Button variant="primary">Go to all articles</Button>
              </Link>
            }
          />
        </SectionCard>
      </PageStack>
    );
  }

  const bannerImageUrl = getImageUrl(article.imageUrl);
  // Replies are part of the conversation, so the count includes them — the
  // top-level length alone under-reports an active thread.
  const totalComments = comments.reduce(
    (total, comment) => total + 1 + (comment.replies?.length ?? 0),
    0
  );
  const author = article.User ?? article.author ?? null;
  const readSeconds = article.readingTime ?? article.readTime ?? 0;
  const readMinutes = readSeconds ? Math.max(1, Math.ceil(readSeconds / 60)) : 5;
  const rawContent = parseContent(article.content);
  const isHtmlContent = /<[a-z][\s\S]*>/i.test(rawContent);
  const categoryLabel = article.category
    ? CATEGORY_LABELS[article.category] ?? article.category
    : null;

  return (
    <PageStack>
      <PageHeading
        eyebrow={categoryLabel ?? 'Community reading'}
        title={article.title}
        icon={Newspaper}
        backHref="/dashboard/articles"
        backLabel="Back to all articles"
        actions={
          <BookmarkButton
            articleId={article.id}
            saved={isSaved(article.id)}
            onToggle={toggle}
            variant="labelled"
          />
        }
      />

      <SectionCard flush>
        {bannerImageUrl && (
          <div className="relative h-56 w-full overflow-hidden bg-[#EDF5FB] sm:h-72 lg:h-96 dark:bg-slate-800">
            {/* The banner is the largest image on the page and above the fold,
                so it is given priority rather than lazy-loaded. */}
            <Image
              src={bannerImageUrl}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          </div>
        )}

        <div className="p-5 sm:p-8">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-[#DCE7F1] pb-5 text-sm ink-muted dark:border-slate-800">
            {author?.name ? (
              <span className="flex items-center gap-2">
                <Avatar src={author.avatar ?? undefined} name={author.name} size="sm" />
                <span className="font-semibold ink-strong">
                  {author.name}
                </span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <User aria-hidden="true" className="h-4 w-4" />
                PPIA Auckland
              </span>
            )}
            {/* Published date and reading time are metadata, set as data. */}
            <span className="data-type flex items-center gap-1.5 text-[12px]">
              <Calendar aria-hidden="true" className="h-4 w-4" />
              {formatDate(article.createdAt, {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
            <span className="data-type flex items-center gap-1.5 text-[12px]">
              <Clock aria-hidden="true" className="h-4 w-4" />
              {readMinutes} min read
            </span>
          </div>

          {article.excerpt && (
            <p className="mt-6 border-l-4 border-[#E8231A] pl-5 text-base font-medium leading-relaxed ink-body">
              {article.excerpt}
            </p>
          )}

          <div className={cn('mt-6', RICH_TEXT_CLASS)}>
            {!rawContent ? (
              <p className="italic ink-muted">This article has no content yet.</p>
            ) : isHtmlContent ? (
              <RichText html={rawContent} />
            ) : (
              rawContent
                .split('\n\n')
                .filter(Boolean)
                .map((paragraph, index) => <p key={index}>{paragraph}</p>)
            )}
          </div>

          {article.tags && article.tags.length > 0 && (
            <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-[#DCE7F1] pt-5 dark:border-slate-800">
              <Tag aria-hidden="true" className="h-4 w-4 ink-muted" />
              {article.tags.map((tag) => (
                <Badge key={tag.id} variant="default">
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Comments"
        description={
          totalComments > 0
            ? `${totalComments} ${totalComments === 1 ? 'comment' : 'comments'} from readers`
            : 'No responses to this article yet'
        }
        icon={MessageCircle}
      >
        {/* Composer — the reason a member is on this page at all. */}
        {user ? (
          <CommentComposer
            authorName={user.name || user.username}
            authorAvatar={user.avatar}
            placeholder="Share what you think about this article…"
            submitLabel="Post comment"
            onSubmit={(content) => postComment(content)}
          />
        ) : (
          <p className="mb-5 rounded-[5px] border border-[#DCE7F1] bg-[#F5FAFD] p-4 text-sm ink-body dark:border-slate-800 dark:bg-slate-800/50">
            <Link href="/login" className="accent-label font-semibold hover:underline">
              Sign in
            </Link>{' '}
            to join the discussion.
          </p>
        )}

        {comments.length === 0 ? (
          <EmptyBlock
            icon={FileText}
            title="No comments yet"
            description="Be the first to respond to this article."
          />
        ) : (
          <ul className="space-y-3">
            {comments.map((comment) => (
              <li
                key={comment.id}
                className="rounded-[5px] border border-[#DCE7F1] bg-[#F5FAFD] p-4 dark:border-slate-800 dark:bg-slate-800/50"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Avatar
                    name={comment.userName}
                    src={comment.User?.avatar ?? undefined}
                    size="xs"
                  />
                  <span className="text-sm font-semibold ink-strong">
                    {comment.userName}
                  </span>
                  <span className="data-type text-[12px] ink-muted">
                    {formatDate(comment.createdAt, {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed ink-body">
                  {comment.content}
                </p>

                {/* Replies, one level deep. Indented with a rule rather than a
                    card so the thread reads as a continuation. */}
                {comment.replies && comment.replies.length > 0 && (
                  <ul className="mt-4 space-y-3 border-l-2 border-[#DCE7F1] pl-4 dark:border-slate-700">
                    {comment.replies.map((reply) => (
                      <li key={reply.id}>
                        <div className="flex flex-wrap items-center gap-2">
                          <Avatar
                            name={reply.userName}
                            src={reply.User?.avatar ?? undefined}
                            size="xs"
                          />
                          <span className="text-sm font-semibold ink-strong">
                            {reply.userName}
                          </span>
                          <span className="data-type text-[12px] ink-muted">
                            {formatDate(reply.createdAt, {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm leading-relaxed ink-body">
                          {reply.content}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}

                {user && (
                  <div className="mt-3">
                    {replyingTo === comment.id ? (
                      <CommentComposer
                        compact
                        autoFocus
                        authorName={user.name || user.username}
                        authorAvatar={user.avatar}
                        placeholder={`Reply to ${comment.userName}…`}
                        submitLabel="Post reply"
                        onSubmit={(content) => postComment(content, comment.id)}
                        onCancel={() => setReplyingTo(null)}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setReplyingTo(comment.id)}
                        className="inline-flex items-center gap-1.5 text-[12px] font-semibold ink-muted transition-colors hover:text-[#C41E16] dark:hover:text-[#FF8A84]"
                      >
                        <Reply aria-hidden="true" className="h-3.5 w-3.5" />
                        Reply
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </PageStack>
  );
}
