'use client';

/**
 * Board-entered scholarship (published or draft, at the board's choice).
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { useToast } from '@/components/Toast';
import { AccessDenied, ListPageSkeleton, PageHeading, PageStack } from '@/components/dashboard';
import { ScholarshipForm } from '../_components/scholarship-form';
import {
  buildScholarshipPayload,
  errorMessage,
  type ScholarshipFormValues,
} from '../_components/shared';

export default function NewAdminScholarshipPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [saving, setSaving] = useState(false);

  const canManage = user?.role === 'SUPER_ADMIN' || user?.role === 'BOARD';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const handleSave = async (values: ScholarshipFormValues) => {
    setSaving(true);
    try {
      await api.createScholarship({
        ...buildScholarshipPayload(values, { board: true }),
        status: values.published ? 'PUBLISHED' : 'DRAFT',
      });
      showSuccess(values.published ? 'Scholarship published.' : 'Scholarship saved as draft.');
      router.push('/dashboard/admin/scholarships');
    } catch (error) {
      showError(errorMessage(error, 'Could not save scholarship'));
      setSaving(false);
    }
  };

  if (isLoading || !user) {
    return <ListPageSkeleton tiles={0} rows={6} />;
  }

  if (!canManage) {
    return (
      <AccessDenied
        message="Managing scholarships is only for Super Admin and Board."
        backHref="/dashboard"
      />
    );
  }

  return (
    <PageStack>
      <PageHeading
        title="New scholarship"
        description="Board-entered entries can go live immediately or stay as drafts."
        icon={GraduationCap}
        backHref="/dashboard/admin/scholarships"
        backLabel="Back to scholarships"
      />
      <ScholarshipForm
        board
        saving={saving}
        submitLabel="Save scholarship"
        onSubmit={handleSave}
      />
    </PageStack>
  );
}
