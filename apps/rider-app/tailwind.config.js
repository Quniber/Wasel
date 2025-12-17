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
        primary: {
          DEFAULT: '#4CAF50',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#2196F3',
          foreground: '#FFFFFF',
        },
        background: {
          DEFAULT: '#FFFFFF',
          dark: '#121212',
        },
        foreground: {
          DEFAULT: '#212121',
          dark: '#FAFAFA',
        },
        muted: {
          DEFAULT: '#F5F5F5',
          dark: '#1E1E1E',
          foreground: '#757575',
        },
        card: {
          DEFAULT: '#FFFFFF',
          dark: '#1E1E1E',
        },
        border: {
          DEFAULT: '#E0E0E0',
          dark: '#333333',
        },
        destructive: {
          DEFAULT: '#F44336',
          foreground: '#FFFFFF',
        },
        success: {
          DEFAULT: '#4CAF50',
          foreground: '#FFFFFF',
        },
        warning: {
          DEFAULT: '#FF9800',
          foreground: '#FFFFFF',
        },
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
  darkMode: 'class',
};
