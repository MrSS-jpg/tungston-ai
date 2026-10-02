export function FilamentMark({ active = false, size = 28 }: { active?: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className={active ? "animate-heat" : ""}
      style={{ filter: active ? "drop-shadow(0 0 6px var(--color-accent))" : "none" }}
    >
      <rect x="3" y="3" width="34" height="34" fill={active ? "var(--color-accent)" : "var(--color-surface2)"} stroke="var(--color-line)" strokeWidth="3" />
      <text x="6" y="12" fontSize="7" fontWeight="700" fill={active ? "var(--color-line)" : "var(--color-muted)"} fontFamily="var(--font-mono), monospace">
        74
      </text>
      <text x="20" y="31" textAnchor="middle" fontSize="20" fill={active ? "var(--color-line)" : "var(--color-ink)"} fontFamily="var(--font-display), sans-serif">
        W
      </text>
    </svg>
  );
}
