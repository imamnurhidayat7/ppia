'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import type { UserProfile } from '@/lib/api-types';
import { useToast } from '@/components/Toast';
import { Avatar, Badge, Button } from '@/components/ui';
import {
  EmptyBlock,
  Field,
  FormActions,
  FormGrid,
  PageHero,
  PageLoading,
  PageStack,
  SectionCard,
  StatTile,
  StatTileRow,
} from '@/components/dashboard';
import MemberCardModal from '@/components/MemberCardModal';
import AvatarPreviewModal from '@/components/dashboard/AvatarPreviewModal';
import {
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  CreditCard,
  Globe,
  IdCard,
  Link2,
  Save,
  SquarePen,
  Ticket,
  User,
  X,
} from 'lucide-react';

/* -------------------------------------------------------------- social icons */

function XIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedinIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function InstagramIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

/* -------------------------------------------------------------- local types */

interface RegistrationEvent {
  id?: string;
  title: string;
  slug?: string;
  startDate: string;
  location?: string;
  imageUrl?: string;
}

/**
 * `GET /event-registrations/my` includes the relation as `Event`; the shared
 * `EventRegistration` type spells it `event`, so both spellings are accepted.
 */
interface MyRegistration {
  id: string;
  status: string;
  registeredAt?: string;
  checkedInAt?: string | null;
  Event?: RegistrationEvent;
  event?: RegistrationEvent;
}

interface ProfileResponse {
  user: UserProfile;
}

interface RegistrationsResponse {
  registrations?: MyRegistration[];
}

interface ProfileForm {
  name: string;
  bio: string;
  linkedIn: string;
  instagram: string;
  twitter: string;
  phone: string;
  personalEmail: string;
}

const EMPTY_FORM: ProfileForm = {
  name: '',
  bio: '',
  linkedIn: '',
  instagram: '',
  twitter: '',
  phone: '',
  personalEmail: '',
};

const STATUS_LABEL: Record<string, string> = {
  REGISTERED: 'Registered',
  ATTENDED: 'Attended',
  CANCELLED: 'Cancelled',
  WAITLISTED: 'Waitlisted',
  NO_SHOW: 'No show',
};

const STATUS_VARIANT: Record<string, 'primary' | 'success' | 'danger' | 'warning' | 'default'> = {
  REGISTERED: 'primary',
  ATTENDED: 'success',
  CANCELLED: 'danger',
  WAITLISTED: 'warning',
  NO_SHOW: 'default',
};

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  BOARD: 'Board',
  MEMBER: 'Member',
};

/** Double-ring porthole used for the avatar and the record markers. */
const PORTHOLE_RING = {
  boxShadow: 'inset 0 0 0 1px rgba(11,28,46,0.14), 0 0 0 4px rgba(11,28,46,0.05)',
} as const;

/**
 * Dates on this page are log entries on a membership record, so they are set as
 * data: 05 Mar 2025 rather than 5 March 2025.
 */
function formatLongDate(date?: string | Date): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-NZ', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * One line of the membership record: a data-face label over its value, with a
 * rope hairline above it so the block reads as a ruled document rather than a
 * grid of loose pairs.
 */
function RecordRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <span aria-hidden="true" className="rope-rule block opacity-60" />
      <div className="py-3">
        <p className="data-type text-[12px] font-bold uppercase ink-muted">{label}</p>
        <p className="mt-1 break-words text-sm font-medium ink-strong">{value || '—'}</p>
      </div>
    </div>
  );
}

function formToState(user: UserProfile): ProfileForm {
  return {
    name: user.name || '',
    bio: user.bio || '',
    linkedIn: user.linkedIn || '',
    instagram: user.instagram || '',
    twitter: user.twitter || '',
    phone: user.phone || '',
    personalEmail: user.personalEmail || '',
  };
}

