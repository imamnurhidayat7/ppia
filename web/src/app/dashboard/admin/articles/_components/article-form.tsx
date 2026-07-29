'use client';

import Link from 'next/link';
import { FileText, Image as ImageIcon, Save, Search, Send, Tags } from 'lucide-react';
import { Button, Toggle } from '@/components/ui';
import { ImageUploader } from '@/components/ui/ImageUploader';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { Field, FormActions, FormGrid, SectionCard } from '@/components/dashboard';
import { cn } from '@/lib/utils';
import type { ArticleFormValues, DivisionRef, TagRef } from './shared';
import { slugFromTitle } from './shared';

interface ArticleFormProps {
  values: ArticleFormValues;
  /** Partial patch so callers keep a single `setFormData({ ...prev, ...patch })`. */
  onChange: (patch: Partial<ArticleFormValues>) => void;
  onSubmit: (event: React.FormEvent) => void;
  divisions: DivisionRef[];
  tags: TagRef[];
  submitting: boolean;
  cancelHref: string;
  submitLabel: string;
  /** Prefix for input ids so two forms on one route never collide. */
  idPrefix: string;
  /** 'article', 'news item' or 'research item' — used in the copy. */
  noun?: string;
  excerptLabel?: string;
  excerptHint?: string;
  contentTitle?: string;
  contentDescription?: string;
  contentPlaceholder?: string;
}

export function ArticleForm({
  values,
  onChange,
  onSubmit,
  divisions,
  tags,
  submitting,
  cancelHref,
  submitLabel,
  idPrefix,
  noun = 'article',
  excerptLabel = 'Excerpt',
  excerptHint = 'Shown on list cards and in search results. Optional.',
  contentTitle = 'Content',
  contentDescription = 'The body that appears on the public page.',
  contentPlaceholder = 'Write the article body here…',
}: ArticleFormProps) {
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
        description={`The title, slug, and excerpt of the ${noun} shown on the site.`}
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
                  onChange({
                    title: event.target.value,
                    slug: slugFromTitle(event.target.value),
                  })
                }
                className="input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700"
                placeholder="Write a clear, specific title"
              />
            </Field>
            <Field
              label="Slug"
              htmlFor={`${idPrefix}-slug`}
              required
              hint="Filled in automatically from the title and used in the public URL."
            >
              <input
                id={`${idPrefix}-slug`}
                type="text"
                required
                value={values.slug}
                onChange={(event) => onChange({ slug: event.target.value })}
                className="input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700"
                placeholder="example-post-title"
              />
            </Field>
          </FormGrid>

          <Field label={excerptLabel} htmlFor={`${idPrefix}-excerpt`} hint={excerptHint}>
            <textarea
              id={`${idPrefix}-excerpt`}
              rows={3}
              value={values.excerpt}
              onChange={(event) => onChange({ excerpt: event.target.value })}
              className="input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700 resize-none"
              placeholder="Sum up the piece in one or two sentences."
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title={contentTitle} description={contentDescription} icon={FileText}>
        <RichTextEditor
          value={values.content}
          onChange={(content) => onChange({ content })}
          placeholder={contentPlaceholder}
        />
      </SectionCard>

      <SectionCard
        title="Cover image"
        description="Upload a file or paste an image URL."
        icon={ImageIcon}
      >
        <ImageUploader
          value={values.imageUrl}
          onChange={(url) => onChange({ imageUrl: url })}
          placeholder="Upload a cover image"
        />
      </SectionCard>

      <SectionCard
        title="Division and tags"
        description="Helps readers find related pieces."
        icon={Tags}
      >
        <div className="space-y-5">
          <Field label="Division" htmlFor={`${idPrefix}-division`} hint="Optional.">
            <select
              id={`${idPrefix}-division`}
              value={values.divisionId}
              onChange={(event) => onChange({ divisionId: event.target.value })}
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

          <Field
            label="Tags"
            hint={
              tags.length === 0
                ? 'No tags available yet.'
                : `${values.selectedTags.length} tags selected.`
            }
          >
            {tags.length === 0 ? (
              <p className="text-sm ink-muted">
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
                        'rounded-[4px] px-3 py-1.5 text-sm font-medium transition-colors',
                        selected
                          ? 'bg-[#E8231A] text-white'
                          : 'bg-[#EDF5FB] ink-body hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700'
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
        </div>
      </SectionCard>

      <SectionCard
        title="SEO metadata"
        description="Leave blank if you want to reuse the title and excerpt above."
        icon={Search}
      >
        <div className="space-y-5">
          <FormGrid columns={1}>
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
                className="input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700"
                placeholder="Title for search results"
              />
            </Field>
          </FormGrid>
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
              className="input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700 resize-none"
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
              className="input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700"
              placeholder="ppia, scholarship, melbourne"
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        title="Publishing"
        description={`${noun.charAt(0).toUpperCase()}${noun.slice(1)}s in draft status are only visible in the admin dashboard.`}
        icon={Send}
      >
        <div className="space-y-4">
          <div className="rounded-[4px] border border-[#DCE7F1] p-4 dark:border-slate-800">
            <Toggle
              id={`${idPrefix}-published`}
              label="Publish now"
              description="When this is on, the piece goes live on the public page straight away."
              checked={values.published}
              onChange={(event) => onChange({ published: event.target.checked })}
            />
          </div>
          <div className="space-y-4 rounded-[4px] border border-[#DCE7F1] p-4 dark:border-slate-800">
            <Toggle
              id={`${idPrefix}-featured`}
              label="Mark as featured"
              description="Featured pieces appear on the homepage."
              checked={values.isFeatured}
              onChange={(event) => onChange({ isFeatured: event.target.checked })}
            />
            {values.isFeatured && (
              <Field
                label="Featured order"
                htmlFor={`${idPrefix}-featured-order`}
                hint="Lower numbers appear first."
              >
                <input
                  id={`${idPrefix}-featured-order`}
                  type="number"
                  min="0"
                  value={values.featuredOrder}
                  onChange={(event) =>
                    onChange({ featuredOrder: Number(event.target.value) || 0 })
                  }
                  className="input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700 sm:w-40"
                />
              </Field>
            )}
          </div>
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
