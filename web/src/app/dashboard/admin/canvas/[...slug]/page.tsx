'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import type { Page, PageBlock } from '@/lib/api-types';
import { EditableField } from '@/components/admin/EditableField';
import { RepeaterEditor } from '@/components/admin/RepeaterEditor';
import { EditableImage } from '@/components/admin/EditableImage';
import { EditableVideo } from '@/components/admin/EditableVideo';
import { BlockLibrary } from '@/components/admin/BlockLibrary';
import { useUndoRedo } from '@/lib/hooks/use-undo-redo';
import {
  AlertCircle, CheckCircle2, ChevronDown, ChevronRight, ChevronUp,
  FileText, Loader2, Plus, Redo2, Trash2, Undo2, X,
} from 'lucide-react';
import Link from 'next/link';
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy,
  arrayMove, sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableItem } from '@/components/admin/SortableItem';
import { CanvasInspector } from '@/components/admin/CanvasInspector';
import { EditorShell } from '@/components/admin/EditorShell';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useAuth } from '@/lib/auth-context';
import { getContentSchema } from '@/lib/content-schemas';
import type { InspectorTab } from '@/components/admin/CanvasInspector';

// ─── Editable Block Renderer ─────────────────────────────────────────────────

interface BlockEditorProps {
  block: PageBlock;
  onChange: (id: string, field: string, value: any) => void;
  onDelete: (id: string) => void;
}

