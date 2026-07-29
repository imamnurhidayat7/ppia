'use client';

/**
 * EditableCanvas Context
 *
 * Provides an edit mode layer on top of the existing CMS data.
 * When editMode=true, useLandingSection returns locally overridden data
 * instead of fetching from API — allowing inline editing without saving.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { LandingSection, SectionBlock, SectionInput } from '@/lib/api-types';
import api from '@/lib/api';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type DraftSections = Record<string, LandingSection>;

/**
 * There is one set of content fields, not one per language. The editor writes
 * to the base fields (`title`, `subtitle`, `description`); the public site
 * falls back from any legacy `*Id` value to these (see `pickText`).
 */
interface EditableCanvasContextValue {
  /** Whether we are in edit mode */
  editMode: boolean;
  /** All loaded sections, keyed by section.key */
  sections: DraftSections;
  /** Section currently focused in the sidebar */
  activeKey: string | null;
  setActiveKey: (key: string | null) => void;
  /** Load all sections from API into the draft store */
  loadSections: () => Promise<void>;
  /** Update a top-level field on a section (title, subtitle, config, etc.) */
  updateSectionField: (key: string, field: string, value: any) => void;
  /** Update a field on a specific block inside a section */
  updateBlockField: (
    sectionKey: string,
    blockId: string,
    field: string,
    value: string
  ) => void;
  /** Add a new section */
  addSection: (data: { key: string; title: string; order?: number }) => Promise<void>;
  /** Delete a section */
  deleteSection: (sectionId: string, key: string) => Promise<void>;
  /** Save all dirty sections back to the API */
  saveAll: () => Promise<void>;
  /** Track which sections have unsaved changes */
  dirty: Set<string>;
  saving: boolean;
  loading: boolean;
}

const EditableCanvasContext = createContext<EditableCanvasContextValue | null>(null);

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────

export function EditableCanvasProvider({ children }: { children: ReactNode }) {
  const [sections, setSections] = useState<DraftSections>({});
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadSections = useCallback(async () => {
    setLoading(true);
    try {
      // The admin endpoint, not the public one: the public route filters
      // `enabled: true` on both sections and blocks, so a section switched off
      // (or soft-deleted, which sets enabled=false) vanished from the editor and
      // could never be found or restored again.
      const res = await api.getLandingSectionsAdmin();
      if (res.success && res.data) {
        const map: DraftSections = {};
        for (const s of res.data as LandingSection[]) {
          map[s.key] = s;
        }
        setSections(map);
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markDirty = (key: string) => {
    setDirty((prev) => new Set([...prev, key]));
  };

  const updateSectionField = useCallback(
    (key: string, field: string, value: any) => {
      setSections((prev) => ({
        ...prev,
        [key]: { ...prev[key], [field]: value },
      }));
      markDirty(key);
    },
    []
  );

  const updateBlockField = useCallback(
    (sectionKey: string, blockId: string, field: string, value: string) => {
      setSections((prev) => {
        const section = prev[sectionKey];
        if (!section) return prev;
        const blocks = (section.blocks || []).map((b) =>
          b.id === blockId ? { ...b, [field]: value } : b
        );
        return { ...prev, [sectionKey]: { ...section, blocks } };
      });
      markDirty(sectionKey);
    },
    []
  );

  const addSection = useCallback(async (data: { key: string; title: string; order?: number }) => {
    try {
      const res = await api.createLandingSection({
        key: data.key,
        title: data.title,
        enabled: true,
        order: data.order ?? Object.keys(sections).length,
      } as SectionInput);
      if (res.success && res.data) {
        setSections((prev) => ({ ...prev, [data.key]: res.data }));
      }
    } catch (e) {
      console.error('addSection error', e);
    }
  }, [sections]);

  const deleteSection = useCallback(async (sectionId: string, key: string) => {
    try {
      await api.deleteLandingSection(sectionId);
      setSections((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setDirty((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    } catch (e) {
      console.error('deleteSection error', e);
    }
  }, []);

  const saveAll = useCallback(async () => {
    setSaving(true);
    try {
      const dirtyKeys = Array.from(dirty);
      await Promise.all(
        dirtyKeys.map(async (key) => {
          const section = sections[key];
          if (!section) return;
          // Save section-level fields
          await api.updateLandingSection(section.id, {
            title: section.title,
            titleId: section.titleId,
            subtitle: section.subtitle,
            subtitleId: section.subtitleId,
            description: section.description,
            descriptionId: section.descriptionId,
            config: section.config,
          });
          // Save each block
          for (const block of section.blocks || []) {
            await api.updateSectionBlock(section.id, block.id, {
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
            });
          }
        })
      );
      setDirty(new Set());
    } finally {
      setSaving(false);
    }
  }, [sections, dirty]);

  return (
    <EditableCanvasContext.Provider
      value={{
        editMode: true,
        sections,
        activeKey,
        setActiveKey,
        loadSections,
        updateSectionField,
        updateBlockField,
        addSection,
        deleteSection,
        saveAll,
        dirty,
        saving,
        loading,
      }}
    >
      {children}
    </EditableCanvasContext.Provider>
  );
}

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

export function useEditableCanvas() {
  const ctx = useContext(EditableCanvasContext);
  if (!ctx) throw new Error('useEditableCanvas must be used inside EditableCanvasProvider');
  return ctx;
}

/**
 * Drop-in replacement for useLandingSection when in canvas edit mode.
 * Returns the draft section from context instead of fetching from API.
 */
export function useEditableSection(key: string) {
  const { sections, updateSectionField, updateBlockField, activeKey, setActiveKey } =
    useEditableCanvas();
  const section = sections[key] ?? null;

  const setField = useCallback(
    (field: string, value: string) => updateSectionField(key, field, value),
    [key, updateSectionField]
  );

  const setBlockField = useCallback(
    (blockId: string, field: string, value: string) =>
      updateBlockField(key, blockId, field, value),
    [key, updateBlockField]
  );

  const isActive = activeKey === key;
  const activate = () => setActiveKey(key);

  return { section, setField, setBlockField, isActive, activate };
}
