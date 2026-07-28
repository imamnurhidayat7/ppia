'use client';

/**
 * ContentFormEditor — Visual form editor for page content.
 *
 * Renders a user-friendly form (text inputs, textareas, image pickers,
 * color pickers, arrays with add/remove) based on a FieldSchema[].
 *
 * No JSON knowledge required — non-technical users edit structured content
 * through labeled form fields. The component converts the form state to/from
 * the JSON object stored in the page.content field.
 */

import { useState, useCallback, useMemo } from 'react';
import { Input, Textarea, Button, Select, Toggle, RichTextEditor } from '@/components/ui';
import { ImageUploader } from '@/components/ui';
import { Plus, Trash2, ChevronDown, ChevronRight, ChevronUp } from 'lucide-react';
import type { FieldSchema, FieldType } from '@/lib/content-schemas';

interface ContentFormEditorProps {
  schema: FieldSchema[];
  value: Record<string, any> | undefined;
  onChange: (value: Record<string, any>) => void;
}

// ============================================
// Field-level renderers
// ============================================

function ImageField({
  label,
  value,
  onChange,
  help,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  help?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <ImageUploader value={value} onChange={onChange} />
      {help && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{help}</p>}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
  help,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  help?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || '#E8231A'}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 rounded-md border border-slate-200 dark:border-slate-700 cursor-pointer"
        />
        <Input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#E8231A"
          className="flex-1"
        />
      </div>
      {help && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{help}</p>}
    </div>
  );
}

/**
 * StringListField — edits an array of plain strings (e.g. ["Masters", "PhD"]).
 *
 * Public pages expect `string[]` for fields like scholarship level/coverage and
 * partnership perks. ArrayField would produce `[{ value: '...' }]`, which breaks
 * rendering, so plain string lists get their own editor.
 */
