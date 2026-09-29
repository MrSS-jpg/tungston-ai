import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#24272B",
        surface: "#2E3237",
        surface2: "#3A3F45",
        ink: "#F2EFE6",
        muted: "#A0A3A9",
        accent: "#FFA85C",
        line: "#0B0C0D",
        danger: "#FF6B5A",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "monospace"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        none: "0",
        sm: "0",
        DEFAULT: "0",
        md: "0",
        lg: "0",
        xl: "0",
        "2xl": "0",
        full: "0",
      },
      boxShadow: {
        hard: "6px 6px 0 #0B0C0D",
        "hard-sm": "3px 3px 0 #0B0C0D",
        glow: "0 0 18px rgba(255,168,92,0.45)",
      },
      keyframes: {
        heat: {
          "0%,100%": { opacity: "0.55", filter: "brightness(0.9)" },
          "50%": { opacity: "1", filter: "brightness(1.25)" },
        },
      },
      animation: {
        heat: "heat 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
