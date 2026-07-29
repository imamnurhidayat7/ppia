'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import {
  CalendarClock,
  ClipboardList,
  ExternalLink,
  FileText,
  Images,
  Save,
  Send,
  SquarePen,
  Users,
} from 'lucide-react';
import { RegistrationFormBuilder } from '../../_components/registration-form-builder';
import { DEFAULT_REGISTRATION_FIELDS, type RegField } from '@/lib/event-registration';

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

export default function EditEventPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const eventId = params?.id as string | undefined;
  const { showError, showSuccess } = useToast();

  const [divisions, setDivisions] = useState<DivisionRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [eventSlug, setEventSlug] = useState('');
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
    locationMapUrl: '',
    divisionId: '',
    published: false,
    capacity: undefined as number | undefined,
    registrationDeadline: undefined as Date | undefined,
    isFree: true,
    registrationFields: [] as RegField[],
  });

  const canManage = user?.role === 'SUPER_ADMIN' || user?.role === 'BOARD';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const fetchData = useCallback(async () => {
    if (!eventId) return;
    try {
      const [divisionsRes, eventRes] = await Promise.all([
        api.getDivisions(),
        api.getEventAdmin(eventId),
      ]);
      const divisionPayload = divisionsRes as { divisions?: DivisionRef[] } | DivisionRef[];
      setDivisions(
        Array.isArray(divisionPayload) ? divisionPayload : divisionPayload?.divisions ?? []
      );

      const event = (eventRes.event || eventRes) as {
        title?: string;
        slug?: string;
        description?: string;
        content?: unknown;
        imageUrl?: string;
        startDate?: string;
        endDate?: string;
        location?: string;
        locationMapUrl?: string | null;
        division?: { id: string };
        divisionId?: string;
        published?: boolean;
        capacity?: number;
        registrationDeadline?: string;
        isFree?: boolean;
        registrationFields?: RegField[] | null;
      };

      const formatTimeFromDate = (dateStr?: string) => {
        if (!dateStr) return '14:00';
        const date = new Date(dateStr);
        return `${date.getHours().toString().padStart(2, '0')}:${date
          .getMinutes()
          .toString()
          .padStart(2, '0')}`;
      };

      setEventSlug(event.slug || '');
      setFormData({
        title: event.title || '',
        slug: event.slug || '',
        description: event.description || '',
        content: typeof event.content === 'string' ? event.content : '',
        imageUrl: event.imageUrl || '',
        startDate: event.startDate ? new Date(event.startDate) : undefined,
        startTime: formatTimeFromDate(event.startDate),
        endDate: event.endDate ? new Date(event.endDate) : undefined,
        endTime: formatTimeFromDate(event.endDate || event.startDate),
        location: event.location || '',
        locationMapUrl: event.locationMapUrl || '',
        divisionId: event.division?.id || event.divisionId || '',
        published: event.published || false,
        capacity: event.capacity || undefined,
        registrationDeadline: event.registrationDeadline
          ? new Date(event.registrationDeadline)
          : undefined,
        isFree: event.isFree ?? true,
        // Existing events created before this feature have null fields → show
        // the defaults so the admin can start from them.
        registrationFields: Array.isArray(event.registrationFields)
          ? event.registrationFields
          : DEFAULT_REGISTRATION_FIELDS,
      });
    } catch (error) {
      const err = error as { message?: string };
      showError(err.message || 'Could not load event');
      router.push('/dashboard/admin/events');
    } finally {
      setLoading(false);
    }
  }, [eventId, router, showError]);

  /* eslint-disable react-hooks/set-state-in-effect --
     fetchData() only writes state after awaiting the network, which is the
     intended fetch-on-mount; the linter cannot see past the call. */
  useEffect(() => {
    if (user && canManage) {
      fetchData();
    }
  }, [user, canManage, fetchData]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSubmit = async (submitEvent: React.FormEvent) => {
    submitEvent.preventDefault();
    if (!eventId) return;
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
        // Sent as-is (including empty string) so clearing the field removes
        // the map rather than being skipped as "unchanged".
        locationMapUrl: formData.locationMapUrl,
        divisionId: formData.divisionId || undefined,
        published: formData.published,
        capacity: formData.capacity,
        isFree: formData.isFree,
        registrationDeadline: formData.registrationDeadline?.toISOString() || undefined,
        registrationFields: formData.registrationFields,
      };

      await api.updateEvent(eventId, data);
      showSuccess('Event changes saved');
      router.push('/dashboard/admin/events');
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      showError(err.response?.data?.error || err.message || 'Could not update event');
      setSubmitting(false);
    }
  };

  const showSkeleton = (isLoading || loading) && (isLoading || canManage);

  if (showSkeleton) {
    return <PageLoading label="Loading event…" />;
  }

  if (!canManage) {
    return (
      <AccessDenied
        message="Only Super Admin and Board can edit events."
        backHref="/dashboard"
      />
    );
  }

  return (
    <PageStack>
      <PageHeading
        eyebrow="Event"
        title="Edit event"
        description={formData.title || 'Update the activity details.'}
        icon={SquarePen}
        backHref="/dashboard/admin/events"
        backLabel="Back to events"
        actions={
          <>
            {eventId && (
              <Link href={`/dashboard/admin/events/${eventId}/documentation`}>
                <Button variant="secondary" size="sm" leftIcon={<Images className="h-4 w-4" />}>
                  Documentation
                </Button>
              </Link>
            )}
            {eventSlug && (
              <Link href={`/activities/events/${eventSlug}`}>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<ExternalLink className="h-4 w-4" />}
                >
                  View on site
                </Button>
              </Link>
            )}
          </>
        }
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
                  className="input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700"
                  placeholder="For example: Welcoming Party 2025"
                />
              </Field>
              <Field
                label="Slug"
                htmlFor="event-slug"
                required
                hint="Changing the slug also changes the event's public URL."
              >
                <input
                  id="event-slug"
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(changeEvent) =>
                    setFormData({ ...formData, slug: changeEvent.target.value })
                  }
                  className="input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700"
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
                className="input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700"
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
                className="input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700"
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
                className="input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700"
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
                className="input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700"
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
                className="input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700"
                placeholder="Melbourne Town Hall"
              />
            </Field>
            <Field
              label="Map embed URL"
              htmlFor="event-map-url"
              hint='Optional. In Google Maps: search the venue → Share → Embed a map → Copy HTML, then paste just the link inside src="..." here. Clear this field to remove the map.'
              className="sm:col-span-2"
            >
              <input
                id="event-map-url"
                type="url"
                value={formData.locationMapUrl}
                onChange={(changeEvent) =>
                  setFormData({ ...formData, locationMapUrl: changeEvent.target.value })
                }
                className="input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700"
                placeholder="https://www.google.com/maps/embed?pb=..."
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
                className="input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700"
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
                className="input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700"
              />
            </Field>
          </FormGrid>
        </SectionCard>

        <SectionCard
          title="Registration form"
          description="Fields attendees fill in when they register. Defaults are pre-filled from the member's profile; delete or add fields as needed."
          icon={ClipboardList}
        >
          <RegistrationFormBuilder
            fields={formData.registrationFields}
            onChange={(registrationFields) => setFormData({ ...formData, registrationFields })}
          />
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
                className="input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700"
              >
                <option value="">No division</option>
                {divisions.map((division) => (
                  <option key={division.id} value={division.id}>
                    {division.name}
                  </option>
                ))}
              </select>
            </Field>

            <div className="rounded-[4px] border border-[#DCE7F1] p-4 dark:border-slate-800">
              <Toggle
                id="event-published"
                label="Publish event"
                description="When enabled, the event appears on the public page."
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
            Save changes
          </Button>
        </FormActions>
      </form>
    </PageStack>
  );
}
