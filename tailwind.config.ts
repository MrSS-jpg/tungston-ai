import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "var(--color-base)",
        surface: "var(--color-surface)",
        surface2: "var(--color-surface2)",
        ink: "var(--color-ink)",
        muted: "var(--color-muted)",
        accent: "var(--color-accent)",
        line: "var(--color-line)",
        danger: "var(--color-danger)",
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
        hard: "6px 6px 0 var(--color-line)",
        "hard-sm": "3px 3px 0 var(--color-line)",
        glow: "0 0 18px var(--color-accent)",
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
