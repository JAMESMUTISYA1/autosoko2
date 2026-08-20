/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./data/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Monochrome design system — see docs/design-notes.md.
        // Every token is a CSS variable that flips value between
        // :root and .dark in globals.css, so components never need
        // dark: prefixes for basic surfaces/text/borders.
        bg: "var(--bg)",       // page background
        card: "var(--card)",   // card/panel background (slightly offset from bg)
        fg: "var(--fg)",       // primary text / primary button fill
        muted: "var(--muted)", // secondary text
        line: "var(--line)",   // borders
        accent: "var(--accent)", // one brand accent, used sparingly

        // "Invert" = intentionally the opposite of the current theme —
        // used for the header/footer/hero so they stay a strong
        // black-on-white or white-on-black bar in either mode instead
        // of disappearing into a same-tone page background.
        invert: {
          DEFAULT: "var(--invert-bg)",
          fg: "var(--invert-fg)",
          soft: "var(--invert-soft)",
          muted: "var(--invert-muted)",
          line: "var(--invert-line)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Arial Black", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      backgroundImage: {
        // Monochrome diagonal accent (was hazard-yellow, now ink-on-transparent)
        "stripe-accent":
          "repeating-linear-gradient(135deg, var(--invert-fg) 0px, var(--invert-fg) 1px, transparent 1px, transparent 14px)",
      },
    },
  },
  plugins: [],
};
