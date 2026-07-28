'use client';

import Link from 'next/link';
import { BookMarked, FileText, Image as ImageIcon, Save, Search, Send, Tags } from 'lucide-react';
import { Button, Toggle } from '@/components/ui';
import { ImageUploader } from '@/components/ui/ImageUploader';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { Field, FormActions, FormGrid, SectionCard } from '@/components/dashboard';
import { cn } from '@/lib/utils';
import type { DivisionRef, ResearchFormValues, TagRef } from './shared';
import { CITATION_FORMATS, RESEARCH_STATUSES, RESEARCH_TYPES, slugFromTitle } from './shared';

interface ResearchFormProps {
  values: ResearchFormValues;
  /** Partial patch so callers keep a single `setFormData({ ...prev, ...patch })`. */
  onChange: (patch: Partial<ResearchFormValues>) => void;
  onSubmit: (event: React.FormEvent) => void;
  divisions: DivisionRef[];
  tags: TagRef[];
  submitting: boolean;
  cancelHref: string;
  submitLabel: string;
  /** Prefix for input ids so two forms on one route never collide. */
  idPrefix: string;
  /** The slug is only regenerated from the title when creating new research. */
  autoSlug?: boolean;
}

/**
 * A local label instead of the RichTextEditor `label` prop, because the
 * editor's own label only uses light colours and is unreadable in dark mode.
 */
function EditorLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">{children}</p>
  );
}

