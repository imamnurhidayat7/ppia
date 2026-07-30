'use client';

import * as React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Image from '@tiptap/extension-image';
import { useToast } from '@/components/Toast';
import { API_ORIGIN } from '@/lib/api-base';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link as LinkIcon,
  Image as ImageIcon,
  Loader2,
  Undo,
  Redo,
  Quote,
  Heading1,
  Heading2,
  Code,
  Minus,
} from 'lucide-react';

interface RichTextEditorProps {
  value?: string;
  onChange?: (content: string) => void;
  label?: string;
  placeholder?: string;
}

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title: string;
}

function ToolbarButton({ onClick, active, disabled, children, title }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-2 rounded-lg transition-colors ${
        active
          ? 'bg-[#E8231A] text-white'
          : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:bg-slate-800 disabled:opacity-50'
      }`}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({ value, onChange, label, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        link: false,
        underline: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-[#E8231A] underline hover:text-[#C41E16]',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TextStyle,
      Color,
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: { class: 'rounded-lg max-w-full h-auto' },
      }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] px-4 py-3',
      },
    },
  });

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const { showSuccess, showError } = useToast();

  const handleImageUpload = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showError('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showError('Image must be under 5MB');
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(`${API_ORIGIN}/api/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || `Upload failed (${res.status})`);
      }
      const data = await res.json();
      const url = data.url?.startsWith('http') ? data.url : `${API_ORIGIN}${data.url}`;
      editor.chain().focus().setImage({ src: url, alt: file.name }).run();
      showSuccess('Image inserted');
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to upload image');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!editor) {
    return (
      <div>
        {label && (
          <label className="block text-sm font-semibold text-[#1A2B4A] mb-2">
            {label}
          </label>
        )}
        <div className="h-[200px] rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 animate-pulse" />
      </div>
    );
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div>
      {label && (
        <label className="block text-sm font-semibold text-[#1A2B4A] mb-2">
          {label}
        </label>
      )}
      <div className="rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-100 bg-gray-50 dark:bg-slate-900/50">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            title="Bold"
          >
            <Bold size={16} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            title="Italic"
          >
            <Italic size={16} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive('underline')}
            title="Underline"
          >
            <UnderlineIcon size={16} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive('strike')}
            title="Strikethrough"
          >
            <Strikethrough size={16} />
          </ToolbarButton>

          <div className="w-px h-6 bg-gray-200 mx-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive('heading', { level: 1 })}
            title="Heading 1"
          >
            <Heading1 size={16} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive('heading', { level: 2 })}
            title="Heading 2"
          >
            <Heading2 size={16} />
          </ToolbarButton>

          <div className="w-px h-6 bg-gray-200 mx-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            title="Bullet List"
          >
            <List size={16} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            title="Numbered List"
          >
            <ListOrdered size={16} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive('blockquote')}
            title="Quote"
          >
            <Quote size={16} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            active={editor.isActive('code')}
            title="Inline Code"
          >
            <Code size={16} />
          </ToolbarButton>

          <div className="w-px h-6 bg-gray-200 mx-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            active={editor.isActive({ textAlign: 'left' })}
            title="Align Left"
          >
            <AlignLeft size={16} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            active={editor.isActive({ textAlign: 'center' })}
            title="Align Center"
          >
            <AlignCenter size={16} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            active={editor.isActive({ textAlign: 'right' })}
            title="Align Right"
          >
            <AlignRight size={16} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            active={editor.isActive({ textAlign: 'justify' })}
            title="Justify"
          >
            <AlignJustify size={16} />
          </ToolbarButton>

          <div className="w-px h-6 bg-gray-200 mx-1" />

          <ToolbarButton
            onClick={setLink}
            active={editor.isActive('link')}
            title="Add Link"
          >
            <LinkIcon size={16} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            title="Insert Image"
          >
            {isUploading ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
          </ToolbarButton>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageUpload(file);
            }}
          />

          <div className="w-px h-6 bg-gray-200 mx-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Horizontal Line"
          >
            <Minus size={16} />
          </ToolbarButton>

          <div className="flex-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo"
          >
            <Undo size={16} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo"
          >
            <Redo size={16} />
          </ToolbarButton>
        </div>

        {/* Editor Content */}
        <EditorContent
          editor={editor}
          className="px-4 py-3 min-h-[200px] max-h-[400px] overflow-y-auto"
        />
      </div>
      {placeholder && !value && (
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">{placeholder}</p>
      )}
    </div>
  );
}
