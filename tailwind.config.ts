import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Semantic theme tokens (CSS-variable backed; flip under `.dark`) ──
        // Use these for surfaces/text/borders so a single class themes itself.
        // Literal gold/navy/cream/ink stay for accents & always-dark sections.
        surface: "rgb(var(--surface) / <alpha-value>)", // page background
        "surface-2": "rgb(var(--surface-2) / <alpha-value>)", // subtle / hover
        card: "rgb(var(--card) / <alpha-value>)", // raised cards / panels
        heading: "rgb(var(--heading) / <alpha-value>)", // primary text / headings
        muted: "rgb(var(--muted) / <alpha-value>)", // secondary text
        faint: "rgb(var(--faint) / <alpha-value>)", // tertiary text
        hair: "var(--hair)", // hairline borders (alpha baked in)
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
      // ── Editorial display ramp ──
      // Fluid (clamp) so the hero and section heads scale continuously instead of
      // stepping at breakpoints. The gap between `display-lg` and a 2xl body heading
      // is what creates hierarchy — the old flat 3xl/4xl scale had almost none.
      fontSize: {
        "display-sm": ["clamp(1.5rem, 1.25rem + 1.3vw, 2rem)", { lineHeight: "1.12", letterSpacing: "-0.018em" }],
        display: ["clamp(1.875rem, 1.4rem + 2.1vw, 2.75rem)", { lineHeight: "1.08", letterSpacing: "-0.022em" }],
        "display-lg": ["clamp(2.25rem, 1.5rem + 3.2vw, 3.5rem)", { lineHeight: "1.04", letterSpacing: "-0.026em" }],
        // Section numerals on the "how it works" spine
        numeral: ["clamp(2.5rem, 1.6rem + 3.8vw, 4.25rem)", { lineHeight: "0.85", letterSpacing: "-0.035em" }],
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
        "out-back": "cubic-bezier(0.34, 1.4, 0.64, 1)",
      },
      boxShadow: {
        card: "0 1px 3px rgba(20,33,61,0.05), 0 8px 24px rgba(20,33,61,0.06)",
        "card-hover": "0 4px 12px rgba(20,33,61,0.10), 0 18px 44px rgba(20,33,61,0.12)",
        gold: "0 8px 24px rgba(212,155,30,0.28)",
        navy: "0 10px 30px rgba(8,18,37,0.30)",
        // Floating nav pill + hero mockup layering
        pill: "0 1px 2px rgba(8,18,37,0.04), 0 8px 30px rgba(8,18,37,0.10)",
        lift: "0 2px 4px rgba(8,18,37,0.04), 0 12px 28px rgba(8,18,37,0.10), 0 36px 68px rgba(8,18,37,0.09)",
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
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        // Radix Accordion needs explicit height keyframes (FAQ section).
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) forwards",
        "fade-in": "fade-in 0.6s ease-out forwards",
        "scale-in": "scale-in 0.4s cubic-bezier(0.16,1,0.3,1) forwards",
        float: "float 6s ease-in-out infinite",
        marquee: "marquee 42s linear infinite",
        "accordion-down": "accordion-down 0.25s cubic-bezier(0.16,1,0.3,1)",
        "accordion-up": "accordion-up 0.2s cubic-bezier(0.16,1,0.3,1)",
      },
    },
  },
  plugins: [],
};

export default config;
