'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Plus,
  Redo2,
  Save,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableItem } from '@/components/admin/SortableItem';
import { useUndoRedo } from '@/lib/hooks/use-undo-redo';
import { Button, ImageUploader, Input, Select, Textarea, Toggle } from '@/components/ui';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { EmptyBlock, Field, IconAction, SectionCard } from '@/components/dashboard';
import { useToast } from '@/components/Toast';
import api from '@/lib/api';
import type {
  BlockInput,
  BlockType,
  LandingSection,
  SectionBlock,
  SectionInput,
} from '@/lib/api-types';
import { getSectionSchema, type BlockFieldDef, type SectionFieldDef } from '@/lib/section-schemas';

interface SectionContentFormProps {
  section: LandingSection & { blocks?: SectionBlock[] };
  onSaved?: () => void;
  /**
   * Hide the form's own Save button. Use when the surrounding shell already
   * provides one — two Save buttons for the same data invites the editor to
   * wonder which of them actually commits their work.
   */
  hideSaveButton?: boolean;
  /** Reports whether the form holds unsaved edits, so a shell can reflect it. */
  onDirtyChange?: (dirty: boolean) => void;
  /** Hands the shell a function it can call to commit this form. */
  registerSave?: (save: (() => Promise<void>) | null) => void;
}

/** The value a single form field can produce. */
type FieldValue = string | number | boolean | null | undefined;

interface WorkingBlock {
  id?: string;
  tempId: string;
  type: BlockType;
  title?: string;
  titleId?: string;
  subtitle?: string;
  subtitleId?: string;
  content?: string;
  contentId?: string;
  linkUrl?: string;
  linkText?: string;
  linkTextId?: string;
  imageUrl?: string;
  iconName?: string;
  color?: string;
  order: number;
  enabled: boolean;
  config?: Record<string, unknown>;
  _deleted?: boolean;
}

/** Shape of the error returned by the API client. */
interface ApiErrorShape {
  response?: { data?: { message?: string } };
  message?: string;
}

/**
 * Reads a single block field without `any`.
 *
 * Field keys come from the schema (plain strings), so reads go through a single
 * gate that narrows the value type to the shape the form field understands.
 */
function readBlockValue(block: WorkingBlock, key: string): FieldValue {
  const value = (block as unknown as Record<string, unknown>)[key];
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  return '';
}

/** Writes a single block field without `any`, returning a new copy. */
function writeBlockValue(block: WorkingBlock, key: string, value: FieldValue): WorkingBlock {
  const next: WorkingBlock = { ...block };
  (next as unknown as Record<string, FieldValue>)[key] = value;
  return next;
}

/** Payload sent to the API — internal working fields like tempId are excluded. */
function toBlockInput(block: WorkingBlock): BlockInput {
  return {
    type: block.type,
    title: block.title,
    titleId: block.titleId,
    subtitle: block.subtitle,
    subtitleId: block.subtitleId,
    content: block.content,
    contentId: block.contentId,
    linkUrl: block.linkUrl,
    linkText: block.linkText,
    linkTextId: block.linkTextId,
    imageUrl: block.imageUrl,
    iconName: block.iconName,
    color: block.color,
    order: block.order,
    enabled: block.enabled,
    config: block.config,
  };
}

