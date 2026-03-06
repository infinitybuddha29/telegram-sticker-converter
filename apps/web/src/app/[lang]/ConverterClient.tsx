'use client';

import { useRef, useState } from 'react';
import type { JobResponse } from '@sticker/core';
import type { Dictionary } from '@/lib/i18n';
import UploadDropzone from '@/components/UploadDropzone';
import StatusCard from '@/components/StatusCard';
import TelegramChecklist from '@/components/TelegramChecklist';
import ResultCard from '@/components/ResultCard';

type AppState =
  | { phase: 'idle' }
  | { phase: 'uploading' }
  | { phase: 'polling'; jobId: string; status: 'queued' | 'processing' }
  | { phase: 'done'; jobId: string; job: JobResponse }
  | { phase: 'error'; message: string };

interface Props {
  dict: Dictionary;
}

export default function ConverterClient({ dict }: Props) {
  const [appState, setAppState] = useState<AppState>({ phase: 'idle' });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function clearPolling() {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function startPolling(jobId: string) {
    clearPolling();
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        const job: JobResponse = await res.json();

        if (job.status === 'done') {
          clearInterval(interval);
          intervalRef.current = null;
          setAppState({ phase: 'done', jobId, job });
        } else if (job.status === 'failed') {
          clearInterval(interval);
          intervalRef.current = null;
          setAppState({
            phase: 'error',
            message: job.error?.message ?? dict.error.title,
          });
        } else {
          setAppState({
            phase: 'polling',
            jobId,
            status: job.status as 'queued' | 'processing',
          });
        }
      } catch (err) {
        clearInterval(interval);
        intervalRef.current = null;
        const detail = err instanceof Error ? err.message : String(err);
        setAppState({
          phase: 'error',
          message: `${dict.error.lostConnection}: ${detail}`,
        });
      }
    }, 1000);
    intervalRef.current = interval;
  }

  async function handleFile(file: File) {
    clearPolling();
    setAppState({ phase: 'uploading' });

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/jobs', { method: 'POST', body: formData });
      if (!res.ok) {
        let message = `${dict.error.uploadFailed} (HTTP ${res.status})`;
        try {
          const data = await res.json();
          if (data.error?.message) message = data.error.message;
        } catch {
          // non-JSON response — use status code message
        }
        setAppState({ phase: 'error', message });
        return;
      }

      const { jobId } = await res.json();
      setAppState({ phase: 'polling', jobId, status: 'queued' });
      startPolling(jobId);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      setAppState({
        phase: 'error',
        message: `${dict.error.uploadFailed}: ${detail}`,
      });
    }
  }

  function handleReset() {
    clearPolling();
    setAppState({ phase: 'idle' });
  }

  const { phase } = appState;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-100 leading-tight">
              {dict.header.title}
            </h1>
            <p className="text-xs text-gray-400 hidden sm:block">
              {dict.header.subtitle}
            </p>
          </div>
          <a
            href="https://core.telegram.org/stickers"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex-shrink-0"
          >
            {dict.header.requirements}&nbsp;&uarr;&#xFE0E;
          </a>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10 flex flex-col gap-6">
        <div className="text-center sm:text-left">
          <p className="text-gray-400 sm:hidden text-sm">
            {dict.header.subtitle}
          </p>
        </div>

        {(phase === 'idle' || phase === 'uploading') && (
          <UploadDropzone
            onFile={handleFile}
            disabled={phase === 'uploading'}
            dict={dict}
          />
        )}

        {phase === 'uploading' && (
          <StatusCard status="uploading" dict={dict} />
        )}

        {phase === 'polling' && (
          <StatusCard status={appState.status} dict={dict} />
        )}

        {phase === 'done' && appState.job.checks && appState.job.output && (
          <>
            <TelegramChecklist checks={appState.job.checks} dict={dict} />
            <ResultCard
              jobId={appState.jobId}
              output={appState.job.output}
              checks={appState.job.checks}
              onReset={handleReset}
              dict={dict}
            />
          </>
        )}

        {phase === 'error' && (
          <div className="bg-gray-900 border border-red-800 rounded-xl p-6 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <svg
                className="h-5 w-5 flex-shrink-0 text-red-400 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
              <div>
                <p className="text-sm font-semibold text-red-400">{dict.error.title}</p>
                <p className="text-sm text-gray-300 mt-1">{appState.message}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="w-full rounded-lg bg-gray-800 px-6 py-2.5 text-sm font-medium text-gray-200 transition-colors hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900"
            >
              {dict.error.tryAgain}
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-6">
        <p className="text-center text-xs text-gray-500">
          {dict.footer}
        </p>
      </footer>
    </div>
  );
}