function BlockEditor({ block, onChange, onDelete }: BlockEditorProps) {
  const [expanded, setExpanded] = useState(true);

  const commonFields = (
    <div className="space-y-3 p-4">
      {/* Title */}
      <div>
        <label className="data-type text-[12px] font-bold uppercase ink-muted">Title</label>
        <EditableField
          as="div"
          label="title"
          value={block.title || ''}
          onChange={(v) => onChange(block.id, 'title', v)}
          className="ink-strong font-semibold text-lg mt-1"
          placeholder="Click to add a title..."
        />
      </div>
      {/* Subtitle */}
      <div>
        <label className="data-type text-[12px] font-bold uppercase ink-muted">Subtitle</label>
        <EditableField
          as="p"
          label="subtitle"
          value={block.subtitle || ''}
          onChange={(v) => onChange(block.id, 'subtitle', v)}
          className="ink-body mt-1"
          placeholder="Click to add a description..."
          multiline
        />
      </div>
    </div>
  );

  // Data source selector for dynamic blocks (events, articles, divisions, faq, media)
  const dataSource = (block.config as any)?.dataSource ?? null;
  const onDataSourceChange = (key: string, value: any) => {
    const currentConfig = (block.config as any) ?? {};
    const newConfig = { ...currentConfig, dataSource: { ...(currentConfig.dataSource ?? {}), [key]: value } };
    onChange(block.id, 'config', newConfig);
  };
  const toggleDataSource = (enabled: boolean) => {
    const currentConfig = (block.config as any) ?? {};
    if (enabled) {
      const newConfig = { ...currentConfig, dataSource: { type: 'events', limit: 5 } };
      onChange(block.id, 'config', newConfig);
    } else {
      const { dataSource: _ds, ...rest } = currentConfig;
      onChange(block.id, 'config', rest);
    }
  };

  // Shared field snippets for common block fields
  const contentField = (label = 'Body') => (
    <div className="px-4 pb-4">
      <label className="data-type text-[12px] font-bold uppercase ink-muted block mb-2">{label}</label>
      <EditableField
        as="div"
        label={label.toLowerCase()}
        value={block.content || ''}
        onChange={(v) => onChange(block.id, 'content', v)}
        className="text-sm ink-body mt-1 min-h-[80px]"
        placeholder="Write the text shown here..."
        multiline
      />
    </div>
  );

  const codeField = (
    <div className="px-4 pb-4">
      <label className="data-type text-[12px] font-bold uppercase ink-muted block mb-2">Code</label>
      <EditableField
        as="div"
        value={block.content || ''}
        onChange={(v) => onChange(block.id, 'content', v)}
        className="data-type text-[12px] text-slate-100 mt-1 min-h-20 bg-[#071321] rounded-[4px] p-3"
        placeholder="console.log('hello');"
        multiline
      />
    </div>
  );

  const imageField = (label = 'Image') => (
    <div className="px-4 pb-4">
      <label className="data-type text-[12px] font-bold uppercase ink-muted block mb-2">{label}</label>
      <EditableImage
        value={block.imageUrl || ''}
        onChange={(v) => onChange(block.id, 'imageUrl', v)}
        className="w-full rounded-[4px] object-cover h-40"
        placeholder="Click to add an image"
      />
    </div>
  );

  const ctaField = (
    <>
      <div className="px-4 pb-4">
        <label className="data-type text-[12px] font-bold uppercase ink-muted block mb-2">Button label</label>
        <EditableField
          as="p"
          label="button label"
          value={block.linkText || ''}
          onChange={(v) => onChange(block.id, 'linkText', v)}
          className="ink-body text-sm mt-1"
          placeholder="Learn more"
        />
      </div>
      <div className="px-4 pb-4">
        <label className="data-type text-[12px] font-bold uppercase ink-muted block mb-2">Button link</label>
        <EditableField
          as="p"
          label="button link"
          value={block.linkUrl || ''}
          onChange={(v) => onChange(block.id, 'linkUrl', v)}
          className="ink-body text-sm mt-1"
          placeholder="/about or https://..."
        />
      </div>
    </>
  );

  const colorField = (
    <div className="px-4 pb-4">
      <label className="data-type text-[12px] font-bold uppercase ink-muted block mb-2">Accent colour</label>
      <div className="flex items-center gap-2 mt-1">
        <input
          type="color"
          value={(block.config as any)?.color || block.color || '#E8231A'}
          onChange={(e) => {
            const currentConfig = (block.config as any) ?? {};
            onChange(block.id, 'config', { ...currentConfig, color: e.target.value });
          }}
          className="w-10 h-8 rounded cursor-pointer border border-[#DCE7F1] dark:border-slate-600"
        />
        <EditableField
          as="p"
          value={(block.config as any)?.color || block.color || ''}
          onChange={(v) => {
            const currentConfig = (block.config as any) ?? {};
            onChange(block.id, 'config', { ...currentConfig, color: v });
          }}
          className="ink-body text-sm flex-1"
          placeholder="#E8231A"
        />
      </div>
    </div>
  );

  const dataSourceFields = (
    <div className="border-t border-[#DCE7F1] dark:border-slate-700 pt-3 mt-3">
      <div className="flex items-center justify-between mb-2">
        <label className="data-type text-[12px] font-bold uppercase ink-muted">Pull from database</label>
        <button
          type="button"
          onClick={() => toggleDataSource(!dataSource)}
          className={`relative w-9 h-5 rounded-full transition-colors ${dataSource ? 'bg-[#E8231A]' : 'bg-slate-300 dark:bg-slate-600'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${dataSource ? 'translate-x-4' : ''}`} />
        </button>
      </div>
      {dataSource && (
        <div className="space-y-3">
          <div>
            <label className="data-type text-[12px] ink-muted block mb-1">Source</label>
            <select
              value={dataSource.type || 'events'}
              onChange={(e) => onDataSourceChange('type', e.target.value)}
              className="w-full rounded-[4px] border border-[#C3D2E0] dark:border-slate-600 bg-white dark:bg-slate-800 text-sm px-2 py-1.5 ink-body"
            >
              <option value="events">Events</option>
              <option value="articles">Articles</option>
              <option value="divisions">Divisions</option>
              <option value="faq">FAQ</option>
              <option value="media">Media (Gallery/Sponsor)</option>
              <option value="candidates">Candidates</option>
            </select>
          </div>
          {(dataSource.type === 'events') && (
            <div>
              <label className="data-type text-[12px] ink-muted block mb-1">Filter</label>
              <select
                value={dataSource.filter || 'all'}
                onChange={(e) => onDataSourceChange('filter', e.target.value)}
                className="w-full rounded-[4px] border border-[#C3D2E0] dark:border-slate-600 bg-white dark:bg-slate-800 text-sm px-2 py-1.5 ink-body"
              >
                <option value="all">All</option>
                <option value="upcoming">Upcoming</option>
                <option value="past">Past</option>
              </select>
            </div>
          )}
          {(dataSource.type === 'faq' || dataSource.type === 'media') && (
            <div>
              <label className="data-type text-[12px] ink-muted block mb-1">Category</label>
              <input
                type="text"
                value={dataSource.category || ''}
                onChange={(e) => onDataSourceChange('category', e.target.value)}
                placeholder="optional"
                className="w-full rounded-[4px] border border-[#C3D2E0] dark:border-slate-600 bg-white dark:bg-slate-800 text-sm px-2 py-1.5 ink-body"
              />
            </div>
          )}
          <div>
            <label className="data-type text-[12px] ink-muted block mb-1">How many items</label>
            <input
              type="number"
              min="1"
              max="50"
              value={dataSource.limit || 5}
              onChange={(e) => onDataSourceChange('limit', parseInt(e.target.value, 10) || 5)}
              className="w-full rounded-[4px] border border-[#C3D2E0] dark:border-slate-600 bg-white dark:bg-slate-800 text-sm px-2 py-1.5 ink-body"
            />
          </div>
        </div>
      )}
    </div>
  );

  const renderBlockContent = () => {
    switch (block.type) {
      case 'IMAGE':
        return (
          <div className="px-4 pb-4 space-y-3">
            {commonFields}
            <div className="px-4 pb-4">
              <label className="data-type text-[12px] font-bold uppercase ink-muted block mb-2">Image</label>
              <EditableImage
                value={block.imageUrl || ''}
                onChange={(v) => onChange(block.id, 'imageUrl', v)}
                className="w-full rounded-[4px] object-cover h-48"
                placeholder="Click to add an image"
              />
            </div>
          </div>
        );
      case 'VIDEO':
        return (
          <div className="px-4 pb-4 space-y-3">
            {commonFields}
            <div className="px-4 pb-4">
              <label className="data-type text-[12px] font-bold uppercase ink-muted block mb-2">Video</label>
              <EditableVideo
                value={block.linkUrl || ''}
                onChange={(v) => onChange(block.id, 'linkUrl', v)}
                className="w-full"
              />
            </div>
          </div>
        );
      case 'CTA_BUTTON':
        return (
          <div className="px-4 pb-4 space-y-3">
            {commonFields}
            <div className="px-4 pb-2">
              <label className="data-type text-[12px] font-bold uppercase ink-muted block mb-1">Link URL</label>
              <EditableField
                as="span"
                value={block.linkUrl || ''}
                onChange={(v) => onChange(block.id, 'linkUrl', v)}
                className="text-blue-500 text-sm underline"
                placeholder="https://..."
              />
            </div>
            <div className="px-4 pb-2">
              <label className="data-type text-[12px] font-bold uppercase ink-muted block mb-1">Button label</label>
              <EditableField
                as="span"
                value={block.linkText || ''}
                onChange={(v) => onChange(block.id, 'linkText', v)}
                className="inline-block bg-blue-600 text-white px-4 py-2 rounded-[4px] text-sm font-medium"
                placeholder="Button label..."
              />
            </div>
          </div>
        );
      case 'TIMELINE':
        return (
          <div className="space-y-0">
            {commonFields}
            <RepeaterEditor block={block} onChange={onChange} />
            {dataSourceFields}
          </div>
        );
      case 'TEAM':
        return (
          <div className="space-y-0">
            {commonFields}
            <RepeaterEditor block={block} onChange={onChange} />
            {dataSourceFields}
          </div>
        );
      case 'QUOTE':
        return (
          <div className="px-4 pb-4 space-y-3">
            {commonFields}
            <div className="px-4 pb-4 space-y-3">
              <div>
                <label className="data-type text-[12px] font-bold uppercase ink-muted block mb-2">Quote</label>
                <EditableField
                  as="blockquote"
                  value={block.content || ''}
                  onChange={(v) => onChange(block.id, 'content', v)}
                  className="ink-body italic mt-1"
                  placeholder="Quote..."
                  multiline
                />
              </div>
              <div>
                <label className="data-type text-[12px] font-bold uppercase ink-muted block mb-2">Author</label>
                <EditableField
                  as="p"
                  value={block.subtitle || ''}
                  onChange={(v) => onChange(block.id, 'subtitle', v)}
                  className="ink-muted text-sm mt-1"
                  placeholder="Author name..."
                />
              </div>
            </div>
          </div>
        );
      case 'DIVIDER':
        return (
          <div className="px-4 pb-4 space-y-3">
            {commonFields}
            <div className="px-4 pb-4">
              <label className="data-type text-[12px] font-bold uppercase ink-muted block mb-2">Label (optional)</label>
              <EditableField
                as="p"
                value={block.subtitle || ''}
                onChange={(v) => onChange(block.id, 'subtitle', v)}
                className="ink-muted text-sm text-center mt-1"
                placeholder="Divider label..."
              />
            </div>
          </div>
        );
      case 'TABLE':
        return (
          <div className="px-4 pb-4 space-y-3">
            {commonFields}
            <div className="px-4 pb-4">
              <label className="data-type text-[12px] font-bold uppercase ink-muted block mb-2">Table data (JSON)</label>
              <EditableField
                as="div"
                value={block.content || ''}
                onChange={(v) => onChange(block.id, 'content', v)}
                className="data-type text-[12px] ink-body mt-1"
                placeholder='{"headers":["A","B"],"rows":[["1","2"]]}'
                multiline
              />
            </div>
          </div>
        );
      case 'CONTACT':
        return (
          <div className="px-4 pb-4 space-y-3">
            {commonFields}
            <div className="px-4 pb-4 space-y-3">
              <div>
                <label className="data-type text-[12px] font-bold uppercase ink-muted block mb-2">Email</label>
                <EditableField
                  as="p"
                  value={block.linkUrl || ''}
                  onChange={(v) => onChange(block.id, 'linkUrl', v)}
                  className="ink-body text-sm mt-1"
                  placeholder="email@ppia.org"
                />
              </div>
              <div>
                <label className="data-type text-[12px] font-bold uppercase ink-muted block mb-2">Additional info (JSON)</label>
                <EditableField
                  as="div"
                  value={block.content || ''}
                  onChange={(v) => onChange(block.id, 'content', v)}
                  className="data-type text-[12px] ink-body mt-1"
                  placeholder='{"phone":"","address":"","instagram":""}'
                  multiline
                />
              </div>
            </div>
          </div>
        );
      case 'COUNTDOWN':
        return (
          <div className="px-4 pb-4 space-y-3">
            {commonFields}
            <div className="px-4 pb-4 space-y-3">
              <div>
                <label className="data-type text-[12px] font-bold uppercase ink-muted block mb-2">Event name</label>
                <EditableField
                  as="p"
                  value={block.subtitle || ''}
                  onChange={(v) => onChange(block.id, 'subtitle', v)}
                  className="ink-body text-sm mt-1"
                  placeholder="Event name..."
                />
              </div>
              <div>
                <label className="data-type text-[12px] font-bold uppercase ink-muted block mb-2">Target date (ISO)</label>
                <EditableField
                  as="p"
                  value={block.linkUrl || ''}
                  onChange={(v) => onChange(block.id, 'linkUrl', v)}
                  className="data-type ink-body text-sm mt-1"
                  placeholder="2026-08-17T00:00:00Z"
                />
              </div>
            </div>
            {dataSourceFields}
          </div>
        );
      case 'SPONSOR':
        return (
          <div className="space-y-0">
            {commonFields}
            <RepeaterEditor block={block} onChange={onChange} />
            {dataSourceFields}
          </div>
        );
      case 'FAQ':
      case 'GALLERY':
        return (
          <div className="space-y-0">
            {commonFields}
            <RepeaterEditor block={block} onChange={onChange} />
            {dataSourceFields}
          </div>
        );
      case 'ARTICLE_CARD':
      case 'EVENT_CARD':
        return (
          <div className="px-4 pb-4 space-y-3">
            {commonFields}
            {dataSourceFields}
          </div>
        );
      case 'MAP':
        return (
          <div className="px-4 pb-4 space-y-3">
            {commonFields}
            <div className="px-4 pb-4 space-y-3">
              <div>
                <label className="data-type text-[12px] font-bold uppercase ink-muted block mb-2">Embed URL</label>
                <EditableField
                  as="p"
                  value={block.linkUrl || ''}
                  onChange={(v) => onChange(block.id, 'linkUrl', v)}
                  className="data-type ink-body text-[12px] mt-1"
                  placeholder="https://maps.google.com/..."
                />
              </div>
              <div>
                <label className="data-type text-[12px] font-bold uppercase ink-muted block mb-2">Address</label>
                <EditableField
                  as="p"
                  value={block.subtitle || ''}
                  onChange={(v) => onChange(block.id, 'subtitle', v)}
                  className="ink-muted text-sm mt-1"
                  placeholder="Location address..."
                />
              </div>
            </div>
          </div>
        );
      case 'NEWSLETTER_FORM':
        return (
          <div className="px-4 pb-4 space-y-3">
            {commonFields}
            <div className="px-4 pb-4">
              <label className="data-type text-[12px] font-bold uppercase ink-muted block mb-2">Button label</label>
              <EditableField
                as="p"
                value={block.linkText || ''}
                onChange={(v) => onChange(block.id, 'linkText', v)}
                className="ink-body text-sm mt-1"
                placeholder="Subscribe"
              />
            </div>
          </div>
        );
      case 'HERO':
        return (
          <div className="space-y-0">
            {commonFields}
            {contentField('Hero description')}
            {imageField('Background image')}
            {ctaField}
            {colorField}
          </div>
        );
      case 'TEXT':
        return (
          <div className="space-y-0">
            {commonFields}
            {contentField('Body text')}
          </div>
        );
      case 'HEADING':
        return (
          <div className="space-y-0">
            {commonFields}
            {colorField}
          </div>
        );
      case 'FEATURE':
        return (
          <div className="space-y-0">
            {commonFields}
            {contentField('Feature description')}
            {imageField('Icon or image')}
            {colorField}
          </div>
        );
      case 'STATISTIC':
        return (
          <div className="space-y-0">
            {commonFields}
            <div className="px-4 pb-4 text-[12px] ink-muted">
              <p>💡 <strong>Title</strong> = the statistic number (e.g. &quot;500+&quot;), <strong>Subtitle</strong> = the caption label.</p>
            </div>
            {colorField}
          </div>
        );
      case 'CODE':
        return (
          <div className="space-y-0">
            {commonFields}
            {codeField}
          </div>
        );
      case 'SPACER':
        return (
          <div className="space-y-0">
            {commonFields}
            <div className="px-4 pb-4 text-[12px] ink-muted italic">
              This block only adds empty vertical spacing on the public page.
            </div>
          </div>
        );
      case 'SOCIAL_LINK':
        return (
          <div className="space-y-0">
            {commonFields}
            {imageField('Social media icon')}
            <div className="px-4 pb-4">
              <label className="data-type text-[12px] font-bold uppercase ink-muted block mb-2">Link URL</label>
              <EditableField
                as="p"
                value={block.linkUrl || ''}
                onChange={(v) => onChange(block.id, 'linkUrl', v)}
                className="ink-body text-sm mt-1"
                placeholder="https://instagram.com/ppia"
              />
            </div>
          </div>
        );
      case 'COLUMNS':
        return (
          <div className="space-y-0">
            {commonFields}
            {contentField('Two-column body text')}
          </div>
        );
      case 'MEMBER_CARD':
        return (
          <div className="space-y-0">
            {commonFields}
            {contentField('Bio')}
            {imageField('Member photo')}
            {colorField}
          </div>
        );
      default:
        return (
          <div className="space-y-0">
            {commonFields}
            <div className="px-4 pb-4 text-[12px] ink-muted italic">
              No dedicated editor for the &quot;{block.type}&quot; block type yet. The title and subtitle above still apply.
            </div>
          </div>
        );
    }
  };

  return (
    <SortableItem id={block.id}>
      <div className="chart-paper rounded-[4px] border border-[#DCE7F1] dark:border-slate-700 overflow-hidden mb-2 shadow-sm">
        {/* Block header */}
        <div className="flex items-center gap-2 px-3 py-2 bg-[#F5FAFD] dark:bg-slate-700/60 border-b border-[#DCE7F1] dark:border-slate-700">
          <button onClick={() => setExpanded((v) => !v)} className="flex-1 flex items-center gap-2 text-left">
            {expanded ? <ChevronUp size={13} className="ink-muted shrink-0" /> : <ChevronDown size={13} className="ink-muted shrink-0" />}
            <span className="data-type text-[12px] font-bold uppercase ink-muted">{block.type}</span>
            <span className="text-[12px] ink-muted truncate">{block.title || block.subtitle || ''}</span>
          </button>
          <button onClick={() => onDelete(block.id)} className="p-1 ink-muted hover:text-red-500 transition-colors" title="Delete block" aria-label="Delete block">
            <Trash2 size={13} />
          </button>
        </div>
        {expanded && renderBlockContent()}
      </div>
    </SortableItem>
  );
}

