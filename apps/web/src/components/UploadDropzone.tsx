'use client';

import { useRef, useState, DragEvent, ChangeEvent } from 'react';
import type { Dictionary } from '@/lib/i18n';

interface Props {
  onFile: (file: File) => void;
  disabled?: boolean;
  dict: Dictionary;
}

const ACCEPTED_EXTENSIONS = ['.webp', '.gif', '.mp4', '.mov', '.webm'];
const ACCEPT_ATTR = '.webp,.gif,.mp4,.mov,.webm';

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  if (dot === -1) return '';
  return filename.slice(dot).toLowerCase();
}

export default function UploadDropzone({ onFile, disabled, dict }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function validateAndSubmit(file: File) {
    const ext = getExtension(file.name);
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setError(dict.dropzone.errorType.replace('{ext}', ext || file.name));
      return;
    }
    setError(null);
    onFile(file);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!disabled) setDragOver(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) validateAndSubmit(file);
  }

  function handleClick() {
    if (!disabled) inputRef.current?.click();
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) validateAndSubmit(file);
    e.target.value = '';
  }

  const borderColor = dragOver ? 'border-blue-400' : 'border-gray-700 hover:border-gray-500';

  return (
    <div className="flex flex-col gap-3">
      <div
        className={`
          relative flex flex-col items-center justify-center gap-3
          rounded-xl border-2 border-dashed p-12 text-center
          transition-colors cursor-pointer
          ${borderColor}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${dragOver ? 'bg-blue-950/30' : 'bg-gray-900'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
        aria-label="Upload file drop zone"
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
          className="hidden"
          onChange={handleChange}
          disabled={disabled}
          aria-hidden="true"
        />

        <div className="flex flex-col items-center gap-2">
          <svg className="h-10 w-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <div>
            <p className="text-lg font-medium text-gray-200">{dict.dropzone.title}</p>
            <p className="text-sm text-gray-400">{dict.dropzone.subtitle}</p>
          </div>
          <p className="text-xs text-gray-500">{dict.dropzone.supports}</p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-400 px-1" role="alert">{error}</p>
      )}
    </div>
  );
}
