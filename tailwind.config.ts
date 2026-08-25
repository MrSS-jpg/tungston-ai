import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#1E2023",
        surface: "#23262B",
        surface2: "#2A2D33",
        ink: "#EDEAE3",
        muted: "#8B8E94",
        accent: "#FFA85C",
        ember: "#6B4A2E",
        steel: "#6C90B0",
        danger: "#E2685A",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        raised: "8px 8px 16px #16171a, -8px -8px 16px #2e3238",
        "raised-sm": "4px 4px 8px #16171a, -4px -4px 8px #2e3238",
        pressed: "inset 4px 4px 8px #16171a, inset -4px -4px 8px #2e3238",
        "pressed-sm": "inset 2px 2px 5px #16171a, inset -2px -2px 5px #2e3238",
        glow: "0 0 18px rgba(255,168,92,0.45)",
      },
      keyframes: {
        heat: {
          "0%,100%": { opacity: "0.55", filter: "brightness(0.9)" },
          "50%": { opacity: "1", filter: "brightness(1.25)" },
        },
        rise: {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        heat: "heat 1.8s ease-in-out infinite",
        rise: "rise 0.25s ease-out",
      },
    },
  },
  plugins: [],
};
export default config;
