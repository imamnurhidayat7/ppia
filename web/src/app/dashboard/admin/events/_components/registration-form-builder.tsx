'use client';

/**
 * Registration form builder for events.
 *
 * Edits the array of field definitions stored on `Event.registrationFields`.
 * New events seed this with the profile-backed defaults (Full name, University,
 * Education level, Major); the admin can relabel, reorder, mark optional,
 * delete any of them, and add custom fields of four types.
 *
 * Reordering uses plain up/down buttons rather than drag-and-drop to avoid a
 * new dependency; the list is short in practice.
 */

import { Button } from '@/components/ui';
import {
  REG_FIELD_TYPE_LABELS,
  newFieldId,
  type RegField,
  type RegFieldType,
} from '@/lib/event-registration';
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Plus,
  Trash2,
  X,
} from 'lucide-react';

const TYPE_OPTIONS: RegFieldType[] = [
  'short_text',
  'long_text',
  'single_choice',
  'multiple_choice',
];

const INPUT = 'input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700';

function isChoice(type: RegFieldType): boolean {
  return type === 'single_choice' || type === 'multiple_choice';
}

interface Props {
  fields: RegField[];
  onChange: (fields: RegField[]) => void;
}

export function RegistrationFormBuilder({ fields, onChange }: Props) {
  const update = (index: number, patch: Partial<RegField>) => {
    onChange(fields.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  };

  const changeType = (index: number, type: RegFieldType) => {
    const patch: Partial<RegField> = { type };
    // Choice types need an options array; text types must not carry one.
    if (isChoice(type)) {
      patch.options = fields[index].options?.length ? fields[index].options : ['Option 1'];
    } else {
      patch.options = undefined;
    }
    update(index, patch);
  };

  const remove = (index: number) => {
    onChange(fields.filter((_, i) => i !== index));
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= fields.length) return;
    const next = [...fields];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const addField = () => {
    onChange([
      ...fields,
      { id: newFieldId(), type: 'short_text', label: '', required: false },
    ]);
  };

  const setOption = (fieldIndex: number, optIndex: number, value: string) => {
    const options = [...(fields[fieldIndex].options ?? [])];
    options[optIndex] = value;
    update(fieldIndex, { options });
  };

  const addOption = (fieldIndex: number) => {
    const options = [...(fields[fieldIndex].options ?? [])];
    options.push(`Option ${options.length + 1}`);
    update(fieldIndex, { options });
  };

  const removeOption = (fieldIndex: number, optIndex: number) => {
    const options = (fields[fieldIndex].options ?? []).filter((_, i) => i !== optIndex);
    update(fieldIndex, { options });
  };

  return (
    <div className="space-y-4">
      {fields.length === 0 && (
        <p className="rounded-[4px] border border-dashed border-[#C3D2E0] px-4 py-6 text-center text-sm ink-muted dark:border-slate-700">
          No fields. Attendees will only confirm their spot. Add a field below to collect information.
        </p>
      )}

      {fields.map((field, index) => (
        <div
          key={field.id}
          className="rounded-[5px] border border-[#DCE7F1] bg-white/60 p-4 dark:border-slate-800 dark:bg-slate-900/40"
        >
          <div className="mb-3 flex items-center gap-2">
            <GripVertical className="h-4 w-4 shrink-0 ink-muted" aria-hidden="true" />
            <span className="data-type text-[11px] font-bold uppercase tracking-wide ink-muted">
              Field {index + 1}
            </span>
            {field.isDefault && (
              <span className="rounded-[3px] bg-[#0B7A55]/12 px-2 py-0.5 text-[10px] font-bold uppercase text-[#0B7A55]">
                Default
              </span>
            )}
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label="Move field up"
                className="rounded-[3px] p-1 ink-muted hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === fields.length - 1}
                aria-label="Move field down"
                className="rounded-[3px] p-1 ink-muted hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => remove(index)}
                aria-label="Delete field"
                className="rounded-[3px] p-1 text-[#E8231A] hover:bg-red-50 dark:hover:bg-red-950/40"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_180px]">
            <div>
              <label className="mb-1 block text-[12px] font-semibold ink-body">Question label</label>
              <input
                type="text"
                value={field.label}
                onChange={(e) => update(index, { label: e.target.value })}
                placeholder="e.g. Will you bring family?"
                className={INPUT}
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-semibold ink-body">Type</label>
              <select
                value={field.type}
                onChange={(e) => changeType(index, e.target.value as RegFieldType)}
                className={INPUT}
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {REG_FIELD_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isChoice(field.type) && (
            <div className="mt-3">
              <label className="mb-1 block text-[12px] font-semibold ink-body">Options</label>
              <div className="space-y-2">
                {(field.options ?? []).map((opt, optIndex) => (
                  <div key={optIndex} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => setOption(index, optIndex, e.target.value)}
                      className={INPUT}
                      placeholder={`Option ${optIndex + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeOption(index, optIndex)}
                      aria-label="Remove option"
                      className="rounded-[3px] p-2 ink-muted hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => addOption(index)}
                className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#E8231A] hover:underline"
              >
                <Plus className="h-3.5 w-3.5" />
                Add option
              </button>
            </div>
          )}

          <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-[13px] ink-body">
            <input
              type="checkbox"
              checked={field.required}
              onChange={(e) => update(index, { required: e.target.checked })}
              className="h-4 w-4 rounded border-[#C3D2E0] text-[#E8231A] focus:ring-[#E8231A]"
            />
            Required
          </label>
        </div>
      ))}

      <Button type="button" variant="secondary" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={addField}>
        Add field
      </Button>
    </div>
  );
}
