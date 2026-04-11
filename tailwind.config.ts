import type { Config } from "tailwindcss";

const config: Config = {
  // Tailwind v4 is driven primarily by `app/globals.css` via `@theme`.
  // This file remains useful for editor tooling and future fallback config.
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#f4f1ea",
        foreground: "#171717",
        accent: {
          DEFAULT: "#0f766e",
          soft: "#c7f0eb"
        },
        panel: "#fffdf8",
        border: "#ddd5c7"
      },
      fontFamily: {
        body: ["var(--font-body-family)", "sans-serif"],
        heading: ["var(--font-heading-family)", "sans-serif"]
      },
      boxShadow: {
        card: "0 20px 60px rgba(23, 23, 23, 0.08)"
      },
      borderRadius: {
        "2xl": "1.5rem"
      }
    }
  },
  plugins: []
};

export default config;
