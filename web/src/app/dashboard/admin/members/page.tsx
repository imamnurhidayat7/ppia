'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { Avatar, Badge, Button, Modal, ModalFooter, Pagination } from '@/components/ui';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { EmptyMembers } from '@/components/ui/EmptyState';
import { useToast } from '@/components/Toast';
import { useConfirm, ConfirmHost } from '@/hooks/useConfirm';
import { PageHeading, useDashboardData } from '@/components/dashboard';
import { cn, formatDate } from '@/lib/utils';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Ban,
  Check,
  Clock,
  Download,
  Edit,
  Eye,
  RefreshCw,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';

/** Metadata dates read as log entries: 05 Mar 2025. */
const DATE_OPTS = {
  dateStyle: undefined,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
} as const;


const POSITIONS = [
  { value: 'PRESIDENT', label: 'President' },
  { value: 'VICE_PRESIDENT', label: 'Vice President' },
  { value: 'SECRETARY', label: 'Secretary' },
  { value: 'TREASURER', label: 'Treasurer' },
  { value: 'COORDINATOR', label: 'Coordinator' },
  { value: 'MEMBER', label: 'Steering Committee Member' },
];

const ROLES = [
  { value: 'MEMBER', label: 'Member' },
  { value: 'BOARD', label: 'Board' },
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
];

type MembershipStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
type SortKey = 'name' | 'role' | 'status' | 'createdAt';
type SortDirection = 'asc' | 'desc';

interface DivisionRef {
  id: string;
  name: string;
  color?: string;
}

interface AdminMember {
  id: string;
  name: string;
  email: string;
  role: string;
  position?: string;
  university?: string;
  avatar?: string;
  createdAt: string;
  membershipStatus?: MembershipStatus;
  division?: DivisionRef;
}

const STATUS_ORDER: Record<MembershipStatus, number> = {
  PENDING: 0,
  APPROVED: 1,
  REJECTED: 2,
};

const ROLE_ORDER: Record<string, number> = {
  SUPER_ADMIN: 0,
  BOARD: 1,
  MEMBER: 2,
};

function statusOf(member: AdminMember): MembershipStatus {
  return member.membershipStatus || 'APPROVED';
}

function RoleBadge({ role }: { role: string }) {
  if (role === 'SUPER_ADMIN') return <Badge variant="danger" className="data-type uppercase">Super Admin</Badge>;
  if (role === 'BOARD') return <Badge variant="primary" className="data-type uppercase">Board</Badge>;
  return <Badge variant="default" className="data-type uppercase">Member</Badge>;
}

function StatusPill({ status }: { status: MembershipStatus }) {
  const styles: Record<MembershipStatus, { className: string; dot: string; label: string }> = {
    PENDING: {
      className:
        'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-800/60',
      dot: 'bg-amber-500 animate-pulse',
      label: 'Pending',
    },
    APPROVED: {
      className:
        'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-800/60',
      dot: 'bg-emerald-500',
      label: 'Approved',
    },
    REJECTED: {
      className:
        'bg-danger-50 text-danger-700 ring-danger-200 dark:bg-danger-900/30 dark:text-danger-300 dark:ring-danger-800/60',
      dot: 'bg-danger-500',
      label: 'Rejected',
    },
  };
  const style = styles[status];
  return (
    <span
      className={cn(
        'data-type inline-flex items-center gap-1.5 rounded-[3px] px-2.5 py-1 text-[12px] font-bold uppercase ring-1',
        style.className
      )}
    >
      <span aria-hidden="true" className={cn('h-1.5 w-1.5 rounded-full', style.dot)} />
      {style.label}
    </span>
  );
}

function SortHeader({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = activeKey === sortKey;
  return (
    <th className={cn('px-4 py-3 text-left', className)}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          'data-type inline-flex items-center gap-1.5 text-[12px] font-bold uppercase transition-colors',
          active
            ? 'ink-strong'
            : 'ink-muted hover:text-slate-800 dark:hover:text-slate-200'
        )}
        aria-label={`Sort by ${label}`}
      >
        {label}
        {active ? (
          direction === 'asc' ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </button>
    </th>
  );
}

function MembersLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-48 rounded skeleton" />
        <div className="h-4 w-64 rounded skeleton" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="h-24 rounded-[5px] skeleton" />
        ))}
      </div>
      <SkeletonTable rows={8} columns={6} />
    </div>
  );
}

