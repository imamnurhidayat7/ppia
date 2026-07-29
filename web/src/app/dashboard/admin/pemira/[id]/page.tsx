'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { useToast } from '@/components/Toast';
import { useConfirm, ConfirmHost } from '@/hooks/useConfirm';
import { Badge, Button, Modal, ModalFooter } from '@/components/ui';
import {
  AccessDenied,
  DetailItem,
  EmptyBlock,
  Field,
  FormGrid,
  PageHeading,
  PageLoading,
  PageStack,
  SectionCard,
  StatTile,
  StatTileRow,
} from '@/components/dashboard';
import {
  BadgeCheck,
  CalendarClock,
  ClipboardList,
  Megaphone,
  RefreshCw,
  Settings2,
  Trash2,
  Users,
  Vote,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminElection {
  id: string;
  title: string;
  description?: string;
  status: string;
  registrationStart: string;
  registrationEnd: string;
  campaignStart?: string;
  campaignEnd?: string;
  votingStart: string;
  votingEnd: string;
  _count?: { candidates?: number; votes?: number };
}

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'outline';

const STATUS_META: Record<string, { label: string; variant: BadgeVariant }> = {
  UPCOMING: { label: 'Upcoming', variant: 'outline' },
  REGISTRATION: { label: 'Registration', variant: 'warning' },
  CAMPAIGN: { label: 'Campaign', variant: 'primary' },
  VOTING: { label: 'Voting', variant: 'success' },
  CLOSED: { label: 'Closed', variant: 'default' },
  PUBLISHED: { label: 'Completed', variant: 'primary' },
};

const EMPTY_EDIT = {
  title: '',
  description: '',
  registrationStart: '',
  registrationEnd: '',
  campaignStart: '',
  campaignEnd: '',
  votingStart: '',
  votingEnd: '',
};

/** ISO -> value for a datetime-local input, kept in the admin's local time zone. */
function toLocalInput(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function formatDateTime(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-NZ', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ManageElectionPage() {
  const params = useParams<{ id: string }>();
  const electionId = params?.id ?? '';
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const confirmCtx = useConfirm();

  const [election, setElection] = useState<AdminElection | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  /** Captured when the data arrives so the active phase stays stable during render. */
  const [nowTs, setNowTs] = useState(0);

  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState(EMPTY_EDIT);
  const [saving, setSaving] = useState(false);

  // PEMIRA is Super Admin only; the API enforces this as well.
  const canManage = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const loadElection = useCallback(async () => {
    try {
      const res = (await api.getElection(electionId)) as { election?: AdminElection };
      setElection(res.election ?? null);
      setNowTs(Date.now());
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      showError(err.response?.data?.error || err.message || 'Could not load the election detail');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [electionId, showError]);

  /* eslint-disable react-hooks/set-state-in-effect --
     loadElection() only writes state after a network await (fetch-on-mount);
     the linter cannot see past that call. */
  useEffect(() => {
    if (user && canManage && electionId) {
      loadElection();
    }
  }, [user, canManage, electionId, loadElection]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const openEdit = () => {
    if (!election) return;
    setEditData({
      title: election.title,
      description: election.description || '',
      registrationStart: toLocalInput(election.registrationStart),
      registrationEnd: toLocalInput(election.registrationEnd),
      // The campaign phase can be empty in older data, so fall back to the nearest schedule.
      campaignStart: toLocalInput(election.campaignStart || election.registrationEnd),
      campaignEnd: toLocalInput(election.campaignEnd || election.votingStart),
      votingStart: toLocalInput(election.votingStart),
      votingEnd: toLocalInput(election.votingEnd),
    });
    setEditOpen(true);
  };

  const setEditValue = (key: keyof typeof EMPTY_EDIT, value: string) => {
    setEditData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const dateKeys: (keyof typeof EMPTY_EDIT)[] = [
      'registrationStart',
      'registrationEnd',
      'campaignStart',
      'campaignEnd',
      'votingStart',
      'votingEnd',
    ];
    // Without this guard, an empty date makes toISOString() throw.
    if (dateKeys.some((key) => !editData[key])) {
      showError('Every phase date is required');
      return;
    }
    setSaving(true);
    try {
      await api.updateElection(electionId, {
        title: editData.title,
        description: editData.description,
        registrationStart: new Date(editData.registrationStart).toISOString(),
        registrationEnd: new Date(editData.registrationEnd).toISOString(),
        campaignStart: new Date(editData.campaignStart).toISOString(),
        campaignEnd: new Date(editData.campaignEnd).toISOString(),
        votingStart: new Date(editData.votingStart).toISOString(),
        votingEnd: new Date(editData.votingEnd).toISOString(),
      });
      showSuccess('Election settings saved');
      setEditOpen(false);
      await loadElection();
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      showError(err.response?.data?.error || err.message || 'Could not save the changes');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    const ok = await confirmCtx.confirm({
      title: 'Publish the election results?',
      message: 'Voting will be closed and the results announced. This action cannot be undone.',
      confirmLabel: 'Yes, publish',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await api.updateElection(electionId, { status: 'PUBLISHED' });
      showSuccess('Election results published');
      await loadElection();
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      showError(err.response?.data?.error || err.message || 'Could not publish the results');
    }
  };

  const handleDelete = async () => {
    const ok = await confirmCtx.confirm({
      title: 'Delete this election?',
      message:
        'The election, along with every candidate and vote in it, will be permanently removed. This cannot be undone. If no elections remain, PEMIRA disappears from the public menu.',
      confirmLabel: 'Yes, delete',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await api.deleteElection(electionId);
      showSuccess('Election deleted');
      router.push('/dashboard/admin/pemira');
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      showError(err.response?.data?.error || err.message || 'Could not delete the election');
    }
  };

  if (isLoading || (loading && canManage)) {
    return <PageLoading label="Loading election detail…" />;
  }

  if (!canManage) {
    return (
      <AccessDenied
        message="Managing PEMIRA is limited to Super Admins."
        backHref="/dashboard"
      />
    );
  }

  if (!election) {
    return (
      <PageStack>
        <PageHeading
          eyebrow="PEMIRA"
          title="Election not found"
          icon={Vote}
          backHref="/dashboard/admin/pemira"
          backLabel="Back to elections"
        />
        <SectionCard flush>
          <EmptyBlock
            icon={Vote}
            title="Election data is unavailable"
            description="The election may have been deleted or the link is wrong."
            action={
              <Link href="/dashboard/admin/pemira">
                <Button variant="primary">Go to elections</Button>
              </Link>
            }
          />
        </SectionCard>
      </PageStack>
    );
  }

  const meta = STATUS_META[election.status] ?? {
    label: election.status,
    variant: 'default' as BadgeVariant,
  };
  const candidateCount = election._count?.candidates ?? 0;
  const voteCount = election._count?.votes ?? 0;
  const isPublished = election.status === 'PUBLISHED';

  const phases: { key: string; label: string; icon: typeof ClipboardList; start?: string; end?: string }[] = [
    {
      key: 'registration',
      label: 'Registration',
      icon: ClipboardList,
      start: election.registrationStart,
      end: election.registrationEnd,
    },
    {
      key: 'campaign',
      label: 'Campaign',
      icon: Megaphone,
      start: election.campaignStart,
      end: election.campaignEnd,
    },
    {
      key: 'voting',
      label: 'Voting',
      icon: Vote,
      start: election.votingStart,
      end: election.votingEnd,
    },
  ];

  const isRunning = (start?: string, end?: string) => {
    if (!start || !end || !nowTs) return false;
    const startTs = new Date(start).getTime();
    const endTs = new Date(end).getTime();
    return (
      Number.isFinite(startTs) && Number.isFinite(endTs) && nowTs >= startTs && nowTs <= endTs
    );
  };

  const runningPhase = phases.find((phase) => isRunning(phase.start, phase.end));

  return (
    <PageStack>
      <PageHeading
        eyebrow="PEMIRA"
        title={election.title}
        description={election.description || 'Manage candidates, track votes, and set the phase schedule.'}
        icon={Vote}
        backHref="/dashboard/admin/pemira"
        backLabel="Back to elections"
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />}
              onClick={() => {
                setRefreshing(true);
                loadElection();
              }}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Settings2 className="h-4 w-4" />}
              onClick={openEdit}
            >
              Edit settings
            </Button>
          </>
        }
      />

      <StatTileRow columns={4}>
        <StatTile label="Candidates" value={candidateCount} tone="sky" icon={Users} />
        <StatTile label="Votes cast" value={voteCount} tone="red" icon={Vote} />
        <StatTile label="Status" value={meta.label} tone="emerald" icon={BadgeCheck} />
        <StatTile
          label="Current phase"
          value={runningPhase?.label ?? 'None'}
          tone="amber"
          icon={CalendarClock}
          hint={runningPhase ? `Ends ${formatDateTime(runningPhase.end)}` : 'Outside every phase window'}
        />
      </StatTileRow>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard
          title="Manage candidates"
          description={`${candidateCount} applicants — approve or reject their submissions.`}
          icon={Users}
        >
          <Link href={`/dashboard/admin/pemira/${election.id}/candidates`}>
            <Button variant="secondary" size="sm" leftIcon={<Users className="h-4 w-4" />}>
              Open candidates
            </Button>
          </Link>
        </SectionCard>

        <SectionCard
          title="Voter audit"
          description={`${voteCount} votes cast — see who has already voted.`}
          icon={ClipboardList}
        >
          <Link href={`/dashboard/admin/pemira/${election.id}/voters`}>
            <Button variant="secondary" size="sm" leftIcon={<ClipboardList className="h-4 w-4" />}>
              Open voter audit
            </Button>
          </Link>
        </SectionCard>

        <SectionCard
          title="Publish results"
          description={
            isPublished
              ? 'The election results have already been published.'
              : 'Closes voting and announces the winner. This cannot be undone.'
          }
          icon={BadgeCheck}
        >
          <Button
            variant="primary"
            size="sm"
            disabled={isPublished}
            leftIcon={<BadgeCheck className="data-type uppercase h-4 w-4" />}
            onClick={handlePublish}
          >
            {isPublished ? 'Already published' : 'Publish results'}
          </Button>
        </SectionCard>
      </div>

      {/* Danger zone: removing the last election also drops PEMIRA from the
          public header, so it is called out on its own rather than tucked in
          beside the everyday actions. */}
      <SectionCard
        title="Delete election"
        description="Permanently removes this election and all of its candidates and votes. When no elections remain, PEMIRA is hidden from the public menu."
        icon={Trash2}
      >
        <Button
          variant="danger"
          size="sm"
          leftIcon={<Trash2 className="h-4 w-4" />}
          onClick={handleDelete}
        >
          Delete election
        </Button>
      </SectionCard>

      <SectionCard
        title="Election schedule"
        description="The phase currently in progress is highlighted."
        icon={CalendarClock}
      >
        <div className="space-y-5">
          {phases.map((phase) => {
            const running = isRunning(phase.start, phase.end);
            return (
              <div
                key={phase.key}
                className={cn(
                  'rounded-[4px] border p-4',
                  running
                    ? 'border-[#E8231A]/40 bg-[#FFF0EF] dark:border-[#E8231A]/40 dark:bg-[#E8231A]/10'
                    : 'border-[#DCE7F1] dark:border-slate-800'
                )}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="font-display text-sm font-bold ink-strong">
                    {phase.label}
                  </h3>
                  {running && <Badge variant="danger" className="data-type uppercase">In progress</Badge>}
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <DetailItem label="Starts" value={formatDateTime(phase.start)} icon={phase.icon} />
                  <DetailItem label="Ends" value={formatDateTime(phase.end)} icon={phase.icon} />
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit election settings"
        description="Changes are saved as soon as you press save."
        size="xl"
      >
        <form onSubmit={handleSave} className="space-y-5">
          <Field label="Election title" htmlFor="edit-title" required>
            <input
              id="edit-title"
              type="text"
              required
              value={editData.title}
              onChange={(changeEvent) => setEditValue('title', changeEvent.target.value)}
              className="input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700"
            />
          </Field>

          <Field label="Description" htmlFor="edit-description">
            <textarea
              id="edit-description"
              rows={3}
              value={editData.description}
              onChange={(changeEvent) => setEditValue('description', changeEvent.target.value)}
              className="input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700 resize-none"
            />
          </Field>

          <div className="space-y-4 rounded-[4px] border border-[#DCE7F1] p-4 dark:border-slate-800">
            <p className="font-display text-sm font-bold ink-strong">
              Registration phase
            </p>
            <FormGrid columns={2}>
              <Field label="Starts" htmlFor="edit-registration-start" required>
                <input
                  id="edit-registration-start"
                  type="datetime-local"
                  required
                  value={editData.registrationStart}
                  onChange={(changeEvent) =>
                    setEditValue('registrationStart', changeEvent.target.value)
                  }
                  className="input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700"
                />
              </Field>
              <Field label="Ends" htmlFor="edit-registration-end" required>
                <input
                  id="edit-registration-end"
                  type="datetime-local"
                  required
                  value={editData.registrationEnd}
                  onChange={(changeEvent) =>
                    setEditValue('registrationEnd', changeEvent.target.value)
                  }
                  className="input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700"
                />
              </Field>
            </FormGrid>
          </div>

          <div className="space-y-4 rounded-[4px] border border-[#DCE7F1] p-4 dark:border-slate-800">
            <p className="font-display text-sm font-bold ink-strong">
              Campaign phase
            </p>
            <FormGrid columns={2}>
              <Field label="Starts" htmlFor="edit-campaign-start" required>
                <input
                  id="edit-campaign-start"
                  type="datetime-local"
                  required
                  value={editData.campaignStart}
                  onChange={(changeEvent) =>
                    setEditValue('campaignStart', changeEvent.target.value)
                  }
                  className="input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700"
                />
              </Field>
              <Field label="Ends" htmlFor="edit-campaign-end" required>
                <input
                  id="edit-campaign-end"
                  type="datetime-local"
                  required
                  value={editData.campaignEnd}
                  onChange={(changeEvent) => setEditValue('campaignEnd', changeEvent.target.value)}
                  className="input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700"
                />
              </Field>
            </FormGrid>
          </div>

          <div className="space-y-4 rounded-[4px] border border-[#DCE7F1] p-4 dark:border-slate-800">
            <p className="font-display text-sm font-bold ink-strong">
              Voting phase
            </p>
            <FormGrid columns={2}>
              <Field label="Starts" htmlFor="edit-voting-start" required>
                <input
                  id="edit-voting-start"
                  type="datetime-local"
                  required
                  value={editData.votingStart}
                  onChange={(changeEvent) => setEditValue('votingStart', changeEvent.target.value)}
                  className="input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700"
                />
              </Field>
              <Field label="Ends" htmlFor="edit-voting-end" required>
                <input
                  id="edit-voting-end"
                  type="datetime-local"
                  required
                  value={editData.votingEnd}
                  onChange={(changeEvent) => setEditValue('votingEnd', changeEvent.target.value)}
                  className="input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700"
                />
              </Field>
            </FormGrid>
          </div>

          <ModalFooter>
            <Button type="button" variant="secondary" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={saving}>
              Save changes
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      <ConfirmHost ctx={confirmCtx} />
    </PageStack>
  );
}
