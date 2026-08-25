const ARC_LENGTH = Math.PI * 50;

function formatTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1000)}K`;
  return `${n}`;
}

export function ContextGauge({ used, max }: { used: number; max: number }) {
  const pct = Math.min(1, max ? used / max : 0);
  const offset = ARC_LENGTH * (1 - pct);

  return (
    <div className="flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 shadow-pressed-sm" title="Context window in use">
      <svg width="30" height="18" viewBox="0 0 120 70">
        <path d="M10,60 A50,50 0 0 1 110,60" fill="none" stroke="#16171a" strokeWidth="10" strokeLinecap="round" />
        <path
          d="M10,60 A50,50 0 0 1 110,60"
          fill="none"
          stroke="#FFA85C"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={ARC_LENGTH}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.4s ease" }}
          opacity={pct < 0.02 ? 0.35 : 1}
        />
      </svg>
      <span className="font-mono text-[11px] text-muted">
        {formatTokens(used)} <span className="text-white/20">/</span> {formatTokens(max)}
      </span>
    </div>
  );
}
