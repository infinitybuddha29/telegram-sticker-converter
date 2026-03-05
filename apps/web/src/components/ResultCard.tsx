'use client';

import type { Dictionary } from '@/lib/i18n';

interface OutputMeta {
  codec: string;
  width: number;
  height: number;
  durationSec: number;
  fps: number;
  fileSizeBytes: number;
  hasAlpha: boolean;
}

interface ChecksShape {
  webm: boolean;
  vp9: boolean;
  noAudio: boolean;
  fpsOk: boolean;
  durationOk: boolean;
  sizeOk: boolean;
  dimensionsOk: boolean;
  allPassed: boolean;
}

interface Props {
  jobId: string;
  output: OutputMeta;
  checks: ChecksShape;
  onReset: () => void;
  dict: Dictionary;
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs uppercase tracking-wider text-gray-500">{label}</dt>
      <dd className="text-sm font-medium text-gray-200">{value}</dd>
    </div>
  );
}

export default function ResultCard({ jobId, output, checks, onReset, dict }: Props) {
  const r = dict.result;
  const fileSizeKb = (output.fileSizeBytes / 1024).toFixed(1);
  const downloadUrl = `/api/jobs/${jobId}/download`;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          {r.title}
        </h2>
        {checks.allPassed && (
          <span className="text-xs font-medium text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
            {r.telegramReady}
          </span>
        )}
      </div>

      {/* Download button */}
      <a
        href={downloadUrl}
        download
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
          />
        </svg>
        {r.download}
      </a>

      {/* Stats */}
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 border-t border-gray-800 pt-4">
        <StatItem label={r.fileSize} value={`${fileSizeKb} KB`} />
        <StatItem label={r.dimensions} value={`${output.width}\u00d7${output.height}px`} />
        <StatItem label={r.duration} value={`${output.durationSec.toFixed(2)}s`} />
        <StatItem label={r.fps} value={`${output.fps} fps`} />
        <StatItem label={r.codec} value={output.codec.toUpperCase()} />
        <StatItem label={r.alpha} value={output.hasAlpha ? r.alphaYes : r.alphaNo} />
      </dl>

      {/* Reset */}
      <button
        type="button"
        onClick={onReset}
        className="w-full rounded-lg border border-gray-700 px-6 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:border-gray-500 hover:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900"
      >
        {r.convertAnother}
      </button>
    </div>
  );
}
