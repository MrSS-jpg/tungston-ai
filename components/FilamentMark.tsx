export function FilamentMark({ active = false, size = 28 }: { active?: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className={active ? "animate-heat" : ""}
      style={{ filter: active ? "drop-shadow(0 0 6px rgba(255,168,92,0.6))" : "none" }}
    >
      <rect x="4" y="4" width="32" height="32" rx="9" fill="#23262B" />
      <path
        d="M13 12 v16 M13 12 q7 0 7 4 t-7 4 M20 20 q7 0 7 4 t-7 4"
        fill="none"
        stroke={active ? "#FFA85C" : "#8B8E94"}
        strokeWidth="2.1"
        strokeLinecap="round"
      />
    </svg>
  );
}
