import type { Config } from "tailwindcss";

const config: Config = {
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
        body: ["var(--font-body)", "sans-serif"],
        heading: ["var(--font-heading)", "sans-serif"]
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
