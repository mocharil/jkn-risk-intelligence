import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F8FBFA",
        surface: {
          DEFAULT: "#FFFFFF",
          secondary: "#F2F8F5",
          tint: "#EEF8F2",
          subtle: "#F4F9F6",
        },
        bpjs: {
          DEFAULT: "#00A651",
          deep: "#08783E",
          dark: "#075C35",
          light: "#E7F7EE",
          soft: "#F2FAF5",
          border: "#D2EBD9",
        },
        intel: {
          DEFAULT: "#1689C8",
          deep: "#126FA3",
          light: "#EAF6FC",
          dark: "#0C4A6E",
        },
        risk: {
          critical: "#D92D20",
          "critical-bg": "#FEF3F2",
          "critical-border": "#FECDCA",
          high: "#F04438",
          "high-bg": "#FFF4F2",
          "high-border": "#FECDCA",
          medium: "#F79009",
          "medium-bg": "#FFFAEB",
          "medium-border": "#FEDF89",
          low: "#12B76A",
          "low-bg": "#ECFDF3",
          "low-border": "#A6F4C5",
        },
        jkn: {
          text: "#16332A",
          muted: "#52665F",
          dim: "#8A9E96",
          border: "#DDE7E2",
          divider: "#E9F1ED",
        }
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "var(--font-sans)",
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"SF Pro"',
          '"Plus Jakarta Sans"',
          '"Inter"',
          "system-ui",
          "sans-serif",
        ],
        mono: [
          '"SF Mono"',
          "SFMono-Regular",
          "var(--font-mono)",
          '"JetBrains Mono"',
          "ui-monospace",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      letterSpacing: {
        tighter: "-0.04em",
        tight: "-0.025em",
        snug: "-0.015em",
        normal: "-0.011em",
        wide: "0.025em",
        wider: "0.05em",
        widest: "0.1em",
      },
      boxShadow: {
        subtle: "0 1px 3px 0 rgba(16, 40, 30, 0.05), 0 1px 2px -1px rgba(16, 40, 30, 0.03)",
        card: "0 4px 12px 0 rgba(16, 40, 30, 0.05), 0 2px 4px -2px rgba(16, 40, 30, 0.03)",
        elevated: "0 10px 25px -3px rgba(16, 40, 30, 0.08), 0 4px 6px -4px rgba(16, 40, 30, 0.04)",
        glow: "0 0 20px -3px rgba(0, 166, 81, 0.25)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "ping-slow": "ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite",
        "border-beam": "border-beam calc(var(--duration)*1s) infinite linear",
        "retro-grid": "retro-grid 20s linear infinite",
        "marquee": "marquee var(--duration) infinite linear",
        "marquee-vertical": "marquee-vertical var(--duration) linear infinite",
        "shimmer-slide": "shimmer-slide var(--speed) ease-in-out infinite alternate",
        "spin-around": "spin-around calc(var(--speed) * 2) infinite linear",
        "orbit": "orbit calc(var(--duration)*1s) linear infinite",
        "gradient": "gradient 8s linear infinite",
      },
      keyframes: {
        "border-beam": {
          "100%": {
            "offset-distance": "100%",
          },
        },
        "retro-grid": {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(-60px)" },
        },
        "marquee": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(calc(-100% - var(--gap)))" },
        },
        "marquee-vertical": {
          from: { transform: "translateY(0)" },
          to: { transform: "translateY(calc(-100% - var(--gap)))" },
        },
        "shimmer-slide": {
          to: {
            transform: "translate(calc(100cqw - 100%), 0)",
          },
        },
        "spin-around": {
          "0%": {
            transform: "translateZ(0) rotate(0)",
          },
          "15%, 35%": {
            transform: "translateZ(0) rotate(90deg)",
          },
          "65%, 85%": {
            transform: "translateZ(0) rotate(270deg)",
          },
          "100%": {
            transform: "translateZ(0) rotate(360deg)",
          },
        },
        "orbit": {
          "0%": {
            transform: "rotate(0deg) translateY(calc(var(--radius) * 1px)) rotate(0deg)",
          },
          "100%": {
            transform: "rotate(360deg) translateY(calc(var(--radius) * 1px)) rotate(-360deg)",
          },
        },
        "gradient": {
          to: {
            backgroundPosition: "var(--bg-size) 0",
          },
        },
      },
    },
  },
  plugins: [],
};
export default config;
