'use client';

import type { Dictionary } from '@/lib/i18n';

interface Props {
  status: 'uploading' | 'queued' | 'processing' | 'done' | 'failed';
  error?: string;
  dict: Dictionary;
}

type StepStatus = Props['status'];

interface Step {
  labelKey: keyof Dictionary['status'];
  statuses: StepStatus[];
}

const STEPS: Step[] = [
  { labelKey: 'uploading', statuses: ['uploading'] },
  { labelKey: 'queued', statuses: ['queued'] },
  { labelKey: 'encoding', statuses: ['processing'] },
  { labelKey: 'ready', statuses: ['done', 'failed'] },
];

function getStepState(step: Step, currentStatus: StepStatus): 'done' | 'active' | 'pending' {
  const statusOrder: StepStatus[] = ['uploading', 'queued', 'processing', 'done', 'failed'];
  const currentIndex = statusOrder.indexOf(currentStatus);
  const stepIndex = Math.min(...step.statuses.map((s) => statusOrder.indexOf(s)));
  if (currentIndex > stepIndex) return 'done';
  if (step.statuses.includes(currentStatus)) return 'active';
  return 'pending';
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin text-blue-400" fill="none" viewBox="0 0 24 24" aria-label="Loading">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function StatusCard({ status, error, dict }: Props) {
  const isFailed = status === 'failed';

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-6">
        {isFailed ? dict.status.conversionFailed : dict.status.converting}
      </h2>

      <div className="flex items-center gap-0">
        {STEPS.map((step, i) => {
          const state = getStepState(step, status);
          const isLast = i === STEPS.length - 1;
          const isFailedStep = isFailed && step.statuses.includes('failed');
          const label = isFailedStep ? dict.status.failedLabel : dict.status[step.labelKey] as string;

          return (
            <div key={step.labelKey} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-2">
                <div className={`
                  flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors
                  ${state === 'done' ? 'border-green-500 bg-green-500'
                    : state === 'active'
                      ? isFailedStep ? 'border-red-500 bg-red-500' : 'border-blue-400 bg-blue-400/10'
                      : 'border-gray-700 bg-gray-800'}
                `}>
                  {state === 'done' ? (
                    <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : state === 'active' ? (
                    isFailedStep ? (
                      <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : <Spinner />
                  ) : (
                    <span className="text-xs text-gray-500 font-medium">{i + 1}</span>
                  )}
                </div>
                <span className={`text-xs font-medium whitespace-nowrap ${
                  state === 'done' ? 'text-green-400'
                    : state === 'active' ? isFailedStep ? 'text-red-400' : 'text-blue-400'
                    : 'text-gray-500'
                }`}>{label}</span>
              </div>

              {!isLast && (
                <div className={`h-0.5 flex-1 mx-2 mb-5 transition-colors ${
                  getStepState(STEPS[i + 1]!, status) !== 'pending' || state === 'done'
                    ? 'bg-green-500' : 'bg-gray-700'
                }`} />
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-400 bg-red-400/10 rounded-lg px-4 py-3" role="alert">{error}</p>
      )}
    </div>
  );
}
