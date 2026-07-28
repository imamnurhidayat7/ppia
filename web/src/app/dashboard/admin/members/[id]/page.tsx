'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import type { UserProfile } from '@/lib/api-types';
import { useToast } from '@/components/Toast';
import { useConfirm, ConfirmHost } from '@/hooks/useConfirm';
import { Avatar, Badge, Button, Modal, ModalFooter } from '@/components/ui';
import {
  AccessDenied,
  DetailItem,
  EmptyBlock,
  Field,
  PageHeading,
  PageHero,
  PageStack,
  SectionCard,
} from '@/components/dashboard';
import { cn, formatDate, getImageUrl } from '@/lib/utils';
import {
  AlertCircle,
  Ban,
  Building2,
  Calendar,
  Check,
  Clock,
  Download,
  ExternalLink,
  FileText,
  GraduationCap,
  IdCard,
  Mail,
  Phone,
  UserCircle,
  Users,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type MembershipStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface UploadedFile {
  label: string;
  url?: string | null;
  isImage: boolean;
  emptyHint: string;
}

const STATUS_LABEL: Record<MembershipStatus, string> = {
  PENDING: 'Pending approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
}

function isPdfUrl(url: string): boolean {
  return /\.pdf$/i.test(url);
}

function safeDate(value?: string | null): string {
  if (!value) return '—';
  try {
    return formatDate(value);
  } catch {
    return value;
  }
}

function MemberDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-4 w-32 rounded skeleton" />
      <div className="h-40 rounded-3xl skeleton" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="h-96 rounded-2xl skeleton lg:col-span-2" />
        <div className="h-96 rounded-2xl skeleton" />
      </div>
    </div>
  );
}

/** Uploaded file preview: images render inline, everything else becomes a download link. */
function FileCard({ file }: { file: UploadedFile }) {
  const fullUrl = file.url ? getImageUrl(file.url) : undefined;
  const showImage = Boolean(fullUrl && file.isImage && isImageUrl(fullUrl));
  const isPdf = Boolean(fullUrl && isPdfUrl(fullUrl));

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-800/50">
        <FileText className="h-4 w-4 text-slate-400" />
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{file.label}</span>
      </div>
      <div className="p-4">
        {!fullUrl ? (
          <p className="text-sm text-slate-400">{file.emptyHint}</p>
        ) : showImage ? (
          <div className="space-y-2">
            {/* `object-contain`: these are scans of documents, so the whole page
                has to stay visible rather than being cropped to fill. */}
            <div className="relative h-44 w-full overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
              <Image
                src={fullUrl}
                alt={file.label}
                fill
                sizes="(min-width: 640px) 50vw, 100vw"
                className="object-contain"
              />
            </div>
            <a
              href={fullUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#E8231A] hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              Open original file
            </a>
          </div>
        ) : (
          <a
            href={fullUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg bg-slate-50 p-3 transition-colors hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800"
          >
            <span
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white',
                isPdf ? 'bg-[#E8231A]' : 'bg-slate-500'
              )}
            >
              {isPdf ? <FileText className="h-5 w-5" /> : <Download className="h-5 w-5" />}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
                {isPdf ? 'View PDF' : 'Download file'}
              </span>
              <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                {file.label}
              </span>
            </span>
          </a>
        )}
      </div>
    </div>
  );
}