export default function ProfilePage() {
  const { user, isLoading: authLoading, isAuthenticated, updateUser } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useToast();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [registrations, setRegistrations] = useState<MyRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showMemberCard, setShowMemberCard] = useState(false);
  const [showAvatarPreview, setShowAvatarPreview] = useState(false);
  const [formData, setFormData] = useState<ProfileForm>(EMPTY_FORM);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const fetchProfile = useCallback(async () => {
    try {
      const [profileRes, registrationsRes] = await Promise.all([
        api.getProfile() as Promise<ProfileResponse>,
        api.getMyRegistrations() as Promise<RegistrationsResponse>,
      ]);
      setProfile(profileRes.user);
      setRegistrations(registrationsRes.registrations || []);
      setFormData(formToState(profileRes.user));
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect --
     fetchProfile() only writes state after awaiting the network requests; the
     linter cannot see past the await. */
  useEffect(() => {
    if (user) fetchProfile();
  }, [user, fetchProfile]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await api.updateProfile(formData);
      setProfile({ ...profile, ...formData });
      setEditing(false);
      showSuccess('Profile updated');
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      showError(err.response?.data?.error || err.message || 'Could not update your profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (profile) setFormData(formToState(profile));
    setEditing(false);
  };

  const handleAvatarUpdated = async (newAvatarUrl: string) => {
    if (!profile) return;
    setProfile({ ...profile, avatar: newAvatarUrl });
    await updateUser({ avatar: newAvatarUrl });
  };

  if (authLoading || loading) {
    return <PageLoading label="Loading profile…" />;
  }

  if (!user || !profile) return null;

  const attendedCount = registrations.filter(
    (registration) => registration.status === 'ATTENDED'
  ).length;
  const hasSocialLinks = Boolean(profile.linkedIn || profile.instagram || profile.twitter);
  const memberId = profile.studentId || `PPIA-${profile.id.slice(0, 6).toUpperCase()}`;

  return (
    <PageStack>
      <PageHero
        eyebrow="My profile"
        title={profile.name}
        description={profile.email}
        icon={User}
        actions={
          <>
            {profile.username && (
              <Link
                href={`/profile/${profile.username}`}
                target="_blank"
                className="inline-flex items-center gap-2 rounded-[5px] border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                <Globe className="h-4 w-4" />
                Public profile
              </Link>
            )}
            {!editing && (
              <Button
                variant="primary"
                leftIcon={<SquarePen className="h-4 w-4" />}
                onClick={() => setEditing(true)}
              >
                Edit profile
              </Button>
            )}
          </>
        }
      >
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant="danger" size="md">
            {ROLE_LABEL[profile.role] ?? profile.role}
          </Badge>
          {profile.position && (
            <span className="data-type rounded-[3px] bg-white/10 px-2 py-0.5 text-[12px] font-bold uppercase text-white/80">
              {profile.position.replace(/_/g, ' ')}
            </span>
          )}
          {profile.division?.name && (
            <span className="data-type rounded-[3px] bg-white/10 px-2 py-0.5 text-[12px] font-bold uppercase text-white/80">
              {profile.division.name}
            </span>
          )}
        </div>
      </PageHero>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ------------------------------------------------------ left column */}
        <div className="space-y-6">
          <SectionCard title="Profile photo" description="Shown on your member card and in the directory">
            <div className="flex flex-col items-center text-center">
              {/* Porthole: the photo sits behind a double-ring frame. Click the
                  photo (or the camera badge in the corner) to open the avatar
                  preview modal. */}
              <button
                type="button"
                onClick={() => setShowAvatarPreview(true)}
                aria-label="View and change profile photo"
                className="group relative inline-block rounded-full p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E8231A] focus-visible:ring-offset-2"
                style={PORTHOLE_RING}
              >
                <Avatar src={profile.avatar} name={profile.name} size="2xl" />
                <span
                  aria-hidden="true"
                  className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#E8231A] text-white shadow-md transition-transform group-hover:scale-110"
                >
                  <Camera className="h-4 w-4" />
                </span>
              </button>
              <p className="mt-5 font-display text-base font-bold ink-strong">
                {profile.name}
              </p>
              <p className="data-type mt-0.5 text-[12px] font-bold uppercase ink-muted">
                {profile.position?.replace(/_/g, ' ') || 'Member'}
              </p>
              <span aria-hidden="true" className="rope-rule my-3 block w-full opacity-60" />
              <p className="text-[12px] ink-muted">
                Click the photo to preview or change it. Images can be up to 5MB.
              </p>
            </div>
          </SectionCard>

          <SectionCard
            title="Member card"
            icon={CreditCard}
            action={<Badge variant="success">Active</Badge>}
          >
            <div className="sea-deep relative overflow-hidden rounded-[5px] p-4 text-white">
              {/* Chart grid, faded from the centre, as on the public deep bands. */}
              <div
                aria-hidden="true"
                className="sea-chart-light pointer-events-none absolute inset-0 opacity-[0.06]"
                style={{
                  maskImage:
                    'radial-gradient(ellipse 80% 75% at 35% 45%, transparent 15%, black 85%)',
                  WebkitMaskImage:
                    'radial-gradient(ellipse 80% 75% at 35% 45%, transparent 15%, black 85%)',
                }}
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-[#E8231A]/20 blur-2xl"
              />
              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="data-type text-[12px] font-bold uppercase text-white/70">
                    PPIA Auckland
                  </p>
                  <p className="mt-1 truncate font-display text-lg font-black">{profile.name}</p>
                  <p className="data-type mt-0.5 truncate text-[12px] uppercase text-white/70">
                    {profile.position?.replace(/_/g, ' ') || ROLE_LABEL[profile.role] || profile.role}
                  </p>
                </div>
                <span
                  aria-hidden="true"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white/80"
                  style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.22), 0 0 0 4px rgba(255,255,255,0.08)' }}
                >
                  <IdCard className="h-5 w-5" />
                </span>
              </div>
              <div className="relative mt-4 border-t border-white/10 pt-3">
                <p className="data-type text-[12px] font-bold uppercase text-white/70">Member ID</p>
                <p className="data-type mt-0.5 text-sm font-bold">{memberId}</p>
              </div>
            </div>
            <Button
              variant="primary"
              className="mt-4 w-full"
              leftIcon={<CreditCard className="h-4 w-4" />}
              onClick={() => setShowMemberCard(true)}
            >
              View card & QR code
            </Button>
          </SectionCard>

          <SectionCard title="Activity" description="Your event participation at a glance">
            <StatTileRow columns={2}>
              <StatTile label="Events joined" value={registrations.length} tone="sky" icon={Ticket} />
              <StatTile label="Attendance" value={attendedCount} tone="emerald" icon={CheckCircle2} />
            </StatTileRow>
          </SectionCard>

          <SectionCard title="Social links" icon={Link2}>
            {editing ? (
              <div className="space-y-4">
                <Field label="LinkedIn" htmlFor="social-linkedin">
                  <input
                    id="social-linkedin"
                    type="url"
                    value={formData.linkedIn}
                    onChange={(event) =>
                      setFormData({ ...formData, linkedIn: event.target.value })
                    }
                    placeholder="https://linkedin.com/in/…"
                    className="input-base"
                  />
                </Field>
                <Field label="Instagram" htmlFor="social-instagram">
                  <input
                    id="social-instagram"
                    type="url"
                    value={formData.instagram}
                    onChange={(event) =>
                      setFormData({ ...formData, instagram: event.target.value })
                    }
                    placeholder="https://instagram.com/…"
                    className="input-base"
                  />
                </Field>
                <Field label="Twitter/X" htmlFor="social-twitter">
                  <input
                    id="social-twitter"
                    type="url"
                    value={formData.twitter}
                    onChange={(event) => setFormData({ ...formData, twitter: event.target.value })}
                    placeholder="https://x.com/…"
                    className="input-base"
                  />
                </Field>
              </div>
            ) : hasSocialLinks ? (
              <ul className="space-y-2">
                {profile.linkedIn && (
                  <li>
                    <a
                      href={profile.linkedIn}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-[5px] border border-[#DCE7F1] p-3 transition-colors hover:border-[#C3D2E0] hover:bg-[#F5FAFD] dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-800/60"
                    >
                      <span aria-hidden="true"
                        className="flex h-9 w-9 items-center justify-center rounded-full text-blue-600 dark:text-blue-300"
                        style={PORTHOLE_RING}>
                        <LinkedinIcon size={18} />
                      </span>
                      <span className="text-sm font-medium ink-body">
                        LinkedIn
                      </span>
                    </a>
                  </li>
                )}
                {profile.instagram && (
                  <li>
                    <a
                      href={profile.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-[5px] border border-[#DCE7F1] p-3 transition-colors hover:border-[#C3D2E0] hover:bg-[#F5FAFD] dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-800/60"
                    >
                      <span aria-hidden="true"
                        className="flex h-9 w-9 items-center justify-center rounded-full text-pink-600 dark:text-pink-300"
                        style={PORTHOLE_RING}>
                        <InstagramIcon size={18} />
                      </span>
                      <span className="text-sm font-medium ink-body">
                        Instagram
                      </span>
                    </a>
                  </li>
                )}
                {profile.twitter && (
                  <li>
                    <a
                      href={profile.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-[5px] border border-[#DCE7F1] p-3 transition-colors hover:border-[#C3D2E0] hover:bg-[#F5FAFD] dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-800/60"
                    >
                      <span aria-hidden="true"
                        className="flex h-9 w-9 items-center justify-center rounded-full ink-body"
                        style={PORTHOLE_RING}>
                        <XIcon size={18} />
                      </span>
                      <span className="text-sm font-medium ink-body">
                        Twitter/X
                      </span>
                    </a>
                  </li>
                )}
              </ul>
            ) : (
              <p className="py-2 text-center text-sm ink-muted">
                No social links yet. Add them from edit mode.
              </p>
            )}
          </SectionCard>
        </div>

        {/* ----------------------------------------------------- right column */}
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title="Bio" description="A short introduction about you">
            {editing ? (
              <Field
                label="Bio"
                htmlFor="profile-bio"
                hint="Share your interests, field of study, or anything else you want others to know."
              >
                <textarea
                  id="profile-bio"
                  rows={4}
                  value={formData.bio}
                  onChange={(event) => setFormData({ ...formData, bio: event.target.value })}
                  placeholder="Write something about yourself…"
                  className="input-base resize-none"
                />
              </Field>
            ) : (
              <p className="text-sm leading-relaxed ink-body">
                {profile.bio || 'No bio yet.'}
              </p>
            )}
          </SectionCard>

          <SectionCard
            title="Personal details"
            description={
              editing ? 'Only some details can be edited by you.' : 'Your membership details'
            }
            icon={User}
          >
            {editing ? (
              <FormGrid columns={2}>
                <Field label="Full name" htmlFor="profile-name" required>
                  <input
                    id="profile-name"
                    type="text"
                    value={formData.name}
                    onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                    className="input-base"
                  />
                </Field>
                <Field label="Phone number" htmlFor="profile-phone">
                  <input
                    id="profile-phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                    placeholder="+64 …"
                    className="input-base"
                  />
                </Field>
                <Field
                  label="Personal email"
                  htmlFor="profile-personal-email"
                  hint="Used if your main email is no longer active."
                >
                  <input
                    id="profile-personal-email"
                    type="email"
                    value={formData.personalEmail}
                    onChange={(event) =>
                      setFormData({ ...formData, personalEmail: event.target.value })
                    }
                    className="input-base"
                  />
                </Field>
                <Field label="Account email" htmlFor="profile-email" hint="Contact the committee to change this.">
                  <input
                    id="profile-email"
                    type="email"
                    value={profile.email}
                    readOnly
                    disabled
                    className="input-base"
                  />
                </Field>
              </FormGrid>
            ) : (
              /* Ruled record rather than icon/label pairs: every field is a
                 line on the membership document. */
              <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                <RecordRow label="Name" value={profile.name} />
                <RecordRow label="Account email" value={profile.email} />
                <RecordRow label="Phone number" value={profile.phone} />
                <RecordRow label="Personal email" value={profile.personalEmail} />
                <RecordRow label="Division" value={profile.division?.name} />
                <RecordRow label="Position" value={profile.position?.replace(/_/g, ' ')} />
                <RecordRow label="University" value={profile.university} />
                <RecordRow label="Programme" value={profile.major} />
                <RecordRow
                  label="Student ID"
                  value={
                    profile.studentId ? (
                      <span className="data-type">{profile.studentId}</span>
                    ) : undefined
                  }
                />
                <RecordRow
                  label="Member since"
                  value={<span className="data-type">{formatLongDate(profile.createdAt)}</span>}
                />
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Event history"
            description={
              registrations.length > 0
                ? `${registrations.length} registrations • showing the ${Math.min(registrations.length, 5)} most recent`
                : 'Your event registrations will appear here'
            }
            icon={Ticket}
            action={
              registrations.length > 0 ? (
                <Link
                  href="/dashboard/events"
                  className="accent-label text-sm font-semibold hover:underline"
                >
                  Find an event
                </Link>
              ) : undefined
            }
            flush={registrations.length === 0}
          >
            {registrations.length === 0 ? (
              <EmptyBlock
                icon={Calendar}
                title="No event registrations yet"
                description="Browse the community calendar and sign up for an event that interests you."
                action={
                  <Link href="/dashboard/events">
                    <Button variant="primary">Browse events</Button>
                  </Link>
                }
              />
            ) : (
              <ul className="space-y-3">
                {registrations.slice(0, 5).map((registration) => {
                  const event = registration.Event ?? registration.event;
                  const status = registration.status;
                  return (
                    <li
                      key={registration.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-[5px] border border-[#DCE7F1] p-4 transition-colors hover:border-[#C3D2E0] dark:border-slate-800 dark:hover:border-slate-700"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          aria-hidden="true"
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full ink-muted"
                          style={PORTHOLE_RING}
                        >
                          <Ticket className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold ink-strong">
                            {event?.title || 'Event unavailable'}
                          </p>
                          <p className="data-type mt-1 flex items-center gap-1.5 text-[12px] ink-muted">
                            <Clock aria-hidden="true" className="h-3 w-3 shrink-0" />
                            {event?.startDate ? formatLongDate(event.startDate) : '—'}
                          </p>
                        </div>
                      </div>
                      <Badge variant={STATUS_VARIANT[status] ?? 'default'} size="md">
                        {STATUS_LABEL[status] ?? status}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>

      {editing && (
        <FormActions>
          <Button
            type="button"
            variant="secondary"
            leftIcon={<X className="h-4 w-4" />}
            onClick={handleCancelEdit}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            leftIcon={<Save className="h-4 w-4" />}
            isLoading={saving}
            onClick={handleSave}
          >
            Save changes
          </Button>
        </FormActions>
      )}

      <MemberCardModal
        isOpen={showMemberCard}
        onClose={() => setShowMemberCard(false)}
        member={profile}
      />

      <AvatarPreviewModal
        isOpen={showAvatarPreview}
        onClose={() => setShowAvatarPreview(false)}
        currentAvatar={profile.avatar}
        userName={profile.name}
        onAvatarUpdated={handleAvatarUpdated}
      />
    </PageStack>
  );
}