// ─── Page Canvas ──────────────────────────────────────────────────────────────

export default function PageCanvasEditor() {
  const params = useParams();
  // [...slug] gives an array — join to reconstruct the full slug (e.g. ['about','ad-art'] → 'about/ad-art')
  const slug = Array.isArray(params.slug) ? params.slug.join('/') : (params.slug as string);

  const { user } = useAuth();
  const canUseAdvanced = user?.role === 'SUPER_ADMIN';

  const [page, setPage] = useState<Page | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showBlockLibrary, setShowBlockLibrary] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('content');
  /** Bumped after each save so the live preview reloads. */
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);
  const [deletedBlockIds, setDeletedBlockIds] = useState<string[]>([]);
  const [pendingDeleteBlock, setPendingDeleteBlock] = useState<string | null>(null);

  /** Parsed `page.content` — the object the public page renders. */
  const [content, setContent] = useState<Record<string, unknown>>({});
  const [jsonText, setJsonText] = useState('{}');
  const [jsonError, setJsonError] = useState<string | null>(null);

  const schema = useMemo(
    () => getContentSchema(page?.slug ?? slug, page?.template),
    [page?.slug, page?.template, slug]
  );
  const hasSchema = schema.length > 0;

  /** Jump the inspector to a content group and scroll it into view. */
  const focusContentField = useCallback((key: string) => {
    setInspectorTab('content');
    // Wait for the tab to render before scrolling to the field.
    requestAnimationFrame(() => {
      document
        .getElementById(`content-field-${key}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  const {
    state: blocks,
    set: setBlocks,
    undo, redo, canUndo, canRedo, reset: resetBlocks,
  } = useUndoRedo<PageBlock[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const load = async () => {
      setPageLoading(true);
      try {
        // Admin lookup first so unpublished (draft) pages stay editable.
        let res = await api.getPageAdminBySlug(slug);
        if (!res?.page) res = await api.getPageBySlug(slug);
        if (res?.page) {
          setPage(res.page);
          resetBlocks((res.page.blocks || []).sort((a: PageBlock, b: PageBlock) => a.order - b.order));
          const loaded =
            res.page.content && typeof res.page.content === 'object'
              ? (res.page.content as Record<string, unknown>)
              : {};
          setContent(loaded);
          setJsonText(JSON.stringify(loaded, null, 2));
          setDirty(false);
        }
      } catch (err) {
        console.error('Failed to load canvas page:', err);
        showToast('error', 'Could not load the page');
      } finally {
        setPageLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  // Keyboard undo/redo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); if (canUndo) undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); if (canRedo) redo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [canUndo, canRedo, undo, redo]);

  const updateBlock = useCallback((id: string, field: string, value: any) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, [field]: value } : b));
    setDirty(true);
  }, [blocks, setBlocks]);

  /**
   * Removal is confirmed through the dashboard's own dialog rather than the
   * browser's `confirm()`, which cannot be styled, cannot be dismissed with the
   * keyboard consistently, and looks nothing like the rest of the product.
   */
  const requestDeleteBlock = useCallback((id: string) => {
    setPendingDeleteBlock(id);
  }, []);

  const confirmDeleteBlock = useCallback(() => {
    const id = pendingDeleteBlock;
    setPendingDeleteBlock(null);
    if (!id) return;
    setBlocks(blocks.filter((b) => b.id !== id));
    // Remember the removal so Save also deletes it on the server.
    setDeletedBlockIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setDirty(true);
  }, [pendingDeleteBlock, blocks, setBlocks]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = blocks.findIndex(b => b.id === active.id);
    const newIdx = blocks.findIndex(b => b.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    setBlocks(arrayMove(blocks, oldIdx, newIdx).map((b, i) => ({ ...b, order: i })));
    setDirty(true);
  }, [blocks, setBlocks]);

  /** Page-level fields edited from the inspector. */
  const handlePageFieldChange = useCallback(
    (patch: Partial<Page>) => {
      setPage((prev) => (prev ? { ...prev, ...patch } : prev));
      setDirty(true);
    },
    []
  );

  /** Structured content edited through the schema form. */
  const handleContentChange = useCallback((next: Record<string, unknown>) => {
    setContent(next);
    setJsonText(JSON.stringify(next, null, 2));
    setJsonError(null);
    setDirty(true);
  }, []);

  /** Raw JSON edited in the advanced tab (SUPER_ADMIN only). */
  const handleJsonChange = useCallback((text: string) => {
    setJsonText(text);
    setDirty(true);
    if (!text.trim()) {
      setContent({});
      setJsonError(null);
      return;
    }
    try {
      const parsed = JSON.parse(text);
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setJsonError('Content must be a JSON object, for example: { "header": { ... } }');
        return;
      }
      setContent(parsed as Record<string, unknown>);
      setJsonError(null);
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : 'Invalid JSON');
    }
  }, []);

  const handleAddBlock = useCallback(async (type: string) => {
    if (!page) return;
    try {
      const res = await api.createPageBlock(page.id, {
        type,
        order: blocks.length,
        enabled: true,
      });
      if (res.block) {
        setBlocks([...blocks, res.block]);
      }
    } catch {
      showToast('error', 'Could not add the block');
    }
    setShowBlockLibrary(false);
    setDirty(true);
  }, [page, blocks, setBlocks]);

  const handleSave = async () => {
    if (!page) return;
    if (jsonError) {
      showToast('error', 'Fix the JSON in the Advanced tab before saving');
      return;
    }
    setSaving(true);
    try {
      // Page fields + the content object rendered by the public page.
      await api.updatePage(page.id, {
        title: page.title,
        excerpt: page.excerpt,
        featuredImage: page.featuredImage,
        metaTitle: page.metaTitle,
        metaDescription: page.metaDescription,
        published: page.published,
        content,
      });

      // Blocks removed on the canvas.
      for (const id of deletedBlockIds) {
        await api.deletePageBlock(id);
      }

      // Remaining blocks, including both language variants.
      for (const block of blocks) {
        await api.updatePageBlock(block.id, {
          title: block.title,
          titleId: block.titleId,
          subtitle: block.subtitle,
          subtitleId: block.subtitleId,
          content: block.content,
          contentId: block.contentId,
          imageUrl: block.imageUrl,
          linkUrl: block.linkUrl,
          linkText: block.linkText,
          linkTextId: block.linkTextId,
          iconName: block.iconName,
          color: block.color,
          config: block.config,
          order: block.order,
        });
      }

      setDeletedBlockIds([]);
      setDirty(false);
      // Reload the live preview so the editor sees the result immediately.
      setPreviewRefreshKey((n) => n + 1);
      showToast('success', 'Page saved');
    } catch {
      showToast('error', 'Could not save the page');
    } finally {
      setSaving(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center gap-3 bg-[#EDF5FB] dark:bg-slate-950 ink-muted">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm">Loading page...</span>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#EDF5FB] dark:bg-slate-950 p-6">
        <div className="chart-paper w-full max-w-sm rounded-[5px] p-6 text-center ring-1 ring-[#DCE7F1] dark:ring-slate-800">
          <AlertCircle size={24} className="mx-auto text-amber-500 mb-3" />
          <p className="text-sm font-semibold ink-strong">
            Page not found
          </p>
          <p className="data-type text-[12px] ink-muted mt-1 break-all">
            /{slug}
          </p>
          <Link
            href="/dashboard/admin/pages"
            className="inline-flex items-center justify-center h-9 px-4 mt-4 rounded-[4px] bg-[#E8231A] hover:bg-[#C41E16] text-white text-[12px] font-semibold transition-colors"
          >
            Back to pages
          </Link>
        </div>
      </div>
    );
  }

  return (
    <EditorShell
      backHref="/dashboard/admin/pages"
      backLabel="Back to pages"
      title={page.title}
      subtitle={`/${page.slug}`}
      publishState={page.published ? 'published' : 'draft'}
      isDirty={dirty}
      isSaving={saving}
      onSave={handleSave}
      previewHref={`/${page.slug}`}
      previewRefreshKey={previewRefreshKey}
      /**
       * Pages with a content schema are rendered by purpose-built React
       * components, so their body cannot be edited in place — the canvas shows
       * the live page instead, and editing happens in the Content tab. Pages
       * without a schema are built from blocks, which the canvas can edit.
       */
      canvasMode={hasSchema ? 'preview' : 'document'}
      toolbarExtra={
        <div className="hidden sm:flex items-center gap-0.5 p-0.5 rounded-[3px] bg-[#EDF5FB] dark:bg-slate-800">
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            aria-label="Undo last change"
            className="w-7 h-7 flex items-center justify-center rounded-[3px] ink-muted hover:text-slate-900 hover:bg-white dark:hover:bg-slate-700 dark:hover:text-slate-100 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
          >
            <Undo2 size={14} />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            aria-label="Redo change"
            className="w-7 h-7 flex items-center justify-center rounded-[3px] ink-muted hover:text-slate-900 hover:bg-white dark:hover:bg-slate-700 dark:hover:text-slate-100 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
          >
            <Redo2 size={14} />
          </button>
        </div>
      }
      rail={
        <>
          {/* Content outline. Without this the rail showed only "Blocks (0)" on
              schema pages, which made the whole editor look half-built even
              though the page had plenty of editable content. */}
          {hasSchema && (
            <>
              <div className="shrink-0 flex items-center h-11 px-3 border-b border-[#DCE7F1] dark:border-slate-800">
                <p className="data-type text-[12px] font-bold uppercase ink-muted">
                  Page content
                </p>
              </div>
              <nav className="shrink-0 max-h-[45%] overflow-y-auto p-2 space-y-0.5" aria-label="Content sections">
                {schema.map((field) => (
                  <button
                    key={field.key}
                    type="button"
                    onClick={() => focusContentField(field.key)}
                    className="w-full flex items-center gap-2 min-h-9 px-2.5 py-1.5 rounded-[4px] text-[12px] text-left ink-body hover:bg-[#EDF5FB] dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E8231A] transition-colors"
                  >
                    <FileText size={13} className="shrink-0 ink-muted" />
                    <span className="flex-1 leading-snug">{field.label}</span>
                    <ChevronRight size={12} className="shrink-0 ink-muted" />
                  </button>
                ))}
              </nav>
            </>
          )}

          <div className="shrink-0 flex items-center justify-between h-11 px-3 border-y border-[#DCE7F1] dark:border-slate-800">
            <p className="data-type text-[12px] font-bold uppercase ink-muted">
              Extra blocks ({blocks.length})
            </p>
            <button
              type="button"
              onClick={() => setShowBlockLibrary(true)}
              className="inline-flex items-center gap-1 h-7 px-2 rounded-[3px] text-[12px] font-semibold text-[#E8231A] hover:bg-[#E8231A]/10 transition-colors"
            >
              <Plus size={12} />
              Add
            </button>
          </div>
          <nav className="flex-1 min-h-0 overflow-y-auto p-2 space-y-0.5" aria-label="Blocks">
            {blocks.length === 0 ? (
              <p className="px-2 py-6 text-[12px] ink-muted text-center leading-relaxed">
                {hasSchema
                  ? 'No extra blocks. This page does not need them.'
                  : 'No blocks yet. Click Add to start.'}
              </p>
            ) : (
              blocks.map((block, idx) => (
                <button
                  key={block.id}
                  type="button"
                  onClick={() =>
                    document
                      .getElementById(`block-${block.id}`)
                      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  }
                  className="w-full flex items-center gap-2 h-9 px-2.5 rounded-[4px] text-[12px] text-left ink-body hover:bg-[#EDF5FB] dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E8231A] transition-colors"
                >
                  <span className="data-type w-4 shrink-0 ink-muted text-[12px]">
                    {idx + 1}
                  </span>
                  <span className="shrink-0 text-[12px] font-semibold ink-muted uppercase">
                    {block.type}
                  </span>
                  <span className="truncate flex-1 ink-muted">
                    {block.title || block.subtitle || '—'}
                  </span>
                </button>
              ))
            )}
          </nav>
          <div className="shrink-0 px-3 py-2.5 border-t border-[#DCE7F1] dark:border-slate-800">
            <p className="text-[12px] leading-relaxed ink-muted">
              {hasSchema
                ? 'Edit this page in the Content tab on the right. The canvas shows the live page.'
                : 'Click any text on the canvas to edit it. Drag blocks to reorder.'}
            </p>
          </div>
        </>
      }
      inspector={
        <CanvasInspector
          slug={page.slug}
          title={page.title}
          excerpt={page.excerpt ?? ''}
          featuredImage={page.featuredImage ?? ''}
          metaTitle={page.metaTitle ?? ''}
          metaDescription={page.metaDescription ?? ''}
          published={page.published}
          content={content}
          schema={schema}
          jsonText={jsonText}
          jsonError={jsonError}
          canUseAdvanced={!!canUseAdvanced}
          tab={inspectorTab}
          onTabChange={setInspectorTab}
          onFieldChange={handlePageFieldChange}
          onContentChange={handleContentChange}
          onJsonChange={handleJsonChange}
        />
      }
    >
      {/* Title, summary and cover image are edited in the inspector's Publish
          tab; duplicating them on the canvas gave two places to change the same
          field. The canvas is only for blocks. */}
      <div>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            {blocks.map((block) => (
              <div id={`block-${block.id}`} key={block.id}>
                <BlockEditor block={block} onChange={updateBlock} onDelete={requestDeleteBlock} />
              </div>
            ))}
          </SortableContext>
        </DndContext>

        <button
          type="button"
          onClick={() => setShowBlockLibrary(true)}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-[4px] border-2 border-dashed border-[#C3D2E0] dark:border-slate-600 ink-muted hover:border-[#E8231A] hover:text-[#E8231A] hover:bg-[#E8231A]/[0.03] transition-colors text-sm font-medium mt-2"
        >
          <Plus size={16} />
          Add block
        </button>
      </div>

      {/* Block Library Modal */}
      {showBlockLibrary && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
          onClick={() => setShowBlockLibrary(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Choose a block type"
        >
          <div
            className="chart-paper rounded-[5px] shadow-2xl ring-1 ring-[#DCE7F1] dark:ring-slate-800 w-full max-w-lg h-[560px] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <BlockLibrary
              onSelect={(type) => handleAddBlock(type)}
              onClose={() => setShowBlockLibrary(false)}
            />
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-5 right-5 z-[110] flex items-center gap-3 pl-4 pr-3 py-3 rounded-[4px] shadow-lg text-sm font-medium ring-1 ${
            toast.type === 'success'
              ? 'bg-white text-emerald-800 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-800'
              : 'bg-white text-red-800 ring-red-200 dark:bg-red-950 dark:text-red-200 dark:ring-red-800'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle size={16} className="text-red-500 shrink-0" />
          )}
          {toast.msg}
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss notification"
            className="p-1 rounded-[3px] ink-muted hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <ConfirmModal
        isOpen={pendingDeleteBlock !== null}
        title="Delete this block?"
        message={
          pendingDeleteBlock
            ? `"${
                blocks.find((b) => b.id === pendingDeleteBlock)?.title ||
                blocks.find((b) => b.id === pendingDeleteBlock)?.type ||
                'This block'
              }" will be removed from the page. The removal takes effect when you save.`
            : ''
        }
        confirmLabel="Delete block"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmDeleteBlock}
        onCancel={() => setPendingDeleteBlock(null)}
      />
    </EditorShell>
  );
}
