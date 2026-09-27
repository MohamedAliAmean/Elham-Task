export interface Toast {
  id: number;
  kind: 'success' | 'error' | 'info';
  text: string;
}

const STYLES: Record<Toast['kind'], string> = {
  success: 'bg-emerald-600',
  error: 'bg-red-600',
  info: 'bg-slate-800',
};

export function Toasts({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-50 flex w-80 flex-col gap-2" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`rounded-lg px-4 py-3 text-sm text-white shadow-lg ${STYLES[t.kind]}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}
