/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/webview/**/*.{ts,tsx,html}"],
  theme: {
    extend: {
      colors: {
        primary: "#2060df",
        "background-dark": "#111113",
        "surface-dark": "#18181B",
        "border-dark": "#27272a",
        "text-main": "#E4E4E7",
        "text-muted": "#A1A1AA",
        "text-dim": "#52525B",
        "accent-warm": "#78716C",
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      fontSize: {
        xxs: "0.65rem",
      },
      letterSpacing: {
        editorial: "0.08em",
        "widest-custom": "0.15em",
      },
    },
  },
  plugins: [],
};
