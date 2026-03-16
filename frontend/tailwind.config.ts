import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0D0D0D",
        surface: "#1A1A2E",
        "surface-2": "#252538",
        gold: "#C9A84C",
        "gold-light": "#F5EDD6",
        "text-primary": "#FFFFFF",
        "text-secondary": "#9A9AAA",
        border: "#2E2E42",
        blue: "#3B82F6",
        green: "#10B981",
        amber: "#F59E0B",
        purple: "#8B5CF6",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      borderRadius: {
        card: "8px",
        input: "4px",
      },
    },
  },
  plugins: [],
};

export default config;
