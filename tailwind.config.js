/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: "class", // enable dark mode via class strategy
  theme: {
    extend: {
      backgroundImage: {
        'holographic': 'linear-gradient(135deg, #ff00cc, #3333ff, #00ffd5)',
      },
      animation: {
        'pulse-slow': 'pulse 3s infinite ease-in-out',
      },
      blur: {
        xs: '2px',
        sm: '4px',
      },
      brightness: {
        120: '1.2',
        150: '1.5',
      },

      // **Added custom colors for light/dark mode and accents**
      colors: {
        bgLight: "#F9FAFB",
        bgDark: "#1E293B",
        cardLight: "#FFFFFF",
        cardDark: "#2E3A59",
        textPrimaryLight: "#111827",
        textPrimaryDark: "#E0E7FF",
        textSecondaryLight: "#6B7280",
        textSecondaryDark: "#A3AED0",
        accentLight: "#2563EB",
        accentDark: "#4F7FFF",
        borderLight: "#E5E7EB",
        borderDark: "#475569",
        footerLight: "#F3F4F6",
        footerDark: "#152536",
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
  ],
};
