import type { Config } from "tailwindcss";
import { heroui } from "@heroui/react";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        canvas: {
          DEFAULT: "#09090b",
          grid: "#27272a",
        },
        accent: {
          DEFAULT: "#f59e0b",
          muted: "#d97706",
          glow: "rgba(245, 158, 11, 0.35)",
        },
      },
      boxShadow: {
        node: "0 0 0 1px rgba(255,255,255,0.06), 0 24px 48px -12px rgba(0,0,0,0.55)",
      },
    },
  },
  darkMode: "class",
  // HeroUI bundles a newer Tailwind plugin type than the project's tailwindcss@3 types.
  plugins: [
    heroui({
      themes: {
        dark: {
          colors: {
            background: "#09090b",
            foreground: "#fafafa",
            primary: {
              50: "#fffbeb",
              100: "#fef3c7",
              200: "#fde68a",
              300: "#fcd34d",
              400: "#fbbf24",
              500: "#f59e0b",
              600: "#d97706",
              700: "#b45309",
              800: "#92400e",
              900: "#78350f",
              DEFAULT: "#f59e0b",
              foreground: "#09090b",
            },
            focus: "#f59e0b",
          },
        },
      },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any,
  ],
};

export default config;
