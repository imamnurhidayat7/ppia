'use client';
import { sanitizeHtml } from '@/lib/sanitize-html';
import { API_ORIGIN } from '@/lib/api-base';

import * as React from 'react';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Quote,
  Image as ImageIcon,
  Minus,
  Undo,
  Redo,
  Strikethrough,
  Link,
  Link2Off,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Code,
  RemoveFormatting,
} from 'lucide-react';

interface ArticleEditorProps {
  value?: string;
  onChange?: (content: string) => void;
  label?: string;
  placeholder?: string;
}

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, active, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-2 rounded transition-colors ${
        active ? 'bg-[#E8231A]/10 text-[#E8231A]' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-200'
      }`}
      title={title}
    >
      {children}
    </button>
  );
}

const API_URL = API_ORIGIN;

export function ArticleEditor({
  value,
  onChange,
  label,
  placeholder = 'Write your article here...',
}: ArticleEditorProps) {
  const editorRef = React.useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = React.useState(false);
  const [activeFormats, setActiveFormats] = React.useState<Set<string>>(new Set());
  const [wordCount, setWordCount] = React.useState(0);
  const [charCount, setCharCount] = React.useState(0);

  React.useEffect(() => {
    if (editorRef.current && value) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value;
      }
    }
  }, []);

  const updateCounts = () => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText || '';
    const trimmed = text.trim();
    setCharCount(trimmed.length);
    setWordCount(trimmed ? trimmed.split(/\s+/).length : 0);
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange?.(editorRef.current.innerHTML);
      updateCounts();
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
    checkActiveFormats();
  };

  const checkActiveFormats = () => {
    const formats = new Set<string>();
    if (document.queryCommandState('bold')) formats.add('bold');
    if (document.queryCommandState('italic')) formats.add('italic');
    if (document.queryCommandState('underline')) formats.add('underline');
    if (document.queryCommandState('strikeThrough')) formats.add('strikeThrough');
    if (document.queryCommandValue('formatBlock') === 'h1') formats.add('h1');
    if (document.queryCommandValue('formatBlock') === 'h2') formats.add('h2');
    if (document.queryCommandState('insertUnorderedList')) formats.add('ul');
    if (document.queryCommandState('insertOrderedList')) formats.add('ol');
    if (document.queryCommandState('justifyLeft')) formats.add('justifyLeft');
    if (document.queryCommandState('justifyCenter')) formats.add('justifyCenter');
    if (document.queryCommandState('justifyRight')) formats.add('justifyRight');
    setActiveFormats(formats);
  };

  React.useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleMouseUp = () => {
      checkActiveFormats();
      updateCounts();
    };
    const handleKeyUp = () => {
      checkActiveFormats();
      updateCounts();
    };

    editor.addEventListener('mouseup', handleMouseUp);
    editor.addEventListener('keyup', handleKeyUp);

    return () => {
      editor.removeEventListener('mouseup', handleMouseUp);
      editor.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      execCommand('bold');
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault();
      execCommand('italic');
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
      e.preventDefault();
      execCommand('underline');
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      execCommand('undo');
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
      e.preventDefault();
      execCommand('redo');
    }
  };

  const handleImageUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      // Try to upload to server
      try {
        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_URL}/api/upload`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          const img = `<img src="${data.url}" alt="uploaded image" class="max-w-full h-auto rounded-lg my-4" />`;
          editorRef.current?.focus();
          document.execCommand('insertHTML', false, img);
          handleInput();
          return;
        }
      } catch {
        // Fallback: use data URL
      }

      // Fallback
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = document.createElement('img');
        img.src = event.target?.result as string;
        img.className = 'max-w-full h-auto rounded-lg my-4';
        editorRef.current?.focus();
        document.execCommand('insertHTML', false, img.outerHTML);
        handleInput();
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleAddLink = () => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();

    if (!selectedText) {
      // If no text selected, insert a link placeholder
      const url = prompt('Enter URL:', 'https://');
      if (!url) return;
      execCommand('insertHTML', `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
      return;
    }

    const url = prompt('Enter URL for selected text:', 'https://');
    if (!url) return;

    const link = `<a href="${url}" target="_blank" rel="noopener noreferrer">${selectedText}</a>`;
    execCommand('insertHTML', link);
  };

  const handleRemoveLink = () => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    const node = sel.anchorNode?.parentElement;
    if (node?.tagName === 'A' || node?.closest('a')) {
      const link = node.tagName === 'A' ? node : node.closest('a');
      if (link) {
        const parent = link.parentNode;
        while (link.firstChild) {
          parent?.insertBefore(link.firstChild, link);
        }
        parent?.removeChild(link);
        handleInput();
      }
    }
  };

  const handleInsertCodeBlock = () => {
    execCommand('insertHTML', '<pre class="bg-gray-900 text-gray-100 rounded-xl p-4 my-4 overflow-x-auto text-sm font-mono"><code>Your code here...</code></pre>');
  };

  const handleClearFormatting = () => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    if (sel.isCollapsed) return;

    // Remove all inline formatting by replacing with clean HTML
    const range = sel.getRangeAt(0);
    const fragment = range.extractContents();
    const span = document.createElement('span');
    span.innerHTML = fragment.textContent || '';
    range.insertNode(span);
    sel.removeAllRanges();
    sel.addRange(range);
    handleInput();
  };

  const isActive = (format: string) => activeFormats.has(format);

  return (
    <div>
      {label && (
        <label className="block text-sm font-semibold text-[#1A2B4A] mb-2">
          {label}
        </label>
      )}
      <div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-0.5 p-1.5 border-b border-gray-100 bg-gray-50 dark:bg-slate-900/50/50">
          {/* Text Style */}
          <div className="flex items-center gap-0.5 pr-1.5 border-r border-gray-200 dark:border-slate-700">
            <ToolbarButton onClick={() => execCommand('bold')} active={isActive('bold')} title="Bold (Ctrl+B)">
              <Bold size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => execCommand('italic')} active={isActive('italic')} title="Italic (Ctrl+I)">
              <Italic size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => execCommand('underline')} active={isActive('underline')} title="Underline (Ctrl+U)">
              <Underline size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => execCommand('strikeThrough')} active={isActive('strikeThrough')} title="Strikethrough">
              <Strikethrough size={16} />
            </ToolbarButton>
          </div>

          {/* Headings */}
          <div className="flex items-center gap-0.5 pr-1.5 border-r border-gray-200 dark:border-slate-700">
            <ToolbarButton onClick={() => addBlock('h1')} active={isActive('h1')} title="Heading 1">
              <Heading1 size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => addBlock('h2')} active={isActive('h2')} title="Heading 2">
              <Heading2 size={16} />
            </ToolbarButton>
          </div>

          {/* Lists */}
          <div className="flex items-center gap-0.5 pr-1.5 border-r border-gray-200 dark:border-slate-700">
            <ToolbarButton onClick={() => addBlock('ul')} active={isActive('ul')} title="Bullet List">
              <List size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => addBlock('ol')} active={isActive('ol')} title="Numbered List">
              <ListOrdered size={16} />
            </ToolbarButton>
          </div>

          {/* Alignment */}
          <div className="flex items-center gap-0.5 pr-1.5 border-r border-gray-200 dark:border-slate-700">
            <ToolbarButton onClick={() => addAlignment('left')} active={isActive('justifyLeft')} title="Align Left">
              <AlignLeft size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => addAlignment('center')} active={isActive('justifyCenter')} title="Align Center">
              <AlignCenter size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => addAlignment('right')} active={isActive('justifyRight')} title="Align Right">
              <AlignRight size={16} />
            </ToolbarButton>
          </div>

          {/* Blocks */}
          <div className="flex items-center gap-0.5 pr-1.5 border-r border-gray-200 dark:border-slate-700">
            <ToolbarButton onClick={() => addBlock('quote')} title="Quote">
              <Quote size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => addBlock('divider')} title="Divider">
              <Minus size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={handleInsertCodeBlock} title="Code Block">
              <Code size={16} />
            </ToolbarButton>
          </div>

          {/* Links & Image */}
          <div className="flex items-center gap-0.5 pr-1.5 border-r border-gray-200 dark:border-slate-700">
            <ToolbarButton onClick={handleAddLink} title="Insert Link">
              <Link size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={handleRemoveLink} title="Remove Link">
              <Link2Off size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={handleImageUpload} title="Add Image">
              <ImageIcon size={16} />
            </ToolbarButton>
          </div>

          {/* Misc */}
          <div className="flex items-center gap-0.5 pr-1.5 border-r border-gray-200 dark:border-slate-700">
            <ToolbarButton onClick={handleClearFormatting} title="Clear Formatting">
              <RemoveFormatting size={16} />
            </ToolbarButton>
          </div>

          {/* Undo/Redo */}
          <div className="flex items-center gap-0.5 ml-auto">
            <ToolbarButton onClick={() => execCommand('undo')} title="Undo (Ctrl+Z)">
              <Undo size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => execCommand('redo')} title="Redo (Ctrl+Y)">
              <Redo size={16} />
            </ToolbarButton>
          </div>
        </div>

        {/* Editor Area */}
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          className={`p-6 min-h-[400px] focus:outline-none prose prose-sm max-w-none ${
            isFocused ? 'ring-2 ring-[#E8231A]/20' : ''
          }`}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(value || '') }}
          data-placeholder={placeholder}
          style={{
            fontFamily: 'var(--font-inter), Inter, sans-serif',
          }}
        />

        {/* Word/Char Count */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 bg-gray-50 dark:bg-slate-900/50/50 text-xs text-gray-400 dark:text-slate-500">
          <span>{charCount} characters</span>
          <span>{wordCount} words</span>
        </div>

        {/* Placeholder styles */}
        <style jsx global>{`
          [contenteditable]:empty:before {
            content: attr(data-placeholder);
            color: #9ca3af;
            pointer-events: none;
          }
          [contenteditable] h1 {
            font-size: 2rem;
            font-weight: 700;
            color: #1A2B4A;
            margin-top: 1.5rem;
            margin-bottom: 1rem;
          }
          [contenteditable] h2 {
            font-size: 1.5rem;
            font-weight: 700;
            color: #1A2B4A;
            margin-top: 1.25rem;
            margin-bottom: 0.75rem;
          }
          [contenteditable] h3 {
            font-size: 1.25rem;
            font-weight: 600;
            color: #1A2B4A;
            margin-top: 1rem;
            margin-bottom: 0.5rem;
          }
          [contenteditable] p {
            margin-bottom: 1rem;
            line-height: 1.75;
          }
          [contenteditable] ul, [contenteditable] ol {
            margin: 1rem 0;
            padding-left: 1.5rem;
          }
          [contenteditable] li {
            margin-bottom: 0.5rem;
          }
          [contenteditable] img {
            max-width: 100%;
            border-radius: 0.5rem;
            margin: 1rem 0;
          }
          [contenteditable] blockquote {
            border-left: 4px solid #E8231A;
            padding-left: 1rem;
            margin: 1.5rem 0;
            font-style: italic;
            color: #4b5563;
            background: #f9fafb;
            padding: 1rem;
            border-radius: 0 0.5rem 0.5rem 0;
          }
          [contenteditable] hr {
            border: none;
            border-top: 1px solid #e5e7eb;
            margin: 2rem 0;
          }
          [contenteditable] a {
            color: #E8231A;
            text-decoration: underline;
          }
          [contenteditable] pre {
            background: #111827;
            color: #f3f4f6;
            border-radius: 0.75rem;
            padding: 1rem;
            margin: 1rem 0;
            overflow-x: auto;
            font-size: 0.875rem;
            font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
          }
          [contenteditable] code {
            font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
            font-size: 0.875em;
          }
          [contenteditable] p > code {
            background: #f1f5f9;
            padding: 0.125rem 0.375rem;
            border-radius: 0.25rem;
            color: #E8231A;
          }
          [contenteditable] .text-left { text-align: left; }
          [contenteditable] .text-center { text-align: center; }
          [contenteditable] .text-right { text-align: right; }
        `}</style>
      </div>
    </div>
  );

  function addBlock(type: string) {
    const blocks: Record<string, string> = {
      h1: '<h1 class="text-3xl font-bold text-[#1A2B4A] my-6">Heading 1</h1>',
      h2: '<h2 class="text-2xl font-bold text-[#1A2B4A] my-5">Heading 2</h2>',
      quote: '<blockquote class="border-l-4 border-[#E8231A] pl-4 my-6 italic text-gray-600 dark:text-slate-400 bg-gray-50 dark:bg-slate-900/50 py-4 rounded-r-lg">Your quote here...</blockquote>',
      divider: '<hr class="my-8 border-gray-200 dark:border-slate-700" />',
      ul: '<ul class="list-disc pl-5 my-4 space-y-2 text-gray-700 dark:text-slate-300"><li>List item</li><li>List item</li></ul>',
      ol: '<ol class="list-decimal pl-5 my-4 space-y-2 text-gray-700 dark:text-slate-300"><li>List item</li><li>List item</li></ol>',
    };

    if (blocks[type]) {
      execCommand('insertHTML', blocks[type]);
    }
  }

  function addAlignment(align: string) {
    document.execCommand(`justify${align.charAt(0).toUpperCase() + align.slice(1)}`);
    editorRef.current?.focus();
    handleInput();
    checkActiveFormats();
  }
}
