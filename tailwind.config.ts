import type { Config } from "tailwindcss";

// Replyloop design tokens — mirrored from the original HTML design system
// so Tailwind utilities and the ported component CSS share one source of truth.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#F5F2EC",
        card: "#FFFFFF",
        soft: "#EFEBE2",
        dark: "#0E1217",
        ink: {
          DEFAULT: "#0E1217",
          2: "#2A3038",
          mute: "#5C6470",
          soft: "#8A8F99",
        },
        line: {
          DEFAULT: "#E5E1D7",
          2: "#ECE8DE",
        },
        accent: {
          DEFAULT: "#059669",
          2: "#047857",
          soft: "#D1FAE5",
          pale: "#ECFDF5",
          bright: "#10B981",
        },
        danger: {
          DEFAULT: "#DC2626",
          pale: "#FEF2F2",
        },
        warn: {
          DEFAULT: "#D97706",
          pale: "#FFFBEB",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Times New Roman", "serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        DEFAULT: "10px",
        lg: "16px",
        pill: "999px",
      },
    },
  },
  plugins: [],
};

export default config;
