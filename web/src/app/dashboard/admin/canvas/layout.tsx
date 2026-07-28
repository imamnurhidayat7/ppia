'use client';

import { EditableCanvasProvider } from '@/lib/editable-canvas-context';

export default function CanvasLayout({ children }: { children: React.ReactNode }) {
  return (
    <EditableCanvasProvider>
      {children}
    </EditableCanvasProvider>
  );
}