function MembersManager() {
  const { user, isLoading } = useAuth();
  const { showSuccess, showError } = useToast();
  const confirmCtx = useConfirm();
  const { refresh: refreshShellData } = useDashboardData();

  const [members, setMembers] = useState<AdminMember[]>([]);
  const [divisions, setDivisions] = useState<DivisionRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters. The notification bell and admin home deep-link here with
  // ?status=PENDING, so that seeds the initial tab.
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(() => {
    const status = searchParams.get('status');
    return status === 'PENDING' || status === 'APPROVED' || status === 'REJECTED' ? status : '';
  });
  const [divisionFilter, setDivisionFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Selection & modals
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingMember, setEditingMember] = useState<AdminMember | null>(null);
  const [formData, setFormData] = useState({ role: 'MEMBER', position: '', divisionId: '' });
  const [saving, setSaving] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<AdminMember[] | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const fetchData = useCallback(async () => {
    try {
      const [membersRes, divisionsRes] = await Promise.all([
        api.getMembers({ limit: 1000 }),
        api.getDivisions(),
      ]);
      const memberPayload = membersRes as { members?: AdminMember[] };
      const divisionPayload = divisionsRes as { divisions?: DivisionRef[] };
      setMembers(memberPayload.members ?? []);
      setDivisions(divisionPayload.divisions ?? []);
    } catch (error) {
      const err = error as { message?: string };
      showError(err.message || 'Could not load member data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showError]);

  /* eslint-disable react-hooks/set-state-in-effect --
     fetchData() only writes state after awaiting the network; the linter cannot
     see past the call. */
  useEffect(() => {
    if (user && isSuperAdmin) {
      fetchData();
    }
  }, [user, isSuperAdmin, fetchData]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Anyone but a super admin never triggers the fetch, so the skeleton must not
  // wait on it — they get the access-denied view instead.
  const showSkeleton = (isLoading || loading) && (isLoading || isSuperAdmin);

  const counts = useMemo(() => {
    const result = { all: members.length, PENDING: 0, APPROVED: 0, REJECTED: 0 };
    members.forEach((member) => {
      result[statusOf(member)] += 1;
    });
    return result;
  }, [members]);

  const filteredMembers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const result = members.filter((member) => {
      if (statusFilter && statusOf(member) !== statusFilter) return false;
      if (roleFilter && member.role !== roleFilter) return false;
      if (divisionFilter) {
        if (divisionFilter === 'NONE' ? Boolean(member.division) : member.division?.id !== divisionFilter) {
          return false;
        }
      }
      if (!query) return true;
      return (
        member.name?.toLowerCase().includes(query) ||
        member.email?.toLowerCase().includes(query) ||
        member.university?.toLowerCase().includes(query) ||
        member.division?.name?.toLowerCase().includes(query)
      );
    });

    const factor = sortDirection === 'asc' ? 1 : -1;
    return [...result].sort((a, b) => {
      switch (sortKey) {
        case 'name':
          return factor * (a.name || '').localeCompare(b.name || '', 'en-NZ');
        case 'role':
          return factor * ((ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9));
        case 'status':
          return factor * (STATUS_ORDER[statusOf(a)] - STATUS_ORDER[statusOf(b)]);
        case 'createdAt':
        default:
          return factor * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      }
    });
  }, [members, searchQuery, roleFilter, statusFilter, divisionFilter, sortKey, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / itemsPerPage));

  // Clamped rather than corrected via an effect, so a filter that shrinks the
  // result set can never leave the table showing an empty page.
  const page = Math.min(currentPage, totalPages);

  const paginatedMembers = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredMembers.slice(start, start + itemsPerPage);
  }, [filteredMembers, page, itemsPerPage]);

  const selectedMembers = useMemo(
    () => members.filter((member) => selected.has(member.id)),
    [members, selected]
  );
  const selectablePending = selectedMembers.filter((member) => statusOf(member) === 'PENDING');

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection(key === 'createdAt' ? 'desc' : 'asc');
    }
    setCurrentPage(1);
  };

  const toggleSelect = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const pageAllSelected =
    paginatedMembers.length > 0 && paginatedMembers.every((member) => selected.has(member.id));

  const togglePageSelection = () => {
    setSelected((current) => {
      const next = new Set(current);
      if (pageAllSelected) {
        paginatedMembers.forEach((member) => next.delete(member.id));
      } else {
        paginatedMembers.forEach((member) => next.add(member.id));
      }
      return next;
    });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setRoleFilter('');
    setStatusFilter('');
    setDivisionFilter('');
    setCurrentPage(1);
  };

  const hasFilters = Boolean(searchQuery || roleFilter || statusFilter || divisionFilter);

  const afterMutation = useCallback(async () => {
    await fetchData();
    refreshShellData();
  }, [fetchData, refreshShellData]);

  const handleApprove = async (member: AdminMember) => {
    const ok = await confirmCtx.confirm({
      title: 'Approve member?',
      message: `${member.name} will be able to log in and access member features right away.`,
      confirmLabel: 'Yes, approve',
      variant: 'warning',
    });
    if (!ok) return;
    try {
      await api.approveMember(member.id);
      showSuccess(`${member.name} approved`);
      await afterMutation();
    } catch (error) {
      const err = error as { message?: string };
      showError(err.message || 'Could not approve member');
    }
  };

  const submitReject = async () => {
    if (!rejectTarget) return;
    setBulkBusy(true);
    const reason = rejectReason.trim() || undefined;
    const results = await Promise.allSettled(
      rejectTarget.map((member) => api.rejectMember(member.id, reason))
    );
    const failed = results.filter((result) => result.status === 'rejected').length;
    setBulkBusy(false);
    setRejectTarget(null);
    setRejectReason('');
    setSelected(new Set());
    if (failed === 0) {
      showSuccess(
        rejectTarget.length === 1
          ? `Registration for ${rejectTarget[0].name} rejected`
          : `${rejectTarget.length} registrations rejected`
      );
    } else {
      showError(`${failed} of ${rejectTarget.length} rejections failed`);
    }
    await afterMutation();
  };

  const handleBulkApprove = async () => {
    if (selectablePending.length === 0) return;
    const ok = await confirmCtx.confirm({
      title: `Approve ${selectablePending.length} members?`,
      message: 'The selected members will be able to log in and access member features right away.',
      confirmLabel: 'Yes, approve',
    });
    if (!ok) return;

    setBulkBusy(true);
    const results = await Promise.allSettled(
      selectablePending.map((member) => api.approveMember(member.id))
    );
    const failed = results.filter((result) => result.status === 'rejected').length;
    setBulkBusy(false);
    setSelected(new Set());
    if (failed === 0) {
      showSuccess(`${selectablePending.length} members approved`);
    } else {
      showError(`${failed} of ${selectablePending.length} approvals failed`);
    }
    await afterMutation();
  };

  const handleDelete = async (member: AdminMember) => {
    const ok = await confirmCtx.confirm({
      title: 'Delete member?',
      message: `${member.name}'s data will be permanently deleted and cannot be undone.`,
      confirmLabel: 'Yes, delete',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await api.deleteMember(member.id);
      showSuccess('Member deleted');
      setSelected((current) => {
        const next = new Set(current);
        next.delete(member.id);
        return next;
      });
      await afterMutation();
    } catch (error) {
      const err = error as { message?: string };
      showError(err.message || 'Could not delete member');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedMembers.length === 0) return;
    const ok = await confirmCtx.confirm({
      title: `Delete ${selectedMembers.length} members?`,
      message: 'All selected member data will be permanently deleted. This action cannot be undone.',
      confirmLabel: 'Yes, delete all',
      variant: 'danger',
    });
    if (!ok) return;

    setBulkBusy(true);
    const results = await Promise.allSettled(
      selectedMembers.map((member) => api.deleteMember(member.id))
    );
    const failed = results.filter((result) => result.status === 'rejected').length;
    setBulkBusy(false);
    setSelected(new Set());
    if (failed === 0) {
      showSuccess(`${selectedMembers.length} members deleted`);
    } else {
      showError(`${failed} of ${selectedMembers.length} deletions failed`);
    }
    await afterMutation();
  };

  const openEdit = (member: AdminMember) => {
    setEditingMember(member);
    setFormData({
      role: member.role,
      position: member.position || '',
      divisionId: member.division?.id || '',
    });
  };

  const handleSubmitEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingMember) return;
    setSaving(true);
    try {
      await api.updateMember(editingMember.id, formData);
      showSuccess('Member details updated');
      setEditingMember(null);
      await afterMutation();
    } catch (error) {
      const err = error as { message?: string };
      showError(err.message || 'Could not update member');
    } finally {
      setSaving(false);
    }
  };

  /** Exports whatever the current filters show, not the whole table. */
  const exportCsv = () => {
    if (filteredMembers.length === 0) {
      showError('No data to export');
      return;
    }
    const headers = ['Name', 'Email', 'Role', 'Position', 'Status', 'Division', 'University', 'Registered'];
    const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = filteredMembers.map((member) =>
      [
        member.name,
        member.email,
        member.role,
        member.position || '',
        statusOf(member),
        member.division?.name || '',
        member.university || '',
        new Date(member.createdAt).toISOString().slice(0, 10),
      ]
        .map(escape)
        .join(',')
    );
    const csv = `${headers.map(escape).join(',')}\n${rows.join('\n')}`;
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ppia-members-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showSuccess(`${filteredMembers.length} rows exported`);
  };

  if (showSkeleton) {
    return <MembersLoading />;
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
        <div aria-hidden="true" style={{ boxShadow: 'inset 0 0 0 1px #F3C9C6, 0 0 0 5px rgba(176,24,18,0.10)' }} className="mb-4 flex h-14 w-14 items-center justify-center rounded-full">
          <Ban className="h-7 w-7 text-danger-600 dark:text-danger-300" />
        </div>
        <h2 className="mb-1 text-lg font-bold ink-strong">Access denied</h2>
        <p className="text-sm ink-muted">
          Only Super Admin can manage members.
        </p>
      </div>
    );
  }

  const statusTabs = [
    { key: '', label: 'All', count: counts.all, dot: 'bg-slate-400', active: 'bg-[#EDF5FB] dark:bg-slate-800' },
    { key: 'PENDING', label: 'Pending', count: counts.PENDING, dot: 'bg-amber-500', active: 'bg-amber-50 dark:bg-amber-900/25' },
    { key: 'APPROVED', label: 'Approved', count: counts.APPROVED, dot: 'bg-emerald-500', active: 'bg-emerald-50 dark:bg-emerald-900/25' },
    { key: 'REJECTED', label: 'Rejected', count: counts.REJECTED, dot: 'bg-danger-500', active: 'bg-danger-50 dark:bg-danger-900/25' },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      {/*
        Uses the shared PageHeading like every other admin page. This screen had
        its own hand-rolled header plus a standalone BackButton, which is why the
        back control floated on its own with roughly twice the gap of the others.
      */}
      <PageHeading
        icon={Users}
        title="Manage members"
        description={
          counts.all +
          ' members registered' +
          (counts.PENDING > 0 ? ` • ${counts.PENDING} pending approval` : '')
        }
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
                fetchData();
              }}
            >
              Refresh
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Download className="h-4 w-4" />}
              onClick={exportCsv}
            >
              Export CSV
            </Button>
          </>
        }
      />

      {/* Status tabs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statusTabs.map((tab) => {
          const active = statusFilter === tab.key;
          return (
            <button
              key={tab.key || 'all'}
              type="button"
              onClick={() => {
                setStatusFilter(tab.key);
                setCurrentPage(1);
              }}
              aria-pressed={active}
              className={cn(
                'rounded-[5px] border p-4 text-left transition-all',
                active
                  ? cn('border-transparent ring-2 ring-[#C3D2E0] dark:ring-slate-600', tab.active)
                  : 'chart-paper border-[#DCE7F1] hover:border-[#C3D2E0] dark:border-slate-800 dark:hover:border-slate-700'
              )}
            >
              <span className="flex items-center gap-2">
                <span aria-hidden="true" className={cn('h-2 w-2 rounded-full', tab.dot)} />
                <span className="data-type text-[12px] font-bold uppercase ink-muted">
                  {tab.label}
                </span>
              </span>
              <span className="data-type mt-1 block font-display text-2xl font-black ink-strong">
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {counts.PENDING > 0 && statusFilter !== 'PENDING' && (
        <div className="flex items-start gap-3 rounded-[5px] border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-900/20">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-amber-700 dark:text-amber-300"
            style={{ boxShadow: 'inset 0 0 0 1px rgba(146,64,14,0.25), 0 0 0 4px rgba(146,64,14,0.08)' }}
          >
            <Clock className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-amber-900 dark:text-amber-100">
              {counts.PENDING} registrations awaiting a decision
            </p>
            <p className="mt-0.5 text-[13px] text-amber-800 dark:text-amber-200">
              Select multiple rows at once to approve or reject them in bulk.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('PENDING');
              setCurrentPage(1);
            }}
            className="data-type shrink-0 rounded-[3px] bg-white px-3 py-1.5 text-[12px] font-bold uppercase text-amber-800 shadow-sm transition-colors hover:bg-amber-50 dark:bg-slate-800 dark:text-amber-200"
          >
            Review
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ink-muted" />
          <input
            type="search"
            placeholder="Search by name, email, university, division…"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setCurrentPage(1);
            }}
            className="input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700 input-with-icon"
            aria-label="Search members"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(event) => {
            setRoleFilter(event.target.value);
            setCurrentPage(1);
          }}
          aria-label="Filter by role"
          className="input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700 lg:w-44"
        >
          <option value="">All roles</option>
          {ROLES.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>
        <select
          value={divisionFilter}
          onChange={(event) => {
            setDivisionFilter(event.target.value);
            setCurrentPage(1);
          }}
          aria-label="Filter by division"
          className="input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700 lg:w-48"
        >
          <option value="">All divisions</option>
          <option value="NONE">No division</option>
          {divisions.map((division) => (
            <option key={division.id} value={division.id}>
              {division.name}
            </option>
          ))}
        </select>
        {hasFilters && (
          <Button variant="ghost" size="md" leftIcon={<X className="h-4 w-4" />} onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="chart-paper animate-fade-in-up sticky bottom-4 z-20 flex flex-col gap-3 rounded-[5px] border border-[#DCE7F1] p-3 shadow-lg sm:flex-row sm:items-center dark:border-slate-700">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full ink-muted"
              style={{ boxShadow: 'inset 0 0 0 1px rgba(11,28,46,0.14), 0 0 0 3px rgba(11,28,46,0.05)' }}
            >
              <Users className="h-4 w-4" />
            </span>
            <p className="data-type text-sm font-semibold ink-strong">
              {selected.size} selected
              {selectablePending.length > 0 && (
                <span className="ml-1 font-normal ink-muted">
                  ({selectablePending.length} pending)
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="success"
              leftIcon={<Check className="h-4 w-4" />}
              disabled={selectablePending.length === 0 || bulkBusy}
              onClick={handleBulkApprove}
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Ban className="h-4 w-4" />}
              disabled={selectablePending.length === 0 || bulkBusy}
              onClick={() => setRejectTarget(selectablePending)}
            >
              Reject
            </Button>
            <Button
              size="sm"
              variant="danger"
              leftIcon={<Trash2 className="h-4 w-4" />}
              disabled={bulkBusy}
              onClick={handleBulkDelete}
            >
              Delete
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="chart-paper overflow-hidden rounded-[5px] border border-[#DCE7F1] dark:border-slate-800">
        {filteredMembers.length === 0 ? (
          hasFilters ? (
            <div className="py-14 text-center">
              <p className="text-sm font-medium ink-body">
                No matching members
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-2 text-sm font-semibold text-[#E8231A] hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <EmptyMembers />
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b border-[#DCE7F1] bg-[#F5FAFD] dark:border-slate-800 dark:bg-slate-800/50">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={pageAllSelected}
                      onChange={togglePageSelection}
                      aria-label="Select all on this page"
                      className="h-4 w-4 cursor-pointer rounded-[3px] border-[#C3D2E0] text-[#E8231A] focus:ring-[#E8231A]/30"
                    />
                  </th>
                  <SortHeader
                    label="Member"
                    sortKey="name"
                    activeKey={sortKey}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <SortHeader
                    label="Role"
                    sortKey="role"
                    activeKey={sortKey}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <SortHeader
                    label="Status"
                    sortKey="status"
                    activeKey={sortKey}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <th className="px-4 py-3 text-left data-type text-[12px] font-bold uppercase ink-muted">
                    Division
                  </th>
                  <SortHeader
                    label="Registered"
                    sortKey="createdAt"
                    activeKey={sortKey}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <th className="px-4 py-3 text-right data-type text-[12px] font-bold uppercase ink-muted">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7EFF7] dark:divide-slate-800">
                {paginatedMembers.map((member) => {
                  const status = statusOf(member);
                  const isSelected = selected.has(member.id);
                  return (
                    <tr
                      key={member.id}
                      className={cn(
                        'transition-colors',
                        isSelected
                          ? 'bg-[#FFF0EF] dark:bg-[#E8231A]/10'
                          : 'hover:bg-[#F5FAFD] dark:hover:bg-slate-800/50'
                      )}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(member.id)}
                          aria-label={`Select ${member.name}`}
                          className="h-4 w-4 cursor-pointer rounded-[3px] border-[#C3D2E0] text-[#E8231A] focus:ring-[#E8231A]/30"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar src={member.avatar} name={member.name} size="md" />
                          <div className="min-w-0">
                            <Link
                              href={`/dashboard/admin/members/${member.id}`}
                              className="block truncate text-sm font-semibold ink-strong hover:underline"
                            >
                              {member.name}
                            </Link>
                            <p className="truncate text-[12px] ink-muted">
                              {member.email}
                            </p>
                            {member.university && (
                              <p className="truncate text-[12px] ink-muted">{member.university}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <RoleBadge role={member.role} />
                        {member.position && (
                          <p className="mt-1 text-[12px] ink-muted">
                            {member.position}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill status={status} />
                      </td>
                      <td className="px-4 py-3">
                        {member.division ? (
                          <span
                            className="data-type inline-flex rounded-[3px] px-2 py-1 text-[12px] font-bold uppercase"
                            style={{
                              backgroundColor: `${member.division.color || '#6366F1'}20`,
                              color: member.division.color || '#6366F1',
                            }}
                          >
                            {member.division.name}
                          </span>
                        ) : (
                          <span className="text-sm ink-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm ink-body">
                        {formatDate(member.createdAt, DATE_OPTS)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {status === 'PENDING' && (
                            <>
                              <Button
                                size="xs"
                                variant="success"
                                leftIcon={<Check className="h-3.5 w-3.5" />}
                                onClick={() => handleApprove(member)}
                              >
                                Approve
                              </Button>
                              <Button
                                size="xs"
                                variant="secondary"
                                leftIcon={<Ban className="h-3.5 w-3.5" />}
                                onClick={() => setRejectTarget([member])}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          <Link
                            href={`/dashboard/admin/members/${member.id}`}
                            title="View details"
                            className="flex h-8 w-8 items-center justify-center rounded-[3px] ink-muted transition-colors hover:bg-[#EDF5FB] hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => openEdit(member)}
                            title="Edit role & division"
                            className="flex h-8 w-8 items-center justify-center rounded-[3px] ink-muted transition-colors hover:bg-[#EDF5FB] hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(member)}
                            title="Delete member"
                            className="flex h-8 w-8 items-center justify-center rounded-[3px] text-danger-600 transition-colors hover:bg-danger-50 dark:text-danger-400 dark:hover:bg-danger-900/30"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filteredMembers.length > 0 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={filteredMembers.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            showItemsPerPage
            onItemsPerPageChange={(limit) => {
              setItemsPerPage(limit);
              setCurrentPage(1);
            }}
          />
        )}
      </div>

      {/* Edit modal */}
      <Modal
        isOpen={Boolean(editingMember)}
        onClose={() => setEditingMember(null)}
        title="Edit member"
        description={editingMember?.name}
        size="lg"
      >
        <form onSubmit={handleSubmitEdit} className="space-y-4">
          <div>
            <label
              htmlFor="member-role"
              className="data-type mb-2 block text-[12px] font-bold uppercase ink-muted"
            >
              Role
            </label>
            <select
              id="member-role"
              value={formData.role}
              onChange={(event) => setFormData({ ...formData, role: event.target.value })}
              className="input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700"
            >
              {ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="member-position"
              className="data-type mb-2 block text-[12px] font-bold uppercase ink-muted"
            >
              Position
            </label>
            <select
              id="member-position"
              value={formData.position}
              onChange={(event) => setFormData({ ...formData, position: event.target.value })}
              className="input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700"
            >
              <option value="">No position</option>
              {POSITIONS.map((position) => (
                <option key={position.value} value={position.value}>
                  {position.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="member-division"
              className="data-type mb-2 block text-[12px] font-bold uppercase ink-muted"
            >
              Division
            </label>
            <select
              id="member-division"
              value={formData.divisionId}
              onChange={(event) => setFormData({ ...formData, divisionId: event.target.value })}
              className="input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700"
            >
              <option value="">No division</option>
              {divisions.map((division) => (
                <option key={division.id} value={division.id}>
                  {division.name}
                </option>
              ))}
            </select>
            {formData.role === 'BOARD' && !formData.divisionId && !formData.position && (
              <p className="mt-1.5 text-[12px] text-amber-600 dark:text-amber-400">
                The Board role requires a division or position.
              </p>
            )}
          </div>

          <ModalFooter>
            <Button type="button" variant="secondary" onClick={() => setEditingMember(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={saving}>
              Save changes
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Reject modal — replaces the old window.prompt */}
      <Modal
        isOpen={Boolean(rejectTarget)}
        onClose={() => {
          setRejectTarget(null);
          setRejectReason('');
        }}
        title={
          rejectTarget && rejectTarget.length > 1
            ? `Reject ${rejectTarget.length} registrations`
            : 'Reject registration'
        }
        description={
          rejectTarget && rejectTarget.length === 1
            ? rejectTarget[0].name
            : 'The same reason will be used for all selected members.'
        }
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label
              htmlFor="reject-reason"
              className="data-type mb-2 block text-[12px] font-bold uppercase ink-muted"
            >
              Rejection reason <span className="ink-muted">(optional)</span>
            </label>
            <textarea
              id="reject-reason"
              rows={4}
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="For example: the student details could not be verified."
              className="input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700 resize-none"
            />
            <p className="mt-1.5 text-[12px] ink-muted">
              This reason is saved on the member record and can be reviewed later.
            </p>
          </div>
          <ModalFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setRejectTarget(null);
                setRejectReason('');
              }}
            >
              Cancel
            </Button>
            <Button type="button" variant="danger" isLoading={bulkBusy} onClick={submitReject}>
              Reject registration
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      <ConfirmHost ctx={confirmCtx} />
    </div>
  );
}

/**
 * useSearchParams() needs a Suspense boundary so Next.js can prerender the
 * route shell without the query string.
 */
export default function AdminMembersPage() {
  return (
    <Suspense fallback={<MembersLoading />}>
      <MembersManager />
    </Suspense>
  );
}
