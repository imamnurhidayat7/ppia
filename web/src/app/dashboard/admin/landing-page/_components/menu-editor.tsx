'use client';

/**
 * Navigation menu editor (header and footer).
 *
 * Every change is sent to the server immediately: menus are used across every
 * public page, so there is no "draft" state that could be left unsaved.
 */

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import type { MenuConfig, MenuItem, MenuItemResponse } from '@/lib/api-types';
import { Badge, Button, Input, Modal, ModalFooter, Toggle } from '@/components/ui';
import {
  EmptyBlock,
  Field,
  IconAction,
  LoadingRows,
  SectionCard,
  StatTile,
  StatTileRow,
} from '@/components/dashboard';
import { useToast } from '@/components/Toast';
import { ConfirmHost, useConfirm } from '@/hooks/useConfirm';
import { cn } from '@/lib/utils';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Globe,
  Menu as MenuIcon,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';

type MenuLang = 'en' | 'id';

/** Shape of the admin menu endpoint response, so there is no `any` in the component. */
interface MenuListResponse {
  success: boolean;
  data?: MenuItemResponse[];
}

interface MenuMutationResponse {
  success: boolean;
  data?: MenuItemResponse;
}

const MENU_KEYS: { key: string; label: string; desc: string }[] = [
  {
    key: 'header_main',
    label: 'Header main menu',
    desc: 'Primary navigation at the top of the site.',
  },
  {
    key: 'footer_about',
    label: 'Footer: about',
    desc: 'About the organisation links in the footer.',
  },
  {
    key: 'footer_activities',
    label: 'Footer: activities',
    desc: 'Activity links in the footer.',
  },
  {
    key: 'footer_quicklinks',
    label: 'Footer: quick links',
    desc: 'Shortcut links in the footer.',
  },
];

const LANG_OPTIONS: { value: MenuLang; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'id', label: 'Indonesian' },
];

/**
 * Returns the array that holds the item at `path`.
 *
 * Used by every edit/delete/move operation so the menu tree traversal is
 * written only once, and returns null when the path is no longer valid (for
 * example the server data changed in another tab).
 */
function resolveSiblings(items: MenuItem[], path: number[]): MenuItem[] | null {
  let current = items;
  for (let index = 0; index < path.length - 1; index += 1) {
    const children = current[path[index]]?.children;
    if (!children) return null;
    current = children;
  }
  return current;
}

