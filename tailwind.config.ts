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
        background: "#F4F7F5",
        // Bingkai ringan: satu langkah tone hijau-abu dari warna BPJS; dipakai untuk latar kontrol dan hover.
        frame: "#EDF2EF",
        surface: {
          DEFAULT: "#FFFFFF",
          secondary: "#EEF3F0",
          tint: "#EBF4EF",
          subtle: "#F6F9F7",
        },
        bpjs: {
          DEFAULT: "#007A3A",
          deep: "#00632F",
          dark: "#064E2B",
          light: "#E3F3EA",
          soft: "#F0F8F3",
          border: "#C2DFCE",
        },
        intel: {
          DEFAULT: "#0E7490",
          deep: "#155E75",
          light: "#E6F4F8",
          dark: "#164E63",
          border: "#BAE0EC",
        },
        risk: {
          critical: "#B91C1C",
          "critical-bg": "#FEF2F2",
          "critical-border": "#FECACA",
          high: "#C2410C",
          "high-bg": "#FFF7ED",
          "high-border": "#FED7AA",
          medium: "#B45309",
          "medium-bg": "#FFFBEB",
          "medium-border": "#FDE68A",
          low: "#047857",
          "low-bg": "#ECFDF5",
          "low-border": "#A7F3D0",
        },
        jkn: {
          text: "#11241D",
          muted: "#475B53",
          dim: "#61756D",
          border: "#D5E0DA",
          divider: "#E4ECE8",
        }
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Plus Jakarta Sans"',
          '"Inter"',
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "var(--font-mono)",
          '"JetBrains Mono"',
          '"SF Mono"',
          "SFMono-Regular",
          "ui-monospace",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      letterSpacing: {
        tighter: "-0.03em",
        tight: "-0.02em",
        snug: "-0.01em",
        normal: "-0.005em",
        wide: "0.02em",
        wider: "0.04em",
        widest: "0.08em",
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgba(17, 36, 29, 0.04)",
        card: "0 1px 3px 0 rgba(17, 36, 29, 0.06), 0 1px 2px -1px rgba(17, 36, 29, 0.04)",
        elevated: "0 8px 20px -4px rgba(17, 36, 29, 0.08), 0 2px 6px -2px rgba(17, 36, 29, 0.04)",
        glow: "0 1px 3px 0 rgba(0, 122, 58, 0.16)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "ping-slow": "ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite",
      },
    },
  },
  plugins: [],
};
export default config;