export function ResearchForm({
  values,
  onChange,
  onSubmit,
  divisions,
  tags,
  submitting,
  cancelHref,
  submitLabel,
  idPrefix,
  autoSlug = false,
}: ResearchFormProps) {
  const toggleTag = (tagId: string) => {
    onChange({
      selectedTags: values.selectedTags.includes(tagId)
        ? values.selectedTags.filter((id) => id !== tagId)
        : [...values.selectedTags, tagId],
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <SectionCard
        title="Basics"
        description="The title and slug used on the research corner page."
        icon={FileText}
      >
        <div className="space-y-5">
          <FormGrid columns={2}>
            <Field label="Title" htmlFor={`${idPrefix}-title`} required>
              <input
                id={`${idPrefix}-title`}
                type="text"
                required
                value={values.title}
                onChange={(event) =>
                  onChange(
                    autoSlug
                      ? { title: event.target.value, slug: slugFromTitle(event.target.value) }
                      : { title: event.target.value }
                  )
                }
                className="input-base"
                placeholder="Research title in its original language"
              />
            </Field>
            <Field
              label="Indonesian title"
              htmlFor={`${idPrefix}-title-id`}
              hint="Optional."
            >
              <input
                id={`${idPrefix}-title-id`}
                type="text"
                value={values.titleIndonesian}
                onChange={(event) => onChange({ titleIndonesian: event.target.value })}
                className="input-base"
                placeholder="Indonesian version of the title"
              />
            </Field>
          </FormGrid>

          <Field
            label="Slug"
            htmlFor={`${idPrefix}-slug`}
            hint={
              autoSlug
                ? 'Filled in automatically from the title and used in the public URL.'
                : 'Used in the public URL. Change it carefully because old links can break.'
            }
          >
            <input
              id={`${idPrefix}-slug`}
              type="text"
              value={values.slug}
              onChange={(event) => onChange({ slug: event.target.value })}
              className="input-base"
              placeholder="research-title"
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        title="Abstract"
        description="The abstract is required because it is used in the list and in search results."
        icon={BookMarked}
      >
        <div className="space-y-5">
          <div>
            <EditorLabel>
              Abstract <span className="text-[#E8231A]">*</span>
            </EditorLabel>
            <RichTextEditor
              value={values.abstract}
              onChange={(content) => onChange({ abstract: content })}
              placeholder="Write the research abstract here…"
            />
          </div>
          <div>
            <EditorLabel>Indonesian abstract</EditorLabel>
            <RichTextEditor
              value={values.abstractIndonesian}
              onChange={(content) => onChange({ abstractIndonesian: content })}
              placeholder="Write the abstract in Indonesian…"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Cover image"
        description="Upload a file or paste an image URL."
        icon={ImageIcon}
      >
        <ImageUploader
          value={values.imageUrl}
          onChange={(url) => onChange({ imageUrl: url })}
          placeholder="Upload a research cover image"
        />
      </SectionCard>

      <SectionCard
        title="Classification"
        description="Type, review stage, owning division, and citation style."
        icon={Tags}
      >
        <FormGrid columns={2}>
          <Field label="Research type" htmlFor={`${idPrefix}-type`}>
            <select
              id={`${idPrefix}-type`}
              value={values.researchType}
              onChange={(event) => onChange({ researchType: event.target.value })}
              className="input-base"
            >
              {RESEARCH_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Stage" htmlFor={`${idPrefix}-status`}>
            <select
              id={`${idPrefix}-status`}
              value={values.researchStatus}
              onChange={(event) => onChange({ researchStatus: event.target.value })}
              className="input-base"
            >
              {RESEARCH_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Division" htmlFor={`${idPrefix}-division`} hint="Optional.">
            <select
              id={`${idPrefix}-division`}
              value={values.divisionId}
              onChange={(event) => onChange({ divisionId: event.target.value })}
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
          <Field label="Citation style" htmlFor={`${idPrefix}-citation`}>
            <select
              id={`${idPrefix}-citation`}
              value={values.citationFormat}
              onChange={(event) => onChange({ citationFormat: event.target.value })}
              className="input-base"
            >
              {CITATION_FORMATS.map((format) => (
                <option key={format} value={format}>
                  {format}
                </option>
              ))}
            </select>
          </Field>
        </FormGrid>
      </SectionCard>

      <SectionCard
        title="Publication details"
        description="Author information, venue, and file links."
        icon={BookMarked}
      >
        <FormGrid columns={2}>
          <Field label="Author" htmlFor={`${idPrefix}-authors`} hint="Separate with commas.">
            <input
              id={`${idPrefix}-authors`}
              type="text"
              value={values.authors}
              onChange={(event) => onChange({ authors: event.target.value })}
              className="input-base"
              placeholder="Nadia Putri, Rian Saputra"
            />
          </Field>
          <Field label="Publication date" htmlFor={`${idPrefix}-publication-date`} hint="Optional.">
            <input
              id={`${idPrefix}-publication-date`}
              type="date"
              value={values.publicationDate}
              onChange={(event) => onChange({ publicationDate: event.target.value })}
              className="input-base"
            />
          </Field>
          <Field label="Venue" htmlFor={`${idPrefix}-venue`} hint="Journal or conference name.">
            <input
              id={`${idPrefix}-venue`}
              type="text"
              value={values.venue}
              onChange={(event) => onChange({ venue: event.target.value })}
              className="input-base"
              placeholder="Journal of Indonesian Studies"
            />
          </Field>
          <Field label="DOI" htmlFor={`${idPrefix}-doi`} hint="Optional.">
            <input
              id={`${idPrefix}-doi`}
              type="text"
              value={values.doi}
              onChange={(event) => onChange({ doi: event.target.value })}
              className="input-base"
              placeholder="10.1234/abcd"
            />
          </Field>
          <Field label="Source link" htmlFor={`${idPrefix}-url`} hint="Optional.">
            <input
              id={`${idPrefix}-url`}
              type="url"
              value={values.url}
              onChange={(event) => onChange({ url: event.target.value })}
              className="input-base"
              placeholder="https://…"
            />
          </Field>
          <Field label="PDF link" htmlFor={`${idPrefix}-pdf`} hint="Used by the download button.">
            <input
              id={`${idPrefix}-pdf`}
              type="url"
              value={values.pdfUrl}
              onChange={(event) => onChange({ pdfUrl: event.target.value })}
              className="input-base"
              placeholder="https://….pdf"
            />
          </Field>
          <Field
            label="Keywords"
            htmlFor={`${idPrefix}-keywords`}
            hint="Separate with commas."
            className="sm:col-span-2"
          >
            <input
              id={`${idPrefix}-keywords`}
              type="text"
              value={values.keywords}
              onChange={(event) => onChange({ keywords: event.target.value })}
              className="input-base"
              placeholder="diaspora, education, policy"
            />
          </Field>
        </FormGrid>
      </SectionCard>

      <SectionCard
        title="Tags"
        description="Helps readers find related research."
        icon={Tags}
      >
        <Field
          label="Tags"
          hint={
            tags.length === 0
              ? 'No tags available yet.'
              : `${values.selectedTags.length} tags selected.`
          }
        >
          {tags.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Create a tag in the Tags menu first to use it here.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const selected = values.selectedTags.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    aria-pressed={selected}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                      selected
                        ? 'bg-[#E8231A] text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    )}
                    style={selected && tag.color ? { backgroundColor: tag.color } : undefined}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          )}
        </Field>
      </SectionCard>

      <SectionCard
        title="SEO metadata"
        description="Leave blank if you want to reuse the title and abstract above."
        icon={Search}
      >
        <div className="space-y-5">
          <Field
            label="Meta title"
            htmlFor={`${idPrefix}-meta-title`}
            hint="Ideally under 60 characters."
          >
            <input
              id={`${idPrefix}-meta-title`}
              type="text"
              value={values.metaTitle}
              onChange={(event) => onChange({ metaTitle: event.target.value })}
              className="input-base"
              placeholder="Title for search results"
            />
          </Field>
          <Field
            label="Meta description"
            htmlFor={`${idPrefix}-meta-description`}
            hint="Ideally under 160 characters."
          >
            <textarea
              id={`${idPrefix}-meta-description`}
              rows={2}
              value={values.metaDescription}
              onChange={(event) => onChange({ metaDescription: event.target.value })}
              className="input-base resize-none"
              placeholder="Short summary for search engines"
            />
          </Field>
          <Field
            label="Meta keywords"
            htmlFor={`${idPrefix}-meta-keywords`}
            hint="Separate with commas."
          >
            <input
              id={`${idPrefix}-meta-keywords`}
              type="text"
              value={values.metaKeywords}
              onChange={(event) => onChange({ metaKeywords: event.target.value })}
              className="input-base"
              placeholder="research, ppia, publication"
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        title="Publishing"
        description="Research in draft status is only visible in the admin dashboard."
        icon={Send}
      >
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <Toggle
              id={`${idPrefix}-published`}
              label="Publish now"
              description="When this is on, the research goes live on the public page straight away."
              checked={values.published}
              onChange={(event) => onChange({ published: event.target.checked })}
            />
          </div>
          <Field
            label="Scheduled publish date"
            htmlFor={`${idPrefix}-scheduled`}
            hint="Optional. Leave blank if it is not scheduled."
          >
            <input
              id={`${idPrefix}-scheduled`}
              type="date"
              value={values.scheduledPublishAt}
              onChange={(event) => onChange({ scheduledPublishAt: event.target.value })}
              className="input-base sm:w-60"
            />
          </Field>
        </div>
      </SectionCard>

      <FormActions>
        <Link href={cancelHref}>
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
          {submitLabel}
        </Button>
      </FormActions>
    </form>
  );
}
