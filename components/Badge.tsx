export default function Badge({ tone='default', children }:{tone?:'default'|'good'|'warn'|'muted', children: React.ReactNode}) {
  const styles = {
    default: 'border-slate-300 text-slate-700 bg-white/60',
    good: 'border-emerald-300 text-emerald-700 bg-emerald-50/80',
    warn: 'border-amber-300 text-amber-800 bg-amber-50/80',
    muted: 'border-slate-200 text-slate-500 bg-slate-50/80'
  } as const;
  return <span className={`badge ${styles[tone]}`}>{children}</span>;
}
