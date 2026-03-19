/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",

  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],

  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card:       { DEFAULT: "var(--card)", foreground: "var(--card-foreground)" },
        muted:      { DEFAULT: "var(--muted)", foreground: "var(--muted-foreground)" },
        border:     "var(--border)",
        input:      "var(--input)",
        primary:    { DEFAULT: "var(--primary)", foreground: "var(--primary-foreground)" },
      },
    },
  },

  plugins: [],
}