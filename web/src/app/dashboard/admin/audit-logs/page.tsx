'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import type { AuditLog } from '@/lib/api-types';
import { useToast } from '@/components/Toast';
import { Badge, Button, Pagination } from '@/components/ui';
import {
  AccessDenied,
  EmptyBlock,
  FilterSelect,
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
import { cn } from '@/lib/utils';
import {
  Building2,
  Calendar,
  FileText,
  ImageIcon,
  RefreshCw,
  Shield,
  User as UserIcon,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const ENTITY_OPTIONS = [
  { value: 'Event', label: 'Event' },
  { value: 'Article', label: 'Article' },
  { value: 'Member', label: 'Member' },
  { value: 'Division', label: 'Division' },
  { value: 'Media', label: 'Media' },
];

const ACTION_OPTIONS = [
  { value: 'CREATE', label: 'Create' },
  { value: 'UPDATE', label: 'Update' },
  { value: 'DELETE', label: 'Delete' },
  { value: 'SEND', label: 'Send' },
];

const ENTITY_ICONS: Record<string, LucideIcon> = {
  Event: Calendar,
  Article: FileText,
  Member: Users,
  User: Users,
  Division: Building2,
  Media: ImageIcon,
};

const ACTION_VARIANT: Record<string, 'success' | 'primary' | 'danger' | 'default'> = {
  CREATE: 'success',
  UPDATE: 'primary',
  DELETE: 'danger',
  SEND: 'default',
};

const ACTION_LABEL: Record<string, string> = {
  CREATE: 'Create',
  UPDATE: 'Update',
  DELETE: 'Delete',
  SEND: 'Send',
};

interface AuditLogsResponse {
  logs?: AuditLog[];
  pagination?: { page?: number; limit?: number; total?: number; pages?: number };
}

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString('en-NZ', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function detailSummary(details?: Record<string, unknown>): string {
  if (!details) return '';
  const text = JSON.stringify(details);
  return text.length > 70 ? `${text.slice(0, 70)}…` : text;
}

export default function AuditLogsPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const { showError } = useToast();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [serverPages, setServerPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // The audit trail is not site content, so only Super Admin can view it.
  const canView = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const fetchLogs = useCallback(async () => {
    try {
      const data = (await api.getAuditLogs({
        page: currentPage,
        limit: itemsPerPage,
        entity: entityFilter || undefined,
        action: actionFilter || undefined,
      })) as AuditLogsResponse;
      setLogs(data.logs ?? []);
      setTotal(data.pagination?.total ?? data.logs?.length ?? 0);
      setServerPages(data.pagination?.pages ?? 0);
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      showError(err.response?.data?.error || err.message || 'Could not load audit log');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentPage, itemsPerPage, entityFilter, actionFilter, showError]);

  /* eslint-disable react-hooks/set-state-in-effect --
     fetchLogs() only writes state after awaiting the network; the linter cannot
     see past the call. */
  useEffect(() => {
    if (user && canView) {
      fetchLogs();
    }
  }, [user, canView, fetchLogs]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Anyone but Super Admin never triggers the fetch, so the skeleton must not wait on it.
  const showSkeleton = (isLoading || loading) && (isLoading || canView);

  /** Search runs on the client because the audit log endpoint does not accept it yet. */
  const visibleLogs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return logs;
    return logs.filter(
      (log) =>
        log.entity?.toLowerCase().includes(query) ||
        log.action?.toLowerCase().includes(query) ||
        log.entityId?.toLowerCase().includes(query) ||
        log.user?.name?.toLowerCase().includes(query) ||
        log.user?.email?.toLowerCase().includes(query)
    );
  }, [logs, searchQuery]);

  const actionCounts = useMemo(() => {
    const result = { CREATE: 0, UPDATE: 0, DELETE: 0 };
    logs.forEach((log) => {
      if (log.action === 'CREATE') result.CREATE += 1;
      else if (log.action === 'UPDATE') result.UPDATE += 1;
      else if (log.action === 'DELETE') result.DELETE += 1;
    });
    return result;
  }, [logs]);

  const totalPages = Math.max(
    1,
    serverPages > 0 ? serverPages : Math.ceil(Math.max(total, visibleLogs.length) / itemsPerPage)
  );
  // Clamped at render time, not corrected via an effect.
  const page = Math.min(currentPage, totalPages);

  const hasFilters = Boolean(searchQuery || entityFilter || actionFilter);

  const resetFilters = () => {
    setSearchQuery('');
    setEntityFilter('');
    setActionFilter('');
    setCurrentPage(1);
  };

  if (showSkeleton) {
    return <ListPageSkeleton tiles={4} rows={8} />;
  }

  if (!canView) {
    return <AccessDenied message="Only Super Admin can view the audit log." backHref="/dashboard" />;
  }

  return (
    <PageStack>
      <PageHeading
        title="Audit log"
        description={
          total === 0
            ? 'No activity has been recorded yet.'
            : `${total.toLocaleString('en-NZ')} activities recorded • showing page ${page} of ${totalPages}`
        }
        icon={Shield}
        backHref="/dashboard/admin"
        backLabel="Back to admin panel"
        actions={
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />}
            onClick={() => {
              setRefreshing(true);
              fetchLogs();
            }}
          >
            Refresh
          </Button>
        }
      />

      <StatTileRow columns={4}>
        <StatTile
          label="Total activity"
          value={total}
          tone="slate"
          icon={Shield}
          active={actionFilter === ''}
          onClick={() => {
            setActionFilter('');
            setCurrentPage(1);
          }}
        />
        <StatTile
          label="Creates"
          value={actionCounts.CREATE}
          tone="emerald"
          hint="On this page"
          active={actionFilter === 'CREATE'}
          onClick={() => {
            setActionFilter('CREATE');
            setCurrentPage(1);
          }}
        />
        <StatTile
          label="Updates"
          value={actionCounts.UPDATE}
          tone="sky"
          hint="On this page"
          active={actionFilter === 'UPDATE'}
          onClick={() => {
            setActionFilter('UPDATE');
            setCurrentPage(1);
          }}
        />
        <StatTile
          label="Deletes"
          value={actionCounts.DELETE}
          tone="red"
          hint="On this page"
          active={actionFilter === 'DELETE'}
          onClick={() => {
            setActionFilter('DELETE');
            setCurrentPage(1);
          }}
        />
      </StatTileRow>

      <Toolbar>
        <SearchField
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by actor, entity, or object ID…"
          ariaLabel="Search audit log"
        />
        <FilterSelect
          value={entityFilter}
          onChange={(value) => {
            setEntityFilter(value);
            setCurrentPage(1);
          }}
          placeholder="All entities"
          ariaLabel="Filter by entity"
          options={ENTITY_OPTIONS}
        />
        <FilterSelect
          value={actionFilter}
          onChange={(value) => {
            setActionFilter(value);
            setCurrentPage(1);
          }}
          placeholder="All actions"
          ariaLabel="Filter by action"
          options={ACTION_OPTIONS}
        />
        {hasFilters && <ResetFiltersButton onClick={resetFilters} />}
      </Toolbar>

      {visibleLogs.length === 0 ? (
        <SectionCard flush>
          {hasFilters ? (
            <EmptyBlock
              icon={Shield}
              title="No matching activity"
              description="Try a different keyword or filter."
              action={
                <Button variant="secondary" onClick={resetFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyBlock
              icon={Shield}
              title="No activity yet"
              description="Every admin action is recorded here automatically."
            />
          )}
        </SectionCard>
      ) : (
        <TableShell
          head={
            <>
              <Th>Time</Th>
              <Th>Actor</Th>
              <Th>Action</Th>
              <Th>Entity</Th>
              <Th>Details</Th>
            </>
          }
          footer={
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={total}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              showItemsPerPage
              itemsPerPageOptions={[25, 50, 100]}
              onItemsPerPageChange={(limit) => {
                setItemsPerPage(limit);
                setCurrentPage(1);
              }}
            />
          }
        >
          {visibleLogs.map((log) => {
            const EntityIcon = ENTITY_ICONS[log.entity] ?? FileText;
            const summary = detailSummary(log.details);
            return (
              <Tr key={log.id}>
                <Td>
                  <span className="whitespace-nowrap text-slate-600 dark:text-slate-300">
                    {formatTimestamp(log.createdAt)}
                  </span>
                </Td>
                <Td>
                  {log.user ? (
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFF0EF] dark:bg-[#E8231A]/15">
                        <UserIcon className="h-3.5 w-3.5 text-[#E8231A]" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900 dark:text-slate-100">
                          {log.user.name}
                        </p>
                        <p className="truncate text-xs text-slate-400">{log.user.email}</p>
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-400">System</span>
                  )}
                </Td>
                <Td>
                  <Badge variant={ACTION_VARIANT[log.action] ?? 'default'}>
                    {ACTION_LABEL[log.action] ?? log.action}
                  </Badge>
                </Td>
                <Td>
                  <span className="flex items-center gap-2">
                    <EntityIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {log.entity}
                    </span>
                  </span>
                  {log.entityId && (
                    <span className="mt-0.5 block max-w-[10rem] truncate font-mono text-xs text-slate-400">
                      {log.entityId}
                    </span>
                  )}
                </Td>
                <Td>
                  {summary ? (
                    <code className="block max-w-sm truncate rounded bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {summary}
                    </code>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </Td>
              </Tr>
            );
          })}
        </TableShell>
      )}
    </PageStack>
  );
}
