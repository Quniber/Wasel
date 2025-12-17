/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Match admin panel color scheme (converted to hex)
        border: '#e2e8f0',
        input: '#e2e8f0',
        ring: '#020817',
        background: {
          DEFAULT: '#ffffff',
          dark: '#020817',
        },
        foreground: {
          DEFAULT: '#020817',
          dark: '#f8fafc',
        },
        primary: {
          DEFAULT: '#1e293b',
          foreground: '#f8fafc',
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        secondary: {
          DEFAULT: '#f1f5f9',
          foreground: '#1e293b',
        },
        destructive: {
          DEFAULT: '#ef4444',
          foreground: '#f8fafc',
        },
        muted: {
          DEFAULT: '#f1f5f9',
          dark: '#1e293b',
          foreground: '#64748b',
        },
        accent: {
          DEFAULT: '#f1f5f9',
          foreground: '#1e293b',
        },
        popover: {
          DEFAULT: '#ffffff',
          foreground: '#020817',
        },
        card: {
          DEFAULT: '#ffffff',
          dark: '#020817',
          foreground: '#020817',
        },
        success: {
          DEFAULT: '#22c55e',
          foreground: '#f8fafc',
        },
        warning: {
          DEFAULT: '#f59e0b',
          foreground: '#f8fafc',
        },
      },
      borderRadius: {
        lg: 8,
        md: 6,
        sm: 4,
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
  darkMode: 'class',
};
