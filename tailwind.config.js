/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Semantic tokens map to CSS variables so light/dark both work.
        primary: "var(--color-primary)",
        "primary-hover": "var(--color-primary-hover)",
        button: "var(--color-button)",
        background: "var(--color-background)",
        surface: "var(--color-surface)",
        "surface-elevated": "var(--color-surface-elevated)",
        input: "var(--color-input)",
        border: "var(--color-border)",
        "border-orange": "var(--color-border-orange)",
        "text-primary": "var(--color-text-primary)",
        "text-secondary": "var(--color-text-secondary)",
        placeholder: "var(--color-placeholder)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        error: "var(--color-error)",
        info: "var(--color-info)",
      },
      fontFamily: {
        display: ["Space Grotesk", "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        neu: "6px 6px 16px rgba(0,0,0,0.06), -6px -6px 16px rgba(255,255,255,0.7)",
        "neu-dark": "6px 6px 16px rgba(0,0,0,0.5), -4px -4px 12px rgba(255,255,255,0.02)",
        "neu-inset": "inset 3px 3px 8px rgba(0,0,0,0.06), inset -3px -3px 8px rgba(255,255,255,0.6)",
      },
    },
  },
  plugins: [],
};