function StringListField({
  label,
  value,
  onChange,
  help,
  placeholder,
}: {
  label: string;
  value: unknown;
  onChange: (v: string[]) => void;
  help?: string;
  placeholder?: string;
}) {
  const items: string[] = Array.isArray(value)
    ? value.map((v) => (typeof v === 'string' ? v : String((v as any)?.value ?? '')))
    : [];

  const update = (index: number, next: string) => {
    const copy = [...items];
    copy[index] = next;
    onChange(copy);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm font-medium">{label}</label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...items, ''])}
          className="h-8 gap-1"
        >
          <Plus size={14} />
          Add
        </Button>
      </div>
      {help && <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{help}</p>}

      {items.length === 0 ? (
        <div className="text-center py-5 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
          <p className="text-sm text-slate-400">No items yet. Click &quot;Add&quot;.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={item}
                onChange={(e) => update(index, e.target.value)}
                placeholder={placeholder}
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => onChange(items.filter((_, i) => i !== index))}
                className="p-2 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                aria-label={`Remove item ${index + 1}`}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ArrayField({
  schema,
  label,
  value,
  onChange,
  help,
  fieldKey,
}: {
  schema: FieldSchema;
  label: string;
  value: any[];
  onChange: (v: any[]) => void;
  help?: string;
  fieldKey: string;
}) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const items: any[] = Array.isArray(value) ? value : [];

  const handleAdd = () => {
    const newItem: Record<string, any> = {};
    (schema.itemSchema || []).forEach((f) => {
      if (f.type === 'array' || f.type === 'stringList') newItem[f.key] = [];
      else if (f.type === 'number') newItem[f.key] = 0;
      else if (f.type === 'toggle') newItem[f.key] = false;
      else if (f.type === 'group') newItem[f.key] = {};
      else newItem[f.key] = '';
    });
    onChange([...items, newItem]);
    // Auto-expand the new item
    setExpanded((prev) => ({ ...prev, [items.length]: true }));
  };

  const handleRemove = (index: number) => {
    const next = items.filter((_, i) => i !== index);
    onChange(next);
    setExpanded((prev) => {
      const next: Record<number, boolean> = {};
      Object.keys(prev).forEach((k) => {
        const ki = parseInt(k, 10);
        if (ki < index) next[ki] = prev[ki];
        else if (ki > index) next[ki - 1] = prev[ki];
      });
      return next;
    });
  };

  const handleItemChange = (index: number, item: any) => {
    const next = [...items];
    next[index] = item;
    onChange(next);
  };

  /**
   * Move an item one place up or down.
   *
   * Array order is display order on the public page — division members, wiki
   * sections, milestones, scholarship tiers. Until now items could only be
   * added and removed, so getting the order right meant deleting everything
   * after the insertion point and retyping it. The grip icon in each row header
   * suggested drag-and-drop that was never wired up, which made this worse by
   * implying the capability existed.
   *
   * The expanded/collapsed state is keyed by index, so it has to move with the
   * items or the wrong row would appear open afterwards.
   */
  const handleMove = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;

    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);

    setExpanded((prev) => ({
      ...prev,
      [index]: prev[target] ?? false,
      [target]: prev[index] ?? false,
    }));
  };

  const toggleExpand = (index: number) => {
    setExpanded((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  // Build a preview label for a collapsed item (use first string field)
  const getItemLabel = (item: any): string => {
    if (!item) return `Item`;
    for (const f of schema.itemSchema || []) {
      if ((f.type === 'text' || f.type === 'textarea') && item[f.key]) {
        return String(item[f.key]);
      }
    }
    return `Item`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm font-medium">{label}</label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAdd}
          className="h-8 gap-1"
        >
          <Plus size={14} />
          Add
        </Button>
      </div>
      {help && <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{help}</p>}

      {items.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
          <p className="text-sm text-slate-400">No items yet. Click &quot;Add&quot; to create one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={index}
              className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-900/40"
            >
              <div className="flex items-center justify-between px-3 py-2 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => toggleExpand(index)}
                  className="flex items-center gap-2 text-sm font-medium text-left flex-1 min-w-0"
                >
                  {expanded[index] ? (
                    <ChevronDown size={16} className="shrink-0 text-slate-400" />
                  ) : (
                    <ChevronRight size={16} className="shrink-0 text-slate-400" />
                  )}
                  <span className="shrink-0 text-[11px] tabular-nums text-slate-400">
                    {index + 1}
                  </span>
                  <span className="truncate">
                    {getItemLabel(item) || `Item ${index + 1}`}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(index, -1)}
                  disabled={index === 0}
                  className="shrink-0 p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Move up"
                  aria-label={`Move ${getItemLabel(item) || `item ${index + 1}`} up`}
                >
                  <ChevronUp size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(index, 1)}
                  disabled={index === items.length - 1}
                  className="shrink-0 p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Move down"
                  aria-label={`Move ${getItemLabel(item) || `item ${index + 1}`} down`}
                >
                  <ChevronDown size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="text-red-500 hover:text-red-700 p-1 rounded"
                  aria-label="Remove item"
                >
                  <Trash2 size={15} />
                </button>
              </div>
              {expanded[index] && (
                <div className="p-3 space-y-3">
                  {(schema.itemSchema || []).map((field) => (
                    <FieldRenderer
                      key={field.key}
                      schema={field}
                      value={item?.[field.key]}
                      onChange={(v) =>
                        handleItemChange(index, { ...item, [field.key]: v })
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GroupField({
  schema,
  value,
  onChange,
}: {
  schema: FieldSchema;
  value: Record<string, any>;
  onChange: (v: Record<string, any>) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const groupValue = value && typeof value === 'object' ? value : {};

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-50/50 dark:bg-slate-900/40">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex items-center gap-2 w-full px-3 py-2 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-sm font-semibold text-left"
      >
        {expanded ? (
          <ChevronDown size={16} className="text-slate-400" />
        ) : (
          <ChevronRight size={16} className="text-slate-400" />
        )}
        {schema.label}
      </button>
      {expanded && (
        <div className="p-3 space-y-3">
          {(schema.fields || []).map((field) => (
            <FieldRenderer
              key={field.key}
              schema={field}
              value={groupValue[field.key]}
              onChange={(v) => onChange({ ...groupValue, [field.key]: v })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FieldRenderer({
  schema,
  value,
  onChange,
}: {
  schema: FieldSchema;
  value: any;
  onChange: (v: any) => void;
}) {
  switch (schema.type) {
    case 'text':
      return (
        <div>
          <label className="block text-sm font-medium mb-1">{schema.label}</label>
          <Input
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={schema.placeholder}
          />
          {schema.help && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{schema.help}</p>
          )}
        </div>
      );
    case 'textarea':
      return (
        <div>
          <label className="block text-sm font-medium mb-1">{schema.label}</label>
          <Textarea
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={schema.placeholder}
            rows={schema.rows ?? 3}
          />
          {schema.help && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{schema.help}</p>
          )}
        </div>
      );
    case 'richtext':
      return (
        <div>
          <label className="block text-sm font-medium mb-1">{schema.label}</label>
          <RichTextEditor
            value={value ?? ''}
            onChange={(html) => onChange(html)}
            placeholder={schema.placeholder}
          />
          {schema.help && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{schema.help}</p>
          )}
        </div>
      );
    case 'url':
      return (
        <div>
          <label className="block text-sm font-medium mb-1">{schema.label}</label>
          <Input
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={schema.placeholder}
          />
          {schema.help && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{schema.help}</p>
          )}
        </div>
      );
    case 'number':
      return (
        <div>
          <label className="block text-sm font-medium mb-1">{schema.label}</label>
          <Input
            type="number"
            value={value ?? 0}
            onChange={(e) => onChange(Number(e.target.value))}
            placeholder={schema.placeholder}
          />
          {schema.help && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{schema.help}</p>
          )}
        </div>
      );
    case 'image':
      return (
        <ImageField
          label={schema.label}
          value={value ?? ''}
          onChange={onChange}
          help={schema.help}
        />
      );
    case 'color':
      return (
        <ColorField
          label={schema.label}
          value={value ?? ''}
          onChange={onChange}
          help={schema.help}
        />
      );
    case 'toggle':
      return (
        <div className="flex items-center justify-between py-2">
          <div>
            <label className="block text-sm font-medium">{schema.label}</label>
            {schema.help && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{schema.help}</p>
            )}
          </div>
          <Toggle
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
          />
        </div>
      );
    case 'select':
      return (
        <div>
          <label className="block text-sm font-medium mb-1">{schema.label}</label>
          <Select
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            options={schema.options ?? []}
            placeholder="Select an option..."
          />
          {schema.help && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{schema.help}</p>
          )}
        </div>
      );
    case 'stringList':
      return (
        <StringListField
          label={schema.label}
          value={value}
          onChange={onChange}
          help={schema.help}
          placeholder={schema.placeholder}
        />
      );
    case 'array':
      return (
        <ArrayField
          schema={schema}
          label={schema.label}
          value={value || []}
          onChange={onChange}
          help={schema.help}
          fieldKey={schema.key}
        />
      );
    case 'group':
      return (
        <GroupField schema={schema} value={value || {}} onChange={onChange} />
      );
    default:
      return null;
  }
}

// ============================================
// Main component
// ============================================

export function ContentFormEditor({ schema, value, onChange }: ContentFormEditorProps) {
  const content = useMemo(() => {
    if (!value || typeof value !== 'object') return {};
    return value;
  }, [value]);

  const handleChange = useCallback(
    (key: string, fieldValue: any) => {
      onChange({ ...content, [key]: fieldValue });
    },
    [content, onChange]
  );

  if (!schema || schema.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {schema.map((field) => (
        // The id lets the left rail act as an outline and scroll straight to a
        // content group, so the rail is useful even on pages with no blocks.
        <div key={field.key} id={`content-field-${field.key}`} className="scroll-mt-3">
          <FieldRenderer
            schema={field}
            value={content[field.key]}
            onChange={(v) => handleChange(field.key, v)}
          />
        </div>
      ))}
    </div>
  );
}

export default ContentFormEditor;