export default function SectionContentForm({
  section,
  onSaved,
  hideSaveButton = false,
  onDirtyChange,
  registerSave,
}: SectionContentFormProps) {
  const { showToast } = useToast();
  const schema = getSectionSchema(section.key);

  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [sectionData, setSectionData] = useState<Record<string, FieldValue>>({});
  const [expandedBlocks, setExpandedBlocks] = useState<Record<string, boolean>>({});

  /**
   * Temporary id numbering for new items.
   *
   * Ids used to be built from Date.now() and Math.random(); this counter keeps
   * ids unique without calling a non-deterministic source.
   */
  const tempIdCounter = useRef(0);

  const {
    state: blockGroups,
    set: setBlockGroupsRaw,
    undo: undoBlocks,
    redo: redoBlocks,
    canUndo,
    canRedo,
    reset: resetBlocks,
  } = useUndoRedo<Record<string, WorkingBlock[]>>({});

  /**
   * Every block mutation funnels through here, so tracking "unsaved" in one
   * place keeps the indicator honest no matter which control was used.
   * `resetBlocks` deliberately bypasses this — loading a section is not an edit.
   */
  const setBlockGroups = useCallback(
    (next: Record<string, WorkingBlock[]>) => {
      setBlockGroupsRaw(next);
      setDirty(true);
    },
    [setBlockGroupsRaw]
  );

  // Stepping through history still leaves the form out of step with the server.
  const undo = useCallback(() => {
    undoBlocks();
    setDirty(true);
  }, [undoBlocks]);
  const redo = useCallback(() => {
    redoBlocks();
    setDirty(true);
  }, [redoBlocks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  /* eslint-disable react-hooks/set-state-in-effect --
     This effect copies the section record from the server into the form's
     working state. It must re-run whenever the `section` prop changes (e.g.
     after saving and reloading), so the copy does write state. */
  useEffect(() => {
    setSectionData({
      title: section.title || '',
      titleId: section.titleId || '',
      subtitle: section.subtitle || '',
      subtitleId: section.subtitleId || '',
      description: section.description || '',
      descriptionId: section.descriptionId || '',
      imageUrl: section.config?.imageUrl || '',
      ...(section.config || {}),
    });
    const groups: Record<string, WorkingBlock[]> = {};
    for (const block of section.blocks || []) {
      if (!groups[block.type]) groups[block.type] = [];
      groups[block.type].push({
        id: block.id,
        tempId: `existing-${block.id}`,
        type: block.type,
        title: block.title || '',
        titleId: block.titleId || '',
        subtitle: block.subtitle || '',
        subtitleId: block.subtitleId || '',
        content: block.content || '',
        contentId: block.contentId || '',
        linkUrl: block.linkUrl || '',
        linkText: block.linkText || '',
        linkTextId: block.linkTextId || '',
        imageUrl: block.imageUrl || '',
        iconName: block.iconName || '',
        color: block.color || '',
        order: block.order,
        enabled: block.enabled,
        config: block.config || {},
      });
    }
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => a.order - b.order);
    }
    resetBlocks(groups);
    setDirty(false);
  }, [section, resetBlocks]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        if (canUndo) undo();
      }
      if (
        (event.ctrlKey || event.metaKey) &&
        (event.key === 'y' || (event.key === 'z' && event.shiftKey))
      ) {
        event.preventDefault();
        if (canRedo) redo();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [canUndo, canRedo, undo, redo]);

  /**
   * Section fields bucketed by their optional `group`.
   *
   * Ungrouped fields come first under "Main content"; each named group then follows
   * in the order it first appears in the schema.
   */
  const fieldGroups = useMemo(() => {
    const buckets: { name: string | undefined; fields: SectionFieldDef[] }[] = [];
    for (const field of schema?.sectionFields ?? []) {
      const existing = buckets.find((bucket) => bucket.name === field.group);
      if (existing) existing.fields.push(field);
      else buckets.push({ name: field.group, fields: [field] });
    }
    // Keep ungrouped fields at the top regardless of where they appear.
    return buckets.sort((a, b) => Number(a.name !== undefined) - Number(b.name !== undefined));
  }, [schema]);

  const headingPreview = useMemo(() => {
    if (!schema?.headingPreview) return null;
    const { titleKey, highlightKey } = schema.headingPreview;
    return {
      title: String(sectionData[titleKey] ?? ''),
      highlight: String(sectionData[highlightKey] ?? ''),
    };
  }, [schema, sectionData]);

  const markDirty = useCallback(() => setDirty(true), []);

  // Keep the surrounding shell's save state in step with the form's.
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const updateSectionField = (key: string, value: FieldValue) => {
    setSectionData((prev) => ({ ...prev, [key]: value }));
    markDirty();
  };

  const handleDragEnd = useCallback(
    (event: DragEndEvent, blockType: string) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const items = blockGroups[blockType] ?? [];
      const oldIndex = items.findIndex((block) => block.tempId === active.id);
      const newIndex = items.findIndex((block) => block.tempId === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(items, oldIndex, newIndex).map((block, index) => ({
        ...block,
        order: index,
      }));
      setBlockGroups({ ...blockGroups, [blockType]: reordered });
    },
    [blockGroups, setBlockGroups]
  );

  /**
   * Append an empty item to a group and open it for editing.
   *
   * The block type is fixed by the group, not chosen by the editor. This used
   * to open the generic block library, which offered every type in the system —
   * asking someone who clicked "Add partner" to pick between "Hero" and
   * "Image + text", then silently doing nothing useful if they picked wrong,
   * because a partners section only renders SPONSOR blocks.
   */
  const addBlockOfType = useCallback(
    (blockType: string) => {
      const groups = { ...blockGroups };
      const existing = groups[blockType] ?? [];
      tempIdCounter.current += 1;
      const tempId = `new-${tempIdCounter.current}`;
      groups[blockType] = [
        ...existing,
        {
          tempId,
          type: blockType as BlockType,
          order: existing.length,
          enabled: true,
          config: {},
        },
      ];
      setBlockGroups(groups);
      setExpandedBlocks((prev) => ({ ...prev, [tempId]: true }));
    },
    [blockGroups, setBlockGroups]
  );

  const updateBlock = useCallback(
    (blockType: string, tempId: string, field: string, value: FieldValue) => {
      const groups = { ...blockGroups };
      groups[blockType] = (groups[blockType] || []).map((block) =>
        block.tempId === tempId ? writeBlockValue(block, field, value) : block
      );
      setBlockGroups(groups);
    },
    [blockGroups, setBlockGroups]
  );

  /**
   * Write a presentation-only setting into the block's `config` JSON.
   * Used by schema fields that declare a `configKey` because they have no
   * dedicated column on the SectionBlock model (e.g., button variant).
   */
  const updateBlockConfig = useCallback(
    (blockType: string, tempId: string, configKey: string, value: FieldValue) => {
      const groups = { ...blockGroups };
      groups[blockType] = (groups[blockType] || []).map((block) =>
        block.tempId === tempId
          ? { ...block, config: { ...(block.config || {}), [configKey]: value } }
          : block
      );
      setBlockGroups(groups);
    },
    [blockGroups, setBlockGroups]
  );

  const deleteBlock = useCallback(
    (blockType: string, tempId: string) => {
      const groups = { ...blockGroups };
      groups[blockType] = (groups[blockType] || []).map((block) =>
        block.tempId === tempId ? { ...block, _deleted: true } : block
      );
      setBlockGroups(groups);
    },
    [blockGroups, setBlockGroups]
  );

  const moveBlock = useCallback(
    (blockType: string, tempId: string, direction: 'up' | 'down') => {
      const groups = { ...blockGroups };
      const visible = (groups[blockType] || []).filter((block) => !block._deleted);
      const index = visible.findIndex((block) => block.tempId === tempId);
      if (index < 0) return;
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= visible.length) return;
      const reordered = arrayMove(visible, index, newIndex).map((block, position) => ({
        ...block,
        order: position,
      }));
      const deleted = (groups[blockType] || []).filter((block) => block._deleted);
      groups[blockType] = [...reordered, ...deleted];
      setBlockGroups(groups);
    },
    [blockGroups, setBlockGroups]
  );

  const toggleExpand = (tempId: string) => {
    setExpandedBlocks((prev) => ({ ...prev, [tempId]: !prev[tempId] }));
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const sectionUpdate: Record<string, unknown> = {};
      const configUpdate: Record<string, unknown> = {};
      for (const field of schema?.sectionFields || []) {
        const value = sectionData[field.key];
        if (field.configKey) {
          configUpdate[field.configKey] = value;
        } else {
          sectionUpdate[field.key] = value;
        }
      }
      sectionUpdate.config = { ...(section.config || {}), ...configUpdate };
      await api.updateLandingSection(section.id, sectionUpdate as Partial<SectionInput>);

      for (const group of schema?.blockGroups || []) {
        const blocks = blockGroups[group.blockType] || [];
        for (const block of blocks) {
          if (block._deleted && block.id) {
            await api.deleteSectionBlock(section.id, block.id);
          } else if (block._deleted) {
            continue;
          } else if (!block.id) {
            await api.createSectionBlock(section.id, toBlockInput(block));
          } else {
            await api.updateSectionBlock(section.id, block.id, toBlockInput(block));
          }
        }
      }
      setDirty(false);
      showToast('success', 'Content saved.');
      onSaved?.();
    } catch (err) {
      const error = err as ApiErrorShape;
      showToast('error', error.response?.data?.message || 'Could not save the content');
    } finally {
      setSaving(false);
    }
  }, [schema, sectionData, blockGroups, section, showToast, onSaved]);

  // Let the surrounding shell drive the save, so its toolbar button and Ctrl+S
  // commit this form instead of sitting there permanently disabled.
  useEffect(() => {
    registerSave?.(handleSave);
    return () => registerSave?.(null);
  }, [handleSave, registerSave]);

  if (!schema) {
    return (
      <SectionCard>
        <EmptyBlock
          icon={AlertCircle}
          title="No form for this section yet"
          description={`Section key "${section.key}" does not have an editing schema yet.`}
        />
      </SectionCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* Edit history and save status */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
        <div className="flex items-center gap-1">
          <IconAction icon={Undo2} label="Undo (Ctrl+Z)" onClick={undo} disabled={!canUndo} />
          <IconAction icon={Redo2} label="Redo (Ctrl+Y)" onClick={redo} disabled={!canRedo} />
        </div>
        {hideSaveButton ? (
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {dirty ? 'Unsaved — use the Save button above' : 'All changes saved'}
          </span>
        ) : (
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Save className="h-4 w-4" />}
            isLoading={saving}
            disabled={!dirty}
            onClick={handleSave}
          >
            Save
          </Button>
        )}
      </div>

      {/* Section fields, grouped according to the schema */}
      {fieldGroups.map(({ name, fields }) => (
        <SectionCard key={name ?? '__main'} title={name ?? 'Main content'}>
          {/*
            One column, always. `md:grid-cols-2` measures the window width, not
            this panel, so on a desktop screen a 320px panel splits into two
            ~150px columns — enough to squash the image uploader and clip every
            input.
          */}
          <div className="flex flex-col gap-4">
            {fields.map((field) => (
              <FieldRenderer
                key={field.key}
                field={field}
                value={sectionData[field.key] ?? ''}
                onChange={(value) => updateSectionField(field.key, value)}
              />
            ))}

            {/* The heading preview belongs with the fields that produce it. */}
            {name === undefined && headingPreview && (
              <HeadingPreview title={headingPreview.title} highlight={headingPreview.highlight} />
            )}
          </div>
        </SectionCard>
      ))}

      {/* Repeating block groups */}
      {schema.blockGroups.map((group) => {
        const blocks = (blockGroups[group.blockType] || []).filter((block) => !block._deleted);
        return (
          <SectionCard
            key={group.blockType}
            title={`${group.label} (${blocks.length})`}
            description={group.help}
            action={
              <IconAction
                icon={Plus}
                label={`Add ${group.itemLabel.toLowerCase()}`}
                onClick={() => addBlockOfType(group.blockType)}
              />
            }
            bodyClassName="space-y-2 p-3"
            flush
          >
            {blocks.length === 0 && (
              <EmptyBlock
                icon={ImageIcon}
                title={`No ${group.itemLabel.toLowerCase()} yet`}
                description="The page still shows its default example."
              />
            )}

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis]}
              onDragEnd={(event) => handleDragEnd(event, group.blockType)}
            >
              <SortableContext
                items={blocks.map((block) => block.tempId)}
                strategy={verticalListSortingStrategy}
              >
                {blocks.map((block, index) => {
                  const isExpanded = !!expandedBlocks[block.tempId];
                  const itemName =
                    block.title || block.titleId || `${group.itemLabel} ${index + 1}`;
                  return (
                    <SortableItem key={block.tempId} id={block.tempId}>
                      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                        {/*
                          `min-w-0` on the label button and `shrink-0` on the
                          action buttons hold the layout: a flex item defaults to
                          `min-width: auto`, so a long label refuses to shrink and
                          pushes the delete button past the card's
                          `overflow-hidden` boundary.
                        */}
                        <div className="flex items-center gap-1 bg-slate-50 px-2 py-1.5 dark:bg-slate-800/60">
                          <button
                            type="button"
                            onClick={() => toggleExpand(block.tempId)}
                            className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                            aria-expanded={isExpanded}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            )}
                            <span className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
                              {itemName}
                            </span>
                          </button>
                          <span className="shrink-0">
                            <Toggle
                              id={`block-enabled-${block.tempId}`}
                              aria-label={`Show ${itemName}`}
                              checked={block.enabled}
                              onChange={(event) =>
                                updateBlock(
                                  group.blockType,
                                  block.tempId,
                                  'enabled',
                                  event.target.checked
                                )
                              }
                            />
                          </span>
                          <IconAction
                            icon={ChevronUp}
                            label={`Move up ${itemName}`}
                            onClick={() => moveBlock(group.blockType, block.tempId, 'up')}
                            disabled={index === 0}
                          />
                          <IconAction
                            icon={ChevronDown}
                            label={`Move down ${itemName}`}
                            onClick={() => moveBlock(group.blockType, block.tempId, 'down')}
                            disabled={index === blocks.length - 1}
                          />
                          <IconAction
                            icon={Trash2}
                            label={`Delete ${itemName}`}
                            tone="danger"
                            onClick={() => deleteBlock(group.blockType, block.tempId)}
                          />
                        </div>
                        {isExpanded && (
                          <div className="flex flex-col gap-4 p-3">
                            {group.fields.map((field) => (
                              <FieldRenderer
                                key={field.key}
                                field={field}
                                value={
                                  field.configKey
                                    ? readConfigValue(block, field.configKey)
                                    : readBlockValue(block, field.key)
                                }
                                onChange={(value) =>
                                  field.configKey
                                    ? updateBlockConfig(
                                        group.blockType,
                                        block.tempId,
                                        field.configKey,
                                        value
                                      )
                                    : updateBlock(group.blockType, block.tempId, field.key, value)
                                }
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </SortableItem>
                  );
                })}
              </SortableContext>
            </DndContext>

            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => addBlockOfType(group.blockType)}
              className="w-full border-dashed"
            >
              Add {group.itemLabel.toLowerCase()}
            </Button>
          </SectionCard>
        );
      })}
    </div>
  );
}

