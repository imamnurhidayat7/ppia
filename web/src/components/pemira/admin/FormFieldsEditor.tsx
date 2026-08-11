'use client';
import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, GripVertical, Pencil, Check, X, Type, AlignLeft, Hash, CircleDot, ListChecks, Image, Video, AlertCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { arrayMove } from '@dnd-kit/sortable';
import api from '@/lib/api';
import { useToast } from '@/components/Toast';
import { Button, Modal, ModalFooter, Toggle } from '@/components/ui';
import { EmptyBlock } from '@/components/dashboard';
import type { ElectionFormField, FormFieldType } from '@/lib/api-types';

interface Props {
  electionId: string;
}

const FIELD_TYPES: { value: FormFieldType; label: string; hint: string; icon: LucideIcon }[] = [
  { value: 'FIELD_TEXT',           label: 'Short text',      hint: 'Single-line answer',    icon: Type },
  { value: 'FIELD_RICHTEXT',       label: 'Paragraph',       hint: 'Multi-line answer',     icon: AlignLeft },
  { value: 'FIELD_NUMBER',         label: 'Number',          hint: 'Numeric answer',        icon: Hash },
  { value: 'FIELD_SINGLE_CHOICE',  label: 'Single choice',   hint: 'Pick one option',       icon: CircleDot },
  { value: 'FIELD_MULTIPLE_CHOICE', label: 'Multiple choice', hint: 'Pick several options',  icon: ListChecks },
  { value: 'FIELD_IMAGE',          label: 'Image upload',    hint: 'Accepts a single image', icon: Image },
  { value: 'FIELD_VIDEO_LINK',     label: 'Video link',      hint: 'URL to a hosted video', icon: Video },
];

const editorInputClass =
  'w-full rounded-[5px] border border-[#DCE7F1] bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#E8231A]/40 focus:ring-4 focus:ring-[#E8231A]/8 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500';

function EditorSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
      {children}
    </p>
  );
}

