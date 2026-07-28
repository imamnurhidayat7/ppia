'use client';

/**
 * RepeaterEditor
 *
 * Generic inline editor for "repeater" blocks (FAQ, TIMELINE, TEAM, SPONSOR,
 * GALLERY). Each block has a list of items with a fixed schema. This component
 * renders one editable card per item, supports add/remove, and persists the
 * items array to `block.config.items`.
 *
 * Falls back to legacy JSON-in-`content` format for backward compat.
 */

import { Plus, Trash2, GripVertical } from 'lucide-react';
import { EditableField } from './EditableField';
import type { PageBlock } from '@/lib/api-types';

interface FieldSchema {
  key: string;
  label: string;
  multiline?: boolean;
  placeholder?: string;
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'div';
  className?: string;
}

/**
 * Schema per repeater block type.
 * Each entry defines the editable fields for one item.
 */
export const REPEATER_SCHEMAS: Record<string, FieldSchema[]> = {
  FAQ: [
    { key: 'question', label: 'Question', placeholder: 'Write the question...', as: 'p', className: 'font-medium text-slate-800 dark:text-slate-100' },
    { key: 'answer', label: 'Answer', placeholder: 'Write the answer...', multiline: true, as: 'p', className: 'text-slate-600 dark:text-slate-300 text-sm' },
  ],
  TIMELINE: [
    { key: 'year', label: 'Year', placeholder: '2024', as: 'span', className: 'font-bold text-slate-700 dark:text-slate-200' },
    { key: 'title', label: 'Title', placeholder: 'Milestone title...', as: 'p', className: 'font-semibold text-slate-800 dark:text-slate-100' },
    { key: 'description', label: 'Description', placeholder: 'Description...', multiline: true, as: 'p', className: 'text-slate-600 dark:text-slate-300 text-sm' },
  ],
  TEAM: [
    { key: 'name', label: 'Name', placeholder: 'Full name...', as: 'p', className: 'font-semibold text-slate-800 dark:text-slate-100' },
    { key: 'role', label: 'Role', placeholder: 'e.g. President', as: 'p', className: 'text-slate-500 dark:text-slate-400 text-sm' },
    { key: 'avatarUrl', label: 'Photo URL', placeholder: 'https://...', as: 'p', className: 'text-slate-500 dark:text-slate-400 text-xs font-mono' },
    { key: 'bio', label: 'Bio', placeholder: 'Short bio...', multiline: true, as: 'p', className: 'text-slate-600 dark:text-slate-300 text-sm' },
  ],
  SPONSOR: [
    { key: 'name', label: 'Sponsor name', placeholder: 'Sponsor name...', as: 'p', className: 'font-semibold text-slate-800 dark:text-slate-100' },
    { key: 'logoUrl', label: 'Logo URL', placeholder: 'https://...', as: 'p', className: 'text-slate-500 dark:text-slate-400 text-xs font-mono' },
    { key: 'link', label: 'Website link', placeholder: 'https://...', as: 'p', className: 'text-slate-500 dark:text-slate-400 text-xs underline' },
  ],
  GALLERY: [
    { key: 'imageUrl', label: 'Image URL', placeholder: 'https://...', as: 'p', className: 'text-slate-500 dark:text-slate-400 text-xs font-mono' },
    { key: 'caption', label: 'Caption', placeholder: 'Image caption...', as: 'p', className: 'text-slate-600 dark:text-slate-300 text-sm' },
  ],
  COUNTDOWN: [
    { key: 'label', label: 'Label', placeholder: 'e.g. Counting down to', as: 'p', className: 'font-medium text-slate-800 dark:text-slate-100' },
    { key: 'date', label: 'Date (ISO)', placeholder: '2024-12-31T23:59:59', as: 'p', className: 'text-slate-500 dark:text-slate-400 text-xs font-mono' },
  ],
};

interface RepeaterEditorProps {
  block: PageBlock;
  onChange: (id: string, field: string, value: any) => void;
}

/**
 * Returns the schema for a given block type, or null if not a repeater.
 */
export function getRepeaterSchema(blockType: string): FieldSchema[] | null {
  return REPEATER_SCHEMAS[blockType] ?? null;
}

/**
 * Parses legacy JSON-in-content items, returning [] on failure.
 */
function parseLegacyItems(content: string | null | undefined): Record<string, any>[] {
  if (!content) return [];
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return parsed as Record<string, any>[];
    return [];
  } catch {
    return [];
  }
}

export function RepeaterEditor({ block, onChange }: RepeaterEditorProps) {
  const schema = REPEATER_SCHEMAS[block.type];
  if (!schema) return null;

  // Read items: prefer config.items (new), fall back to content JSON (legacy)
  const config = (block.config as Record<string, any> | null) ?? {};
  const items: Record<string, any>[] = Array.isArray(config.items)
    ? (config.items as Record<string, any>[])
    : parseLegacyItems(block.content);

  // Build empty item with all schema keys
  const makeEmptyItem = (): Record<string, any> => {
    const item: Record<string, any> = {};
    for (const f of schema) item[f.key] = '';
    return item;
  };

  // Persist items to config.items
  const persistItems = (next: Record<string, any>[]) => {
    const newConfig = { ...config, items: next };
    onChange(block.id, 'config', newConfig);
  };

  const handleItemChange = (index: number, fieldKey: string, value: any) => {
    const next = items.map((item, i) => (i === index ? { ...item, [fieldKey]: value } : item));
    persistItems(next);
  };

  const handleAddItem = () => {
    persistItems([...items, makeEmptyItem()]);
  };

  const handleDeleteItem = (index: number) => {
    persistItems(items.filter((_, i) => i !== index));
  };

  // Human-readable label per block type for the "Add" button
  const addItemLabel: Record<string, string> = {
    FAQ: 'Add question',
    TIMELINE: 'Add milestone',
    TEAM: 'Add person',
    SPONSOR: 'Add sponsor',
    GALLERY: 'Add image',
    COUNTDOWN: 'Add countdown',
  };

  return (
    <div className="px-4 pb-4 space-y-3">
      {/* Items list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
            Items ({items.length})
          </label>
        </div>

        {items.length === 0 && (
          <div className="text-center py-6 px-4 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 text-sm">
            No items yet. Use the button below to add one.
          </div>
        )}

        {items.map((item, index) => (
          <div
            key={index}
            className="group relative rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-3 space-y-2"
          >
            {/* Item header: index + delete */}
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                <GripVertical size={12} />
                Item #{index + 1}
              </span>
              <button
                type="button"
                onClick={() => handleDeleteItem(index)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500"
                title="Remove item"
                aria-label="Remove item"
              >
                <Trash2 size={14} />
              </button>
            </div>

            {/* Item fields */}
            <div className="space-y-2">
              {schema.map((field) => (
                <div key={field.key}>
                  <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wide block mb-0.5">
                    {field.label}
                  </label>
                  <EditableField
                    as={field.as ?? 'p'}
                    value={String(item[field.key] ?? '')}
                    onChange={(v) => handleItemChange(index, field.key, v)}
                    className={field.className ?? 'text-slate-700 dark:text-slate-200 text-sm'}
                    placeholder={field.placeholder}
                    multiline={field.multiline}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add item button */}
      <button
        type="button"
        onClick={handleAddItem}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-[#E8231A] hover:text-[#E8231A] transition-colors text-sm font-medium"
      >
        <Plus size={16} />
        {addItemLabel[block.type] ?? 'Add item'}
      </button>
    </div>
  );
}
