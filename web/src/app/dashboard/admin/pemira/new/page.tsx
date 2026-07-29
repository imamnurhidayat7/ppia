'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { useToast } from '@/components/Toast';
import { Button } from '@/components/ui';
import {
  AccessDenied,
  Field,
  FormActions,
  FormGrid,
  PageHeading,
  PageLoading,
  PageStack,
  SectionCard,
} from '@/components/dashboard';
import { CalendarClock, ClipboardList, Info, Megaphone, Save, Vote } from 'lucide-react';

const EMPTY_FORM = {
  title: '',
  description: '',
  registrationStart: '',
  registrationEnd: '',
  campaignStart: '',
  campaignEnd: '',
  votingStart: '',
  votingEnd: '',
};

export default function NewElectionPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const { showError, showSuccess } = useToast();

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  // PEMIRA is Super Admin only; the API enforces this as well.
  const canManage = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const setValue = (key: keyof typeof EMPTY_FORM, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      // Payload is unchanged: an empty campaign phase is filled in
      // automatically from the registration end until voting starts.
      const res = (await api.createElection({
        title: formData.title,
        description: formData.description,
        registrationStart: formData.registrationStart,
        registrationEnd: formData.registrationEnd,
        campaignStart: formData.campaignStart || formData.registrationEnd,
        campaignEnd: formData.campaignEnd || formData.votingStart,
        votingStart: formData.votingStart,
        votingEnd: formData.votingEnd,
      })) as { election?: { id?: string } };

      showSuccess('Election created');
      const newId = res.election?.id;
      router.push(newId ? `/dashboard/admin/pemira/${newId}` : '/dashboard/admin/pemira');
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      showError(err.response?.data?.error || err.message || 'Could not create the election');
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return <PageLoading label="Preparing the form…" />;
  }

  if (!canManage) {
    return (
      <AccessDenied
        message="Creating elections is limited to Super Admins."
        backHref="/dashboard"
      />
    );
  }

  return (
    <PageStack>
      <PageHeading
        eyebrow="PEMIRA"
        title="New election"
        description="Fill in the election details and the schedule for each phase before registration opens."
        icon={Vote}
        backHref="/dashboard/admin/pemira"
        backLabel="Back to elections"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <SectionCard
          title="Basic information"
          description="The election name members see, along with its summary."
          icon={Info}
        >
          <div className="space-y-4">
            <Field label="Election title" htmlFor="election-title" required>
              <input
                id="election-title"
                type="text"
                required
                value={formData.title}
                onChange={(changeEvent) => setValue('title', changeEvent.target.value)}
                className="input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700"
                placeholder="PEMIRA PPIA Auckland 2026"
              />
            </Field>
            <Field
              label="Description"
              htmlFor="election-description"
              hint="Optional. Explain the position being contested and the term of office."
            >
              <textarea
                id="election-description"
                rows={3}
                value={formData.description}
                onChange={(changeEvent) => setValue('description', changeEvent.target.value)}
                className="input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700 resize-none"
                placeholder="Election for the PPIA Auckland President, 2026–2027 term…"
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard
          title="Registration phase"
          description="The window in which members can register as candidates."
          icon={ClipboardList}
        >
          <FormGrid columns={2}>
            <Field label="Registration starts" htmlFor="election-registration-start" required>
              <input
                id="election-registration-start"
                type="datetime-local"
                required
                value={formData.registrationStart}
                onChange={(changeEvent) => setValue('registrationStart', changeEvent.target.value)}
                className="input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700"
              />
            </Field>
            <Field label="Registration ends" htmlFor="election-registration-end" required>
              <input
                id="election-registration-end"
                type="datetime-local"
                required
                value={formData.registrationEnd}
                onChange={(changeEvent) => setValue('registrationEnd', changeEvent.target.value)}
                className="input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700"
              />
            </Field>
          </FormGrid>
        </SectionCard>

        <SectionCard
          title="Campaign phase"
          description="Leave both empty if the campaign runs straight from registration until voting opens."
          icon={Megaphone}
        >
          <FormGrid columns={2}>
            <Field
              label="Campaign starts"
              htmlFor="election-campaign-start"
              hint="Empty = uses the registration end."
            >
              <input
                id="election-campaign-start"
                type="datetime-local"
                value={formData.campaignStart}
                onChange={(changeEvent) => setValue('campaignStart', changeEvent.target.value)}
                className="input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700"
              />
            </Field>
            <Field
              label="Campaign ends"
              htmlFor="election-campaign-end"
              hint="Empty = uses the voting start time."
            >
              <input
                id="election-campaign-end"
                type="datetime-local"
                value={formData.campaignEnd}
                onChange={(changeEvent) => setValue('campaignEnd', changeEvent.target.value)}
                className="input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700"
              />
            </Field>
          </FormGrid>
        </SectionCard>

        <SectionCard
          title="Voting phase"
          description="Votes can only be cast within this window."
          icon={CalendarClock}
        >
          <FormGrid columns={2}>
            <Field label="Voting starts" htmlFor="election-voting-start" required>
              <input
                id="election-voting-start"
                type="datetime-local"
                required
                value={formData.votingStart}
                onChange={(changeEvent) => setValue('votingStart', changeEvent.target.value)}
                className="input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700"
              />
            </Field>
            <Field label="Voting ends" htmlFor="election-voting-end" required>
              <input
                id="election-voting-end"
                type="datetime-local"
                required
                value={formData.votingEnd}
                onChange={(changeEvent) => setValue('votingEnd', changeEvent.target.value)}
                className="input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700"
              />
            </Field>
          </FormGrid>
        </SectionCard>

        <FormActions>
          <Link href="/dashboard/admin/pemira">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            variant="primary"
            isLoading={submitting}
            leftIcon={<Save className="h-4 w-4" />}
          >
            Create election
          </Button>
        </FormActions>
      </form>
    </PageStack>
  );
}