/** Reads a value from a block's `config` without `any`. */
function readConfigValue(block: WorkingBlock, configKey: string): FieldValue {
  const value = block.config?.[configKey];
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  return '';
}

interface FieldRendererProps {
  field: SectionFieldDef | BlockFieldDef;
  value: FieldValue;
  onChange: (value: FieldValue) => void;
}

function FieldRenderer({ field, value, onChange }: FieldRendererProps) {
  const generatedId = useId();
  const inputId = `${generatedId}-${field.key}`;
  const text = typeof value === 'boolean' ? '' : value == null ? '' : String(value);

  // Toggle carries its own label and already wires it up via htmlFor.
  if (field.type === 'toggle') {
    return (
      <Toggle
        id={inputId}
        label={field.label}
        description={field.help}
        checked={!!value}
        onChange={(event) => onChange(event.target.checked)}
      />
    );
  }

  const control = (() => {
    switch (field.type) {
      case 'url':
        return (
          <Input
            id={inputId}
            type="url"
            value={text}
            onChange={(event) => onChange(event.target.value)}
            placeholder={field.placeholder}
          />
        );
      case 'number':
        return (
          <Input
            id={inputId}
            type="number"
            value={text}
            onChange={(event) => onChange(event.target.value)}
            placeholder={field.placeholder}
          />
        );
      case 'textarea':
        return (
          <Textarea
            id={inputId}
            rows={3}
            value={text}
            onChange={(event) => onChange(event.target.value)}
            placeholder={field.placeholder}
          />
        );
      case 'richtext':
        return <RichTextEditor value={text} onChange={onChange} />;
      case 'image':
        return <ImageUploader value={text} onChange={onChange} />;
      case 'select':
        return (
          <Select
            id={inputId}
            value={text}
            onChange={(event) => onChange(event.target.value)}
            options={field.options || []}
          />
        );
      case 'color':
        return <ColorField id={inputId} value={text} onChange={onChange} label={field.label} />;
      default:
        return (
          <Input
            id={inputId}
            type="text"
            value={text}
            onChange={(event) => onChange(event.target.value)}
            placeholder={field.placeholder}
          />
        );
    }
  })();

  // The image uploader and rich text editor are not a single input, so their
  // label is not wired to an id.
  const composite = field.type === 'image' || field.type === 'richtext';

  return (
    <Field
      label={field.label}
      htmlFor={composite ? undefined : inputId}
      hint={field.help}
      className="min-w-0"
    >
      {control}
    </Field>
  );
}

