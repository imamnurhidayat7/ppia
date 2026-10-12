'use client';

/**
 * Scholarship editor form shared by the board's new/edit pages.
 *
 * Board-only controls (featured, published) render only when `board` is true.
 */

import { useState } from 'react';
import { Button, Input, Select, Textarea, Toggle } from '@/components/ui';
import { Field, FormActions, FormGrid, SectionCard } from '@/components/dashboard';
import {
  EMPTY_SCHOLARSHIP_FORM,
  SCHOLARSHIP_TYPES,
  validateScholarshipForm,
  type ScholarshipFormValues,
} from './shared';

interface ScholarshipFormProps {
  initial?: Partial<ScholarshipFormValues>;
  board?: boolean;
  saving: boolean;
  submitLabel: string;
  draftLabel?: string;
  onSubmit: (values: ScholarshipFormValues) => void;
  onSaveDraft?: (values: ScholarshipFormValues) => void;
}

export function ScholarshipForm({
  initial,
  board,
  saving,
  submitLabel,
  draftLabel,
  onSubmit,
  onSaveDraft,
}: ScholarshipFormProps) {
  const [values, setValues] = useState<ScholarshipFormValues>({ ...EMPTY_SCHOLARSHIP_FORM, ...initial });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof ScholarshipFormValues>(key: K, value: ScholarshipFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = (asDraft: boolean) => {
    const nextErrors = validateScholarshipForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (asDraft) {
      onSaveDraft?.(values);
    } else {
      onSubmit(values);
    }
  };

  return (
    <>
      <SectionCard
        title="Scholarship details"
        description="What applicants see on the public scholarship page."
      >
        <div className="space-y-4">
          <Field label="Scholarship name" htmlFor="sch-name" required error={errors.name}>
            <Input
              id="sch-name"
              value={values.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="LPDP Scholarship"
            />
          </Field>
          <FormGrid columns={2}>
            <Field label="Provider" htmlFor="sch-provider" hint="Who funds it.">
              <Input
                id="sch-provider"
                value={values.provider}
                onChange={(e) => set('provider', e.target.value)}
                placeholder="Lembaga Pengelola Dana Pendidikan"
              />
            </Field>
            <Field label="Category" htmlFor="sch-type" hint="Drives the filter on the public page.">
              <Select
                id="sch-type"
                value={values.type}
                onChange={(e) => set('type', e.target.value)}
                options={SCHOLARSHIP_TYPES.map((t) => ({ value: t.value, label: t.label }))}
              />
            </Field>
          </FormGrid>
          <FormGrid columns={2}>
            <Field label="Official link" htmlFor="sch-url" hint="Application or info page." error={errors.url}>
              <Input
                id="sch-url"
                value={values.url}
                onChange={(e) => set('url', e.target.value)}
                placeholder="https://…"
                inputMode="url"
              />
            </Field>
            <Field label="Accent colour" htmlFor="sch-color" hint="Card top border and badges.">
              <Input
                id="sch-color"
                type="color"
                value={values.color}
                onChange={(e) => set('color', e.target.value)}
              />
            </Field>
          </FormGrid>
          <Field label="Description" htmlFor="sch-desc" hint="One or two sentences for the listing card.">
            <Textarea
              id="sch-desc"
              value={values.desc}
              onChange={(e) => set('desc', e.target.value)}
              rows={3}
              placeholder="The flagship Indonesian government scholarship for postgraduate study abroad."
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        title="Funding & eligibility"
        description="Coverage, study levels and amounts shown on the card."
      >
        <div className="space-y-4">
          <FormGrid columns={2}>
            <Field label="Study levels" htmlFor="sch-level" hint="One per line, e.g. Masters.">
              <Textarea
                id="sch-level"
                value={values.levelText}
                onChange={(e) => set('levelText', e.target.value)}
                rows={3}
                placeholder={'Masters\nPhD'}
              />
            </Field>
            <Field label="What it covers" htmlFor="sch-coverage" hint="One per line, e.g. Full tuition.">
              <Textarea
                id="sch-coverage"
                value={values.coverageText}
                onChange={(e) => set('coverageText', e.target.value)}
                rows={3}
                placeholder={'Full tuition\nLiving allowance'}
              />
            </Field>
          </FormGrid>
          <FormGrid columns={2}>
            <Field label="Amount" htmlFor="sch-amount" hint="e.g. Full funding or NZ$10,000.">
              <Input
                id="sch-amount"
                value={values.amount}
                onChange={(e) => set('amount', e.target.value)}
                placeholder="Full funding"
              />
            </Field>
            <Field label="Deadline (display text)" htmlFor="sch-deadline" hint="Shown when there is no exact date.">
              <Input
                id="sch-deadline"
                value={values.deadline}
                onChange={(e) => set('deadline', e.target.value)}
                placeholder="Multiple rounds annually"
              />
            </Field>
          </FormGrid>
          <Field
            label="Deadline date (optional)"
            htmlFor="sch-deadline-date"
            hint="Exact dates render as a day board with a countdown."
            error={errors.deadlineDate}
          >
            <Input
              id="sch-deadline-date"
              type="date"
              value={values.deadlineDate}
              onChange={(e) => set('deadlineDate', e.target.value)}
            />
          </Field>
        </div>
      </SectionCard>

      {board && (
        <SectionCard
          title="Board controls"
          description="Only the board sees this. Publishing makes the entry public immediately."
        >
          <div className="flex flex-wrap gap-6">
            <Toggle
              label="Featured"
              checked={values.featured}
              onChange={(e) => set('featured', e.target.checked)}
            />
            <Toggle
              label="Published"
              checked={values.published}
              onChange={(e) => set('published', e.target.checked)}
            />
          </div>
        </SectionCard>
      )}

      <FormActions>
        {draftLabel && onSaveDraft && (
          <Button variant="secondary" onClick={() => handleSubmit(true)} disabled={saving}>
            {draftLabel}
          </Button>
        )}
        <Button variant="primary" onClick={() => handleSubmit(false)} isLoading={saving}>
          {submitLabel}
        </Button>
      </FormActions>
    </>
  );
}
