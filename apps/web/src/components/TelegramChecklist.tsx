'use client';

interface ChecksProps {
  checks: {
    webm: boolean;
    vp9: boolean;
    noAudio: boolean;
    fpsOk: boolean;
    durationOk: boolean;
    sizeOk: boolean;
    dimensionsOk: boolean;
    allPassed: boolean;
  };
}

interface CheckRowProps {
  label: string;
  passed: boolean;
}

function CheckRow({ label, passed }: CheckRowProps) {
  return (
    <div className="flex items-center gap-3 py-2">
      {passed ? (
        <svg
          className="h-5 w-5 flex-shrink-0 text-green-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-label="Passed"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M4.5 12.75l6 6 9-13.5"
          />
        </svg>
      ) : (
        <svg
          className="h-5 w-5 flex-shrink-0 text-red-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-label="Failed"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      )}
      <span className={`text-sm ${passed ? 'text-gray-200' : 'text-red-300'}`}>
        {label}
      </span>
    </div>
  );
}

export default function TelegramChecklist({ checks }: ChecksProps) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          Telegram Compliance
        </h2>
        {checks.allPassed ? (
          <span className="text-xs font-medium text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
            All checks passed
          </span>
        ) : (
          <span className="text-xs font-medium text-red-400 bg-red-400/10 px-2 py-1 rounded-full">
            Some checks failed
          </span>
        )}
      </div>

      <div className="divide-y divide-gray-800">
        <CheckRow label="WebM container" passed={checks.webm} />
        <CheckRow label="VP9 codec" passed={checks.vp9} />
        <CheckRow label="No audio track" passed={checks.noAudio} />
        <CheckRow label="FPS \u2264 30" passed={checks.fpsOk} />
        <CheckRow label="Duration \u2264 3.0s" passed={checks.durationOk} />
        <CheckRow label="Size \u2264 256KB" passed={checks.sizeOk} />
        <CheckRow label="Dimensions (one side = 512px)" passed={checks.dimensionsOk} />
      </div>
    </div>
  );
}
