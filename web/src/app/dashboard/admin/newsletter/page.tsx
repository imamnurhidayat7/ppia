'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import type { NewsletterSubscriber } from '@/lib/api-types';
import { useToast } from '@/components/Toast';
import { useConfirm, ConfirmHost } from '@/hooks/useConfirm';
import { Badge, Button, Pagination } from '@/components/ui';
import {
  AccessDenied,
  EmptyBlock,
  Field,
  FormActions,
  ListPageSkeleton,
  PageHeading,
  PageStack,
  ResetFiltersButton,
  SearchField,
  SectionCard,
  StatTile,
  StatTileRow,
  TableShell,
  Td,
  Th,
  Toolbar,
  Tr,
} from '@/components/dashboard';
import { cn, formatDate } from '@/lib/utils';
import {
  Download,
  Inbox,
  Mail,
  RefreshCw,
  Send,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';

type StatusFilter = '' | 'active' | 'inactive';
type NewsletterTab = 'subscribers' | 'compose';

interface SubscribersResponse {
  subscribers?: NewsletterSubscriber[];
  stats?: { total?: number; active?: number; inactive?: number };
}

export default function AdminNewsletterPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const confirmCtx = useConfirm();

  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [tab, setTab] = useState<NewsletterTab>('subscribers');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  // The newsletter touches subscriber data, so only Super Admin can manage it.
  const canManage = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const fetchSubscribers = useCallback(async () => {
    try {
      const response = (await api.getNewsletterSubscribers({
        page: 1,
        limit: 1000,
      })) as SubscribersResponse;
      setSubscribers(response.subscribers ?? []);
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      showError(err.response?.data?.error || err.message || 'Could not load subscriber data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showError]);

  /* eslint-disable react-hooks/set-state-in-effect --
     fetchSubscribers() only writes state after awaiting the network; the linter
     cannot see past the call. */
  useEffect(() => {
    if (user && canManage) {
      fetchSubscribers();
    }
  }, [user, canManage, fetchSubscribers]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Anyone but Super Admin never triggers the fetch, so the skeleton must not wait on it.
  const showSkeleton = (isLoading || loading) && (isLoading || canManage);

  const stats = useMemo(() => {
    const active = subscribers.filter((subscriber) => subscriber.isActive).length;
    return {
      total: subscribers.length,
      active,
      inactive: subscribers.length - active,
    };
  }, [subscribers]);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return subscribers.filter((subscriber) => {
      if (statusFilter === 'active' && !subscriber.isActive) return false;
      if (statusFilter === 'inactive' && subscriber.isActive) return false;
      if (!query) return true;
      return (
        subscriber.email?.toLowerCase().includes(query) ||
        subscriber.name?.toLowerCase().includes(query)
      );
    });
  }, [subscribers, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  // Clamped at render time so a filter that shrinks the result set never leaves an empty page.
  const page = Math.min(currentPage, totalPages);

  const paginated = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, page, itemsPerPage]);

  const hasFilters = Boolean(searchQuery || statusFilter);

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setCurrentPage(1);
  };

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!subject.trim() || !content.trim()) {
      showError('Subject and body are required');
      return;
    }
    if (stats.active === 0) {
      showError('There are no active subscribers to send to');
      return;
    }
    const ok = await confirmCtx.confirm({
      title: 'Send newsletter?',
      message: `This email will be sent to ${stats.active} active subscribers. This action cannot be undone.`,
      confirmLabel: 'Yes, send',
      variant: 'warning',
    });
    if (!ok) return;

    setSending(true);
    try {
      const result = await api.sendNewsletter(subject.trim(), content) as {
        message?: string;
        sent?: number;
        failed?: number;
      };
      const message = result.message || `Newsletter sent to ${result.sent ?? stats.active} subscribers`;
      if ((result.failed ?? 0) > 0) showError(message);
      else showSuccess(message);
      setSubject('');
      setContent('');
    } catch (error) {
      const err = error as {
        response?: { data?: { error?: string; message?: string } };
        message?: string;
      };
      showError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          err.message ||
          'Could not send newsletter'
      );
    } finally {
      setSending(false);
    }
  };

  /** Exports whatever the current filters show, not the whole table. */
  const handleExport = () => {
    if (filtered.length === 0) {
      showError('No data to export');
      return;
    }
    const headers = ['Email', 'Name', 'Status', 'Subscribed at', 'Unsubscribed at'];
    const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = filtered.map((subscriber) =>
      [
        subscriber.email,
        subscriber.name || '',
        subscriber.isActive ? 'Active' : 'Unsubscribed',
        subscriber.subscribedAt || '',
        subscriber.unsubscribedAt || '',
      ]
        .map(escape)
        .join(',')
    );
    const csv = `${headers.map(escape).join(',')}\n${rows.join('\n')}`;
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showSuccess(`${filtered.length} rows exported`);
  };

  if (showSkeleton) {
    return <ListPageSkeleton tiles={3} rows={8} />;
  }

  if (!canManage) {
    return (
      <AccessDenied
        message="Only Super Admin can manage the newsletter."
        backHref="/dashboard"
      />
    );
  }

  return (
    <PageStack>
      <PageHeading
        title="Newsletter"
        description={
          stats.total === 0
            ? 'No one has subscribed yet.'
            : `${stats.total} subscribers • ${stats.active} actively receiving emails`
        }
        icon={Mail}
        backHref="/dashboard/admin"
        backLabel="Back to admin panel"
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />}
              onClick={() => {
                setRefreshing(true);
                fetchSubscribers();
              }}
            >
              Refresh
            </Button>
            <Button
              variant={tab === 'compose' ? 'secondary' : 'primary'}
              size="sm"
              leftIcon={tab === 'compose' ? <Users className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              onClick={() => setTab(tab === 'compose' ? 'subscribers' : 'compose')}
            >
              {tab === 'compose' ? 'View subscribers' : 'Compose newsletter'}
            </Button>
          </>
        }
      />

      <StatTileRow columns={3}>
        <StatTile
          label="Total subscribers"
          value={stats.total}
          tone="slate"
          icon={Users}
          active={statusFilter === ''}
          onClick={() => {
            setTab('subscribers');
            setStatusFilter('');
            setCurrentPage(1);
          }}
        />
        <StatTile
          label="Active"
          value={stats.active}
          tone="emerald"
          icon={UserCheck}
          active={statusFilter === 'active'}
          onClick={() => {
            setTab('subscribers');
            setStatusFilter('active');
            setCurrentPage(1);
          }}
        />
        <StatTile
          label="Unsubscribed"
          value={stats.inactive}
          tone="amber"
          icon={UserX}
          active={statusFilter === 'inactive'}
          onClick={() => {
            setTab('subscribers');
            setStatusFilter('inactive');
            setCurrentPage(1);
          }}
        />
      </StatTileRow>

      {tab === 'subscribers' ? (
        <>
          <Toolbar>
            <SearchField
              value={searchQuery}
              onChange={(value) => {
                setSearchQuery(value);
                setCurrentPage(1);
              }}
              placeholder="Search by subscriber email or name…"
              ariaLabel="Search newsletter subscribers"
            />
            <Button
              variant="secondary"
              size="md"
              leftIcon={<Download className="h-4 w-4" />}
              onClick={handleExport}
              disabled={filtered.length === 0}
            >
              Export CSV
            </Button>
            {hasFilters && <ResetFiltersButton onClick={resetFilters} />}
          </Toolbar>

          {filtered.length === 0 ? (
            <SectionCard flush>
              {hasFilters ? (
                <EmptyBlock
                  icon={Inbox}
                  title="No matching subscribers"
                  description="Try a different keyword or status filter."
                  action={
                    <Button variant="secondary" onClick={resetFilters}>
                      Clear filters
                    </Button>
                  }
                />
              ) : (
                <EmptyBlock
                  icon={Inbox}
                  title="No subscribers yet"
                  description="Subscribers from the site's subscription form will appear here."
                />
              )}
            </SectionCard>
          ) : (
            <TableShell
              head={
                <>
                  <Th>Email</Th>
                  <Th>Name</Th>
                  <Th>Status</Th>
                  <Th>Subscribed</Th>
                  <Th>Unsubscribed</Th>
                </>
              }
              footer={
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  totalItems={filtered.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  showItemsPerPage
                  onItemsPerPageChange={(limit) => {
                    setItemsPerPage(limit);
                    setCurrentPage(1);
                  }}
                />
              }
            >
              {paginated.map((subscriber) => (
                <Tr key={subscriber.id}>
                  <Td>
                    <span className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {subscriber.email}
                      </span>
                    </span>
                  </Td>
                  <Td>{subscriber.name || <span className="text-slate-400">—</span>}</Td>
                  <Td>
                    {subscriber.isActive ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="default">Unsubscribed</Badge>
                    )}
                  </Td>
                  <Td>
                    {subscriber.subscribedAt ? (
                      formatDate(subscriber.subscribedAt)
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </Td>
                  <Td>
                    {subscriber.unsubscribedAt ? (
                      formatDate(subscriber.unsubscribedAt)
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </Td>
                </Tr>
              ))}
            </TableShell>
          )}
        </>
      ) : (
        <form onSubmit={handleSend} className="space-y-6">
          <SectionCard
            title="Compose newsletter"
            description={`Will be sent to ${stats.active} active subscribers. Unsubscribed addresses are skipped.`}
            icon={Send}
          >
            <div className="space-y-4">
              <Field label="Subject" htmlFor="newsletter-subject" required>
                <input
                  id="newsletter-subject"
                  type="text"
                  required
                  maxLength={200}
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="For example: PPIA Auckland news — July 2026"
                  className="input-base"
                />
              </Field>

              <Field
                label="Body"
                htmlFor="newsletter-content"
                hint={`${content.length} characters. Plain text is supported.`}
                required
              >
                <textarea
                  id="newsletter-content"
                  required
                  rows={14}
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Write the newsletter body here…"
                  className="input-base resize-y font-mono text-sm"
                />
              </Field>
            </div>
          </SectionCard>

          <FormActions>
            <Button
              type="button"
              variant="ghost"
              disabled={sending}
              onClick={() => {
                setSubject('');
                setContent('');
              }}
            >
              Clear
            </Button>
            <Button
              type="submit"
              variant="primary"
              leftIcon={<Send className="h-4 w-4" />}
              isLoading={sending}
              disabled={!subject.trim() || !content.trim()}
            >
              Send to {stats.active} active subscribers
            </Button>
          </FormActions>
        </form>
      )}

      <ConfirmHost ctx={confirmCtx} />
    </PageStack>
  );
}
