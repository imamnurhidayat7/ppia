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
import { BackButton, useDashboardData } from '@/components/dashboard';
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
  if (role === 'SUPER_ADMIN') return <Badge variant="danger">Super Admin</Badge>;
  if (role === 'BOARD') return <Badge variant="primary">Board</Badge>;
  return <Badge variant="default">Member</Badge>;
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
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1',
        style.className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', style.dot)} />
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
          'inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide transition-colors',
          active
            ? 'text-slate-900 dark:text-slate-100'
            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
        )}
        aria-label={`Urutkan berdasarkan ${label}`}
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
          <div key={row} className="h-24 rounded-2xl skeleton" />
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
      showError(err.message || 'Gagal memuat data anggota');
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
          return factor * (a.name || '').localeCompare(b.name || '', 'id');
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
    try {
      await api.approveMember(member.id);
      showSuccess(`${member.name} disetujui`);
      await afterMutation();
    } catch (error) {
      const err = error as { message?: string };
      showError(err.message || 'Gagal menyetujui anggota');
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
          ? `Pendaftaran ${rejectTarget[0].name} ditolak`
          : `${rejectTarget.length} pendaftaran ditolak`
      );
    } else {
      showError(`${failed} dari ${rejectTarget.length} penolakan gagal`);
    }
    await afterMutation();
  };

  const handleBulkApprove = async () => {
    if (selectablePending.length === 0) return;
    const ok = await confirmCtx.confirm({
      title: `Setujui ${selectablePending.length} anggota?`,
      message: 'Anggota terpilih akan langsung bisa masuk dan mengakses fitur member.',
      confirmLabel: 'Ya, setujui',
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
      showSuccess(`${selectablePending.length} anggota disetujui`);
    } else {
      showError(`${failed} dari ${selectablePending.length} persetujuan gagal`);
    }
    await afterMutation();
  };

  const handleDelete = async (member: AdminMember) => {
    const ok = await confirmCtx.confirm({
      title: 'Hapus anggota?',
      message: `Data ${member.name} akan dihapus permanen dan tidak bisa dibatalkan.`,
      confirmLabel: 'Ya, hapus',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await api.deleteMember(member.id);
      showSuccess('Anggota dihapus');
      setSelected((current) => {
        const next = new Set(current);
        next.delete(member.id);
        return next;
      });
      await afterMutation();
    } catch (error) {
      const err = error as { message?: string };
      showError(err.message || 'Gagal menghapus anggota');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedMembers.length === 0) return;
    const ok = await confirmCtx.confirm({
      title: `Hapus ${selectedMembers.length} anggota?`,
      message: 'Semua data anggota terpilih akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.',
      confirmLabel: 'Ya, hapus semua',
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
      showSuccess(`${selectedMembers.length} anggota dihapus`);
    } else {
      showError(`${failed} dari ${selectedMembers.length} penghapusan gagal`);
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
      showSuccess('Data anggota diperbarui');
      setEditingMember(null);
      await afterMutation();
    } catch (error) {
      const err = error as { message?: string };
      showError(err.message || 'Gagal memperbarui anggota');
    } finally {
      setSaving(false);
    }
  };

  /** Exports whatever the current filters show, not the whole table. */
  const exportCsv = () => {
    if (filteredMembers.length === 0) {
      showError('Tidak ada data untuk diekspor');
      return;
    }
    const headers = ['Nama', 'Email', 'Role', 'Posisi', 'Status', 'Divisi', 'Universitas', 'Terdaftar'];
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
    link.download = `anggota-ppia-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showSuccess(`${filteredMembers.length} baris diekspor`);
  };

  if (showSkeleton) {
    return <MembersLoading />;
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger-50 dark:bg-danger-900/40">
          <Ban className="h-7 w-7 text-danger-600 dark:text-danger-300" />
        </div>
        <h2 className="mb-1 text-lg font-bold text-slate-900 dark:text-slate-100">Akses ditolak</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Manajemen anggota hanya untuk Super Admin.
        </p>
      </div>
    );
  }

  const statusTabs = [
    { key: '', label: 'Semua', count: counts.all, dot: 'bg-slate-400', active: 'bg-slate-100 dark:bg-slate-800' },
    { key: 'PENDING', label: 'Pending', count: counts.PENDING, dot: 'bg-amber-500', active: 'bg-amber-50 dark:bg-amber-900/25' },
    { key: 'APPROVED', label: 'Disetujui', count: counts.APPROVED, dot: 'bg-emerald-500', active: 'bg-emerald-50 dark:bg-emerald-900/25' },
    { key: 'REJECTED', label: 'Ditolak', count: counts.REJECTED, dot: 'bg-danger-500', active: 'bg-danger-50 dark:bg-danger-900/25' },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <BackButton href="/dashboard/admin" label="Kembali ke Panel Admin" />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-black text-slate-900 dark:text-slate-50">
            Manajemen Anggota
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {counts.all} anggota terdaftar
            {counts.PENDING > 0 && ` • ${counts.PENDING} menunggu persetujuan`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />}
            onClick={() => {
              setRefreshing(true);
              fetchData();
            }}
          >
            Muat ulang
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={exportCsv}
          >
            Ekspor CSV
          </Button>
        </div>
      </div>

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
                'rounded-2xl border p-4 text-left transition-all',
                active
                  ? cn('border-transparent ring-2 ring-slate-300 dark:ring-slate-600', tab.active)
                  : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700'
              )}
            >
              <span className="flex items-center gap-2">
                <span className={cn('h-2 w-2 rounded-full', tab.dot)} />
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {tab.label}
                </span>
              </span>
              <span className="mt-1 block font-display text-2xl font-black text-slate-900 dark:text-slate-50">
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {counts.PENDING > 0 && statusFilter !== 'PENDING' && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-900/20">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/50">
            <Clock className="h-4 w-4 text-amber-700 dark:text-amber-300" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-amber-900 dark:text-amber-100">
              {counts.PENDING} pendaftaran menunggu keputusan
            </p>
            <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-200">
              Pilih beberapa baris sekaligus untuk menyetujui atau menolak secara massal.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('PENDING');
              setCurrentPage(1);
            }}
            className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-amber-800 shadow-sm transition-colors hover:bg-amber-50 dark:bg-slate-800 dark:text-amber-200"
          >
            Tinjau
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Cari nama, email, universitas, divisi…"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setCurrentPage(1);
            }}
            className="input-base pl-9"
            aria-label="Cari anggota"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(event) => {
            setRoleFilter(event.target.value);
            setCurrentPage(1);
          }}
          aria-label="Filter role"
          className="input-base lg:w-44"
        >
          <option value="">Semua role</option>
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
          aria-label="Filter divisi"
          className="input-base lg:w-48"
        >
          <option value="">Semua divisi</option>
          <option value="NONE">Tanpa divisi</option>
          {divisions.map((division) => (
            <option key={division.id} value={division.id}>
              {division.name}
            </option>
          ))}
        </select>
        {hasFilters && (
          <Button variant="ghost" size="md" leftIcon={<X className="h-4 w-4" />} onClick={clearFilters}>
            Reset
          </Button>
        )}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="animate-fade-in-up sticky bottom-4 z-20 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg sm:flex-row sm:items-center dark:border-slate-700 dark:bg-slate-900">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
              <Users className="h-4 w-4 text-slate-500" />
            </span>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {selected.size} dipilih
              {selectablePending.length > 0 && (
                <span className="ml-1 font-normal text-slate-500 dark:text-slate-400">
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
              Setujui
            </Button>
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Ban className="h-4 w-4" />}
              disabled={selectablePending.length === 0 || bulkBusy}
              onClick={() => setRejectTarget(selectablePending)}
            >
              Tolak
            </Button>
            <Button
              size="sm"
              variant="danger"
              leftIcon={<Trash2 className="h-4 w-4" />}
              disabled={bulkBusy}
              onClick={handleBulkDelete}
            >
              Hapus
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              Batal
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {filteredMembers.length === 0 ? (
          hasFilters ? (
            <div className="py-14 text-center">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Tidak ada anggota yang cocok
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-2 text-sm font-semibold text-[#E8231A] hover:underline"
              >
                Reset filter
              </button>
            </div>
          ) : (
            <EmptyMembers />
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={pageAllSelected}
                      onChange={togglePageSelection}
                      aria-label="Pilih semua di halaman ini"
                      className="h-4 w-4 cursor-pointer rounded border-slate-300 text-[#E8231A] focus:ring-[#E8231A]/30"
                    />
                  </th>
                  <SortHeader
                    label="Anggota"
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
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Divisi
                  </th>
                  <SortHeader
                    label="Terdaftar"
                    sortKey="createdAt"
                    activeKey={sortKey}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
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
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      )}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(member.id)}
                          aria-label={`Pilih ${member.name}`}
                          className="h-4 w-4 cursor-pointer rounded border-slate-300 text-[#E8231A] focus:ring-[#E8231A]/30"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar src={member.avatar} name={member.name} size="md" />
                          <div className="min-w-0">
                            <Link
                              href={`/dashboard/admin/members/${member.id}`}
                              className="block truncate text-sm font-semibold text-slate-900 hover:underline dark:text-slate-100"
                            >
                              {member.name}
                            </Link>
                            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                              {member.email}
                            </p>
                            {member.university && (
                              <p className="truncate text-xs text-slate-400">{member.university}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <RoleBadge role={member.role} />
                        {member.position && (
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
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
                            className="inline-flex rounded-full px-2 py-1 text-xs font-medium"
                            style={{
                              backgroundColor: `${member.division.color || '#6366F1'}20`,
                              color: member.division.color || '#6366F1',
                            }}
                          >
                            {member.division.name}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                        {formatDate(member.createdAt)}
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
                                Setujui
                              </Button>
                              <Button
                                size="xs"
                                variant="secondary"
                                leftIcon={<Ban className="h-3.5 w-3.5" />}
                                onClick={() => setRejectTarget([member])}
                              >
                                Tolak
                              </Button>
                            </>
                          )}
                          <Link
                            href={`/dashboard/admin/members/${member.id}`}
                            title="Lihat detail"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => openEdit(member)}
                            title="Ubah role & divisi"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(member)}
                            title="Hapus anggota"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-danger-600 transition-colors hover:bg-danger-50 dark:text-danger-400 dark:hover:bg-danger-900/30"
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
        title="Ubah anggota"
        description={editingMember?.name}
        size="lg"
      >
        <form onSubmit={handleSubmitEdit} className="space-y-4">
          <div>
            <label
              htmlFor="member-role"
              className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Role
            </label>
            <select
              id="member-role"
              value={formData.role}
              onChange={(event) => setFormData({ ...formData, role: event.target.value })}
              className="input-base"
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
              className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Posisi
            </label>
            <select
              id="member-position"
              value={formData.position}
              onChange={(event) => setFormData({ ...formData, position: event.target.value })}
              className="input-base"
            >
              <option value="">Tanpa posisi</option>
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
              className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Divisi
            </label>
            <select
              id="member-division"
              value={formData.divisionId}
              onChange={(event) => setFormData({ ...formData, divisionId: event.target.value })}
              className="input-base"
            >
              <option value="">Tanpa divisi</option>
              {divisions.map((division) => (
                <option key={division.id} value={division.id}>
                  {division.name}
                </option>
              ))}
            </select>
            {formData.role === 'BOARD' && !formData.divisionId && !formData.position && (
              <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
                Role Board memerlukan divisi atau posisi.
              </p>
            )}
          </div>

          <ModalFooter>
            <Button type="button" variant="secondary" onClick={() => setEditingMember(null)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" isLoading={saving}>
              Simpan perubahan
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
            ? `Tolak ${rejectTarget.length} pendaftaran`
            : 'Tolak pendaftaran'
        }
        description={
          rejectTarget && rejectTarget.length === 1
            ? rejectTarget[0].name
            : 'Alasan yang sama akan dipakai untuk semua anggota terpilih.'
        }
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label
              htmlFor="reject-reason"
              className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Alasan penolakan <span className="text-slate-400">(opsional)</span>
            </label>
            <textarea
              id="reject-reason"
              rows={4}
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="Contoh: data mahasiswa tidak dapat diverifikasi."
              className="input-base resize-none"
            />
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              Alasan ini tersimpan pada data anggota dan bisa dilihat kembali nanti.
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
              Batal
            </Button>
            <Button type="button" variant="danger" isLoading={bulkBusy} onClick={submitReject}>
              Tolak pendaftaran
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
