'use client';

/**
 * Board edit page for one scholarship.
 *
 * Visibility has one control: the Published switch in the form below. Saving
 * with it on publishes immediately (stage PUBLISHED); off hides the row
 * (stage DRAFT). The internal note is a private memo for other board members.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { GraduationCap } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { useToast } from '@/components/Toast';
import {
  AccessDenied,
  EmptyBlock,
  Field,
  ListPageSkeleton,
  PageHeading,
  PageStack,
  SectionCard,
} from '@/components/dashboard';
import { Badge, Button, Textarea } from '@/components/ui';
import { ScholarshipForm } from '../../_components/scholarship-form';
import {
  buildScholarshipPayload,
  errorMessage,
  formFromScholarship,
  statusMeta,
  type Scholarship,
  type ScholarshipFormValues,
} from '../../_components/shared';

export default function AdminScholarshipEditPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [item, setItem] = useState<Scholarship | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState('');

  const canManage = user?.role === 'SUPER_ADMIN' || user?.role === 'BOARD';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const fetchItem = useCallback(async () => {
    try {
      const res = (await api.getScholarshipAdminById(id)) as { scholarship?: Scholarship };
      const found = res.scholarship ?? null;
      setItem(found);
      if (found) {
        setNote(found.reviewComments ?? '');
      }
    } catch (error) {
      showError(errorMessage(error, 'Could not load scholarship'));
    } finally {
      setLoading(false);
    }
  }, [id, showError]);

  /* eslint-disable react-hooks/set-state-in-effect --
     fetchItem() only writes state after awaiting the network. */
  useEffect(() => {
    if (user && canManage) {
      fetchItem();
    } else if (!isLoading) {
      setLoading(false);
    }
  }, [user, canManage, isLoading, fetchItem]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSave = async (values: ScholarshipFormValues) => {
    setSaving(true);
    try {
      const payload = buildScholarshipPayload(values, { board: true });
      await api.updateScholarship(id, {
        ...payload,
        // The Published switch is the single visibility control: on publishes
        // immediately, off hides the row. The API derives `published` from
        // the stage, so the two can never disagree.
        status: values.published ? 'PUBLISHED' : 'DRAFT',
        reviewComments: note || null,
      });
      showSuccess('Scholarship saved');
      router.push('/dashboard/admin/scholarships');
    } catch (error) {
      showError(errorMessage(error, 'Could not save changes'));
      setSaving(false);
    }
  };

  if (isLoading || loading) {
    return <ListPageSkeleton tiles={0} rows={6} />;
  }

  if (!canManage) {
    return (
      <AccessDenied
        message="Reviewing scholarships is only for Super Admin and Board."
        backHref="/dashboard"
      />
    );
  }

  if (!item) {
    return (
      <PageStack>
        <EmptyBlock
          icon={GraduationCap}
          title="Scholarship not found"
          description="It may have been deleted."
          action={
            <Link href="/dashboard/admin/scholarships">
              <Button variant="secondary">Back to scholarships</Button>
            </Link>
          }
        />
      </PageStack>
    );
  }

  const status = statusMeta(item.status);

  return (
    <PageStack>
      <PageHeading
        title="Edit scholarship"
        description={`“${item.name}” entered by ${item.submittedBy?.name ?? 'board'}.`}
        icon={GraduationCap}
        backHref="/dashboard/admin/scholarships"
        backLabel="Back to scholarships"
      />

      <SectionCard
        title="Publishing"
        description="Live status and an internal note for other board members. Visibility itself is the Published switch in the form below."
      >
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <Badge variant={status?.badge || 'default'} className="data-type uppercase">
            Current stage: {status?.label ?? item.status}
          </Badge>
          {item.published ? (
            <Badge variant="outline" className="data-type uppercase">Public</Badge>
          ) : (
            <Badge variant="warning" className="data-type uppercase">Unpublished</Badge>
          )}
        </div>
        <Field
          label="Internal note"
          htmlFor="sch-note"
          hint="Private note for other board members."
        >
          <Textarea
            id="sch-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="e.g. Waiting on the official deadline confirmation."
          />
        </Field>
      </SectionCard>

      <ScholarshipForm
        key={item.updatedAt}
        board
        initial={formFromScholarship(item)}
        saving={saving}
        submitLabel="Save changes"
        onSubmit={handleSave}
      />
    </PageStack>
  );
}
