function formatTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1000)}K`;
  return `${n}`;
}

export function ContextGauge({ used, max }: { used: number; max: number }) {
  const pct = Math.min(1, max ? used / max : 0);

  return (
    <div className="flex items-center gap-3 border-2 border-line bg-surface px-3 py-1.5 shadow-hard-sm" title="Context window in use">
      <div className="h-3 w-20 border-2 border-line bg-base md:w-32">
        <div className="h-full bg-accent" style={{ width: `${Math.max(pct * 100, used > 0 ? 2 : 0)}%` }} />
      </div>
      <span className="font-mono text-[11px] font-bold uppercase text-ink">
        {formatTokens(used)} <span className="text-muted">/</span> {formatTokens(max)}
      </span>
    </div>
  );
}