export default function MemberDetailPage() {
  const params = useParams<{ id: string }>();
  const memberId = params?.id as string | undefined;
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { showSuccess, showError } = useToast();
  const confirmCtx = useConfirm();

  const [member, setMember] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Member data is not site content, so only Super Admin can view it.
  const canView = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const fetchMember = useCallback(async () => {
    if (!memberId) return;
    try {
      const response = (await api.getMember(memberId)) as { member?: UserProfile };
      if (response.member) {
        setMember(response.member);
        setError(null);
      } else {
        setError('Member not found.');
      }
    } catch (requestError) {
      const err = requestError as {
        response?: { data?: { error?: string } };
        message?: string;
      };
      setError(err.response?.data?.error || err.message || 'Could not load member details.');
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  /* eslint-disable react-hooks/set-state-in-effect --
     fetchMember() only writes state after awaiting the network; the linter
     cannot see past the call. */
  useEffect(() => {
    if (user && canView && memberId) {
      fetchMember();
    }
  }, [user, canView, memberId, fetchMember]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Anyone but Super Admin never triggers the fetch, so the skeleton must not wait on it.
  const showSkeleton = (authLoading || loading) && (authLoading || canView);

  const status = (member?.membershipStatus as MembershipStatus | undefined) ?? 'APPROVED';

  const registrationFields = useMemo(() => {
    if (!member) return [] as { label: string; value?: string; icon: LucideIcon }[];
    return [
      { label: 'Full name', value: member.name, icon: UserCircle },
      { label: 'Username', value: member.username, icon: UserCircle },
      { label: 'Account email', value: member.email, icon: Mail },
      { label: 'Personal email', value: member.personalEmail, icon: Mail },
      { label: 'Phone', value: member.phone, icon: Phone },
      { label: 'Student ID', value: member.studentId, icon: IdCard },
      { label: 'University', value: member.university, icon: Building2 },
      { label: 'University email', value: member.universityEmail, icon: Mail },
      { label: 'UPI', value: member.upi, icon: IdCard },
      { label: 'Degree level', value: member.degree, icon: GraduationCap },
      { label: 'Programme', value: member.major, icon: GraduationCap },
      { label: 'Graduation date', value: safeDate(member.graduationDate), icon: Calendar },
      { label: 'Funding source', value: member.funding, icon: Wallet },
      { label: 'Registered', value: safeDate(member.createdAt), icon: Calendar },
    ];
  }, [member]);

  const uploadedFiles = useMemo<UploadedFile[]>(() => {
    if (!member) return [];
    return [
      {
        label: 'Profile photo',
        url: member.avatar,
        isImage: true,
        emptyHint: 'No profile photo uploaded yet.',
      },
      {
        label: 'Member card / ID',
        url: member.memberCardUrl,
        isImage: false,
        emptyHint: 'No member card uploaded yet.',
      },
      {
        label: 'LoA / CoE / LoG (proof of student status)',
        url: member.loaCoe,
        isImage: false,
        emptyHint: 'No proof of student status uploaded yet.',
      },
    ];
  }, [member]);

  const handleApprove = async () => {
    if (!member) return;
    const ok = await confirmCtx.confirm({
      title: status === 'PENDING' ? 'Approve member?' : 'Approve member again?',
      message: `${member.name || member.username} will be able to log in and access member features right away.`,
      confirmLabel: 'Yes, approve',
      variant: 'warning',
    });
    if (!ok) return;
    setActionLoading(true);
    try {
      await api.approveMember(member.id);
      showSuccess('Member approved');
      await fetchMember();
    } catch (requestError) {
      const err = requestError as {
        response?: { data?: { error?: string } };
        message?: string;
      };
      showError(err.response?.data?.error || err.message || 'Could not approve member');
    } finally {
      setActionLoading(false);
    }
  };

  const submitReject = async () => {
    if (!member) return;
    setActionLoading(true);
    try {
      await api.rejectMember(member.id, rejectReason.trim() || undefined);
      showSuccess('Registration rejected');
      setRejectOpen(false);
      setRejectReason('');
      await fetchMember();
    } catch (requestError) {
      const err = requestError as {
        response?: { data?: { error?: string } };
        message?: string;
      };
      showError(err.response?.data?.error || err.message || 'Could not reject registration');
    } finally {
      setActionLoading(false);
    }
  };

  if (showSkeleton) {
    return <MemberDetailSkeleton />;
  }

  if (!canView) {
    return (
      <AccessDenied message="Only Super Admin can view member details." backHref="/dashboard" />
    );
  }

  if (error || !member) {
    return (
      <PageStack>
        <PageHeading
          title="Member details"
          backHref="/dashboard/admin/members"
          backLabel="Back to members"
        />
        <SectionCard flush>
          <EmptyBlock
            icon={AlertCircle}
            title="Member data could not be loaded"
            description={error || 'Member not found.'}
            action={
              <Button variant="secondary" onClick={() => fetchMember()}>
                Try again
              </Button>
            }
          />
        </SectionCard>
      </PageStack>
    );
  }

  const statusBadgeVariant =
    status === 'PENDING' ? 'warning' : status === 'REJECTED' ? 'danger' : 'success';

  return (
    <PageStack>
      <PageHeading
        title="Member details"
        description="Review the registration details and files before making a decision."
        backHref="/dashboard/admin/members"
        backLabel="Back to members"
        icon={Users}
        actions={
          status !== 'APPROVED' ? (
            <>
              <Button
                variant="success"
                size="sm"
                leftIcon={<Check className="h-4 w-4" />}
                isLoading={actionLoading}
                onClick={handleApprove}
              >
                {status === 'PENDING' ? 'Approve' : 'Approve again'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Ban className="h-4 w-4" />}
                disabled={actionLoading}
                onClick={() => setRejectOpen(true)}
              >
                Reject
              </Button>
            </>
          ) : undefined
        }
      />

      <PageHero
        title={member.name || member.username || 'Member'}
        description={member.email}
        eyebrow={member.role}
        icon={UserCircle}
        actions={
          <Avatar
            src={member.avatar ? getImageUrl(member.avatar) : undefined}
            name={member.name || member.username || 'Member'}
            size="2xl"
          />
        }
      >
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant={statusBadgeVariant} size="md">
            {STATUS_LABEL[status]}
          </Badge>
          {member.division?.name && (
            <Badge variant="outline" size="md" className="border-white/30 text-white/80">
              {member.division.name}
            </Badge>
          )}
          {member.position && (
            <Badge variant="outline" size="md" className="border-white/30 text-white/80">
              {member.position}
            </Badge>
          )}
          {member.username && member.username !== member.name && (
            <span className="text-xs text-white/60">@{member.username}</span>
          )}
        </div>
      </PageHero>

      {status === 'PENDING' && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-900/20">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/50">
            <Clock className="h-4 w-4 text-amber-700 dark:text-amber-300" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-amber-900 dark:text-amber-100">
              Registration awaiting a decision
            </p>
            <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-200">
              Check the registration details and uploaded files below before approving.
            </p>
          </div>
        </div>
      )}

      {status === 'REJECTED' && (
        <div className="flex items-start gap-3 rounded-2xl border border-danger-200 bg-danger-50 p-4 dark:border-danger-900/50 dark:bg-danger-900/20">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-danger-100 dark:bg-danger-900/50">
            <AlertCircle className="h-4 w-4 text-danger-700 dark:text-danger-300" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-danger-900 dark:text-danger-100">
              Registration rejected
            </p>
            {member.rejectionReason ? (
              <p className="mt-0.5 text-xs text-danger-800 dark:text-danger-200">
                Reason: {member.rejectionReason}
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-danger-800 dark:text-danger-200">
                No reason was recorded. You can still approve this member again.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SectionCard
          title="Registration details"
          description="Information the member submitted when they registered."
          icon={UserCircle}
          className="lg:col-span-2"
        >
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            {registrationFields.map((field) => (
              <DetailItem
                key={field.label}
                label={field.label}
                value={field.value || '—'}
                icon={field.icon}
              />
            ))}
          </div>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard
            title="Membership status"
            description="Decision history for this registration."
            icon={Check}
          >
            <div className="space-y-5">
              <DetailItem label="Status" value={STATUS_LABEL[status]} icon={Check} />
              <DetailItem
                label="Approved at"
                value={safeDate(member.approvedAt)}
                icon={Calendar}
              />
              <DetailItem label="Role" value={member.role || '—'} icon={Users} />
              <DetailItem
                label="Division"
                value={member.division?.name || '—'}
                icon={Building2}
              />
              {member.rejectionReason && (
                <DetailItem
                  label="Rejection reason"
                  value={member.rejectionReason}
                  icon={AlertCircle}
                />
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Uploaded files"
            description="Documents submitted for verification."
            icon={FileText}
          >
            <div className="space-y-4">
              {uploadedFiles.map((file) => (
                <FileCard key={file.label} file={file} />
              ))}
            </div>
          </SectionCard>
        </div>
      </div>

      <Modal
        isOpen={rejectOpen}
        onClose={() => {
          setRejectOpen(false);
          setRejectReason('');
        }}
        title="Reject registration"
        description={member.name || member.username}
        size="lg"
      >
        <div className="space-y-4">
          <Field
            label="Rejection reason"
            htmlFor="reject-reason"
            hint="Optional. This reason is saved on the member's record and can be reviewed later."
          >
            <textarea
              id="reject-reason"
              rows={4}
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="For example: the student details could not be verified."
              className="input-base resize-none"
            />
          </Field>
          <ModalFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setRejectOpen(false);
                setRejectReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              isLoading={actionLoading}
              onClick={submitReject}
            >
              Reject registration
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      <ConfirmHost ctx={confirmCtx} />
    </PageStack>
  );
}