/**
 * Colour picker that treats "empty" as a real, selectable state.
 *
 * An empty value means "inherit the site theme colour", so the swatch shows a
 * neutral placeholder rather than defaulting to black — otherwise every block
 * saved through this form would silently hard-code a colour.
 */
function ColorField({
  id,
  value,
  onChange,
  label,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const isSet = /^#[0-9a-fA-F]{6}$/.test(value);

  return (
    <div className="flex items-center gap-2">
      <div className="relative shrink-0">
        <input
          id={`${id}-picker`}
          type="color"
          value={isSet ? value : '#E8231A'}
          onChange={(event) => onChange(event.target.value)}
          aria-label={`Pick ${label.toLowerCase()}`}
          className="h-9 w-9 cursor-pointer rounded-lg border border-slate-200 bg-transparent p-0.5 dark:border-slate-700"
        />
        {!isSet && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0.5 rounded-md border border-dashed border-slate-300 bg-slate-100 dark:border-slate-600 dark:bg-slate-800"
          />
        )}
      </div>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Theme default"
        className="font-mono"
      />
      {isSet && (
        <IconAction
          icon={X}
          label={`Clear ${label.toLowerCase()}`}
          onClick={() => onChange('')}
        />
      )}
    </div>
  );
}

/**
 * Shows how the heading will actually read, with the accented run picked out.
 *
 * The accent only applies when the highlight words appear in the heading
 * verbatim, which is easy to get wrong — a trailing space or a changed question
 * mark silently drops the gradient. Rather than explain that in help text and
 * hope, this renders the outcome and says plainly when no match was found.
 */
function HeadingPreview({ title, highlight }: { title: string; highlight: string }) {
  if (!title.trim()) return null;

  const at = highlight.trim() ? title.indexOf(highlight) : -1;
  const matched = at !== -1;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/60">
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        How the heading will look
      </p>
      <p className="font-display break-words text-base font-black leading-snug text-slate-900 dark:text-slate-100">
        {matched ? (
          <>
            {title.slice(0, at)}
            <span className="text-[#E8231A]">{highlight}</span>
            {title.slice(at + highlight.length)}
          </>
        ) : (
          title
        )}
      </p>
      {highlight.trim() && !matched && (
        <p className="mt-2 text-[11px] leading-relaxed text-amber-600 dark:text-amber-400">
          &ldquo;{highlight}&rdquo; is not in the title, so nothing is highlighted. Check the
          spelling and punctuation.
        </p>
      )}
    </div>
  );
}
