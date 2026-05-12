import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
      },
      borderRadius: {
        xl:  "28px",
        lg:  "20px",
        md:  "16px",
        sm:  "12px",
        xs:  "10px",
        base: "var(--radius)",
      },
      fontFamily: {
        sans: ["Inter", "DM Sans", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      backdropBlur: {
        xs: "4px",
        glass: "20px",
        "glass-lg": "30px",
      },
      boxShadow: {
        glass:       "0 8px 32px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.08)",
        "glass-lg":  "0 28px 90px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.12)",
        "glass-modal":"0 24px 64px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.10)",
        "glow-blue": "0 0 20px rgba(79,156,249,0.40)",
        "glow-green":"0 0 20px rgba(54,211,153,0.35)",
        "glow-red":  "0 0 20px rgba(248,114,114,0.35)",
      },
      animation: {
        "fade-in":       "fadeIn 0.35s ease both",
        "fade-in-scale": "fadeInScale 0.25s ease both",
        "pulse-ring":    "pulse-ring 2s infinite",
        "drift":         "drift 60s infinite alternate linear",
        "dot-pulse":     "dot-pulse 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
