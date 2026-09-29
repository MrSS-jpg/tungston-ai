export function FilamentMark({ active = false, size = 28 }: { active?: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className={active ? "animate-heat" : ""}
      style={{ filter: active ? "drop-shadow(0 0 6px rgba(255,168,92,0.6))" : "none" }}
    >
      <rect x="3" y="3" width="34" height="34" fill={active ? "#FFA85C" : "#3A3F45"} stroke="#0B0C0D" strokeWidth="3" />
      <text x="6" y="12" fontSize="7" fontWeight="700" fill={active ? "#0B0C0D" : "#A0A3A9"} fontFamily="var(--font-mono), monospace">
        74
      </text>
      <text x="20" y="31" textAnchor="middle" fontSize="20" fill={active ? "#0B0C0D" : "#F2EFE6"} fontFamily="var(--font-display), sans-serif">
        W
      </text>
    </svg>
  );
}
