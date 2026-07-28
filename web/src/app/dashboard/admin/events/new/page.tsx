'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { useToast } from '@/components/Toast';
import { ImageUploader } from '@/components/ui/ImageUploader';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { Button, Toggle } from '@/components/ui';
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
import { CalendarClock, CalendarPlus, FileText, Save, Send, Users } from 'lucide-react';

interface DivisionRef {
  id: string;
  name: string;
  color?: string;
}

/** Local date helpers keep the value the admin picked; toISOString() would shift it. */
function toDateInputValue(date?: Date): string {
  if (!date) return '';
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function toDateTimeInputValue(date?: Date): string {
  if (!date) return '';
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${toDateInputValue(date)}T${hours}:${minutes}`;
}

function fromDateInputValue(value: string): Date | undefined {
  return value ? new Date(`${value}T00:00:00`) : undefined;
}

export default function NewEventPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const { showError, showSuccess } = useToast();

  const [divisions, setDivisions] = useState<DivisionRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    content: '',
    imageUrl: '',
    startDate: undefined as Date | undefined,
    startTime: '14:00',
    endDate: undefined as Date | undefined,
    endTime: '17:00',
    location: '',
    divisionId: '',
    published: false,
    capacity: undefined as number | undefined,
    registrationDeadline: undefined as Date | undefined,
    isFree: true,
  });

  const canManage = user?.role === 'SUPER_ADMIN' || user?.role === 'BOARD';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const fetchDivisions = useCallback(async () => {
    try {
      const res = await api.getDivisions();
      const payload = res as { divisions?: DivisionRef[] } | DivisionRef[];
      setDivisions(Array.isArray(payload) ? payload : payload?.divisions ?? []);
    } catch (error) {
      const err = error as { message?: string };
      showError(err.message || 'Could not load divisions');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  /* eslint-disable react-hooks/set-state-in-effect --
     fetchDivisions() only writes state after awaiting the network, which is the
     intended fetch-on-mount; the linter cannot see past the call. */
  useEffect(() => {
    if (user && canManage) {
      fetchDivisions();
    }
  }, [user, canManage, fetchDivisions]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const combineDateTime = (date: Date | undefined, time: string) => {
        if (!date) return '';
        const [hours, minutes] = time.split(':');
        const combined = new Date(date);
        combined.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        return combined.toISOString();
      };

      const data = {
        title: formData.title,
        slug: formData.slug,
        description: formData.description,
        content: formData.content || {},
        imageUrl: formData.imageUrl,
        startDate: combineDateTime(formData.startDate, formData.startTime),
        endDate: formData.endDate ? combineDateTime(formData.endDate, formData.endTime) : '',
        location: formData.location,
        divisionId: formData.divisionId || undefined,
        published: formData.published,
        capacity: formData.capacity,
        isFree: formData.isFree,
        registrationDeadline: formData.registrationDeadline?.toISOString() || undefined,
      };

      await api.createEvent(data);
      showSuccess(formData.published ? 'Event created and published' : 'Event saved as draft');
      router.push('/dashboard/admin/events');
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      showError(err.response?.data?.error || err.message || 'Could not create event');
      setSubmitting(false);
    }
  };

  const showSkeleton = (isLoading || loading) && (isLoading || canManage);

  if (showSkeleton) {
    return <PageLoading label="Preparing the form…" />;
  }

  if (!canManage) {
    return (
      <AccessDenied
        message="Only Super Admin and Board can create events."
        backHref="/dashboard"
      />
    );
  }

  return (
    <PageStack>
      <PageHeading
        eyebrow="Event"
        title="New event"
        description="Fill in the activity details, then save as a draft or publish it right away."
        icon={CalendarPlus}
        backHref="/dashboard/admin/events"
        backLabel="Back to events"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <SectionCard
          title="Basics"
          description="Title, summary, and cover image shown on the site."
          icon={FileText}
        >
          <div className="space-y-5">
            <FormGrid columns={2}>
              <Field label="Event title" htmlFor="event-title" required>
                <input
                  id="event-title"
                  type="text"
                  required
                  value={formData.title}
                  onChange={(changeEvent) =>
                    setFormData({
                      ...formData,
                      title: changeEvent.target.value,
                      slug: changeEvent.target.value
                        .toLowerCase()
                        .replace(/\s+/g, '-')
                        .replace(/[^a-z0-9-]/g, ''),
                    })
                  }
                  className="input-base"
                  placeholder="For example: Welcoming Party 2025"
                />
              </Field>
              <Field
                label="Slug"
                htmlFor="event-slug"
                required
                hint="Filled automatically from the title and used in the public URL."
              >
                <input
                  id="event-slug"
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(changeEvent) =>
                    setFormData({ ...formData, slug: changeEvent.target.value })
                  }
                  className="input-base"
                  placeholder="welcoming-party-2025"
                />
              </Field>
            </FormGrid>

            <RichTextEditor
              label="Description"
              value={formData.description}
              onChange={(content) => setFormData({ ...formData, description: content })}
              placeholder="Describe the agenda, speakers, and other important details…"
            />

            <ImageUploader
              label="Cover image"
              value={formData.imageUrl}
              onChange={(url) => setFormData({ ...formData, imageUrl: url })}
              placeholder="Upload the event cover image"
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Schedule and location"
          description="Start time is required. End time is optional."
          icon={CalendarClock}
        >
          <FormGrid columns={2}>
            <Field label="Start date" htmlFor="event-start-date" required>
              <input
                id="event-start-date"
                type="date"
                required
                value={toDateInputValue(formData.startDate)}
                onChange={(changeEvent) =>
                  setFormData({
                    ...formData,
                    startDate: fromDateInputValue(changeEvent.target.value),
                  })
                }
                className="input-base"
              />
            </Field>
            <Field label="Start time" htmlFor="event-start-time" required>
              <input
                id="event-start-time"
                type="time"
                required
                value={formData.startTime}
                onChange={(changeEvent) =>
                  setFormData({ ...formData, startTime: changeEvent.target.value })
                }
                className="input-base"
              />
            </Field>
            <Field label="End date" htmlFor="event-end-date" hint="Optional.">
              <input
                id="event-end-date"
                type="date"
                value={toDateInputValue(formData.endDate)}
                onChange={(changeEvent) =>
                  setFormData({
                    ...formData,
                    endDate: fromDateInputValue(changeEvent.target.value),
                  })
                }
                className="input-base"
              />
            </Field>
            <Field label="End time" htmlFor="event-end-time">
              <input
                id="event-end-time"
                type="time"
                value={formData.endTime}
                onChange={(changeEvent) =>
                  setFormData({ ...formData, endTime: changeEvent.target.value })
                }
                className="input-base"
              />
            </Field>
            <Field
              label="Location"
              htmlFor="event-location"
              hint="Enter the venue name, or Online for a virtual event."
              className="sm:col-span-2"
            >
              <input
                id="event-location"
                type="text"
                value={formData.location}
                onChange={(changeEvent) =>
                  setFormData({ ...formData, location: changeEvent.target.value })
                }
                className="input-base"
                placeholder="Melbourne Town Hall"
              />
            </Field>
          </FormGrid>
        </SectionCard>

        <SectionCard
          title="Registration"
          description="Set the attendee capacity and registration deadline."
          icon={Users}
        >
          <FormGrid columns={2}>
            <Field
              label="Capacity"
              htmlFor="event-capacity"
              hint="Leave empty if there is no attendee limit."
            >
              <input
                id="event-capacity"
                type="number"
                min="1"
                value={formData.capacity ?? ''}
                onChange={(changeEvent) =>
                  setFormData({
                    ...formData,
                    capacity: changeEvent.target.value
                      ? parseInt(changeEvent.target.value)
                      : undefined,
                  })
                }
                className="input-base"
                placeholder="Example: 120"
              />
            </Field>
            <Field label="Registration deadline" htmlFor="event-deadline" hint="Optional.">
              <input
                id="event-deadline"
                type="datetime-local"
                value={toDateTimeInputValue(formData.registrationDeadline)}
                onChange={(changeEvent) =>
                  setFormData({
                    ...formData,
                    registrationDeadline: changeEvent.target.value
                      ? new Date(changeEvent.target.value)
                      : undefined,
                  })
                }
                className="input-base"
              />
            </Field>
          </FormGrid>
        </SectionCard>

        <SectionCard
          title="Division and publishing"
          description="Draft events are only visible in the admin dashboard."
          icon={Send}
        >
          <div className="space-y-5">
            <Field label="Division" htmlFor="event-division" hint="Optional.">
              <select
                id="event-division"
                value={formData.divisionId}
                onChange={(changeEvent) =>
                  setFormData({ ...formData, divisionId: changeEvent.target.value })
                }
                className="input-base"
              >
                <option value="">No division</option>
                {divisions.map((division) => (
                  <option key={division.id} value={division.id}>
                    {division.name}
                  </option>
                ))}
              </select>
            </Field>

            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <Toggle
                id="event-published"
                label="Publish event"
                description="When enabled, the event appears on the public page right away."
                checked={formData.published}
                onChange={(changeEvent) =>
                  setFormData({ ...formData, published: changeEvent.target.checked })
                }
              />
            </div>
          </div>
        </SectionCard>

        <FormActions>
          <Link href="/dashboard/admin/events">
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
            {formData.published ? 'Save and publish' : 'Save draft'}
          </Button>
        </FormActions>
      </form>
    </PageStack>
  );
}