export default function FormFieldsEditor({ electionId }: Props) {
  const { showSuccess, showError } = useToast();
  const [fields, setFields] = useState<ElectionFormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingField, setEditingField] = useState<ElectionFormField | null>(null);
  const [reordering, setReordering] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const load = useCallback(async () => {
    try {
      const res = await api.getElectionFormFields(electionId);
      setFields(res.fields ?? []);
    } catch {
      showError('Could not load form fields');
    } finally {
      setLoading(false);
    }
  }, [electionId, showError]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (field: ElectionFormField) => {
    const ok = window.confirm(
      `Delete "${field.label}"?\n\nThis also removes all stored responses for this field. This cannot be undone.`,
    );
    if (!ok) return;
    try {
      await api.deleteElectionFormField(field.id);
      showSuccess('Field deleted');
      load();
    } catch {
      showError('Delete failed');
    }
  };

  // Optimistic reorder: update local state immediately for a snappy feel,
  // then persist the new order to the backend. On failure we reload the
  // server-authoritative order so the UI never drifts.
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIdx = fields.findIndex((f) => f.id === active.id);
      const newIdx = fields.findIndex((f) => f.id === over.id);
      if (oldIdx === -1 || newIdx === -1) return;

      const reordered = arrayMove(fields, oldIdx, newIdx).map((f, i) => ({
        ...f,
        order: i,
      }));
      setFields(reordered);

      setReordering(true);
      try {
        await api.reorderElectionFormFields(electionId, reordered.map((f) => f.id));
      } catch {
        showError('Could not save new order');
        load();
      } finally {
        setReordering(false);
      }
    },
    [electionId, fields, load, showError],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {fields.length === 0 ? (
        <EmptyBlock
          title="No custom fields yet"
          description="Candidates will use the default vision/mission questions. Add custom fields to replace them."
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {fields.map((field, idx) => (
                <SortableFieldRow
                  key={field.id}
                  field={field}
                  index={idx}
                  disabled={reordering}
                  typeLabel={FIELD_TYPES.find((t) => t.value === field.type)?.label ?? field.type}
                  onEdit={() => {
                    setEditingField(field);
                    setShowEditor(true);
                  }}
                  onDelete={() => handleDelete(field)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-slate-500">
          {fields.length > 0
            ? 'These fields replace the default vision/mission questions for this election.'
            : ''}
        </p>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => {
            setEditingField(null);
            setShowEditor(true);
          }}
        >
          Add field
        </Button>
      </div>

      {showEditor && (
        <FormFieldEditorModal
          electionId={electionId}
          field={editingField}
          onClose={() => setShowEditor(false)}
          onSaved={() => {
            setShowEditor(false);
            load();
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// Editor modal
// ============================================================================

interface EditorProps {
  electionId: string;
  field: ElectionFormField | null;
  onClose: () => void;
  onSaved: () => void;
}

function FormFieldEditorModal({ electionId, field, onClose, onSaved }: EditorProps) {
  const { showSuccess, showError } = useToast();
  const isEdit = field !== null;

  const [type, setType] = useState<FormFieldType>(field?.type ?? 'FIELD_TEXT');
  const [label, setLabel] = useState(field?.label ?? '');
  const [description, setDescription] = useState(field?.description ?? '');
  const [options, setOptions] = useState(
    (field?.options ?? []).join('\n'),
  );
  const [required, setRequired] = useState(field?.required ?? false);
  const [maxFileSize, setMaxFileSize] = useState(field?.maxFileSize ?? 5);
  const [acceptedTypes, setAcceptedTypes] = useState(
    (field?.acceptedTypes ?? []).join(','),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isChoice =
    type === 'FIELD_SINGLE_CHOICE' || type === 'FIELD_MULTIPLE_CHOICE';
  const isImage = type === 'FIELD_IMAGE';

  const handleSubmit = async () => {
    setError(null);
    if (label.trim().length === 0) {
      setError('Label is required');
      return;
    }
    const payload: any = {
      type,
      label: label.trim(),
      description: description.trim() || undefined,
      required,
    };
    if (isChoice) {
      const optList = options
        .split('\n')
        .map((o) => o.trim())
        .filter(Boolean);
      if (optList.length === 0) {
        setError('At least one option is required');
        return;
      }
      payload.options = optList;
    }
    if (isImage) {
      const n = Number(maxFileSize);
      if (!Number.isFinite(n) || n <= 0 || n > 10) {
        setError('Max file size must be between 1 and 10 MB');
        return;
      }
      payload.maxFileSize = Math.floor(n);
      const exts = acceptedTypes
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean);
      payload.acceptedTypes = exts.length > 0 ? exts : undefined;
    }
    setSaving(true);
    try {
      if (isEdit && field) {
        await api.updateElectionFormField(field.id, payload);
        showSuccess('Field updated');
      } else {
        await api.createElectionFormField(electionId, payload);
        showSuccess('Field added');
      }
      onSaved();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Could not save field');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={isEdit ? 'Edit form field' : 'Add form field'}
      description={
        isEdit
          ? 'Update how this question is presented to candidates.'
          : 'Configure a question candidates answer during registration.'
      }
      size="lg"
    >
      <div className="space-y-6">
        {/* ------------------------------------------- field type picker */}
        <section>
          <EditorSectionLabel>Field type</EditorSectionLabel>
          <div
            role="radiogroup"
            aria-label="Field type"
            className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2"
          >
            {FIELD_TYPES.map((t) => {
              const active = type === t.value;
              const TileIcon = t.icon;
              return (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={isEdit}
                  onClick={() => setType(t.value)}
                  className={`flex items-start gap-3 rounded-[5px] border p-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                    active
                      ? 'border-[#E8231A]/50 bg-[#E8231A]/5 shadow-[0_0_0_1px_rgba(232,35,26,0.12)]'
                      : 'border-[#DCE7F1] bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-slate-600'
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] transition-colors ${
                      active
                        ? 'bg-[#E8231A] text-white'
                        : 'bg-[#F5FAFD] text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    <TileIcon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span
                      className={`block text-[13px] font-bold leading-tight ${
                        active
                          ? 'text-[#C41E16] dark:text-[#FF8A84]'
                          : 'text-slate-800 dark:text-slate-100'
                      }`}
                    >
                      {t.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-tight text-slate-400 dark:text-slate-500">
                      {t.hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          {isEdit && (
            <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
              The field type is locked after creation so stored answers stay valid.
            </p>
          )}
        </section>

        <div className="border-t border-[#E7EFF7] dark:border-slate-800" />

        {/* ------------------------------------------------ question setup */}
        <section className="space-y-4">
          <EditorSectionLabel>Question</EditorSectionLabel>
          <div>
            <label
              htmlFor="ff-label"
              className="mb-1.5 block text-[13px] font-bold text-slate-800 dark:text-slate-100"
            >
              Label <span className="text-[#E8231A]">*</span>
            </label>
            <input
              id="ff-label"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Why are you running?"
              className={editorInputClass}
            />
          </div>
          <div>
            <label
              htmlFor="ff-desc"
              className="mb-1.5 block text-[13px] font-bold text-slate-800 dark:text-slate-100"
            >
              Description
            </label>
            <input
              id="ff-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional helper text shown under the label"
              className={editorInputClass}
            />
          </div>
        </section>

        {isChoice && (
          <section>
            <EditorSectionLabel>Options</EditorSectionLabel>
            <textarea
              id="ff-options"
              value={options}
              onChange={(e) => setOptions(e.target.value)}
              rows={4}
              placeholder={'Option 1\nOption 2\nOption 3'}
              className={`${editorInputClass} mt-2.5 resize-none font-mono text-[13px]`}
            />
            <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">
              One option per line. Blank lines are ignored.
            </p>
          </section>
        )}

        {isImage && (
          <section className="space-y-4">
            <EditorSectionLabel>Upload settings</EditorSectionLabel>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="ff-max"
                  className="mb-1.5 block text-[13px] font-bold text-slate-800 dark:text-slate-100"
                >
                  Max file size (MB)
                </label>
                <input
                  id="ff-max"
                  type="number"
                  min={1}
                  max={10}
                  value={maxFileSize}
                  onChange={(e) => setMaxFileSize(Number(e.target.value))}
                  className={editorInputClass}
                />
              </div>
              <div>
                <label
                  htmlFor="ff-ext"
                  className="mb-1.5 block text-[13px] font-bold text-slate-800 dark:text-slate-100"
                >
                  Accepted extensions
                </label>
                <input
                  id="ff-ext"
                  type="text"
                  value={acceptedTypes}
                  onChange={(e) => setAcceptedTypes(e.target.value)}
                  placeholder=".jpg, .png, .webp"
                  className={editorInputClass}
                />
              </div>
            </div>
          </section>
        )}

        <div className="border-t border-[#E7EFF7] dark:border-slate-800" />

        {/* --------------------------------------------------- validation */}
        <div className="flex items-center justify-between gap-4 rounded-[5px] border border-[#DCE7F1] px-4 py-3.5 dark:border-slate-700">
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">
              Required answer
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Candidates cannot submit their registration without answering this field.
            </p>
          </div>
          <Toggle
            aria-label="Required answer"
            checked={required}
            onChange={(e) => setRequired(e.target.checked)}
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-[5px] border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-[#C41E16] dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      <ModalFooter>
        <Button variant="ghost" onClick={onClose} leftIcon={<X className="h-4 w-4" />}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={saving}
          leftIcon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="h-4 w-4" />}
        >
          {isEdit ? 'Save changes' : 'Add field'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

// ============================================================================
// Sortable row
// ============================================================================

interface SortableRowProps {
  field: ElectionFormField;
  index: number;
  disabled?: boolean;
  typeLabel: string;
  onEdit: () => void;
  onDelete: () => void;
}

function SortableFieldRow({
  field,
  index,
  disabled,
  typeLabel,
  onEdit,
  onDelete,
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id, disabled });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
        isDragging
          ? 'border-[#E8231A] bg-[#E8231A]/5 shadow-lg'
          : 'border-slate-200 hover:border-slate-300'
      } ${disabled ? 'opacity-60' : ''}`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="p-1 rounded-lg text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing touch-none"
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <span className="text-xs font-mono text-slate-400 w-6">{index + 1}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-700 truncate">
            {field.label}
          </span>
          {field.required && (
            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-600">
              Required
            </span>
          )}
        </div>
        <div className="text-xs text-slate-500">
          {typeLabel}
          {field.options && field.options.length > 0 && (
            <span> · {field.options.length} options</span>
          )}
        </div>
      </div>
      <button
        onClick={onEdit}
        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
        aria-label="Edit field"
      >
        <Pencil className="w-4 h-4" />
      </button>
      <button
        onClick={onDelete}
        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
        aria-label="Delete field"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </li>
  );
}
