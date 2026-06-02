import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Golden yellow — primary brand / action
        gold: {
          50: "#FBF3DF",
          100: "#F6E6BC",
          200: "#EFD389",
          300: "#E8C056",
          400: "#E2B23A",
          500: "#D49B1E",
          600: "#B07F15",
          700: "#8A6310",
          800: "#6B4D0E",
          900: "#4D370A",
        },
        // Dark blue — depth, headers, admin
        navy: {
          50: "#EAEEF6",
          100: "#C9D4E8",
          200: "#93A6CC",
          300: "#5C77AF",
          400: "#2F4D8A",
          500: "#1E3A6E",
          600: "#16305C",
          700: "#112548",
          800: "#0C1B36",
          900: "#081225",
          950: "#050C19",
        },
        // Light creamy — backgrounds, surfaces
        cream: {
          50: "#FDFBF7",
          100: "#FAF5EA",
          200: "#F3E9D5",
          300: "#EBDBBC",
          400: "#DDC79A",
        },
        // Text ink
        ink: {
          DEFAULT: "#14213D",
          soft: "#5B6B85",
          faint: "#8A97AC",
        },
        success: "#22C55E",
        warning: "#F97316",
      },
      fontFamily: {
        heading: ["var(--font-outfit)", "system-ui", "sans-serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(20,33,61,0.05), 0 8px 24px rgba(20,33,61,0.06)",
        "card-hover": "0 4px 12px rgba(20,33,61,0.10), 0 18px 44px rgba(20,33,61,0.12)",
        gold: "0 8px 24px rgba(212,155,30,0.28)",
        navy: "0 10px 30px rgba(8,18,37,0.30)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) forwards",
        "fade-in": "fade-in 0.6s ease-out forwards",
        "scale-in": "scale-in 0.4s cubic-bezier(0.16,1,0.3,1) forwards",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
