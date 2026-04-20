import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // Custom vintage colors
        sepia: "hsl(var(--sepia))",
        "aged-paper": "hsl(var(--aged-paper))",
        ink: "hsl(var(--ink))",
        leather: "hsl(var(--leather))",
        gold: "hsl(var(--gold))",
        "dark-green": "hsl(var(--dark-green))",
        wood: "hsl(var(--wood))",
        bookmark: "hsl(var(--bookmark))",
        "paper-highlight": "hsl(var(--paper-highlight))",
        "paper-shadow": "hsl(var(--paper-shadow))",
      },
      fontFamily: {
        serif: ["'Nanum Myeongjo'", "serif"],
        handwriting: ["'Nanum Pen Script'", "cursive"],
      },
      fontSize:{
        'handwriting-sm': ['calc(0.875rem + 0.5px)', '1.25'],
        'handwriting-base': ['calc(1rem + 0.5px)', '1.5'],
        'handwriting-lg': ['calc(1.125rem + 0.5px)', '1.75'],
        'handwriting-xl': ['calc(1.25rem + 0.5px)', '1.75'],
        'handwriting-2xl': ['calc(1.5rem + 0.5px)', '2'],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        book: "var(--shadow-book)",
        page: "var(--shadow-page)",
        soft: "var(--shadow-soft)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-left": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "slide-out-left": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-100%)" },
        },
        "book-open": {
          "0%": { transform: "perspective(1000px) rotateY(-90deg)", opacity: "0" },
          "100%": { transform: "perspective(1000px) rotateY(0deg)", opacity: "1" },
        },
        "gentle-float": {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(-10px) rotate(2deg)" },
        },
        "ink-appear": {
          "0%": { opacity: "0", filter: "blur(2px)" },
          "100%": { opacity: "1", filter: "blur(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out",
        "slide-in-left": "slide-in-left 0.4s ease-out",
        "slide-out-left": "slide-out-left 0.4s ease-out",
        "book-open": "book-open 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
        "gentle-float": "gentle-float 4s ease-in-out infinite",
        "ink-appear": "ink-appear 0.5s ease-out forwards",
      },
    },
  },
  plugins: [
  require("tailwindcss-animate"),
  require("tailwind-scrollbar")
],
} satisfies Config;