export default function MenuEditor() {
  const { showToast } = useToast();
  const confirmCtx = useConfirm();

  const [menus, setMenus] = useState<MenuItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeMenuKey, setActiveMenuKey] = useState('header_main');
  const [activeLang, setActiveLang] = useState<MenuLang>('en');
  const [editingItem, setEditingItem] = useState<{ path: number[]; item: MenuItem } | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  const loadMenus = useCallback(async () => {
    try {
      setLoading(true);
      const res = (await api.getMenuItemsAdmin()) as MenuListResponse;
      if (res.success) {
        setMenus(res.data || []);
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Could not load menus');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  /* eslint-disable react-hooks/set-state-in-effect --
     loadMenus() loads data once when the component mounts; state is only written
     after a network await, and the linter cannot see past that call. */
  useEffect(() => {
    loadMenus();
  }, [loadMenus]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const activeMenu = menus.find((menu) => menu.key === activeMenuKey);
  const activeMeta = MENU_KEYS.find((entry) => entry.key === activeMenuKey);
  const activeItems = activeMenu?.items?.[activeLang] ?? [];

  const toggleExpand = (pathKey: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(pathKey)) next.delete(pathKey);
      else next.add(pathKey);
      return next;
    });
  };

  const saveMenu = useCallback(
    async (menu: MenuItemResponse, newItems: MenuConfig, enabled: boolean, message: string) => {
      try {
        setSaving(true);
        const res = (await api.updateMenuItem(menu.key, {
          items: newItems,
          enabled,
        })) as MenuMutationResponse;
        if (res.success) {
          setMenus((prev) =>
            prev.map((entry) =>
              entry.key === menu.key ? { ...entry, items: newItems, enabled } : entry
            )
          );
          showToast('success', message);
        }
      } catch (err) {
        console.error(err);
        showToast('error', 'Could not update the menu');
      } finally {
        setSaving(false);
      }
    },
    [showToast]
  );

  const updateMenuItems = (lang: MenuLang, path: number[], newItem: MenuItem) => {
    if (!activeMenu) return;
    const items = structuredClone(activeMenu.items[lang] ?? []) as MenuItem[];
    const siblings = resolveSiblings(items, path);
    if (!siblings) return;
    siblings[path[path.length - 1]] = newItem;
    saveMenu(activeMenu, { ...activeMenu.items, [lang]: items }, activeMenu.enabled, 'Menu item saved');
  };

  const addItem = (lang: MenuLang, path: number[] | null) => {
    if (!activeMenu) return;
    const items = structuredClone(activeMenu.items[lang] ?? []) as MenuItem[];
    const newItem: MenuItem = { label: 'New item', href: '#', children: [] };
    if (path === null) {
      items.push(newItem);
    } else {
      // Descend to the target item, creating the children array if it does not
      // exist yet, so even an item without children can receive subitems.
      let current = items;
      for (let index = 0; index < path.length; index += 1) {
        const target = current[path[index]];
        if (!target) return;
        if (!target.children) target.children = [];
        current = target.children;
      }
      current.push(newItem);
      setExpandedPaths((prev) => new Set(prev).add(path.join('-')));
    }
    saveMenu(activeMenu, { ...activeMenu.items, [lang]: items }, activeMenu.enabled, 'Menu item added');
  };

  const deleteItem = async (lang: MenuLang, path: number[], item: MenuItem) => {
    if (!activeMenu) return;
    const ok = await confirmCtx.confirm({
      title: 'Delete menu item?',
      message: `"${item.label}" and its subitems will be removed from this menu.`,
      confirmLabel: 'Yes, delete',
      variant: 'danger',
    });
    if (!ok) return;
    const items = structuredClone(activeMenu.items[lang] ?? []) as MenuItem[];
    const siblings = resolveSiblings(items, path);
    if (!siblings) return;
    siblings.splice(path[path.length - 1], 1);
    saveMenu(activeMenu, { ...activeMenu.items, [lang]: items }, activeMenu.enabled, 'Menu item deleted');
  };

  const moveItem = (lang: MenuLang, path: number[], direction: 'up' | 'down') => {
    if (!activeMenu) return;
    const items = structuredClone(activeMenu.items[lang] ?? []) as MenuItem[];
    const siblings = resolveSiblings(items, path);
    if (!siblings) return;
    const index = path[path.length - 1];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= siblings.length) return;
    [siblings[index], siblings[swapIndex]] = [siblings[swapIndex], siblings[index]];
    saveMenu(activeMenu, { ...activeMenu.items, [lang]: items }, activeMenu.enabled, 'Menu order updated');
  };

  const toggleMenuEnabled = () => {
    if (!activeMenu) return;
    saveMenu(
      activeMenu,
      activeMenu.items,
      !activeMenu.enabled,
      activeMenu.enabled ? 'Menu disabled' : 'Menu enabled'
    );
  };

  const renderMenuItem = (
    item: MenuItem,
    path: number[],
    lang: MenuLang,
    siblingCount: number,
    depth = 0
  ) => {
    const pathKey = path.join('-');
    const children = item.children ?? [];
    const hasChildren = children.length > 0;
    const isExpanded = expandedPaths.has(pathKey);
    const index = path[path.length - 1];

    return (
      <li
        key={pathKey}
        className={cn(depth > 0 && 'ml-4 border-l border-slate-200 pl-3 dark:border-slate-800')}
      >
        <div className="flex items-center gap-2 rounded-xl px-2 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60">
          {hasChildren ? (
            <button
              type="button"
              onClick={() => toggleExpand(pathKey)}
              aria-expanded={isExpanded}
              aria-label={
                isExpanded ? `Collapse subitems of ${item.label}` : `Expand subitems of ${item.label}`
              }
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <span className="h-7 w-7 shrink-0" aria-hidden="true" />
          )}

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                {item.label}
              </span>
              {hasChildren && (
                <Badge variant="outline">{children.length} subitems</Badge>
              )}
            </div>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {item.href || 'No link'}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            <IconAction
              icon={ArrowUp}
              label={`Move up ${item.label}`}
              onClick={() => moveItem(lang, path, 'up')}
              disabled={saving || index === 0}
            />
            <IconAction
              icon={ArrowDown}
              label={`Move down ${item.label}`}
              onClick={() => moveItem(lang, path, 'down')}
              disabled={saving || index === siblingCount - 1}
            />
            <IconAction
              icon={Plus}
              label={`Add subitem to ${item.label}`}
              onClick={() => addItem(lang, path)}
              disabled={saving}
            />
            <IconAction
              icon={Pencil}
              label={`Edit ${item.label}`}
              onClick={() => setEditingItem({ path, item })}
              disabled={saving}
            />
            <IconAction
              icon={Trash2}
              label={`Delete ${item.label}`}
              tone="danger"
              onClick={() => deleteItem(lang, path, item)}
              disabled={saving}
            />
          </div>
        </div>

        {hasChildren && isExpanded && (
          <ul className="mt-1 space-y-1">
            {children.map((child, childIndex) =>
              renderMenuItem(child, [...path, childIndex], lang, children.length, depth + 1)
            )}
          </ul>
        )}
      </li>
    );
  };

  if (loading) {
    return (
      <SectionCard title="Navigation menu" description="Loading menu data…" icon={MenuIcon}>
        <LoadingRows rows={5} />
      </SectionCard>
    );
  }

  return (
    <div className="space-y-5">
      <StatTileRow columns={4}>
        {MENU_KEYS.map((entry) => {
          const menu = menus.find((item) => item.key === entry.key);
          return (
            <StatTile
              key={entry.key}
              label={entry.label}
              value={menu?.items?.[activeLang]?.length ?? 0}
              tone="red"
              hint={menu?.enabled === false ? 'Disabled' : 'Enabled'}
              active={activeMenuKey === entry.key}
              onClick={() => setActiveMenuKey(entry.key)}
            />
          );
        })}
      </StatTileRow>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Language</span>
          <div className="flex gap-1.5" role="group" aria-label="Select menu language">
            {LANG_OPTIONS.map((option) => (
              <Button
                key={option.value}
                size="sm"
                variant={activeLang === option.value ? 'primary' : 'secondary'}
                aria-pressed={activeLang === option.value}
                onClick={() => setActiveLang(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
        {saving && (
          <span className="text-xs text-slate-500 dark:text-slate-400">Saving…</span>
        )}
      </div>

      <SectionCard
        title={activeMeta?.label ?? activeMenuKey}
        description={activeMeta?.desc}
        icon={MenuIcon}
        action={
          activeMenu && (
            <>
              <Toggle
                id="menu-enabled"
                label="Show menu"
                checked={activeMenu.enabled}
                onChange={toggleMenuEnabled}
                disabled={saving}
              />
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => addItem(activeLang, null)}
                disabled={saving}
              >
                New item
              </Button>
            </>
          )
        }
        flush={activeItems.length === 0}
      >
        {!activeMenu ? (
          <EmptyBlock
            icon={MenuIcon}
            title="Menu not available yet"
            description="This menu data does not exist on the server yet. Refresh the page or run the menu data seed."
          />
        ) : activeItems.length === 0 ? (
          <EmptyBlock
            icon={MenuIcon}
            title="No menu items yet"
            description={`Add the first item for the ${
              activeLang === 'en' ? 'English version' : 'Indonesian version'
            } of this menu.`}
            action={
              <Button
                variant="primary"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => addItem(activeLang, null)}
                disabled={saving}
              >
                New item
              </Button>
            }
          />
        ) : (
          <ul className="space-y-1">
            {activeItems.map((item, index) =>
              renderMenuItem(item, [index], activeLang, activeItems.length)
            )}
          </ul>
        )}
      </SectionCard>

      {editingItem && (
        <Modal
          isOpen
          onClose={() => setEditingItem(null)}
          title="Edit menu item"
          description={
            activeLang === 'en' ? 'English version' : 'Indonesian version'
          }
          size="lg"
        >
          <div className="space-y-4">
            <Field
              label="Label"
              htmlFor="menu-item-label"
              hint="The text shown in the navigation."
            >
              <Input
                id="menu-item-label"
                value={editingItem.item.label}
                onChange={(event) =>
                  setEditingItem({
                    ...editingItem,
                    item: { ...editingItem.item, label: event.target.value },
                  })
                }
                placeholder="For example: About us"
              />
            </Field>
            <Field
              label="Link"
              htmlFor="menu-item-href"
              hint="For example: /about or https://another-site.org."
            >
              <Input
                id="menu-item-href"
                value={editingItem.item.href || ''}
                onChange={(event) =>
                  setEditingItem({
                    ...editingItem,
                    item: { ...editingItem.item, href: event.target.value },
                  })
                }
                placeholder="/about"
              />
            </Field>

            <ModalFooter>
              <Button variant="secondary" onClick={() => setEditingItem(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                isLoading={saving}
                onClick={() => {
                  updateMenuItems(activeLang, editingItem.path, editingItem.item);
                  setEditingItem(null);
                }}
              >
                Save item
              </Button>
            </ModalFooter>
          </div>
        </Modal>
      )}

      <ConfirmHost ctx={confirmCtx} />
    </div>
  );
}
